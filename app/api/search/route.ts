import { NextResponse } from "next/server";
import { searchKnowledgeBase } from "@/lib/rag";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { question, topK = 6 } = await request.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    const result = await searchKnowledgeBase(question, Number(topK));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const question = searchParams.get("q");
  const topK = Number(searchParams.get("topK") ?? 6);

  if (!question) {
    return NextResponse.json({ error: "q is required." }, { status: 400 });
  }

  try {
    const result = await searchKnowledgeBase(question, topK);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed." },
      { status: 500 }
    );
  }
}
