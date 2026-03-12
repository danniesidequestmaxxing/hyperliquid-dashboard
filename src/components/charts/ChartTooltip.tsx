'use client';

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  formatter?: (value: number, name: string) => string;
  labelFormatter?: (label: string, payload: TooltipPayloadItem[]) => string;
}

export function ChartTooltip({ active, payload, label, formatter, labelFormatter }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const displayLabel = labelFormatter && label ? labelFormatter(label, payload) : label;

  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#111117]/95 backdrop-blur-sm px-3 py-2.5 shadow-xl shadow-black/40">
      <p className="text-[10px] font-mono text-[#8888a0] mb-1.5 uppercase tracking-wider">{displayLabel}</p>
      <div className="space-y-1">
        {payload.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[#8888a0] font-mono">{item.name}</span>
            <span className="ml-auto font-mono font-semibold text-[#e2e2e8]">
              {formatter ? formatter(item.value, item.name) : item.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
