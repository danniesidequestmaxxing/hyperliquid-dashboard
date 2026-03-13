'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import { SUPPLY_PARAMS, formatNumber, formatUSD } from '@/lib/constants';

interface SupplyPoint {
  month: string;
  circulatingSupply: number;
  avgPrice: number;
  isProjected: boolean;
}

export function CirculatingSupplyChart({ data }: { data: SupplyPoint[] }) {
  // Merge into chart-friendly format
  const chartData = useMemo(() =>
    data.map(d => ({
      month: d.month,
      supply: d.circulatingSupply,
      supplyHistorical: d.isProjected ? undefined : d.circulatingSupply,
      supplyProjected: d.isProjected ? d.circulatingSupply : undefined,
      price: d.avgPrice,
    })),
    [data]
  );

  // Ensure the last historical point is also in projected for continuity
  const lastHistIdx = chartData.findLastIndex(d => d.supplyHistorical !== undefined);
  if (lastHistIdx >= 0 && lastHistIdx < chartData.length - 1) {
    chartData[lastHistIdx].supplyProjected = chartData[lastHistIdx].supply;
  }

  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#111117] p-4">
      <div className="mb-4">
        <h3 className="text-xs font-mono font-semibold text-[#e2e2e8] uppercase tracking-wider">Circulating Supply & Price</h3>
        <p className="text-[10px] font-mono text-[#8888a0] mt-0.5">Supply growth from unlocks (area) | HYPE price with AF cost basis (line)</p>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />

            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: '#8888a0', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={{ stroke: '#1e1e2e' }}
              tickFormatter={(v: string) => {
                const [y, m] = v.split('-');
                const monthNames = ['', 'J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
                return `${monthNames[parseInt(m)]}${y.slice(2)}`;
              }}
            />
            <YAxis
              yAxisId="supply"
              orientation="left"
              tick={{ fontSize: 10, fill: '#8888a0', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatNumber(v)}
              width={54}
            />
            <YAxis
              yAxisId="price"
              orientation="right"
              tick={{ fontSize: 10, fill: '#8888a0', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v}`}
              width={42}
            />

            <Tooltip content={<ChartTooltip formatter={(v, name) =>
              typeof name === 'string' && name.includes('Price') ? formatUSD(v, false) : `${formatNumber(v)} HYPE`
            } />} />

            {/* AF Cost Basis reference on price axis */}
            <ReferenceLine
              yAxisId="price"
              y={SUPPLY_PARAMS.AF_COST_BASIS}
              stroke="#6366f1"
              strokeDasharray="8 4"
              strokeWidth={1}
              label={{
                value: `AF $${SUPPLY_PARAMS.AF_COST_BASIS}`,
                position: 'right',
                fill: '#6366f1',
                fontSize: 9,
                fontFamily: 'var(--font-geist-mono)',
              }}
            />

            {/* Historical supply area */}
            <Area
              yAxisId="supply"
              type="monotone"
              dataKey="supplyHistorical"
              name="Circulating Supply"
              fill="#5ae9b5"
              fillOpacity={0.12}
              stroke="#5ae9b5"
              strokeWidth={1.5}
              connectNulls={false}
            />

            {/* Projected supply area */}
            <Area
              yAxisId="supply"
              type="monotone"
              dataKey="supplyProjected"
              name="Supply (Projected)"
              fill="#5ae9b5"
              fillOpacity={0.06}
              stroke="#5ae9b5"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              connectNulls={false}
            />

            {/* Price line */}
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="price"
              name="HYPE Price"
              stroke="#e2e2e8"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: '#e2e2e8' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
