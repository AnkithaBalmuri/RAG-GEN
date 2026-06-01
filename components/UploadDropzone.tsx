"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, Loader2, MessageCircle, Moon, Send, UploadCloud, X, XCircle } from "lucide-react";
import { AstroBot } from "@/components/AstroBot";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { UploadedDocument } from "@/types";

const MAX_BATCH_FILES = 5;

type UploadState = {
  status: "idle" | "uploading" | "success" | "error";
  message: string;
  progress: number;
};

export function UploadDropzone() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [uploaded, setUploaded] = useLocalStorage<UploadedDocument[]>("astrorag-uploaded-documents", []);
  const [quickQuestion, setQuickQuestion] = useState("");
  const [state, setState] = useState<UploadState>({ status: "idle", message: "", progress: 0 });

  const totalSize = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024),
    [files]
  );

  function addFiles(nextFiles: File[]) {
    const supportedFiles = nextFiles.filter((file) => /\.(pdf|txt|docx)$/i.test(file.name));
    const merged = [...files, ...supportedFiles].filter(
      (file, index, array) => array.findIndex((item) => item.name === file.name && item.size === file.size) === index
    );
    setFiles(merged.slice(0, MAX_BATCH_FILES));

    if (merged.length > MAX_BATCH_FILES) {
      setState({
        status: "error",
        message: `You can upload ${MAX_BATCH_FILES} files at a time. Extra files were left out of this batch.`,
        progress: 0
      });
    } else if (supportedFiles.length !== nextFiles.length) {
      setState({ status: "error", message: "Only PDF, TXT, and DOCX files are supported.", progress: 0 });
    } else {
      setState({ status: "idle", message: "", progress: 0 });
    }
  }

  function removeFile(name: string, size: number) {
    setFiles((current) => current.filter((file) => !(file.name === name && file.size === size)));
  }

  async function submit() {
    if (!files.length) return;
    setState({ status: "uploading", message: `Processing ${files.length} files and embeddings`, progress: 15 });
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const progressTimer = window.setInterval(() => {
      setState((current) => ({ ...current, progress: Math.min(current.progress + 8, 88) }));
    }, 900);

    try {
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");
      setUploaded((current) => {
        const merged = [...data.documents, ...current];
        return merged.filter(
          (document, index, array) => array.findIndex((item) => item.filename === document.filename) === index
        );
      });
      setState({ status: "success", message: `Indexed ${data.totalChunks} chunks from ${data.documents.length} files`, progress: 100 });
      setFiles([]);
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Upload failed",
        progress: 0
      });
    } finally {
      window.clearInterval(progressTimer);
    }
  }

  function askUploadedFiles() {
    const query = quickQuestion.trim();
    if (!query) return;
    router.push(`/chat?q=${encodeURIComponent(query)}`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="astro-card rounded-lg p-5">
        <label
          className="relative flex min-h-80 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-orbital/60 bg-ink/40 p-6 text-center transition hover:bg-orbital/5"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            addFiles(Array.from(event.dataTransfer.files ?? []));
          }}
        >
          <Image src="/space/black-hole-disk.png" alt="" fill className="object-cover opacity-28" sizes="50vw" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/55" />
          <span className="relative grid h-16 w-16 place-items-center rounded-full border border-white/15 bg-white/10 backdrop-blur">
            <UploadCloud className="h-8 w-8 text-orbital" />
          </span>
          <span className="relative mt-4 text-lg font-semibold text-white">Choose up to 5 documents</span>
          <span className="relative mt-2 max-w-md text-sm leading-6 text-slate-300">
            PDF, TXT, and DOCX files are accepted. Upload 5 files per batch, then repeat to build a 50+ document knowledge base.
          </span>
          <input
            className="sr-only"
            type="file"
            multiple
            accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => {
              addFiles(Array.from(event.target.files ?? []));
              event.currentTarget.value = "";
            }}
          />
        </label>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-300">
            {files.length}/{MAX_BATCH_FILES} selected - {totalSize.toFixed(2)} MB
          </p>
          <button
            onClick={submit}
            disabled={!files.length || state.status === "uploading"}
            className="inline-flex items-center gap-2 rounded-md bg-orbital px-4 py-2 font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state.status === "uploading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            Ingest {files.length || ""} {files.length === 1 ? "file" : "files"}
          </button>
        </div>

        {state.status !== "idle" && (
          <div className="mt-5 rounded-md border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl">
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-200">
              {state.status === "success" && <CheckCircle2 className="h-4 w-4 text-orbital" />}
              {state.status === "error" && <XCircle className="h-4 w-4 text-red-400" />}
              {state.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-solar" />}
              {state.message}
            </div>
            <div className="h-2 overflow-hidden rounded bg-white/10">
              <div className="h-full rounded bg-orbital transition-all" style={{ width: `${state.progress}%` }} />
            </div>
          </div>
        )}
        <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <AstroBot compact />
            <div>
              <p className="text-sm font-semibold text-white">Chat with uploaded files</p>
              <p className="text-xs leading-5 text-slate-300">Ask by keyword, tag, filename, or full question.</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <input
              value={quickQuestion}
              onChange={(event) => setQuickQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") askUploadedFiles();
              }}
              placeholder="Ask: Chandrayaan mission findings"
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/[0.055] px-3 py-2 text-sm text-white outline-none ring-orbital/50 placeholder:text-slate-400 focus:ring-2"
            />
            <button
              onClick={askUploadedFiles}
              disabled={!quickQuestion.trim()}
              className="grid h-10 w-10 place-items-center rounded-md bg-orbital text-ink disabled:cursor-not-allowed disabled:opacity-50"
              title="Ask in chat"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <Link href="/chat" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-orbital">
            <MessageCircle className="h-4 w-4" />
            Open full chat
          </Link>
        </div>
      </section>

      <section className="astro-card rounded-lg p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-solar">
            <Moon className="h-5 w-5" />
          </span>
          <h2 className="text-lg font-semibold text-white">Current Batch and Uploaded Files</h2>
        </div>
        <div className="mt-4 grid gap-3">
          {uploaded.length === 0 && files.length === 0 && (
            <p className="rounded-md border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              Choose up to 5 files at once. Uploaded documents will appear here after ingestion.
            </p>
          )}
          {files.map((file) => (
            <div key={`${file.name}-${file.size}`} className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3">
              <FileText className="h-5 w-5 text-solar" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <button
                className="ml-auto grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                onClick={() => removeFile(file.name, file.size)}
                title={`Remove ${file.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {uploaded.map((document) => (
            <div key={document.filename} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium text-white">{document.filename}</p>
                <span className="rounded bg-orbital/15 px-2 py-1 text-xs text-orbital">{document.chunks} chunks</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {document.tags.map((tag) => (
                  <span key={tag} className="cute-chip rounded-full px-2 py-1 text-xs text-slate-200">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
