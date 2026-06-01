import { Orbit, Rocket, Satellite, Sparkles } from "lucide-react";

const doodles = [
  { icon: Rocket, label: "Launch-ready ingestion", className: "left-6 top-6 rotate-[-12deg] text-solar" },
  { icon: Satellite, label: "Orbital retrieval", className: "right-8 top-10 rotate-[14deg] text-orbital" },
  { icon: Orbit, label: "Context orbit", className: "bottom-8 left-10 rotate-[8deg] text-nebula" },
  { icon: Sparkles, label: "Signal stars", className: "bottom-8 right-10 rotate-[-10deg] text-white" }
];

export function SpaceDoodles() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      {doodles.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={`absolute grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/10 backdrop-blur ${item.className}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        );
      })}
    </div>
  );
}
