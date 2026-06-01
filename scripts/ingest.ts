import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { Pinecone } from "@pinecone-database/pinecone";
import pdf from "pdf-parse";
import { pipeline } from "@xenova/transformers";

const PROJECT_ROOT = process.cwd();

// Put your knowledge-base documents here. Add, edit, or delete .md, .txt, and .pdf files,
// then run `npm run ingest` to rebuild the Pinecone index from the current folder contents.
const DATA_DIR = path.join(PROJECT_ROOT, "data");

const PINECONE_NAMESPACE = "space-astronomy";
const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
const EMBEDDING_DIMENSIONS = 384;
const CHUNK_SIZE = 1100;
const CHUNK_OVERLAP = 180;
const UPSERT_BATCH_SIZE = 25;
const UPSERT_RETRIES = 4;

type DataDocument = {
  absolutePath: string;
  relativePath: string;
  filename: string;
  text: string;
};

type FeatureExtractor = Awaited<ReturnType<typeof pipeline>>;

let extractorPromise: Promise<FeatureExtractor> | null = null;

function loadEnvFile(filePath: string) {
  return fs
    .readFile(filePath, "utf8")
    .then((content) => {
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
        const [key, ...valueParts] = trimmed.split("=");
        if (!process.env[key]) {
          process.env[key] = valueParts.join("=").trim();
        }
      }
    })
    .catch(() => undefined);
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required. Add it to .env.local before running npm run ingest.`);
  return value;
}

function cleanText(input: string) {
  return input
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function chunkText(text: string) {
  const cleaned = cleanText(text);
  if (!cleaned) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + CHUNK_SIZE, cleaned.length);
    const slice = cleaned.slice(start, end);
    const lastBreak = Math.max(slice.lastIndexOf("\n"), slice.lastIndexOf(". "));
    const chunk = end < cleaned.length && lastBreak > CHUNK_SIZE * 0.55 ? slice.slice(0, lastBreak + 1) : slice;
    chunks.push(chunk.trim());
    if (end >= cleaned.length) break;
    start += Math.max(chunk.length - CHUNK_OVERLAP, 1);
  }

  return chunks.filter(Boolean);
}

function makeTags(text: string, filename: string) {
  const knownTerms = [
    "astronomy",
    "solar",
    "Sun",
    "stars",
    "planet",
    "Moon",
    "Mars",
    "black hole",
    "galaxy",
    "telescope",
    "satellite",
    "ISRO",
    "NASA",
    "Chandrayaan",
    "Gaganyaan",
    "orbit",
    "rocket"
  ];
  const haystack = `${filename} ${text}`.toLowerCase();
  const matched = knownTerms.filter((term) => haystack.includes(term.toLowerCase()));
  const words = haystack.match(/\b[a-z][a-z-]{4,}\b/g) ?? [];
  return Array.from(new Set([...matched, ...words.slice(0, 10)])).slice(0, 8);
}

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", EMBEDDING_MODEL);
  }
  return extractorPromise;
}

async function embedText(text: string) {
  const extractor = await getExtractor();
  const result = (await extractor(text, { pooling: "mean", normalize: true } as never)) as { data: Float32Array };
  return Array.from(result.data);
}

async function listDataFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return listDataFiles(fullPath);
      return /\.(md|txt|pdf)$/i.test(entry.name) ? [fullPath] : [];
    })
  );
  return files.flat();
}

async function extractDocument(filePath: string): Promise<DataDocument> {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = await fs.readFile(filePath);
  const relativePath = path.relative(DATA_DIR, filePath).replace(/\\/g, "/");

  if (ext === ".pdf") {
    const parsed = await pdf(buffer);
    return { absolutePath: filePath, relativePath, filename: path.basename(filePath), text: parsed.text };
  }

  return {
    absolutePath: filePath,
    relativePath,
    filename: path.basename(filePath),
    text: buffer.toString("utf8")
  };
}

async function ensureIndex(pc: Pinecone, indexName: string) {
  const existing = await pc.listIndexes();
  const currentIndex = existing.indexes?.find((index) => index.name === indexName);

  if (currentIndex?.dimension && currentIndex.dimension !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Pinecone index "${indexName}" has dimension ${currentIndex.dimension}. This project uses ${EMBEDDING_DIMENSIONS}-dimension embeddings.`
    );
  }

  if (!currentIndex) {
    await pc.createIndex({
      name: indexName,
      dimension: EMBEDDING_DIMENSIONS,
      metric: "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1"
        }
      }
    });
  }
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function upsertWithRetry(index: ReturnType<ReturnType<Pinecone["index"]>["namespace"]>, records: unknown[]) {
  for (let attempt = 1; attempt <= UPSERT_RETRIES; attempt += 1) {
    try {
      await index.upsert(records as never);
      return;
    } catch (error) {
      if (attempt === UPSERT_RETRIES) throw error;
      const delay = attempt * 2500;
      console.warn(`Pinecone upsert failed. Retrying batch in ${delay}ms (${attempt}/${UPSERT_RETRIES})...`);
      await sleep(delay);
    }
  }
}

async function main() {
  await loadEnvFile(path.join(PROJECT_ROOT, ".env.local"));
  await loadEnvFile(path.join(PROJECT_ROOT, ".env"));

  await fs.mkdir(DATA_DIR, { recursive: true });

  const files = await listDataFiles(DATA_DIR);
  const pc = new Pinecone({ apiKey: requiredEnv("PINECONE_API_KEY") });
  const indexName = requiredEnv("PINECONE_INDEX_NAME");
  const host = process.env.PINECONE_HOST;

  await ensureIndex(pc, indexName);
  const index = (host ? pc.index(indexName, host) : pc.index(indexName)).namespace(PINECONE_NAMESPACE);

  // Re-indexing policy: clear the namespace first, then upload vectors for the current /data folder.
  // This means deleted files are removed from the active knowledge base after `npm run ingest`.
  await index.deleteAll().catch(() => undefined);

  if (!files.length) {
    console.log("No .md, .txt, or .pdf files found in /data.");
    console.log("The Pinecone namespace was cleared. Add your documents to data/ and run npm run ingest again.");
    return;
  }

  let totalChunks = 0;
  const uploadedAt = new Date().toISOString();

  for (const filePath of files) {
    const document = await extractDocument(filePath);
    const chunks = chunkText(document.text);
    const tags = makeTags(document.text, document.filename);
    const baseId = document.relativePath.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

    console.log(`Indexing ${document.relativePath} (${chunks.length} chunks)`);

    const records = [];
    for (let index = 0; index < chunks.length; index += 1) {
      records.push({
        id: `${baseId}-${index}`,
        values: await embedText(chunks[index]),
        metadata: {
          text: chunks[index],
          filename: document.filename,
          source: document.relativePath,
          chunkNumber: index + 1,
          uploadDate: uploadedAt,
          tags
        }
      });
    }

    for (let i = 0; i < records.length; i += UPSERT_BATCH_SIZE) {
      const batch = records.slice(i, i + UPSERT_BATCH_SIZE);
      await upsertWithRetry(index, batch);
      console.log(`  Uploaded ${Math.min(i + UPSERT_BATCH_SIZE, records.length)}/${records.length} chunks`);
    }

    totalChunks += chunks.length;
  }

  console.log(`Done. Indexed ${files.length} documents and ${totalChunks} chunks into Pinecone namespace "${PINECONE_NAMESPACE}".`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
