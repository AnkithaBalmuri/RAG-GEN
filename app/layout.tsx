import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { CosmicBackdrop } from "@/components/CosmicBackdrop";
import { Shell } from "@/components/Shell";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AstroRAG - Space & Astronomy Knowledge Assistant",
  description: "Production-ready RAG chatbot for space and astronomy documents."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <CosmicBackdrop />
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
