import { pipeline } from "@xenova/transformers";
import { EMBEDDING_MODEL } from "@/lib/constants";

type FeatureExtractor = Awaited<ReturnType<typeof pipeline>>;

let extractorPromise: Promise<FeatureExtractor> | null = null;

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", EMBEDDING_MODEL);
  }
  return extractorPromise;
}

export async function embedText(text: string) {
  const extractor = await getExtractor();
  const result = (await extractor(text, { pooling: "mean", normalize: true } as never)) as { data: Float32Array };
  return Array.from(result.data as Float32Array);
}

export async function embedMany(texts: string[]) {
  const vectors: number[][] = [];
  for (const text of texts) {
    vectors.push(await embedText(text));
  }
  return vectors;
}
