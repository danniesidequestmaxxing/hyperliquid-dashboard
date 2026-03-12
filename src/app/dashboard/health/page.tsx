'use client';

import { KPICard } from '@/components/ui/kpi-card';
import { OILiquidationsChart } from '@/components/charts/OILiquidationsChart';
import { CapitalStickinessChart } from '@/components/charts/CapitalStickinessChart';
import { generateNetworkHealthData } from '@/lib/mock-data';
import { formatUSD, formatBps, formatPercent } from '@/lib/constants';
import { useApiData } from '@/lib/use-api-data';

interface HealthApiData {
  totalOI: number;
  totalVolume24h: number;
  avgFundingRate: number;
  fundingHeatmap: { name: string; oi: number; fundingRate: number }[];
}

export default function NetworkHealthPage() {
  // Real-time OI and funding from HL API
  const { data: healthApi, isLive } = useApiData<HealthApiData>(
    '/api/data/health',
    null,
    60_000 // Refresh every minute
  );

  // Historical chart data (needs DB for real history; using mock for now)
  const { data: chartData } = useApiData(
    '__mock_health__',
    () => generateNetworkHealthData(180),
  );

  if (!chartData) return <div className="min-h-[400px]" />;

  const latest = chartData[chartData.length - 1];
  const prev = chartData[chartData.length - 2];

  // Use real OI if available
  const currentOI = healthApi?.totalOI || latest.open_interest;
  const currentFunding = healthApi?.avgFundingRate ?? latest.funding_rate;

  const oiChange = prev.open_interest > 0
    ? ((latest.open_interest - prev.open_interest) / prev.open_interest) * 100 : 0;
  const liqChange = prev.liquidation_volume > 0
    ? ((latest.liquidation_volume - prev.liquidation_volume) / prev.liquidation_volume) * 100 : 0;

  const recentOI = chartData.slice(-14).map(d => d.open_interest);
  const recentLiqs = chartData.slice(-14).map(d => d.liquidation_volume);
  const recentFunding = chartData.slice(-14).map(d => d.funding_rate);
  const recentStickiness = chartData.slice(-14).map(d => d.capital_stickiness);

  // Use real funding heatmap data if available
  const fundingRows = healthApi?.fundingHeatmap?.slice(0, 8) || [
    { name: 'BTC', oi: 2.8e9, fundingRate: 3.2 },
    { name: 'ETH', oi: 1.9e9, fundingRate: 4.8 },
    { name: 'SOL', oi: 0.8e9, fundingRate: -1.2 },
    { name: 'DOGE', oi: 0.4e9, fundingRate: 6.5 },
    { name: 'ARB', oi: 0.3e9, fundingRate: 2.1 },
    { name: 'AVAX', oi: 0.25e9, fundingRate: -0.5 },
    { name: 'LINK', oi: 0.2e9, fundingRate: 1.8 },
    { name: 'WIF', oi: 0.15e9, fundingRate: 12.4 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Total OI"
          value={formatUSD(currentOI)}
          change={oiChange}
          subtitle={isLive ? 'live' : 'aggregate'}
          sparkline={recentOI}
          accentColor="#5ae9b5"
        />
        <KPICard
          label="24h Liquidations"
          value={formatUSD(latest.liquidation_volume)}
          change={liqChange}
          subtitle="24h"
          sparkline={recentLiqs}
          accentColor="#ef4444"
        />
        <KPICard
          label="Avg Funding Rate"
          value={formatBps(currentFunding)}
          change={latest.funding_rate - prev.funding_rate}
          subtitle={isLive ? 'live annualized' : 'annualized'}
          sparkline={recentFunding}
          accentColor="#f59e0b"
        />
        <KPICard
          label="Capital Stickiness"
          value={formatPercent(latest.capital_stickiness)}
          change={latest.capital_stickiness - prev.capital_stickiness}
          subtitle="retention rate"
          sparkline={recentStickiness}
          accentColor="#22c55e"
        />
      </div>

      <OILiquidationsChart data={chartData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <CapitalStickinessChart data={latest} />

        <div className="rounded-lg border border-[#1e1e2e] bg-[#111117] p-4">
          <div className="mb-4">
            <h3 className="text-xs font-mono font-semibold text-[#e2e2e8] uppercase tracking-wider">Funding Rate Heatmap</h3>
            <p className="text-[10px] font-mono text-[#8888a0] mt-0.5">
              Top assets by OI, current annualized funding rate
              {isLive && <span className="text-[#5ae9b5] ml-1">LIVE</span>}
            </p>
          </div>
          <div className="space-y-1.5">
            {fundingRows.map((row) => {
              const rate = row.fundingRate;
              const intensity = Math.min(1, Math.abs(rate) / 15);
              const bgColor = rate >= 0
                ? `rgba(34, 197, 94, ${intensity * 0.2})`
                : `rgba(239, 68, 68, ${intensity * 0.2})`;
              const textColor = rate >= 0 ? '#22c55e' : '#ef4444';

              return (
                <div key={row.name} className="flex items-center justify-between px-3 py-2 rounded" style={{ backgroundColor: bgColor }}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-semibold text-[#e2e2e8] w-10">{row.name}</span>
                    <span className="text-[10px] font-mono text-[#8888a0]">{formatUSD(row.oi)} OI</span>
                  </div>
                  <span className="text-xs font-mono font-semibold" style={{ color: textColor }}>
                    {rate >= 0 ? '+' : ''}{formatBps(rate)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
