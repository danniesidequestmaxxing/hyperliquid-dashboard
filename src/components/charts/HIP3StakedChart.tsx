'use client';

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { TimeRangeSelector } from './TimeRangeSelector';
import { ChartTooltip } from './ChartTooltip';
import { COLORS, formatNumber } from '@/lib/constants';

interface DataPoint {
  date: string;
  operators: number;
  staked_hype: number;
}

export function HIP3StakedChart({ data }: { data: DataPoint[] }) {
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
          <h3 className="text-xs font-mono font-semibold text-[#e2e2e8] uppercase tracking-wider">HYPE Staked by Operators</h3>
          <p className="text-[10px] font-mono text-[#8888a0] mt-0.5">500K HYPE staked per HIP-3 operator</p>
        </div>
        <TimeRangeSelector selected={range} onChange={setRange} />
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filtered} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
              tick={{ fontSize: 10, fill: '#8888a0', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatNumber(v)}
              width={48}
            />
            <Tooltip
              content={<ChartTooltip formatter={(v) => `${formatNumber(v)} HYPE`} />}
            />

            {/* Milestone reference lines */}
            <ReferenceLine
              y={5_000_000}
              stroke={COLORS.warning}
              strokeDasharray="6 4"
              strokeWidth={1}
              label={{ value: '10 ops (5M)', position: 'right', fill: COLORS.warning, fontSize: 9, fontFamily: 'var(--font-geist-mono)' }}
            />
            <ReferenceLine
              y={10_000_000}
              stroke={COLORS.positive}
              strokeDasharray="6 4"
              strokeWidth={1}
              label={{ value: '20 ops (10M)', position: 'right', fill: COLORS.positive, fontSize: 9, fontFamily: 'var(--font-geist-mono)' }}
            />

            <Bar
              dataKey="staked_hype"
              fill={COLORS.hyperliquid}
              fillOpacity={0.7}
              radius={[2, 2, 0, 0]}
              name="Staked HYPE"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
