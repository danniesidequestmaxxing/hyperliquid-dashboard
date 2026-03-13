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
  Legend,
} from 'recharts';
import { TimeRangeSelector } from './TimeRangeSelector';
import { ChartTooltip } from './ChartTooltip';
import { BENCHMARKS, formatMultiple } from '@/lib/constants';

interface DataPoint {
  date: string;
  fdv_multiple: number;
  swpe?: number;
}

export function FDVMultipleChart({ data }: { data: DataPoint[] }) {
  const [range, setRange] = useState('90D');

  const hasSWPE = data.some(d => d.swpe && d.swpe > 0);

  const filtered = useMemo(() => {
    const dayMap: Record<string, number> = { '30D': 30, '90D': 90, '180D': 180, '1Y': 365 };
    const days = range === 'All' ? data.length : dayMap[range] || 90;
    return data.slice(-days);
  }, [data, range]);

  // Compute Y-axis bounds from both metrics
  const allValues = filtered.flatMap(d => {
    const vals = [d.fdv_multiple];
    if (d.swpe && d.swpe > 0) vals.push(d.swpe);
    return vals;
  }).filter(v => v > 0);
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const yMin = Math.max(0, Math.floor(rawMin - 2));
  const yMax = Math.ceil(rawMax + 2);

  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#111117] p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-mono font-semibold text-[#e2e2e8] uppercase tracking-wider">
            {hasSWPE ? 'Valuation Multiples' : 'FDV / Annualized Fees'}
          </h3>
          <p className="text-[10px] font-mono text-[#8888a0] mt-0.5">
            {hasSWPE
              ? 'SWPE = RFS Market Cap / Ann. Revenue (30d MA) | FDV/Fees for reference'
              : 'Crypto P/E ratio (30d MA fees × 365)'
            }
          </p>
        </div>
        <TimeRangeSelector selected={range} onChange={setRange} />
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filtered} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />

            {/* Green zone: undervalued */}
            <ReferenceArea y1={yMin} y2={BENCHMARKS.SWPE_CHEAP} fill="#22c55e" fillOpacity={0.03} />
            {/* Red zone: expensive */}
            <ReferenceArea y1={BENCHMARKS.SWPE_EXPENSIVE} y2={yMax} fill="#ef4444" fillOpacity={0.03} />

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

            {/* SWPE fair value reference lines */}
            {hasSWPE && (
              <ReferenceLine
                y={BENCHMARKS.SWPE_FAIR}
                stroke="#6366f1"
                strokeDasharray="8 4"
                strokeWidth={1}
                label={{
                  value: `Fair ${BENCHMARKS.SWPE_FAIR}x`,
                  position: 'right',
                  fill: '#6366f1',
                  fontSize: 10,
                  fontFamily: 'var(--font-geist-mono)',
                }}
              />
            )}

            {!hasSWPE && (
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
            )}

            {/* SWPE line (primary - bold accent color) */}
            {hasSWPE && (
              <Line
                type="monotone"
                dataKey="swpe"
                name="SWPE (float-adj.)"
                stroke="#5ae9b5"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: '#5ae9b5' }}
              />
            )}

            {/* FDV/Fees line (secondary when SWPE is available, primary otherwise) */}
            <Line
              type="monotone"
              dataKey="fdv_multiple"
              name="FDV/Rev (fully diluted)"
              stroke={hasSWPE ? '#a855f7' : '#a855f7'}
              strokeWidth={hasSWPE ? 1 : 2}
              strokeDasharray={hasSWPE ? '6 3' : undefined}
              strokeOpacity={hasSWPE ? 0.5 : 1}
              dot={false}
              activeDot={{ r: 3, fill: '#a855f7' }}
            />

            {hasSWPE && (
              <Legend
                verticalAlign="top"
                height={24}
                iconType="line"
                wrapperStyle={{ fontSize: 10, fontFamily: 'var(--font-geist-mono)' }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
