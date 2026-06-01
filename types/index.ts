export type UploadedDocument = {
  filename: string;
  source: string;
  chunks: number;
  tags: string[];
  uploadedAt: string;
};

export type DocumentChunk = {
  id: string;
  text: string;
  filename: string;
  source: string;
  chunkNumber: number;
  uploadDate: string;
  tags: string[];
  score?: number;
};

export type QueryType = "simple_factual" | "comparative" | "multi_hop" | "broad_exploratory";

export type ConfidenceLabel = "High" | "Medium" | "Low";

export type RetrievalQuality = {
  averageSimilarity: number;
  confidenceScore: number;
  confidenceLabel: ConfidenceLabel;
  lowConfidence: boolean;
};

export type CitationReference = {
  filename: string;
  chunkNumber: number;
  chunkId: string;
  score: number;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  chunks?: DocumentChunk[];
  tags?: string[];
  searchQuery?: string;
  rewrittenQuery?: string;
  queryType?: QueryType;
  confidence?: RetrievalQuality;
  citations?: CitationReference[];
};

export type EvaluationMetrics = {
  contextPrecision: number;
  contextRecall: number;
  retrievalRelevance: number;
  faithfulness: number;
  answerRelevance: number;
  answerCorrectness: number;
  conciseness: number;
  precisionAtK?: number;
  recallAtK?: number;
  hitRate?: number;
  mrr?: number;
};

export type AdaptiveLogEntry = {
  id: string;
  createdAt: string;
  originalQuery: string;
  queryType: QueryType;
  rewrittenQuery?: string;
  retrievedDocuments: CitationReference[];
  similarityScores: number[];
  finalAnswer: string;
  confidence: RetrievalQuality;
  missingContext: boolean;
};
