import { promises as fs } from "fs";
import path from "path";
import type { EvaluationMetrics } from "@/types";

export type EvaluationQuestion = {
  id: string;
  question: string;
  expectedAnswer: string;
  expectedSources?: string[];
};

export type EvaluationReportItem = EvaluationQuestion & {
  answer: string;
  sources: string[];
  metrics: EvaluationMetrics;
  confidenceScore: number;
  confidenceLabel: string;
};

export type EvaluationReport = {
  createdAt: string;
  count: number;
  averages: EvaluationMetrics;
  results: EvaluationReportItem[];
};

const EVALUATION_DIR = path.join(process.cwd(), "evaluation");
const QUESTIONS_PATH = path.join(EVALUATION_DIR, "questions.json");
const REPORT_PATH = path.join(EVALUATION_DIR, "results.json");

export async function readEvaluationQuestions(): Promise<EvaluationQuestion[]> {
  const content = await fs.readFile(QUESTIONS_PATH, "utf8");
  return JSON.parse(content) as EvaluationQuestion[];
}

export async function writeEvaluationReport(report: EvaluationReport) {
  await fs.mkdir(EVALUATION_DIR, { recursive: true });
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export async function readEvaluationReport(): Promise<EvaluationReport | null> {
  try {
    const content = await fs.readFile(REPORT_PATH, "utf8");
    return JSON.parse(content) as EvaluationReport;
  } catch {
    return null;
  }
}

export function averageMetrics(items: EvaluationReportItem[]): EvaluationMetrics {
  const keys: (keyof EvaluationMetrics)[] = [
    "contextPrecision",
    "contextRecall",
    "retrievalRelevance",
    "faithfulness",
    "answerRelevance",
    "answerCorrectness",
    "conciseness"
  ];

  return Object.fromEntries(
    keys.map((key) => [
      key,
      round(items.length ? items.reduce((sum, item) => sum + Number(item.metrics[key] ?? 0), 0) / items.length : 0)
    ])
  ) as EvaluationMetrics;
}

function round(value: number) {
  return Number(value.toFixed(3));
}
