"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { Database, Loader2, Play, Telescope } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChunksViewer } from "@/components/ChunksViewer";
import type { DocumentChunk, EvaluationMetrics } from "@/types";

type EvaluationResult = {
  metrics: EvaluationMetrics;
  chunks: DocumentChunk[];
  answer: string;
  sources: string[];
  confidence?: { confidenceScore: number; confidenceLabel: string };
};

type EvaluationReport = {
  createdAt: string;
  count: number;
  averages: EvaluationMetrics;
  results: Array<EvaluationResult & { id: string; question: string; expectedAnswer: string }>;
};

export function EvaluationDashboard() {
  const [question, setQuestion] = useState("What is a black hole and how is it formed?");
  const [expectedSources, setExpectedSources] = useState("");
  const [expectedAnswer, setExpectedAnswer] = useState("");
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [datasetLoading, setDatasetLoading] = useState(false);

  useEffect(() => {
    fetch("/api/evaluate")
      .then((response) => response.json())
      .then((data) => setReport(data.report ?? null))
      .catch(() => setReport(null));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          expectedSources: expectedSources.split(",").map((source) => source.trim()).filter(Boolean),
          expectedAnswer
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Evaluation failed");
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  async function runDataset() {
    setDatasetLoading(true);
    try {
      const response = await fetch("/api/evaluate?run=1");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Dataset evaluation failed");
      setReport(data.report);
    } finally {
      setDatasetLoading(false);
    }
  }

  const chartData = result
    ? Object.entries(result.metrics).map(([key, value]) => ({
        metric: key.replace(/([A-Z])/g, " $1"),
        value
      }))
    : [];

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <form onSubmit={submit} className="astro-card rounded-lg p-5">
        <div className="relative mb-5 h-32 overflow-hidden rounded-lg border border-white/10">
          <Image src="/space/galactic-center.png" alt="" fill className="object-cover" sizes="380px" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/90 to-ink/20" />
          <div className="absolute inset-0 flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-orbital backdrop-blur">
              <Telescope className="h-5 w-5" />
            </span>
            <p className="max-w-52 text-sm font-semibold leading-5 text-white">Tune retrieval quality like an observatory instrument.</p>
          </div>
        </div>
        <label className="text-sm font-medium text-slate-200" htmlFor="question">
          Evaluation question
        </label>
        <textarea
          id="question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          className="mt-2 h-32 w-full resize-none rounded-md border border-white/10 bg-ink p-3 text-sm text-white outline-none ring-orbital/50 focus:ring-2"
        />
        <label className="mt-4 block text-sm font-medium text-slate-200" htmlFor="sources">
          Expected sources
        </label>
        <input
          id="sources"
          value={expectedSources}
          onChange={(event) => setExpectedSources(event.target.value)}
          placeholder="black-holes.pdf, nasa-guide.pdf"
          className="mt-2 w-full rounded-md border border-white/10 bg-ink p-3 text-sm text-white outline-none ring-orbital/50 focus:ring-2"
        />
        <label className="mt-4 block text-sm font-medium text-slate-200" htmlFor="expectedAnswer">
          Expected answer
        </label>
        <textarea
          id="expectedAnswer"
          value={expectedAnswer}
          onChange={(event) => setExpectedAnswer(event.target.value)}
          placeholder="Optional reference answer for answer correctness"
          className="mt-2 h-24 w-full resize-none rounded-md border border-white/10 bg-ink p-3 text-sm text-white outline-none ring-orbital/50 focus:ring-2"
        />
        <button
          disabled={loading}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-orbital px-4 py-3 font-semibold text-ink disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Run Evaluation
        </button>
        <button
          type="button"
          onClick={runDataset}
          disabled={datasetLoading}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          {datasetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          Run 20 Question Dataset
        </button>
      </form>

      <section className="astro-card rounded-lg p-5">
        {!result && !report ? (
          <p className="text-sm text-slate-300">Run an evaluation to see Adaptive RAG retrieval and answer quality metrics.</p>
        ) : null}
        {report ? (
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-orbital">Dataset Report</p>
                <h2 className="mt-1 text-xl font-semibold text-white">{report.count} evaluation questions</h2>
              </div>
              <p className="text-xs text-slate-400">Saved to evaluation/results.json</p>
            </div>
            <div className="grid metric-grid gap-3">
              {Object.entries(report.averages).map(([key, value]) => (
                <div key={key} className="rounded-md border border-white/10 bg-panel/80 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{key.replace(/([A-Z])/g, " $1")}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {result ? (
          <div className="space-y-6">
            <div className="grid metric-grid gap-3">
              {Object.entries(result.metrics).map(([key, value]) => (
                <div key={key} className="rounded-md border border-white/10 bg-panel/80 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{key.replace(/([A-Z])/g, " $1")}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
            <div className="h-72 rounded-md border border-white/10 bg-ink p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="metric" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 1]} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ background: "#101828", border: "1px solid rgba(255,255,255,0.12)" }} />
                  <Bar dataKey="value" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h2 className="mb-3 text-lg font-semibold text-white">Retrieved Chunks Table</h2>
              <ChunksViewer chunks={result.chunks} />
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
