'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import { COLORS, formatPercent } from '@/lib/constants';

interface StickinessData {
  bridged_aster: number;
  bridged_lighter: number;
  bridged_edgex: number;
  capital_stickiness: number;
}

const barColors: Record<string, string> = {
  'Aster': COLORS.aster,
  'Lighter': COLORS.lighter,
  'edgeX': COLORS.edgex,
  'Retained': COLORS.positive,
};

export function CapitalStickinessChart({ data }: { data: StickinessData }) {
  const chartData = [
    { name: 'Aster', value: data.bridged_aster },
    { name: 'Lighter', value: data.bridged_lighter },
    { name: 'edgeX', value: data.bridged_edgex },
    { name: 'Retained', value: data.capital_stickiness },
  ];

  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#111117] p-4">
      <div className="mb-4">
        <h3 className="text-xs font-mono font-semibold text-[#e2e2e8] uppercase tracking-wider">Capital Stickiness</h3>
        <p className="text-[10px] font-mono text-[#8888a0] mt-0.5">% of HL addresses that bridged to each competitor vs retained</p>
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 20, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: '#8888a0', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={{ stroke: '#1e1e2e' }}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: '#e2e2e8', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip content={<ChartTooltip formatter={(v) => formatPercent(v)} />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Share" barSize={28}>
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={barColors[entry.name]} fillOpacity={0.75} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
