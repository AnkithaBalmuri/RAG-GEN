import { NextResponse } from "next/server";
import { evaluateRetrieval } from "@/lib/evaluation";
import { averageMetrics, readEvaluationQuestions, readEvaluationReport, writeEvaluationReport } from "@/lib/evaluation-store";
import { runRag } from "@/lib/rag";
import { uniqueValues } from "@/lib/text";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { question, expectedSources = [], expectedAnswer = "", topK = 6 } = await request.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    const result = await runRag(question, Number(topK));
    const metrics = evaluateRetrieval(result.chunks, expectedSources, result.answer, expectedAnswer);

    return NextResponse.json({
      metrics,
      answer: result.answer,
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
      { error: error instanceof Error ? error.message : "Evaluation failed." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const run = searchParams.get("run");

  try {
    if (run !== "1") {
      return NextResponse.json({ report: await readEvaluationReport(), questions: await readEvaluationQuestions() });
    }

    const questions = await readEvaluationQuestions();
    const results = [];

    for (const item of questions) {
      const result = await runRag(item.question, 6);
      const sources = uniqueValues(result.chunks.map((chunk) => chunk.filename));
      results.push({
        ...item,
        answer: result.answer,
        sources,
        metrics: evaluateRetrieval(result.chunks, item.expectedSources ?? [], result.answer, item.expectedAnswer),
        confidenceScore: result.confidence.confidenceScore,
        confidenceLabel: result.confidence.confidenceLabel
      });
    }

    const report = {
      createdAt: new Date().toISOString(),
      count: results.length,
      averages: averageMetrics(results),
      results
    };
    await writeEvaluationReport(report);

    return NextResponse.json({ report, questions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Evaluation failed." },
      { status: 500 }
    );
  }
}
