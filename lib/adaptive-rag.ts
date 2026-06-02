import { promises as fs } from "fs";
import path from "path";
import { RETRIEVAL_CONFIDENCE_THRESHOLD, UNAVAILABLE_ANSWER } from "@/lib/constants";
import type { AdaptiveLogEntry, CitationReference, DocumentChunk, QueryType, RetrievalQuality } from "@/types";

const LOG_DIR = path.join(process.cwd(), "evaluation");
const LOG_PATH = path.join(LOG_DIR, "adaptive-rag-logs.jsonl");

export function analyzeQueryType(question: string): QueryType {
  const normalized = question.toLowerCase();
  const comparativeTerms = ["compare", "difference", "different", "versus", " vs ", "better", "similar", "contrast"];
  const multiHopTerms = ["how does", "why does", "relationship", "connect", "cause", "effect", "mission and", "between"];
  const broadTerms = ["explain", "overview", "describe", "what are", "tell me about", "summarize", "introduction"];

  if (comparativeTerms.some((term) => normalized.includes(term))) return "comparative";
  if (multiHopTerms.some((term) => normalized.includes(term))) return "multi_hop";
  if (broadTerms.some((term) => normalized.includes(term)) || question.split(/\s+/).length > 14) {
    return "broad_exploratory";
  }
  return "simple_factual";
}

export function evaluateRetrievalQuality(chunks: DocumentChunk[]): RetrievalQuality {
  const similarityScores = chunks.map((chunk) => chunk.score ?? 0);
  const averageSimilarity = similarityScores.length
    ? similarityScores.reduce((sum, score) => sum + score, 0) / similarityScores.length
    : 0;
  const confidenceScore = Math.max(0, Math.min(100, Math.round(((averageSimilarity - 0.18) / 0.44) * 100)));

  return {
    averageSimilarity: round(averageSimilarity),
    confidenceScore,
    confidenceLabel: confidenceScore >= 70 ? "High" : confidenceScore >= RETRIEVAL_CONFIDENCE_THRESHOLD ? "Medium" : "Low",
    lowConfidence: confidenceScore < RETRIEVAL_CONFIDENCE_THRESHOLD
  };
}

export function buildCitations(chunks: DocumentChunk[]): CitationReference[] {
  return chunks.map((chunk) => ({
    filename: chunk.filename,
    chunkNumber: chunk.chunkNumber,
    chunkId: chunk.id,
    score: round(chunk.score ?? 0)
  }));
}

export function isMissingContextAnswer(answer: string) {
  return answer.trim().toLowerCase().includes(UNAVAILABLE_ANSWER.toLowerCase());
}

export async function writeAdaptiveLog(entry: Omit<AdaptiveLogEntry, "id" | "createdAt">) {
  const payload: AdaptiveLogEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry
  };

  if (process.env.NODE_ENV === "production") {
    console.log("[AdaptiveRAG]", JSON.stringify(payload));
    return payload;
  }

  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    await fs.appendFile(LOG_PATH, `${JSON.stringify(payload)}\n`, "utf8");
  } catch (error) {
    console.warn("[AdaptiveRAG] Local file logging failed:", error instanceof Error ? error.message : error);
  }

  return payload;
}

export async function readAdaptiveLogs(limit = 100): Promise<AdaptiveLogEntry[]> {
  try {
    const content = await fs.readFile(LOG_PATH, "utf8");
    return content
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AdaptiveLogEntry)
      .slice(-limit)
      .reverse();
  } catch {
    return [];
  }
}

function round(value: number) {
  return Number(value.toFixed(3));
}

