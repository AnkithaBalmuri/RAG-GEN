import Groq from "groq-sdk";
import { QUERY_REWRITE_PROMPT, SEARCH_QUERY_PROMPT, SYSTEM_PROMPT, TAGGING_PROMPT, UNAVAILABLE_ANSWER } from "@/lib/constants";
import { keywordTags, uniqueValues } from "@/lib/text";
import type { DocumentChunk } from "@/types";

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return new Groq({ apiKey });
}

async function complete(messages: Groq.Chat.Completions.ChatCompletionMessageParam[], temperature = 0.2) {
  const client = getGroqClient();
  if (!client) return "";

  const completion = await client.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    messages,
    temperature
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
}

export async function generateTags(text: string) {
  const content = await complete([
    { role: "system", content: TAGGING_PROMPT },
    { role: "user", content: text.slice(0, 8000) }
  ]);

  const tags = content ? content.split(",").map((tag) => tag.trim()) : keywordTags(text);
  return uniqueValues(tags).slice(0, 8);
}

export async function generateSearchQuery(question: string) {
  const content = await complete([
    { role: "system", content: SEARCH_QUERY_PROMPT },
    { role: "user", content: question }
  ]);
  return cleanSingleLine(content).slice(0, 160) || question;
}

export async function rewriteQuery(question: string) {
  const content = await complete([
    { role: "system", content: QUERY_REWRITE_PROMPT },
    { role: "user", content: question }
  ]);
  return cleanSingleLine(content).slice(0, 220) || question;
}

export async function answerWithContext(question: string, chunks: DocumentChunk[]) {
  const usableChunks = chunks.filter((chunk) => (chunk.score ?? 0) >= 0.22);
  if (usableChunks.length === 0) {
    return UNAVAILABLE_ANSWER;
  }

  const context = usableChunks
    .map(
      (chunk) =>
        `Source: ${chunk.filename}\nChunk: ${chunk.chunkNumber}\nTags: ${chunk.tags.join(", ")}\nContent:\n${chunk.text}`
    )
    .join("\n\n---\n\n");

  const answer = await complete(
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Question: ${question}

Retrieved context:
${context}

Answering rules:
- Use only the retrieved context above.
- Prefer exact facts and wording from the uploaded files.
- Mention the source filename and chunk number beside important claims.
- If the retrieved context does not contain the answer, say exactly: "${UNAVAILABLE_ANSWER}"`
      }
    ],
    0
  );

  return answer || UNAVAILABLE_ANSWER;
}

function cleanSingleLine(value: string) {
  const quoted = value.match(/["“](.+?)["”]/)?.[1];
  return (quoted ?? value)
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^(search query|rewritten query|query)\s*:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}
