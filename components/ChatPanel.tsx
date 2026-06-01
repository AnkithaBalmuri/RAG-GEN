"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { AstroBot } from "@/components/AstroBot";
import { Clock, Loader2, Orbit, Search, Send, Trash2 } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { ChatMessage } from "@/types";

const defaultQuestions = [
  "What is a black hole?",
  "How are exoplanets detected?",
  "What is the Milky Way galaxy?",
  "Explain dark matter.",
  "What are gravitational waves?",
  "What is Chandrayaan-3?",
  "What is the Big Bang theory?",
  "How does gravitational lensing work?",
  "What are pulsars?",
  "What are quasars?",
  "What is infrared astronomy used for?",
  "What is radio astronomy?",
  "What is the International Space Station?",
  "What is PSLV used for?",
  "What is Gaganyaan?",
  "What are GPS satellites used for?",
  "How are stars formed?",
  "What is the solar system?",
  "What is Mercury like?",
  "What is Venus like?"
];

export function ChatPanel() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useLocalStorage<ChatMessage[]>("astrorag-chat-history", []);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initialQuestion = searchParams.get("q");
    if (initialQuestion) setQuestion(initialQuestion);
  }, [searchParams]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!question.trim()) return;
    const nextQuestion = question.trim();
    setQuestion("");
    setLoading(true);
    setMessages((current) => [...current, { role: "user", content: nextQuestion }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: nextQuestion, topK: 6 })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Chat failed");
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
          chunks: data.chunks,
          tags: data.tags,
          searchQuery: data.searchQuery,
          rewrittenQuery: data.rewrittenQuery,
          queryType: data.queryType,
          confidence: data.confidence,
          citations: data.citations
        }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "The request failed."
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  const recentQuestions = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .slice(-6)
    .reverse();

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <section className="astro-card flex min-h-[640px] flex-col overflow-hidden rounded-lg">
        <div className="relative h-36 border-b border-white/10">
          <Image src="/space/black-hole-viz.png" alt="" fill className="object-cover" sizes="100vw" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-between gap-3 px-5">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/10 backdrop-blur">
                <Orbit className="h-6 w-6 text-orbital" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orbital">AstroRAG Online</p>
                <p className="mt-1 text-xl font-semibold text-white">Ask your space documents</p>
              </div>
            </div>
            <div className="hidden sm:block">
              <AstroBot compact />
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="grid h-full place-items-center text-center">
              <div>
                <Search className="mx-auto h-10 w-10 text-orbital" />
                <p className="mt-3 text-lg font-semibold text-white">Ask from your indexed astronomy documents.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {defaultQuestions.slice(0, 4).map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setQuestion(prompt)}
                      className="cute-chip rounded-full px-3 py-1 text-xs font-semibold text-slate-100"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <article
              key={`${message.role}-${index}`}
              className={`rounded-lg border p-4 ${
                message.role === "user"
                  ? "user-bubble ml-auto max-w-2xl border-orbital/30"
                  : "assistant-bubble mr-auto max-w-3xl border-white/10"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-100">{message.content}</p>

              {message.role === "assistant" && message.confidence ? (
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full border border-orbital/30 bg-orbital/10 px-3 py-1 text-orbital">
                    Accuracy: {message.confidence.confidenceScore}%
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-slate-200">
                    Chunks used: {message.chunks?.length ?? 0}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-slate-200">
                    {message.confidence.confidenceLabel}
                  </span>
                </div>
              ) : null}

              {message.sources?.length ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orbital">Sources</p>
                  <ul className="mt-2 list-inside list-disc text-sm text-slate-300">
                    {message.sources.map((source) => (
                      <li key={source}>{source}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {message.rewrittenQuery ? (
                <p className="mt-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300">
                  Better search used: <span className="font-semibold text-orbital">{message.rewrittenQuery}</span>
                </p>
              ) : null}

              {message.tags?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.tags.slice(0, 8).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setQuestion(tag)}
                      className="cute-chip rounded-full px-2 py-1 text-xs text-slate-200"
                      title={`Search ${tag}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>

        <form onSubmit={submit} className="border-t border-white/10 p-4">
          <div className="flex gap-3">
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask about black holes, Chandrayaan, stars, rockets..."
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/[0.055] px-4 py-3 text-sm text-white outline-none ring-orbital/50 placeholder:text-slate-400 focus:ring-2"
            />
            <button
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md bg-orbital px-4 py-3 font-semibold text-ink disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </button>
          </div>
        </form>
      </section>

      <aside className="astro-card rounded-lg p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">History</h2>
          {messages.length ? (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
              title="Clear chat history"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="mt-4 grid gap-2">
          {recentQuestions.length ? (
            recentQuestions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setQuestion(item)}
                className="rounded-md border border-white/10 bg-white/[0.04] p-3 text-left text-sm leading-5 text-slate-200 hover:border-orbital/40 hover:bg-orbital/10"
              >
                <Clock className="mr-2 inline h-4 w-4 text-orbital" />
                {item}
              </button>
            ))
          ) : (
            <p className="rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm text-slate-300">Your recent questions will appear here.</p>
          )}
        </div>

        <h2 className="mt-6 text-lg font-semibold text-white">Try Questions</h2>
        <div className="mt-4 grid gap-2">
          {defaultQuestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setQuestion(item)}
              className="cute-chip rounded-full px-3 py-2 text-left text-xs font-semibold text-slate-100"
            >
              {item}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
