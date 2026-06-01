import { EvaluationDashboard } from "@/components/EvaluationDashboard";

export default function EvaluationPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orbital">Observatory Metrics</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Evaluation Dashboard</h1>
      </div>
      <EvaluationDashboard />
    </main>
  );
}
