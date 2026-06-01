export function cleanText(input: string) {
  return input
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function chunkText(text: string, chunkSize = 1100, overlap = 180) {
  const cleaned = cleanText(text);
  if (!cleaned) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length);
    const slice = cleaned.slice(start, end);
    const lastBreak = Math.max(slice.lastIndexOf("\n"), slice.lastIndexOf(". "));
    const chunk = end < cleaned.length && lastBreak > chunkSize * 0.55 ? slice.slice(0, lastBreak + 1) : slice;
    chunks.push(chunk.trim());

    if (end >= cleaned.length) break;
    start += Math.max(chunk.length - overlap, 1);
  }

  return chunks.filter(Boolean);
}

export function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function keywordTags(text: string, max = 8) {
  const astronomyTerms = [
    "black hole",
    "astronomy",
    "astrophysics",
    "exoplanets",
    "telescope",
    "NASA",
    "ISRO",
    "Chandrayaan",
    "Gaganyaan",
    "James Webb",
    "Mars",
    "Moon",
    "satellite",
    "galaxy",
    "rocket",
    "orbit",
    "nebula",
    "cosmology"
  ];
  const lower = text.toLowerCase();
  const matched = astronomyTerms.filter((term) => lower.includes(term.toLowerCase()));
  const words = text.match(/\b[a-zA-Z][a-zA-Z-]{4,}\b/g) ?? [];
  const frequent = uniqueValues(words.map((word) => word.toLowerCase())).slice(0, max);
  return uniqueValues([...matched, ...frequent]).slice(0, max);
}

export function extractKeywords(text: string, max = 10) {
  const stopWords = new Set([
    "what",
    "when",
    "where",
    "which",
    "with",
    "from",
    "that",
    "this",
    "there",
    "their",
    "about",
    "explain",
    "does",
    "have",
    "your",
    "into",
    "using",
    "the",
    "and",
    "for",
    "are",
    "how",
    "why"
  ]);

  const words = text
    .toLowerCase()
    .match(/\b[a-z0-9][a-z0-9-]{2,}\b/g) ?? [];

  return uniqueValues(words.filter((word) => !stopWords.has(word))).slice(0, max);
}
