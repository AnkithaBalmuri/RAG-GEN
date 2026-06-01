export function CosmicBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[url('/space/galactic-center.png')] bg-cover bg-center opacity-25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(13,18,38,0.1),#050815_76%)]" />
      <div className="stars-layer stars-layer-a" />
      <div className="stars-layer stars-layer-b" />
      <div className="stars-layer stars-layer-c" />
      <div className="cosmic-moon left-[7%] top-[16%] h-28 w-28 opacity-70" />
      <div className="cosmic-planet right-[8%] top-[18%] h-36 w-36 opacity-80" />
      <div className="solar-system left-1/2 top-[54%]">
        <span className="solar-sun" />
        <span className="solar-orbit solar-orbit-1"><i /></span>
        <span className="solar-orbit solar-orbit-2"><i /></span>
        <span className="solar-orbit solar-orbit-3"><i /></span>
      </div>
      <div className="cute-comet left-[9%] bottom-[14%]" />
      <div className="shooting-star left-[18%] top-[24%]" />
      <div className="shooting-star right-[12%] top-[62%] delay-700" />
    </div>
  );
}
