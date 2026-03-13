'use client';

import { KPICard } from '@/components/ui/kpi-card';
import { SupplyPressureChart } from '@/components/charts/SupplyPressureChart';
import { CirculatingSupplyChart } from '@/components/charts/CirculatingSupplyChart';
import { BuybackGauge } from '@/components/charts/BuybackGauge';
import { formatUSD, formatNumber, SUPPLY_PARAMS } from '@/lib/constants';
import { useApiData } from '@/lib/use-api-data';
import { generateSupplyData } from '@/lib/mock-data';

interface SupplyKPIs {
  circulatingSupply: number;
  circulatingChangePct: number;
  monthlyUnlockUsd: number;
  annualBuybackTokens: number;
  netMonthlyPressure: number;
  netMonthlyPressureUsd: number;
  neutralizationPct: number;
  annualizedRevenue: number;
  hypePrice: number;
}

interface MonthlyPoint {
  month: string;
  unlocks: number;
  unlocksUsd: number;
  buybacks: number;
  buybacksUsd: number;
  netChange: number;
  cumulativeNetChange: number;
  circulatingSupply: number;
  avgPrice: number;
  isProjected: boolean;
}

interface SupplyApiResponse {
  kpis: SupplyKPIs;
  monthly: MonthlyPoint[];
  priceHistory: { date: string; price: number }[];
}

export default function SupplyPage() {
  const { data } = useApiData<SupplyApiResponse>(
    '/api/data/supply',
    () => generateSupplyData(),
    300_000
  );

  if (!data) return <div className="min-h-[400px]" />;

  const { kpis, monthly } = data;

  // Sparklines from recent months
  const recentMonths = monthly.filter(m => !m.isProjected).slice(-8);
  const sparkSupply = recentMonths.map(m => m.circulatingSupply);
  const sparkBuybacks = recentMonths.map(m => m.buybacks);
  const sparkNet = recentMonths.map(m => m.netChange);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Circulating Supply"
          value={formatNumber(kpis.circulatingSupply)}
          change={kpis.circulatingChangePct}
          subtitle="HYPE tokens"
          sparkline={sparkSupply}
          accentColor="#5ae9b5"
        />
        <KPICard
          label="Monthly Unlock Rate"
          value={formatUSD(kpis.monthlyUnlockUsd)}
          subtitle="10M HYPE/month"
          accentColor="#ef4444"
        />
        <KPICard
          label="Annual Buyback Power"
          value={formatNumber(kpis.annualBuybackTokens)}
          subtitle="HYPE/yr at current rev"
          sparkline={sparkBuybacks}
          accentColor="#22c55e"
        />
        <KPICard
          label="Net Monthly Pressure"
          value={`${kpis.netMonthlyPressure > 0 ? '+' : ''}${formatNumber(Math.abs(kpis.netMonthlyPressure))}`}
          subtitle={kpis.netMonthlyPressure > 0 ? 'inflationary / month' : 'deflationary / month'}
          sparkline={sparkNet}
          accentColor={kpis.netMonthlyPressure > 0 ? '#ef4444' : '#22c55e'}
        />
      </div>

      {/* Supply Pressure Chart */}
      <SupplyPressureChart data={monthly} />

      {/* Bottom row: Circulating Supply + Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <CirculatingSupplyChart data={monthly} />
        </div>
        <BuybackGauge
          currentRevenue={kpis.annualizedRevenue}
          requiredRevenue={SUPPLY_PARAMS.NEUTRALIZATION_REV}
          neutralizationPct={kpis.neutralizationPct}
        />
      </div>

      {/* Context card */}
      <div className="rounded-lg border border-[#1e1e2e] bg-[#111117] p-4">
        <h3 className="text-xs font-mono font-semibold text-[#e2e2e8] uppercase tracking-wider mb-3">Supply Dynamics Context</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] font-mono text-[#8888a0] leading-relaxed">
          <div className="space-y-2">
            <p><span className="text-[#e2e2e8] font-semibold">2025 Regime (Deflationary):</span> No employee unlocks. Assistance Fund deployed $900M+ of protocol revenue into buybacks, creating persistent bid support.</p>
            <p><span className="text-[#e2e2e8] font-semibold">2026 Regime (Inflationary):</span> Employee unlocks began Nov 2025 at ~10M HYPE/month (~119M in 2026 = 39% of circulating float).</p>
          </div>
          <div className="space-y-2">
            <p><span className="text-[#e2e2e8] font-semibold">Neutralization Threshold:</span> Protocol needs ~$2.6B annual revenue to buy back enough HYPE to offset unlock supply. FY25 revenue was $912M.</p>
            <p><span className="text-[#e2e2e8] font-semibold">AF Cost Basis:</span> Assistance Fund blended entry ~$23.61. Market participants view this as a psychological support level.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
