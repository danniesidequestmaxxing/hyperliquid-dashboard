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
  ReferenceArea,
} from 'recharts';
import { TimeRangeSelector } from './TimeRangeSelector';
import { ChartTooltip } from './ChartTooltip';
import { BENCHMARKS, PEER_MULTIPLES, formatMultiple } from '@/lib/constants';

interface DataPoint {
  date: string;
  fdv_multiple: number;
}

export function FDVMultipleChart({ data }: { data: DataPoint[] }) {
  const [range, setRange] = useState('90D');

  const filtered = useMemo(() => {
    const dayMap: Record<string, number> = { '30D': 30, '90D': 90, '180D': 180, '1Y': 365 };
    const days = range === 'All' ? data.length : dayMap[range] || 90;
    return data.slice(-days);
  }, [data, range]);

  const rawMin = Math.min(...filtered.map(d => d.fdv_multiple));
  const yMin = Math.min(Math.floor(rawMin - 2), PEER_MULTIPLES.aster.multiple - 2);
  const yMax = Math.ceil(Math.max(...filtered.map(d => d.fdv_multiple)) + 2);

  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#111117] p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-mono font-semibold text-[#e2e2e8] uppercase tracking-wider">FDV / Annualized Fees</h3>
          <p className="text-[10px] font-mono text-[#8888a0] mt-0.5">Crypto P/E ratio (30d MA fees * 365)</p>
        </div>
        <TimeRangeSelector selected={range} onChange={setRange} />
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filtered} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />

            {/* Green zone: undervalued */}
            <ReferenceArea y1={yMin} y2={15} fill="#22c55e" fillOpacity={0.03} />
            {/* Red zone: expensive */}
            <ReferenceArea y1={30} y2={yMax} fill="#ef4444" fillOpacity={0.03} />

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
              tickFormatter={(v) => `${v}x`}
              domain={[yMin, yMax]}
              width={36}
            />
            <Tooltip content={<ChartTooltip formatter={(v) => formatMultiple(v)} />} />

            <ReferenceLine
              y={BENCHMARKS.FDV_FEES_MULTIPLE}
              stroke="#6366f1"
              strokeDasharray="8 4"
              strokeWidth={1}
              label={{
                value: `${BENCHMARKS.FDV_FEES_MULTIPLE}x`,
                position: 'right',
                fill: '#6366f1',
                fontSize: 10,
                fontFamily: 'var(--font-geist-mono)',
              }}
            />

            <ReferenceLine
              y={PEER_MULTIPLES.lighter.multiple}
              stroke={PEER_MULTIPLES.lighter.color}
              strokeDasharray="6 4"
              strokeWidth={1}
              strokeOpacity={0.6}
              label={{
                value: `Lighter ${PEER_MULTIPLES.lighter.multiple}x → $${PEER_MULTIPLES.lighter.impliedPrice}`,
                position: 'right',
                fill: PEER_MULTIPLES.lighter.color,
                fontSize: 9,
                fontFamily: 'var(--font-geist-mono)',
              }}
            />
            <ReferenceLine
              y={PEER_MULTIPLES.aster.multiple}
              stroke={PEER_MULTIPLES.aster.color}
              strokeDasharray="6 4"
              strokeWidth={1}
              strokeOpacity={0.6}
              label={{
                value: `Aster ${PEER_MULTIPLES.aster.multiple}x → $${PEER_MULTIPLES.aster.impliedPrice}`,
                position: 'right',
                fill: PEER_MULTIPLES.aster.color,
                fontSize: 9,
                fontFamily: 'var(--font-geist-mono)',
              }}
            />

            <Line
              type="monotone"
              dataKey="fdv_multiple"
              name="FDV/Fees"
              stroke="#a855f7"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: '#a855f7' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
