import { loadEnvConfig } from "@next/env";
import { evaluateRetrieval } from "@/lib/evaluation";
import { averageMetrics, readEvaluationQuestions, writeEvaluationReport } from "@/lib/evaluation-store";
import { runRag } from "@/lib/rag";
import { uniqueValues } from "@/lib/text";

loadEnvConfig(process.cwd());

async function main() {
  const questions = await readEvaluationQuestions();
  const results = [];

  for (const item of questions) {
    console.log(`Evaluating ${item.id}: ${item.question}`);
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
  console.log(`Saved evaluation report for ${report.count} questions to evaluation/results.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
