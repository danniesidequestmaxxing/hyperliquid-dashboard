import { NextResponse } from 'next/server';
import { fetchFeeHistory, fetchPriceHistory } from '@/lib/api/defillama';
import { SUPPLY_PARAMS } from '@/lib/constants';

export const revalidate = 300;

function tsToMonth(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 7);
}

function tsToDate(ts: number): string {
  return new Date(ts * 1000).toISOString().split('T')[0];
}

function avg(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

export async function GET() {
  try {
    const [feesResult, pricesResult] = await Promise.allSettled([
      fetchFeeHistory('hyperliquid'),
      fetchPriceHistory('hyperliquid', 500),
    ]);

    const feeData = feesResult.status === 'fulfilled' ? feesResult.value : [];
    const priceData = pricesResult.status === 'fulfilled' ? pricesResult.value : [];

    if (feeData.length === 0 && priceData.length === 0) {
      return NextResponse.json({ error: 'No data available' }, { status: 500 });
    }

    // Group fees by month
    const monthlyFees = new Map<string, number>();
    for (const d of feeData) {
      const month = tsToMonth(d.timestamp);
      monthlyFees.set(month, (monthlyFees.get(month) || 0) + d.value);
    }

    // Group prices by month (for avg price) and keep daily for overlay
    const monthlyPrices = new Map<string, number[]>();
    const dailyPriceHistory: { date: string; price: number }[] = [];
    for (const d of priceData) {
      const month = tsToMonth(d.timestamp);
      const arr = monthlyPrices.get(month) || [];
      arr.push(d.price);
      monthlyPrices.set(month, arr);
      dailyPriceHistory.push({ date: tsToDate(d.timestamp), price: d.price });
    }

    // Compute 30d MA of fees for projections
    const recentFees = feeData.slice(-30);
    const fees30dMA = avg(recentFees.map(d => d.value));
    const latestPrice = priceData.length > 0 ? priceData[priceData.length - 1].price : 0;

    // Build sorted list of all months
    const allMonths = new Set<string>();
    monthlyFees.forEach((_, m) => allMonths.add(m));
    monthlyPrices.forEach((_, m) => allMonths.add(m));
    const sortedMonths = [...allMonths].sort();

    // Build monthly series
    let circulatingSupply = SUPPLY_PARAMS.INITIAL_CIRCULATING;
    let cumulativeNetChange = 0;
    const monthly: {
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
    }[] = [];

    for (const month of sortedMonths) {
      const mFees = monthlyFees.get(month) || 0;
      const mPrices = monthlyPrices.get(month) || [];
      const mAvgPrice = avg(mPrices) || latestPrice;

      const unlocks = month >= SUPPLY_PARAMS.UNLOCK_START ? SUPPLY_PARAMS.MONTHLY_UNLOCK_HYPE : 0;
      const buybackUsd = mFees * SUPPLY_PARAMS.BUYBACK_REVENUE_PCT;
      const buybacks = mAvgPrice > 0 ? buybackUsd / mAvgPrice : 0;
      const netChange = unlocks - buybacks;
      cumulativeNetChange += netChange;
      circulatingSupply += netChange;

      monthly.push({
        month,
        unlocks,
        unlocksUsd: unlocks * mAvgPrice,
        buybacks: Math.round(buybacks),
        buybacksUsd: buybackUsd,
        netChange: Math.round(netChange),
        cumulativeNetChange: Math.round(cumulativeNetChange),
        circulatingSupply: Math.round(circulatingSupply),
        avgPrice: mAvgPrice,
        isProjected: false,
      });
    }

    // Forward project 6 months
    const monthlyFeeProjection = fees30dMA * 30; // approx monthly fees
    const lastMonth = sortedMonths[sortedMonths.length - 1] || '2026-03';

    for (let i = 1; i <= 6; i++) {
      const [y, m] = lastMonth.split('-').map(Number);
      const projDate = new Date(y, m - 1 + i, 1);
      const projMonth = `${projDate.getFullYear()}-${String(projDate.getMonth() + 1).padStart(2, '0')}`;

      const unlocks = projMonth >= SUPPLY_PARAMS.UNLOCK_START ? SUPPLY_PARAMS.MONTHLY_UNLOCK_HYPE : 0;
      const buybackUsd = monthlyFeeProjection * SUPPLY_PARAMS.BUYBACK_REVENUE_PCT;
      const buybacks = latestPrice > 0 ? buybackUsd / latestPrice : 0;
      const netChange = unlocks - buybacks;
      cumulativeNetChange += netChange;
      circulatingSupply += netChange;

      monthly.push({
        month: projMonth,
        unlocks,
        unlocksUsd: unlocks * latestPrice,
        buybacks: Math.round(buybacks),
        buybacksUsd: buybackUsd,
        netChange: Math.round(netChange),
        cumulativeNetChange: Math.round(cumulativeNetChange),
        circulatingSupply: Math.round(circulatingSupply),
        avgPrice: latestPrice,
        isProjected: true,
      });
    }

    // KPIs
    const annualizedFees = fees30dMA * 365;
    const annualBuybackTokens = latestPrice > 0
      ? (annualizedFees * SUPPLY_PARAMS.BUYBACK_REVENUE_PCT) / latestPrice
      : 0;
    const monthlyBuybackTokens = annualBuybackTokens / 12;
    const netMonthlyPressure = SUPPLY_PARAMS.MONTHLY_UNLOCK_HYPE - monthlyBuybackTokens;
    const neutralizationPct = (annualizedFees / SUPPLY_PARAMS.NEUTRALIZATION_REV) * 100;

    // Month-over-month circulating change
    const historicalMonths = monthly.filter(m => !m.isProjected);
    const lastHist = historicalMonths[historicalMonths.length - 1];
    const prevHist = historicalMonths[historicalMonths.length - 2];
    const circulatingChangePct = prevHist && prevHist.circulatingSupply > 0
      ? ((lastHist.circulatingSupply - prevHist.circulatingSupply) / prevHist.circulatingSupply) * 100
      : 0;

    return NextResponse.json({
      kpis: {
        circulatingSupply: lastHist?.circulatingSupply || SUPPLY_PARAMS.INITIAL_CIRCULATING,
        circulatingChangePct,
        monthlyUnlockUsd: SUPPLY_PARAMS.MONTHLY_UNLOCK_HYPE * latestPrice,
        annualBuybackTokens: Math.round(annualBuybackTokens),
        netMonthlyPressure: Math.round(netMonthlyPressure),
        netMonthlyPressureUsd: netMonthlyPressure * latestPrice,
        neutralizationPct,
        annualizedRevenue: annualizedFees,
        hypePrice: latestPrice,
      },
      monthly,
      priceHistory: dailyPriceHistory,
    });
  } catch (error) {
    console.error('Supply API error:', error);
    return NextResponse.json({ error: 'Failed to fetch supply data' }, { status: 500 });
  }
}
