'use client';

import { cn } from '@/lib/utils';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface KPICardProps {
  label: string;
  value: string;
  change?: number;
  subtitle?: string;
  sparkline?: number[];
  accentColor?: string;
}

export function KPICard({ label, value, change, subtitle, sparkline, accentColor = '#5ae9b5' }: KPICardProps) {
  const isPositive = (change ?? 0) >= 0;

  return (
    <div className="relative group overflow-hidden rounded-lg border border-[#1e1e2e] bg-[#111117] p-4 transition-all hover:border-[#2a2a3e] hover:bg-[#13131a]">
      {/* Accent top border */}
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}40, transparent)` }} />

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#8888a0] mb-1.5">{label}</p>
          <p className="text-xl font-mono font-bold text-[#e2e2e8] tracking-tight leading-none mb-1">{value}</p>
          <div className="flex items-center gap-2 mt-2">
            {change !== undefined && (
              <span className={cn(
                'text-[11px] font-mono font-semibold flex items-center gap-0.5',
                isPositive ? 'text-[#22c55e]' : 'text-[#ef4444]'
              )}>
                <span className="text-[9px]">{isPositive ? '\u25B2' : '\u25BC'}</span>
                {Math.abs(change).toFixed(2)}%
              </span>
            )}
            {subtitle && (
              <span className="text-[10px] font-mono text-[#8888a0]">{subtitle}</span>
            )}
          </div>
        </div>

        {sparkline && sparkline.length > 2 && (
          <div className="w-16 h-8 opacity-60 group-hover:opacity-100 transition-opacity">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkline.map((v, i) => ({ v, i }))}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={isPositive ? '#22c55e' : '#ef4444'}
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
