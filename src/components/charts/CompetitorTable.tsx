'use client';

import { useMemo } from 'react';
import { formatUSD, formatBps, formatPercent } from '@/lib/constants';

interface Competitor {
  name: string;
  type: 'CEX' | 'DEX';
  volume24h: number;
  volume30d: number;
  fees24h: number;
  takeRate: number;
  color: string;
}

export function CompetitorTable({ data }: { data: Competitor[] }) {
  const maxVolume = Math.max(...data.map(d => d.volume24h));
  const totalVolume = data.reduce((s, d) => s + d.volume24h, 0);

  const cexRows = useMemo(() => data.filter(d => d.type === 'CEX'), [data]);
  const dexRows = useMemo(() => data.filter(d => d.type === 'DEX'), [data]);

  const renderRow = (row: Competitor) => {
    const share = totalVolume > 0 ? (row.volume24h / totalVolume) * 100 : 0;
    return (
      <tr
        key={row.name}
        className="border-b border-[#1e1e2e]/50 hover:bg-[#16161e] transition-colors"
      >
        <td className="py-2 px-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
            <span className="text-xs font-mono font-medium text-[#e2e2e8] whitespace-nowrap">{row.name}</span>
          </div>
        </td>
        <td className="py-2 px-2 text-right">
          <div className="flex items-center justify-end gap-1.5">
            <div className="w-12 h-1.5 rounded-full bg-[#1e1e2e] overflow-hidden flex-shrink-0">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(row.volume24h / maxVolume) * 100}%`,
                  backgroundColor: row.color,
                  opacity: 0.6,
                }}
              />
            </div>
            <span className="text-xs font-mono text-[#e2e2e8] whitespace-nowrap">{formatUSD(row.volume24h)}</span>
          </div>
        </td>
        <td className="py-2 px-2 text-right text-xs font-mono text-[#e2e2e8]/70 whitespace-nowrap">{formatUSD(row.volume30d)}</td>
        <td className="py-2 px-2 text-right text-xs font-mono text-[#e2e2e8] whitespace-nowrap">{formatUSD(row.fees24h)}</td>
        <td className="py-2 px-2 text-right">
          <span className={`text-xs font-mono font-semibold px-1 py-0.5 rounded ${
            row.takeRate >= 3 ? 'text-[#22c55e] bg-[#22c55e]/10' :
            row.takeRate >= 1 ? 'text-[#eab308] bg-[#eab308]/10' :
            'text-[#ef4444] bg-[#ef4444]/10'
          }`}>
            {formatBps(row.takeRate)}
          </span>
        </td>
        <td className="py-2 px-2 text-right text-xs font-mono font-semibold text-[#e2e2e8] whitespace-nowrap">
          {formatPercent(share)}
        </td>
      </tr>
    );
  };

  const renderGroupHeader = (label: string) => (
    <tr key={`group-${label}`} className="border-b border-[#1e1e2e]">
      <td colSpan={6} className="py-2 px-2">
        <span className="text-[9px] font-mono font-bold text-[#8888a0] uppercase tracking-widest">{label}</span>
      </td>
    </tr>
  );

  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#111117] p-4">
      <div className="mb-4">
        <h3 className="text-xs font-mono font-semibold text-[#e2e2e8] uppercase tracking-wider">Venue Comparison</h3>
        <p className="text-[10px] font-mono text-[#8888a0] mt-0.5">Volume, fees, and take rate across CEX and DEX venues</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-[#1e1e2e]">
              <th className="text-left py-2 px-2 text-[10px] font-mono font-semibold text-[#8888a0] uppercase tracking-wider w-[120px]">Venue</th>
              <th className="text-right py-2 px-2 text-[10px] font-mono font-semibold text-[#8888a0] uppercase tracking-wider">24h Volume</th>
              <th className="text-right py-2 px-2 text-[10px] font-mono font-semibold text-[#8888a0] uppercase tracking-wider">30d Volume</th>
              <th className="text-right py-2 px-2 text-[10px] font-mono font-semibold text-[#8888a0] uppercase tracking-wider">24h Fees</th>
              <th className="text-right py-2 px-2 text-[10px] font-mono font-semibold text-[#8888a0] uppercase tracking-wider">Take Rate</th>
              <th className="text-right py-2 px-2 text-[10px] font-mono font-semibold text-[#8888a0] uppercase tracking-wider">Share</th>
            </tr>
          </thead>
          <tbody>
            {renderGroupHeader('Centralized Exchanges')}
            {cexRows.map(renderRow)}
            {renderGroupHeader('Decentralized Exchanges')}
            {dexRows.map(renderRow)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
