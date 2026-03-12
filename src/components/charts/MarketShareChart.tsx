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
import { COLORS, formatUSD, formatPercent } from '@/lib/constants';

interface DataPoint {
  date: string;
  [key: string]: string | number;
}

const cexKeys = [
  { key: 'Binance', color: '#F0B90B' },
  { key: 'Bybit', color: '#F7A600' },
  { key: 'OKX', color: '#9B9B9B' },
  { key: 'Bitget', color: '#00C8B5' },
  { key: 'Gate.io', color: '#2354E6' },
];

const dexKeys = [
  { key: 'Hyperliquid', color: COLORS.hyperliquid },
  { key: 'Lighter', color: COLORS.lighter },
  { key: 'Aster', color: COLORS.aster },
  { key: 'edgeX', color: COLORS.edgex },
  { key: 'Other DEX', color: COLORS.others },
];

export function MarketShareChart({ data }: { data: DataPoint[] }) {
  const [range, setRange] = useState('90D');

  const filtered = useMemo(() => {
    const dayMap: Record<string, number> = { '30D': 30, '90D': 90, '180D': 180, '1Y': 365 };
    const days = range === 'All' ? data.length : dayMap[range] || 90;
    return data.slice(-days);
  }, [data, range]);

  const chartData = useMemo(() => {
    return filtered.map(d => {
      const totalDex = dexKeys.reduce((s, k) => s + (Number(d[k.key]) || 0), 0);
      const totalCex = cexKeys.reduce((s, k) => s + (Number(d[k.key]) || 0), 0);
      const totalAll = totalDex + totalCex;
      return {
        ...d,
        hl_share_total: totalAll > 0 ? ((Number(d.Hyperliquid) || 0) / totalAll) * 100 : 0,
        hl_share_dex: totalDex > 0 ? ((Number(d.Hyperliquid) || 0) / totalDex) * 100 : 0,
      };
    });
  }, [filtered]);

  const latest = chartData[chartData.length - 1];

  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#111117] p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-mono font-semibold text-[#e2e2e8] uppercase tracking-wider">Perp Volume: CEX vs DEX</h3>
          <p className="text-[10px] font-mono text-[#8888a0] mt-0.5">Daily volume by venue (stacked bars) | HL market share (line)</p>
        </div>
        <TimeRangeSelector selected={range} onChange={setRange} />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
        <span className="text-[9px] font-mono text-[#8888a0] uppercase tracking-wider mr-1">CEX</span>
        {cexKeys.map(p => (
          <div key={p.key} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.color, opacity: 0.35 }} />
            <span className="text-[10px] font-mono text-[#8888a0]">{p.key}</span>
          </div>
        ))}
        <span className="text-[9px] font-mono text-[#8888a0] uppercase tracking-wider ml-2 mr-1">DEX</span>
        {dexKeys.map(p => (
          <div key={p.key} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.color }} />
            <span className="text-[10px] font-mono text-[#8888a0]">{p.key}</span>
          </div>
        ))}
      </div>
      {latest && (
        <div className="flex items-center gap-4 mb-3">
          <span className="text-[10px] font-mono text-[#8888a0]">
            HL share (all perps): <span className="text-[#5ae9b5] font-semibold">{formatPercent(latest.hl_share_total)}</span>
          </span>
          <span className="text-[10px] font-mono text-[#8888a0]">
            HL share (DEX only): <span className="text-[#5ae9b5] font-semibold">{formatPercent(latest.hl_share_dex)}</span>
          </span>
        </div>
      )}

      <div className="h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
              interval={Math.floor(chartData.length / 8)}
            />
            <YAxis
              yAxisId="vol"
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
              tickFormatter={(v) => `${v.toFixed(0)}%`}
              width={36}
              domain={[0, 'auto']}
            />
            <Tooltip content={<ChartTooltip formatter={(v, name) =>
              name.includes('share') ? formatPercent(v) : formatUSD(v)
            } />} />

            {/* CEX bars - dimmer */}
            {cexKeys.map(p => (
              <Bar
                key={p.key}
                yAxisId="vol"
                dataKey={p.key}
                stackId="volume"
                fill={p.color}
                fillOpacity={0.15}
                name={p.key}
              />
            ))}
            {/* DEX bars - brighter */}
            {dexKeys.map(p => (
              <Bar
                key={p.key}
                yAxisId="vol"
                dataKey={p.key}
                stackId="volume"
                fill={p.color}
                fillOpacity={0.6}
                name={p.key}
              />
            ))}
            {/* HL share line */}
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="hl_share_total"
              stroke={COLORS.hyperliquid}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: COLORS.hyperliquid }}
              name="HL share (all)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
