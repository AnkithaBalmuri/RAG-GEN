import { Suspense } from "react";
import { ChatPanel } from "@/components/ChatPanel";

export default function ChatPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orbital">Deep Space Console</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Ask Your Space Files</h1>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-300">
          Answers are grounded in the indexed files from your data folder and include source document names.
        </p>
      </div>
      <Suspense fallback={<div className="astro-card rounded-lg p-6 text-sm text-slate-300">Loading AstroRAG chat...</div>}>
        <ChatPanel />
      </Suspense>
    </main>
  );
}
