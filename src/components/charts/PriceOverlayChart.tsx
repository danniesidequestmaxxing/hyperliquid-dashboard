'use client';

import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
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
import { SUPPLY_PARAMS, PEER_MULTIPLES } from '@/lib/constants';

interface DataPoint {
  date: string;
  fdv: number;
  daily_fees: number;
  fdv_multiple: number;
  hype_price: number;
}

function formatB(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toFixed(0)}`;
}

export function PriceOverlayChart({ data }: { data: DataPoint[] }) {
  const [range, setRange] = useState('180D');

  const filtered = useMemo(() => {
    const dayMap: Record<string, number> = { '30D': 30, '90D': 90, '180D': 180, '1Y': 365 };
    const days = range === 'All' ? data.length : dayMap[range] || 180;
    return data.slice(-days);
  }, [data, range]);

  // Enrich with peer-implied FDVs using 30d rolling avg fees
  const enriched = useMemo(() => {
    return filtered.map((d, i) => {
      const start = Math.max(0, i - 29);
      const window = filtered.slice(start, i + 1);
      const avgFees = window.reduce((s, w) => s + w.daily_fees, 0) / window.length;
      const annualizedFees = avgFees * 365;

      return {
        date: d.date,
        fdv: d.fdv,
        fdvMultiple: d.fdv_multiple,
        lighterFDV: annualizedFees * PEER_MULTIPLES.lighter.multiple,
        asterFDV: annualizedFees * PEER_MULTIPLES.aster.multiple,
      };
    });
  }, [filtered]);

  const fdvs = enriched.map(d => d.fdv).filter(v => v > 0);
  const allValues = [
    ...fdvs,
    ...enriched.map(d => d.lighterFDV),
    ...enriched.map(d => d.asterFDV),
  ].filter(v => v > 0);
  const yMin = Math.floor(Math.min(...allValues) * 0.85);
  const yMax = Math.ceil(Math.max(...allValues) * 1.1);

  const afBasisFDV = SUPPLY_PARAMS.AF_COST_BASIS * SUPPLY_PARAMS.TOTAL_SUPPLY;

  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#111117] p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-mono font-semibold text-[#e2e2e8] uppercase tracking-wider">FDV vs Peer-Implied Valuations</h3>
          <p className="text-[10px] font-mono text-[#8888a0] mt-0.5">Actual FDV with fair value range at competitor multiples (30d avg)</p>
        </div>
        <TimeRangeSelector selected={range} onChange={setRange} />
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={enriched} margin={{ top: 4, right: 50, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />

            {/* Shaded band between peer-implied FDVs */}
            <defs>
              <linearGradient id="fairValueBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PEER_MULTIPLES.lighter.color} stopOpacity={0.08} />
                <stop offset="100%" stopColor={PEER_MULTIPLES.aster.color} stopOpacity={0.08} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#8888a0', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={{ stroke: '#1e1e2e' }}
              tickFormatter={(v) => {
                const d = new Date(v);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
              interval={Math.floor(enriched.length / 6)}
            />

            {/* Left axis: FDV */}
            <YAxis
              yAxisId="fdv"
              tick={{ fontSize: 10, fill: '#8888a0', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatB(v)}
              domain={[yMin, yMax]}
              width={52}
            />

            {/* Right axis: Multiple */}
            <YAxis
              yAxisId="multiple"
              orientation="right"
              tick={{ fontSize: 10, fill: '#8888a0', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}x`}
              width={36}
            />

            <Tooltip
              content={
                <ChartTooltip
                  formatter={(v, name) => {
                    if (name === 'FDV/Rev') return `${Number(v).toFixed(1)}x`;
                    return formatB(Number(v));
                  }}
                />
              }
            />

            {/* AF Cost Basis FDV */}
            {afBasisFDV >= yMin && afBasisFDV <= yMax && (
              <ReferenceLine
                yAxisId="fdv"
                y={afBasisFDV}
                stroke="#6366f1"
                strokeDasharray="8 4"
                strokeWidth={1}
                label={{
                  value: `AF Basis ${formatB(afBasisFDV)}`,
                  position: 'right',
                  fill: '#6366f1',
                  fontSize: 9,
                  fontFamily: 'var(--font-geist-mono)',
                }}
              />
            )}

            {/* Lighter-implied FDV line */}
            <Line
              yAxisId="fdv"
              type="monotone"
              dataKey="lighterFDV"
              name={`Lighter ${PEER_MULTIPLES.lighter.multiple}x`}
              stroke={PEER_MULTIPLES.lighter.color}
              strokeWidth={1}
              strokeDasharray="6 4"
              strokeOpacity={0.7}
              dot={false}
              activeDot={false}
            />

            {/* Aster-implied FDV line */}
            <Line
              yAxisId="fdv"
              type="monotone"
              dataKey="asterFDV"
              name={`Aster ${PEER_MULTIPLES.aster.multiple}x`}
              stroke={PEER_MULTIPLES.aster.color}
              strokeWidth={1}
              strokeDasharray="6 4"
              strokeOpacity={0.7}
              dot={false}
              activeDot={false}
            />

            {/* Actual FDV */}
            <Line
              yAxisId="fdv"
              type="monotone"
              dataKey="fdv"
              name="HYPE FDV"
              stroke="#5ae9b5"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: '#5ae9b5' }}
            />

            {/* FDV/Revenue multiple on right axis */}
            <Line
              yAxisId="multiple"
              type="monotone"
              dataKey="fdvMultiple"
              name="FDV/Rev"
              stroke="#8888a0"
              strokeWidth={1}
              strokeOpacity={0.4}
              dot={false}
              activeDot={{ r: 2, fill: '#8888a0' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[10px] font-mono text-[#8888a0]">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-[2px] bg-[#5ae9b5]" />
          <span>HYPE FDV</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-[2px]" style={{ backgroundColor: PEER_MULTIPLES.lighter.color, opacity: 0.7, backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0, currentColor 3px, transparent 3px, transparent 6px)' }} />
          <span>at Lighter {PEER_MULTIPLES.lighter.multiple}x</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-[2px]" style={{ backgroundColor: PEER_MULTIPLES.aster.color, opacity: 0.7, backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0, currentColor 3px, transparent 3px, transparent 6px)' }} />
          <span>at Aster {PEER_MULTIPLES.aster.multiple}x</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-[2px] bg-[#6366f1]" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #6366f1 0, #6366f1 4px, transparent 4px, transparent 8px)' }} />
          <span>AF Basis FDV</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-[2px] bg-[#8888a0] opacity-40" />
          <span>FDV/Rev Multiple</span>
        </div>
      </div>
    </div>
  );
}
