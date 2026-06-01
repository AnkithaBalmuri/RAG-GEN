import { NextResponse } from "next/server";
import { runRag } from "@/lib/rag";
import { uniqueValues } from "@/lib/text";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { question, topK = 6 } = await request.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    const result = await runRag(question, Number(topK));
    return NextResponse.json({
      answer: result.answer,
      searchQuery: result.searchQuery,
      sources: uniqueValues(result.chunks.map((chunk) => chunk.filename)),
      chunks: result.chunks,
      tags: result.tags,
      queryType: result.queryType,
      rewrittenQuery: result.rewrittenQuery,
      confidence: result.confidence,
      citations: result.citations
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed." },
      { status: 500 }
    );
  }
}
