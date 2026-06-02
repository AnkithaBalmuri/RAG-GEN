import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { Pinecone } from "@pinecone-database/pinecone";
import pdf from "pdf-parse";

const PROJECT_ROOT = process.cwd();

// Place knowledge-base documents in /data. Add, edit, or delete .md, .txt, and .pdf files,
// then run `npm run ingest` to rebuild Pinecone records with Pinecone-hosted embeddings.
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const PINECONE_NAMESPACE = "space-astronomy";
const CHUNK_SIZE = 1100;
const CHUNK_OVERLAP = 180;
const UPSERT_BATCH_SIZE = 96;
const UPSERT_RETRIES = 4;

type DataDocument = {
  absolutePath: string;
  relativePath: string;
  filename: string;
  text: string;
};

type IntegratedRecord = {
  id: string;
  text: string;
  filename: string;
  source: string;
  chunkNumber: number;
  uploadDate: string;
  tags: string[];
};

function loadEnvFile(filePath: string) {
  return fs
    .readFile(filePath, "utf8")
    .then((content) => {
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
        const [key, ...valueParts] = trimmed.split("=");
        if (!process.env[key]) process.env[key] = valueParts.join("=").trim();
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

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function upsertWithRetry(namespace: ReturnType<ReturnType<Pinecone["index"]>["namespace"]>, records: IntegratedRecord[]) {
  for (let attempt = 1; attempt <= UPSERT_RETRIES; attempt += 1) {
    try {
      await namespace.upsertRecords(records);
      return;
    } catch (error) {
      if (attempt === UPSERT_RETRIES) throw error;
      const delay = attempt * 2500;
      console.warn(`Pinecone upsertRecords failed. Retrying batch in ${delay}ms (${attempt}/${UPSERT_RETRIES})...`);
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
  const namespace = (host ? pc.index(indexName, host) : pc.index(indexName)).namespace(PINECONE_NAMESPACE);

  // Re-indexing policy: clear the namespace first, then upload raw text records.
  // Pinecone integrated inference embeds the `text` field inside the astrospace index.
  await namespace.deleteAll().catch(() => undefined);

  if (!files.length) {
    console.log("No .md, .txt, or .pdf files found in /data.");
    console.log("The Pinecone namespace was cleared. Add documents to data/ and run npm run ingest again.");
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

    const records = chunks.map((chunk, index) => ({
      id: `${baseId}-${index}`,
      text: chunk,
      filename: document.filename,
      source: document.relativePath,
      chunkNumber: index + 1,
      uploadDate: uploadedAt,
      tags
    }));

    for (let i = 0; i < records.length; i += UPSERT_BATCH_SIZE) {
      const batch = records.slice(i, i + UPSERT_BATCH_SIZE);
      await upsertWithRetry(namespace, batch);
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
