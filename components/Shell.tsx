"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, MessageSquare, Orbit } from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/evaluation", label: "Evaluation", icon: BarChart3 }
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/25 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-[radial-gradient(circle_at_30%_25%,#fef3c7,#2dd4bf_44%,#1e1b4b)] text-white shadow-glow">
              <Orbit className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-base font-semibold text-white">AstroRAG</span>
              <span className="hidden text-xs text-slate-400 sm:block">Space knowledge assistant</span>
            </span>
          </Link>
          <nav className="flex overflow-x-auto rounded-md border border-white/10 bg-white/[0.03] p-1">
            {nav.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-w-10 items-center gap-2 rounded px-3 py-2 text-sm font-medium transition ${
                    active ? "bg-white text-ink" : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                  title={item.label}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
