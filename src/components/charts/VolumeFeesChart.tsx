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
} from 'recharts';
import { TimeRangeSelector } from './TimeRangeSelector';
import { ChartTooltip } from './ChartTooltip';
import { formatUSD } from '@/lib/constants';

interface DataPoint {
  date: string;
  perp_volume: number;
  spot_volume: number;
  daily_fees: number;
}

export function VolumeFeesChart({ data }: { data: DataPoint[] }) {
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
          <h3 className="text-xs font-mono font-semibold text-[#e2e2e8] uppercase tracking-wider">Daily Volume & Fees</h3>
          <p className="text-[10px] font-mono text-[#8888a0] mt-0.5">Perp + Spot volume (bars) | Fees (line)</p>
        </div>
        <TimeRangeSelector selected={range} onChange={setRange} />
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
              yAxisId="volume"
              orientation="left"
              tick={{ fontSize: 10, fill: '#8888a0', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatUSD(v)}
              width={60}
            />
            <YAxis
              yAxisId="fees"
              orientation="right"
              tick={{ fontSize: 10, fill: '#8888a0', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatUSD(v)}
              width={60}
            />
            <Tooltip
              content={<ChartTooltip formatter={(v, name) =>
                name.includes('Fee') ? formatUSD(v) : formatUSD(v)
              } />}
            />
            <Bar
              yAxisId="volume"
              dataKey="perp_volume"
              name="Perp Volume"
              fill="#5ae9b5"
              fillOpacity={0.25}
              radius={[2, 2, 0, 0]}
              stackId="volume"
            />
            <Bar
              yAxisId="volume"
              dataKey="spot_volume"
              name="Spot Volume"
              fill="#5ae9b5"
              fillOpacity={0.1}
              radius={[2, 2, 0, 0]}
              stackId="volume"
            />
            <Line
              yAxisId="fees"
              type="monotone"
              dataKey="daily_fees"
              name="Daily Fees"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: '#f59e0b' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
