'use client';

import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { TimeRangeSelector } from './TimeRangeSelector';
import { ChartTooltip } from './ChartTooltip';
import { SimulatedBadge } from '@/components/ui/simulated-badge';
import { COLORS, formatUSD } from '@/lib/constants';

interface DataPoint {
  date: string;
  open_interest: number;
  liquidation_volume: number;
  adl_events: number;
}

export function OILiquidationsChart({ data }: { data: DataPoint[] }) {
  const [range, setRange] = useState('90D');

  const filtered = useMemo(() => {
    const dayMap: Record<string, number> = { '30D': 30, '90D': 90, '180D': 180, '1Y': 365 };
    const days = range === 'All' ? data.length : dayMap[range] || 90;
    return data.slice(-days);
  }, [data, range]);

  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#111117] p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-mono font-semibold text-[#e2e2e8] uppercase tracking-wider">Open Interest & Liquidations<SimulatedBadge /></h3>
          <p className="text-[10px] font-mono text-[#8888a0] mt-0.5">Total OI (area) vs daily liquidation volume (bars)</p>
        </div>
        <TimeRangeSelector selected={range} onChange={setRange} />
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: COLORS.hyperliquid, opacity: 0.5 }} />
          <span className="text-[10px] font-mono text-[#8888a0]">Open Interest</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: COLORS.negative, opacity: 0.7 }} />
          <span className="text-[10px] font-mono text-[#8888a0]">Liquidations</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.warning }} />
          <span className="text-[10px] font-mono text-[#8888a0]">ADL Event</span>
        </div>
      </div>

      <div className="h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={filtered} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#8888a0', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={{ stroke: '#1e1e2e' }}
              tickFormatter={(v) => {
                const d = new Date(v);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
              interval={Math.floor(filtered.length / 8)}
            />
            <YAxis
              yAxisId="oi"
              tick={{ fontSize: 10, fill: '#8888a0', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatUSD(v)}
              width={52}
            />
            <YAxis
              yAxisId="liq"
              orientation="right"
              tick={{ fontSize: 10, fill: '#8888a0', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatUSD(v)}
              width={52}
            />
            <Tooltip content={<ChartTooltip formatter={(v) => formatUSD(v)} />} />

            <Area
              yAxisId="oi"
              type="monotone"
              dataKey="open_interest"
              fill={COLORS.hyperliquid}
              fillOpacity={0.12}
              stroke={COLORS.hyperliquid}
              strokeWidth={1.5}
              name="Open Interest"
            />
            <Bar
              yAxisId="liq"
              dataKey="liquidation_volume"
              fill={COLORS.negative}
              fillOpacity={0.6}
              radius={[2, 2, 0, 0]}
              name="Liquidations"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
