import type { DocumentChunk, EvaluationMetrics } from "@/types";

export function evaluateRetrieval(
  chunks: DocumentChunk[],
  expectedSources: string[] = [],
  answer = "",
  expectedAnswer = ""
): EvaluationMetrics {
  const retrievedSources = chunks.map((chunk) => chunk.filename.toLowerCase());
  const expected = expectedSources.map((source) => source.toLowerCase()).filter(Boolean);
  const relevantHits = expected.length
    ? retrievedSources.filter((source) => expected.some((expectedSource) => source.includes(expectedSource))).length
    : chunks.filter((chunk) => (chunk.score ?? 0) >= 0.45).length;

  const firstRelevant = chunks.findIndex((chunk) => {
    if (!expected.length) return (chunk.score ?? 0) >= 0.45;
    return expected.some((source) => chunk.filename.toLowerCase().includes(source));
  });

  const precisionAtK = chunks.length ? relevantHits / chunks.length : 0;
  const recallAtK = expected.length ? relevantHits / expected.length : precisionAtK;
  const hitRate = relevantHits > 0 ? 1 : 0;
  const mrr = firstRelevant >= 0 ? 1 / (firstRelevant + 1) : 0;
  const averageScore = chunks.length ? chunks.reduce((sum, chunk) => sum + (chunk.score ?? 0), 0) / chunks.length : 0;
  const retrievedContext = chunks.map((chunk) => chunk.text).join(" ").toLowerCase();
  const answerTerms = importantTerms(answer);
  const expectedTerms = importantTerms(expectedAnswer);
  const questionSupportedTerms = answerTerms.length
    ? answerTerms.filter((term) => retrievedContext.includes(term)).length / answerTerms.length
    : hitRate;
  const expectedOverlap = expectedTerms.length
    ? expectedTerms.filter((term) => answer.toLowerCase().includes(term)).length / expectedTerms.length
    : (precisionAtK + hitRate) / 2;
  const answerLength = answer.split(/\s+/).filter(Boolean).length;
  const conciseness = answerLength === 0 ? 0 : answerLength <= 180 ? 1 : Math.max(0.35, 1 - (answerLength - 180) / 420);

  return {
    contextPrecision: round(precisionAtK),
    contextRecall: round(Math.min(recallAtK, 1)),
    retrievalRelevance: round(averageScore),
    faithfulness: round(questionSupportedTerms),
    answerRelevance: round(Math.max(hitRate, questionSupportedTerms)),
    answerCorrectness: round(expectedOverlap),
    conciseness: round(conciseness),
    precisionAtK: round(precisionAtK),
    recallAtK: round(Math.min(recallAtK, 1)),
    hitRate,
    mrr: round(mrr),
  };
}

function round(value: number) {
  return Number(value.toFixed(3));
}

function importantTerms(text: string) {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter((term) => term.length > 4)
        .filter((term) => !["about", "which", "their", "there", "these", "those", "source", "chunk", "information"].includes(term))
    )
  ).slice(0, 40);
}
