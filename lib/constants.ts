export const PINECONE_NAMESPACE = "space-astronomy";
export const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = Number(process.env.OPENAI_EMBEDDING_DIMENSIONS || 512);
export const DEFAULT_TOP_K = 6;
export const RETRIEVAL_CONFIDENCE_THRESHOLD = 40;
export const UNAVAILABLE_ANSWER = "I could not find this information in the provided documents.";

export const SYSTEM_PROMPT = `You are AstroRAG, a Space and Astronomy Knowledge Assistant.

Use only the retrieved context to answer questions.

Instructions:
- Use only the retrieved context provided with the user question.
- Do not use outside knowledge, assumptions, or guesses.
- Cite source document names and chunk numbers beside important claims.
- Combine retrieved chunks only when they directly support the answer.
- If the retrieved context does not contain the answer, say exactly: "${UNAVAILABLE_ANSWER}"
- Keep answers factual, concise, and educational.`;

export const TAGGING_PROMPT =
  "You are a content tagging expert. Analyze Question and Answer content and generate 4-8 descriptive tags based on topic, technical concepts, astronomy terms, missions, planets, telescopes, space science concepts, and keywords. Return only comma-separated tags.";

export const SEARCH_QUERY_PROMPT =
  "Generate one clean retrieval search query using 1-8 astronomy or space technology keywords. Return only the query text, with no quotes, labels, or explanation.";

export const QUERY_REWRITE_PROMPT =
  "Rewrite the user's question into one retrieval-friendly Space and Astronomy knowledge-base query. Expand acronyms where obvious, preserve the user's intent, and return only the rewritten query.";


