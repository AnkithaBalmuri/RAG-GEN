import { Pinecone } from "@pinecone-database/pinecone";
import { EMBEDDING_DIMENSIONS, PINECONE_NAMESPACE } from "@/lib/constants";
import type { DocumentChunk } from "@/types";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function getPineconeIndex() {
  const pc = new Pinecone({ apiKey: requiredEnv("PINECONE_API_KEY") });
  const indexName = requiredEnv("PINECONE_INDEX_NAME");
  const host = process.env.PINECONE_HOST;
  return host ? pc.index(indexName, host) : pc.index(indexName);
}

export async function ensurePineconeIndex() {
  const pc = new Pinecone({ apiKey: requiredEnv("PINECONE_API_KEY") });
  const indexName = requiredEnv("PINECONE_INDEX_NAME");
  const existing = await pc.listIndexes();
  const indexes = existing.indexes ?? [];
  const currentIndex = indexes.find((index) => index.name === indexName);

  if (currentIndex?.dimension && currentIndex.dimension !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Pinecone index "${indexName}" has dimension ${currentIndex.dimension}, but AstroRAG embeddings use ${EMBEDDING_DIMENSIONS}. Use a ${EMBEDDING_DIMENSIONS}-dimension index or change the embedding model.`
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

export async function upsertChunks(chunks: DocumentChunk[], vectors: number[][]) {
  const index = getPineconeIndex().namespace(PINECONE_NAMESPACE);
  const records = chunks.map((chunk, index) => ({
    id: chunk.id,
    values: vectors[index],
    metadata: {
      text: chunk.text,
      filename: chunk.filename,
      source: chunk.source,
      chunkNumber: chunk.chunkNumber,
      uploadDate: chunk.uploadDate,
      tags: chunk.tags
    }
  }));

  for (let i = 0; i < records.length; i += 100) {
    await index.upsert(records.slice(i, i + 100));
  }
}

export async function queryChunks(vector: number[], topK: number, tags: string[] = []) {
  const index = getPineconeIndex().namespace(PINECONE_NAMESPACE);
  const filter = tags.length ? { tags: { $in: tags } } : undefined;
  const result = await index.query({
    vector,
    topK,
    includeMetadata: true,
    filter
  });

  return (result.matches ?? [])
    .map((match) => {
      const metadata = match.metadata as Record<string, unknown>;
      return {
        id: match.id,
        text: String(metadata.text ?? ""),
        filename: String(metadata.filename ?? "unknown"),
        source: String(metadata.source ?? "upload"),
        chunkNumber: Number(metadata.chunkNumber ?? 0),
        uploadDate: String(metadata.uploadDate ?? ""),
        tags: Array.isArray(metadata.tags) ? metadata.tags.map(String) : [],
        score: match.score
      } satisfies DocumentChunk;
    })
    .filter((chunk) => chunk.text.trim().length >= 80);
}
