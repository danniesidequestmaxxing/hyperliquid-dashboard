'use client';

import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { TimeRangeSelector } from './TimeRangeSelector';
import { ChartTooltip } from './ChartTooltip';
import { COLORS, formatUSD } from '@/lib/constants';

interface DataPoint {
  date: string;
  Hyperliquid: number;
  Aster: number;
  Lighter: number;
  edgeX: number;
}

const protocols = [
  { key: 'Hyperliquid', color: COLORS.hyperliquid },
  { key: 'Aster', color: COLORS.aster },
  { key: 'Lighter', color: COLORS.lighter },
  { key: 'edgeX', color: COLORS.edgex },
];

export function BridgeTVLChart({ data }: { data: DataPoint[] }) {
  const [range, setRange] = useState('90D');

  const filtered = useMemo(() => {
    const dayMap: Record<string, number> = { '30D': 30, '90D': 90, '180D': 180, '1Y': 365 };
    const days = range === 'All' ? data.length : dayMap[range] || 90;
    return data.slice(-days);
  }, [data, range]);

  const latest = filtered[filtered.length - 1];
  const totalTVL = latest ? protocols.reduce((s, p) => s + (latest[p.key as keyof DataPoint] as number), 0) : 0;

  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#111117] p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-mono font-semibold text-[#e2e2e8] uppercase tracking-wider">Bridge TVL Dominance</h3>
          <p className="text-[10px] font-mono text-[#8888a0] mt-0.5">Total Value Locked in bridge contracts</p>
        </div>
        <TimeRangeSelector selected={range} onChange={setRange} />
      </div>

      {/* Legend with current values */}
      <div className="flex flex-wrap gap-4 mb-3">
        {latest && protocols.map(p => {
          const val = latest[p.key as keyof DataPoint] as number;
          const share = totalTVL > 0 ? (val / totalTVL) * 100 : 0;
          return (
            <div key={p.key} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-[10px] font-mono text-[#8888a0]">{p.key}</span>
              <span className="text-[10px] font-mono font-semibold text-[#e2e2e8]">{formatUSD(val)}</span>
              <span className="text-[10px] font-mono text-[#8888a0]">{share.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filtered} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
              tickFormatter={(v) => formatUSD(v)}
              width={52}
            />
            <Tooltip content={<ChartTooltip formatter={(v) => formatUSD(v)} />} />
            {protocols.map(p => (
              <Area
                key={p.key}
                type="monotone"
                dataKey={p.key}
                stackId="tvl"
                fill={p.color}
                fillOpacity={0.5}
                stroke={p.color}
                strokeWidth={0}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
