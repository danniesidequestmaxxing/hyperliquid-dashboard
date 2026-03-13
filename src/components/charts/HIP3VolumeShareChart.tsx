'use client';

import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Area,
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
import { SimulatedBadge } from '@/components/ui/simulated-badge';
import { COLORS, formatUSD, formatPercent } from '@/lib/constants';

interface DataPoint {
  date: string;
  hip3_volume: number;
  total_hl_volume: number;
  total_hl_fees: number;
  hip3_protocol_fees: number;
  hip3_fee_contribution: number;
}

export function HIP3VolumeShareChart({ data }: { data: DataPoint[] }) {
  const [range, setRange] = useState('90D');

  const filtered = useMemo(() => {
    const dayMap: Record<string, number> = { '30D': 30, '90D': 90, '180D': 180, '1Y': 365 };
    const days = range === 'All' ? data.length : dayMap[range] || 90;
    return data.slice(-days);
  }, [data, range]);

  // Compute cumulative HIP-3 protocol fees for the filtered period
  const cumulativeFees = useMemo(() => {
    let sum = 0;
    return filtered.map(d => {
      sum += d.hip3_protocol_fees;
      return sum;
    });
  }, [filtered]);

  const totalCumFees = cumulativeFees[cumulativeFees.length - 1] || 0;
  const latestContrib = filtered[filtered.length - 1]?.hip3_fee_contribution || 0;

  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#111117] p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-mono font-semibold text-[#e2e2e8] uppercase tracking-wider">HIP-3 Fee Contribution<SimulatedBadge /></h3>
          <p className="text-[10px] font-mono text-[#8888a0] mt-0.5">HIP-3 protocol fees (bars) vs total HL fees (area) | contribution % (line)</p>
        </div>
        <TimeRangeSelector selected={range} onChange={setRange} />
      </div>

      {/* Summary stats */}
      <div className="flex gap-5 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: COLORS.hyperliquid, opacity: 0.2 }} />
          <span className="text-[10px] font-mono text-[#8888a0]">Total HL Fees</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
          <span className="text-[10px] font-mono text-[#8888a0]">HIP-3 Protocol Fees</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-0.5 rounded-full" style={{ backgroundColor: '#a855f7' }} />
          <span className="text-[10px] font-mono text-[#8888a0]">Contribution %</span>
        </div>
        <div className="ml-auto text-[10px] font-mono text-[#e2e2e8]">
          Period total: <span className="text-[#f59e0b] font-semibold">{formatUSD(totalCumFees)}</span>
          {' '}<span className="text-[#8888a0]">|</span>{' '}
          Latest: <span className="text-[#a855f7] font-semibold">{formatPercent(latestContrib)}</span> of fees
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
              yAxisId="fees"
              tick={{ fontSize: 10, fill: '#8888a0', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatUSD(v)}
              width={56}
            />
            <YAxis
              yAxisId="pct"
              orientation="right"
              tick={{ fontSize: 10, fill: '#8888a0', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v.toFixed(1)}%`}
              width={40}
              domain={[0, 'auto']}
            />
            <Tooltip content={<ChartTooltip formatter={(v, name) =>
              name.includes('%') ? formatPercent(v) : formatUSD(v)
            } />} />

            <Area
              yAxisId="fees"
              type="monotone"
              dataKey="total_hl_fees"
              fill={COLORS.hyperliquid}
              fillOpacity={0.08}
              stroke={COLORS.hyperliquid}
              strokeWidth={1}
              strokeOpacity={0.3}
              name="Total HL Fees"
            />
            <Bar
              yAxisId="fees"
              dataKey="hip3_protocol_fees"
              fill="#f59e0b"
              fillOpacity={0.6}
              radius={[2, 2, 0, 0]}
              name="HIP-3 Protocol Fees"
            />
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="hip3_fee_contribution"
              stroke="#a855f7"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: '#a855f7' }}
              name="Fee Contribution %"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
