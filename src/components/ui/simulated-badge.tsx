'use client';

export function SimulatedBadge() {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-semibold uppercase tracking-wider text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/20 ml-2 cursor-help"
      title="This chart uses simulated data. Real historical data is not yet available from public APIs."
    >
      Simulated
    </span>
  );
}
