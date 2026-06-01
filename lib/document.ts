import mammoth from "mammoth";
import pdf from "pdf-parse";
import { chunkText } from "@/lib/text";
import type { DocumentChunk } from "@/types";

export async function extractText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    const parsed = await pdf(buffer);
    return parsed.text;
  }

  if (name.endsWith(".docx")) {
    const parsed = await mammoth.extractRawText({ buffer });
    return parsed.value;
  }

  if (name.endsWith(".txt") || file.type === "text/plain") {
    return buffer.toString("utf8");
  }

  throw new Error(`${file.name} is not a supported file type`);
}

export function buildDocumentChunks(
  filename: string,
  source: string,
  text: string,
  tags: string[],
  options: { uploadedAt?: string; idPrefix?: string } = {}
) {
  const uploadedAt = options.uploadedAt ?? new Date().toISOString();
  const baseId = options.idPrefix ?? `${filename.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${Date.now()}`;
  return chunkText(text).map((chunk, index) => {
    const id = `${baseId}-${index}`;
    return {
      id,
      text: chunk,
      filename,
      source,
      chunkNumber: index + 1,
      uploadDate: uploadedAt,
      tags
    } satisfies DocumentChunk;
  });
}
