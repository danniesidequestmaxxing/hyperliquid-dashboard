'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { TimeRangeSelector } from './TimeRangeSelector';
import { ChartTooltip } from './ChartTooltip';
import { BENCHMARKS, formatBps } from '@/lib/constants';

interface DataPoint {
  date: string;
  take_rate_bps: number;
  take_rate_7d_ma: number;
}

export function TakeRateChart({ data }: { data: DataPoint[] }) {
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
          <h3 className="text-xs font-mono font-semibold text-[#e2e2e8] uppercase tracking-wider">Realized Take Rate</h3>
          <p className="text-[10px] font-mono text-[#8888a0] mt-0.5">(Fees / Volume) * 10,000 bps</p>
        </div>
        <TimeRangeSelector selected={range} onChange={setRange} />
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filtered} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
              interval={Math.floor(filtered.length / 6)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#8888a0', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v.toFixed(1)}`}
              domain={['auto', 'auto']}
              width={36}
            />
            <Tooltip content={<ChartTooltip formatter={(v) => formatBps(v)} />} />

            <ReferenceLine
              y={BENCHMARKS.TAKE_RATE_BPS}
              stroke="#6366f1"
              strokeDasharray="8 4"
              strokeWidth={1}
              label={{
                value: `${BENCHMARKS.TAKE_RATE_BPS} bps`,
                position: 'right',
                fill: '#6366f1',
                fontSize: 10,
                fontFamily: 'var(--font-geist-mono)',
              }}
            />

            <Line
              type="monotone"
              dataKey="take_rate_bps"
              name="Take Rate"
              stroke="#5ae9b5"
              strokeWidth={1}
              dot={false}
              strokeOpacity={0.4}
            />
            <Line
              type="monotone"
              dataKey="take_rate_7d_ma"
              name="7d MA"
              stroke="#5ae9b5"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 3, fill: '#5ae9b5' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
