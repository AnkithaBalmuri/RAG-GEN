import { DEFAULT_TOP_K } from "@/lib/constants";
import { analyzeQueryType, buildCitations, evaluateRetrievalQuality, isMissingContextAnswer, writeAdaptiveLog } from "@/lib/adaptive-rag";
import { answerWithContext, generateSearchQuery, generateTags, rewriteQuery } from "@/lib/groq";
import { searchChunkRecords } from "@/lib/pinecone";
import { extractKeywords, uniqueValues } from "@/lib/text";

export async function searchKnowledgeBase(question: string, topK = DEFAULT_TOP_K) {
  const keywords = extractKeywords(question);
  const [searchQuery, tags] = await Promise.all([
    generateSearchQuery(question),
    generateTags(question)
  ]);

  const [questionMatches, queryMatches, tagMatches] = await Promise.all([
    searchChunkRecords(question, topK * 2),
    searchChunkRecords(searchQuery, topK * 2),
    tags.length ? searchChunkRecords(searchQuery, topK * 2, tags) : Promise.resolve([])
  ]);

  const merged = [...questionMatches, ...queryMatches, ...tagMatches]
    .filter((chunk, index, array) => array.findIndex((item) => item.id === chunk.id) === index)
    .map((chunk) => {
      const haystack = `${chunk.filename} ${chunk.tags.join(" ")} ${chunk.text}`.toLowerCase();
      const keywordHits = keywords.filter((keyword) => haystack.includes(keyword)).length;
      const tagHits = tags.filter((tag) => chunk.tags.some((chunkTag) => chunkTag.toLowerCase() === tag.toLowerCase())).length;
      return {
        ...chunk,
        score: (chunk.score ?? 0) + keywordHits * 0.04 + tagHits * 0.05
      };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, topK);

  return {
    searchQuery,
    tags: uniqueValues([...tags, ...keywords, ...merged.flatMap((chunk) => chunk.tags)]),
    chunks: merged
  };
}

export async function runRag(question: string, topK = DEFAULT_TOP_K) {
  const queryType = analyzeQueryType(question);
  console.log(`[AdaptiveRAG] query type: ${queryType}`);

  let retrieval = await searchKnowledgeBase(question, topK);
  let quality = evaluateRetrievalQuality(retrieval.chunks);
  let rewrittenQuery: string | undefined;

  if (quality.lowConfidence) {
    rewrittenQuery = await rewriteQuery(question);
    if (rewrittenQuery && rewrittenQuery.toLowerCase() !== question.toLowerCase()) {
      const retryRetrieval = await searchKnowledgeBase(rewrittenQuery, topK);
      const retryQuality = evaluateRetrievalQuality(retryRetrieval.chunks);
      if (retryQuality.confidenceScore >= quality.confidenceScore) {
        retrieval = retryRetrieval;
        quality = retryQuality;
      }
    }
  }

  const citations = buildCitations(retrieval.chunks);
  const answer = await answerWithContext(question, retrieval.chunks);
  const missingContext = isMissingContextAnswer(answer);

  await writeAdaptiveLog({
    originalQuery: question,
    queryType,
    rewrittenQuery,
    retrievedDocuments: citations,
    similarityScores: citations.map((citation) => citation.score),
    finalAnswer: answer,
    confidence: quality,
    missingContext
  });

  return { ...retrieval, answer, queryType, rewrittenQuery, confidence: quality, citations, missingContext };
}
