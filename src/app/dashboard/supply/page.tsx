'use client';

import { useState, useMemo } from 'react';
import { KPICard } from '@/components/ui/kpi-card';
import { ScenarioSelector } from '@/components/ui/scenario-selector';
import { SupplyPressureChart } from '@/components/charts/SupplyPressureChart';
import { CirculatingSupplyChart } from '@/components/charts/CirculatingSupplyChart';
import { BuybackGauge } from '@/components/charts/BuybackGauge';
import {
  formatUSD,
  formatNumber,
  SUPPLY_PARAMS,
  SELL_THROUGH_SCENARIOS,
  DEFAULT_SCENARIO,
  getNeutralizationRevenue,
  type SellThroughScenario,
} from '@/lib/constants';
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

  const [scenario, setScenario] = useState<SellThroughScenario>(DEFAULT_SCENARIO);
  const sellThroughRate = SELL_THROUGH_SCENARIOS[scenario].rate;

  // Recompute all data with the scenario's sell-through rate
  const adjustedData = useMemo(() => {
    if (!data) return null;
    const { kpis: grossKpis, monthly: grossMonthly, priceHistory } = data;

    // Recompute monthly series with adjusted unlocks
    let circulatingSupply = SUPPLY_PARAMS.INITIAL_CIRCULATING;
    let cumulativeNetChange = 0;

    // Also compute gross circulating supply for overlay
    let grossCirculatingSupply = SUPPLY_PARAMS.INITIAL_CIRCULATING;

    const adjustedMonthly = grossMonthly.map((m) => {
      const effectiveUnlocks = Math.round(m.unlocks * sellThroughRate);
      const netChange = effectiveUnlocks - m.buybacks;
      cumulativeNetChange += netChange;
      circulatingSupply += netChange;

      // Gross trajectory (100% sell-through)
      const grossNetChange = m.unlocks - m.buybacks;
      grossCirculatingSupply += grossNetChange;

      return {
        ...m,
        grossUnlocks: m.unlocks, // preserve original gross
        unlocks: effectiveUnlocks, // override with effective
        netChange: Math.round(netChange),
        cumulativeNetChange: Math.round(cumulativeNetChange),
        circulatingSupply: Math.round(circulatingSupply),
        grossCirculatingSupply: Math.round(grossCirculatingSupply),
      };
    });

    // Recompute KPIs
    const adjustedNeutralizationRev = getNeutralizationRevenue(sellThroughRate);
    const effectiveMonthlyUnlock = SUPPLY_PARAMS.MONTHLY_UNLOCK_HYPE * sellThroughRate;
    const monthlyBuybackTokens = grossKpis.annualBuybackTokens / 12;
    const netMonthlyPressure = effectiveMonthlyUnlock - monthlyBuybackTokens;
    const neutralizationPct = adjustedNeutralizationRev > 0
      ? (grossKpis.annualizedRevenue / adjustedNeutralizationRev) * 100
      : 100;

    const historicalMonths = adjustedMonthly.filter((m) => !m.isProjected);
    const lastHist = historicalMonths[historicalMonths.length - 1];
    const prevHist = historicalMonths[historicalMonths.length - 2];
    const circulatingChangePct =
      prevHist && prevHist.circulatingSupply > 0
        ? ((lastHist.circulatingSupply - prevHist.circulatingSupply) / prevHist.circulatingSupply) * 100
        : 0;

    const adjustedKpis = {
      ...grossKpis,
      grossMonthlyUnlockHype: SUPPLY_PARAMS.MONTHLY_UNLOCK_HYPE,
      effectiveMonthlyUnlockHype: effectiveMonthlyUnlock,
      monthlyUnlockUsd: effectiveMonthlyUnlock * grossKpis.hypePrice,
      netMonthlyPressure: Math.round(netMonthlyPressure),
      netMonthlyPressureUsd: netMonthlyPressure * grossKpis.hypePrice,
      neutralizationPct,
      neutralizationRev: adjustedNeutralizationRev,
      circulatingSupply: lastHist?.circulatingSupply || SUPPLY_PARAMS.INITIAL_CIRCULATING,
      circulatingChangePct,
    };

    return { kpis: adjustedKpis, monthly: adjustedMonthly, priceHistory };
  }, [data, sellThroughRate]);

  if (!adjustedData) return <div className="min-h-[400px]" />;

  const { kpis, monthly } = adjustedData;

  // Sparklines from recent months
  const recentMonths = monthly.filter((m) => !m.isProjected).slice(-8);
  const sparkSupply = recentMonths.map((m) => m.circulatingSupply);
  const sparkBuybacks = recentMonths.map((m) => m.buybacks);
  const sparkNet = recentMonths.map((m) => m.netChange);

  return (
    <div className="space-y-4">
      {/* Scenario Selector */}
      <div className="flex items-center justify-between">
        <ScenarioSelector selected={scenario} onChange={setScenario} />
      </div>

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
          label="Effective Sell Pressure"
          value={formatUSD(kpis.monthlyUnlockUsd)}
          subtitle={`${formatNumber(kpis.effectiveMonthlyUnlockHype)} of ${formatNumber(kpis.grossMonthlyUnlockHype)} HYPE/mo`}
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
          <CirculatingSupplyChart data={monthly} showGrossOverlay={sellThroughRate < 1} />
        </div>
        <BuybackGauge
          currentRevenue={kpis.annualizedRevenue}
          requiredRevenue={kpis.neutralizationRev}
          neutralizationPct={kpis.neutralizationPct}
          sellThroughRate={sellThroughRate}
        />
      </div>

      {/* Context card */}
      <div className="rounded-lg border border-[#1e1e2e] bg-[#111117] p-4">
        <h3 className="text-xs font-mono font-semibold text-[#e2e2e8] uppercase tracking-wider mb-3">Supply Dynamics Context</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] font-mono text-[#8888a0] leading-relaxed">
          <div className="space-y-2">
            <p><span className="text-[#e2e2e8] font-semibold">Restaking Behavior:</span> Team unlocks 10M HYPE/month, but historically only ~10-15% hits the market. The majority is restaked back into the network, significantly reducing effective sell pressure.</p>
            <p><span className="text-[#e2e2e8] font-semibold">2025 Regime (Deflationary):</span> No employee unlocks. Assistance Fund deployed $900M+ of protocol revenue into buybacks, creating persistent bid support.</p>
          </div>
          <div className="space-y-2">
            <p><span className="text-[#e2e2e8] font-semibold">Scenario Impact ({(sellThroughRate * 100).toFixed(0)}% sell-through):</span> Effective monthly sell pressure is {formatNumber(SUPPLY_PARAMS.MONTHLY_UNLOCK_HYPE * sellThroughRate)} HYPE ({formatUSD(SUPPLY_PARAMS.MONTHLY_UNLOCK_HYPE * sellThroughRate * kpis.hypePrice)}). Neutralization threshold drops from $2.6B to {formatUSD(getNeutralizationRevenue(sellThroughRate))}.</p>
            <p><span className="text-[#e2e2e8] font-semibold">AF Cost Basis:</span> Assistance Fund blended entry ~$23.61. Market participants view this as a psychological support level.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
