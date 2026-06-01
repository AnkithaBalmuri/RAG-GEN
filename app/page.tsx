import Image from "next/image";
import Link from "next/link";
import { MessageSquare, Sparkles } from "lucide-react";
import { AstroBot } from "@/components/AstroBot";
import { SpaceDoodles } from "@/components/SpaceDoodles";

const topicTags = [
  "black holes",
  "exoplanets",
  "Milky Way",
  "solar system",
  "dark matter",
  "Big Bang",
  "Chandrayaan",
  "Gaganyaan",
  "Hubble",
  "gravitational waves",
  "pulsars",
  "quasars"
];

const defaultQuestions = [
  "What is a black hole?",
  "How are exoplanets detected?",
  "Explain the Milky Way galaxy.",
  "What is dark matter?",
  "What is Chandrayaan-3?",
  "What are gravitational waves?",
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

export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="astro-card relative min-h-[430px] overflow-hidden rounded-lg p-6 shadow-glow">
        <Image src="/space/galactic-center.png" alt="" fill className="object-cover opacity-35" priority sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/58 to-black/20" />
        <SpaceDoodles />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_150px] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orbital">AstroRAG</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-normal text-white sm:text-5xl">
              Space & Astronomy Chatbot
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Ask questions about space, astronomy, satellites, rockets, ISRO, NASA, cosmology, and missions.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="inline-flex items-center gap-2 rounded-md bg-orbital px-4 py-2 font-semibold text-ink" href="/chat">
                <MessageSquare className="h-4 w-4" />
                Start Chat
              </Link>
              <Link className="inline-flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 font-semibold text-white" href="/evaluation">
                <Sparkles className="h-4 w-4" />
                Evaluation
              </Link>
            </div>
          </div>
          <div className="hidden justify-self-center lg:block">
            <AstroBot />
          </div>
        </div>
      </section>

      <section className="astro-card rounded-lg p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orbital">Try Questions</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Start with these</h2>
          </div>
          <Link href="/chat" className="text-sm font-semibold text-orbital">
            Open chat
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {defaultQuestions.map((question) => (
            <Link
              key={question}
              href={`/chat?q=${encodeURIComponent(question)}`}
              className="rounded-md border border-white/10 bg-white/[0.045] p-4 text-sm font-medium leading-6 text-slate-100 transition hover:border-orbital/50 hover:bg-orbital/10"
            >
              {question}
            </Link>
          ))}
        </div>
      </section>

      <section className="astro-card rounded-lg p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orbital">Topics</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {topicTags.map((tag) => (
            <Link key={tag} href={`/chat?q=${encodeURIComponent(tag)}`} className="cute-chip rounded-full px-3 py-1 text-xs font-semibold text-slate-100">
              {tag}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
