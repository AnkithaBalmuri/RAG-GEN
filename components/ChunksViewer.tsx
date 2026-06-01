"use client";

import type { DocumentChunk } from "@/types";

export function ChunksViewer({ chunks }: { chunks: DocumentChunk[] }) {
  return (
    <div className="grid gap-3">
      {chunks.map((chunk) => (
        <details key={chunk.id} className="rounded-md border border-white/10 bg-white/[0.04] p-3 shadow-[0_10px_35px_rgba(45,212,191,0.08)]">
          <summary className="cursor-pointer text-sm font-medium text-white">
            {chunk.filename} · chunk {chunk.chunkNumber} · {Math.round((chunk.score ?? 0) * 100)}%
          </summary>
          <p className="mt-3 text-sm leading-6 text-slate-300">{chunk.text.slice(0, 650)}</p>
        </details>
      ))}
    </div>
  );
}
