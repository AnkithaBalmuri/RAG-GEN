import { Pinecone } from "@pinecone-database/pinecone";
import { PINECONE_NAMESPACE } from "@/lib/constants";
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

export function getPineconeNamespace() {
  return getPineconeIndex().namespace(PINECONE_NAMESPACE);
}

export type IntegratedChunkRecord = {
  id: string;
  text: string;
  filename: string;
  source: string;
  chunkNumber: number;
  uploadDate: string;
  tags: string[];
};

export async function upsertChunkRecords(records: IntegratedChunkRecord[]) {
  const namespace = getPineconeNamespace();
  for (let i = 0; i < records.length; i += 96) {
    await namespace.upsertRecords(records.slice(i, i + 96));
  }
}

export async function searchChunkRecords(query: string, topK: number, tags: string[] = []) {
  const namespace = getPineconeNamespace();
  const filter = tags.length ? { tags: { $in: tags } } : undefined;
  const response = await namespace.searchRecords({
    query: {
      topK,
      inputs: { text: query },
      ...(filter ? { filter } : {})
    },
    fields: ["text", "filename", "source", "chunkNumber", "uploadDate", "tags"]
  });

  return (response.result?.hits ?? [])
    .map((hit) => {
      const fields = hit.fields as Record<string, unknown>;
      return {
        id: hit._id,
        text: String(fields.text ?? ""),
        filename: String(fields.filename ?? "unknown"),
        source: String(fields.source ?? "upload"),
        chunkNumber: Number(fields.chunkNumber ?? 0),
        uploadDate: String(fields.uploadDate ?? ""),
        tags: Array.isArray(fields.tags) ? fields.tags.map(String) : [],
        score: hit._score
      } satisfies DocumentChunk;
    })
    .filter((chunk) => chunk.text.trim().length >= 20);
}
