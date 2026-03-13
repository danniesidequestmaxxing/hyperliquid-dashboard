'use client';

import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import { formatNumber, formatUSD } from '@/lib/constants';

interface DataPoint {
  month: string;
  unlocks: number;
  buybacks: number;
  netChange: number;
  cumulativeNetChange: number;
  isProjected: boolean;
}

const ranges = ['6M', '1Y', '2Y', 'All'] as const;

export function SupplyPressureChart({ data }: { data: DataPoint[] }) {
  const [range, setRange] = useState<string>('1Y');

  const filtered = useMemo(() => {
    const monthMap: Record<string, number> = { '6M': 6, '1Y': 12, '2Y': 24 };
    const months = range === 'All' ? data.length : monthMap[range] || 12;
    return data.slice(-months);
  }, [data, range]);

  // Split historical vs projected for the cumulative line
  const historicalData = useMemo(() =>
    filtered.map(d => d.isProjected ? { ...d, cumulativeHistorical: undefined } : { ...d, cumulativeHistorical: d.cumulativeNetChange }),
    [filtered]
  );
  const projectedData = useMemo(() =>
    filtered.map((d, i) => {
      // Include the last historical point for line continuity
      const prev = i > 0 ? filtered[i - 1] : null;
      if (d.isProjected || (prev && filtered[i + 1]?.isProjected)) {
        return { ...d, cumulativeProjected: d.cumulativeNetChange };
      }
      return { ...d, cumulativeProjected: undefined };
    }),
    [filtered]
  );

  // Merge for chart
  const chartData = filtered.map((d, i) => ({
    ...d,
    cumulativeHistorical: historicalData[i].cumulativeHistorical,
    cumulativeProjected: projectedData[i].cumulativeProjected,
  }));

  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#111117] p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-mono font-semibold text-[#e2e2e8] uppercase tracking-wider">Supply Pressure: Unlocks vs Buybacks</h3>
          <p className="text-[10px] font-mono text-[#8888a0] mt-0.5">Monthly employee unlocks (red) vs protocol buybacks (green) | Cumulative net change (line)</p>
        </div>
        <div className="flex items-center gap-0.5 rounded-md bg-[#0a0a0f] p-0.5 border border-[#1e1e2e]">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 text-[11px] font-mono font-medium rounded transition-all ${
                range === r
                  ? 'bg-[#5ae9b5]/10 text-[#5ae9b5] border border-[#5ae9b5]/20'
                  : 'text-[#8888a0] hover:text-[#e2e2e8] border border-transparent'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />

            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: '#8888a0', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={{ stroke: '#1e1e2e' }}
              tickFormatter={(v: string) => {
                const [, m] = v.split('-');
                const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return monthNames[parseInt(m)] || v;
              }}
            />
            <YAxis
              yAxisId="tokens"
              orientation="left"
              tick={{ fontSize: 10, fill: '#8888a0', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatNumber(v)}
              width={54}
            />
            <YAxis
              yAxisId="cumulative"
              orientation="right"
              tick={{ fontSize: 10, fill: '#8888a0', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatNumber(v)}
              width={54}
            />

            <Tooltip
              content={<ChartTooltip formatter={(v, name) => {
                if (typeof name === 'string' && name.includes('Cumulative')) return formatNumber(v);
                return `${formatNumber(v)} HYPE`;
              }} />}
            />

            <ReferenceLine yAxisId="cumulative" y={0} stroke="#8888a0" strokeDasharray="4 4" strokeWidth={1} strokeOpacity={0.5} />

            <Bar yAxisId="tokens" dataKey="unlocks" name="Monthly Unlocks" fill="#ef4444" fillOpacity={0.3} radius={[2, 2, 0, 0]} />
            <Bar yAxisId="tokens" dataKey="buybacks" name="Monthly Buybacks" fill="#22c55e" fillOpacity={0.3} radius={[2, 2, 0, 0]} />

            <Line
              yAxisId="cumulative"
              type="monotone"
              dataKey="cumulativeHistorical"
              name="Cumulative Net (Historical)"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              activeDot={{ r: 3, fill: '#f59e0b' }}
            />
            <Line
              yAxisId="cumulative"
              type="monotone"
              dataKey="cumulativeProjected"
              name="Cumulative Net (Projected)"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              connectNulls={false}
              activeDot={{ r: 3, fill: '#f59e0b' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-[10px] font-mono text-[#8888a0]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm bg-[#ef4444]/30" />
          <span>Unlocks</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm bg-[#22c55e]/30" />
          <span>Buybacks</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-[2px] bg-[#f59e0b]" />
          <span>Cumulative Net</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-[2px] bg-[#f59e0b]" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #f59e0b 0, #f59e0b 3px, transparent 3px, transparent 6px)' }} />
          <span>Projected</span>
        </div>
      </div>
    </div>
  );
}
