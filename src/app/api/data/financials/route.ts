import { NextResponse } from 'next/server';
import { fetchFeeHistory, fetchDerivativesVolumeHistory, fetchDexVolumeHistory, fetchPriceHistory } from '@/lib/api/defillama';

export const revalidate = 300; // Cache for 5 minutes

const HYPE_TOTAL_SUPPLY = 1_000_000_000;
const HYPE_CIRC_RATIO = 0.336; // ~33.6% circulating

export async function GET() {
  try {
    const [fees, perpVol, spotVol, prices] = await Promise.allSettled([
      fetchFeeHistory('hyperliquid'),
      fetchDerivativesVolumeHistory('hyperliquid'),
      fetchDexVolumeHistory('hyperliquid'),
      fetchPriceHistory('hyperliquid', 400),
    ]);

    const feeData = fees.status === 'fulfilled' ? fees.value : [];
    const perpData = perpVol.status === 'fulfilled' ? perpVol.value : [];
    const spotData = spotVol.status === 'fulfilled' ? spotVol.value : [];
    const priceData = prices.status === 'fulfilled' ? prices.value : [];

    // Build lookup maps by date string
    const feeMap = new Map(feeData.map(d => [tsToDate(d.timestamp), d.value]));
    const perpMap = new Map(perpData.map(d => [tsToDate(d.timestamp), d.value]));
    const spotMap = new Map(spotData.map(d => [tsToDate(d.timestamp), d.value]));
    const priceMap = new Map(priceData.map(d => [tsToDate(d.timestamp), d.price]));

    // Use fees as the base date set (most complete for our needs)
    const allDates = new Set([...feeMap.keys(), ...perpMap.keys()]);
    const sortedDates = [...allDates].sort();

    // Build the financials array matching chart interface
    const result = sortedDates.map((date, i) => {
      const dailyFees = feeMap.get(date) || 0;
      const perpVolume = perpMap.get(date) || 0;
      const spotVolume = spotMap.get(date) || 0;
      const totalVolume = perpVolume + spotVolume;
      const takeRateBps = totalVolume > 0 ? (dailyFees / totalVolume) * 10_000 : 0;
      const price = priceMap.get(date) || findClosestPrice(date, priceMap);
      const fdv = price * HYPE_TOTAL_SUPPLY;

      // Compute 30d MA of daily fees for FDV multiple
      const startIdx = Math.max(0, i - 29);
      const recentDates = sortedDates.slice(startIdx, i + 1);
      const recentFees = recentDates.map(d => feeMap.get(d) || 0);
      const fees30dMA = recentFees.reduce((s, v) => s + v, 0) / recentFees.length;
      const annualizedFees = fees30dMA * 365;
      const fdvMultiple = annualizedFees > 0 ? fdv / annualizedFees : 0;

      return {
        date,
        perp_volume: perpVolume,
        spot_volume: spotVolume,
        total_volume: totalVolume,
        daily_fees: dailyFees,
        take_rate_bps: takeRateBps,
        fdv,
        fdv_multiple: fdvMultiple,
        open_interest: 0, // Filled from health endpoint
        hype_price: price,
        market_cap: price * HYPE_TOTAL_SUPPLY * HYPE_CIRC_RATIO,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Financials API error:', error);
    return NextResponse.json({ error: 'Failed to fetch financial data' }, { status: 500 });
  }
}

function tsToDate(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return d.toISOString().split('T')[0];
}

function findClosestPrice(date: string, priceMap: Map<string, number>): number {
  // Simple fallback: try nearby dates
  const d = new Date(date);
  for (let offset = 1; offset <= 7; offset++) {
    const before = new Date(d); before.setDate(before.getDate() - offset);
    const after = new Date(d); after.setDate(after.getDate() + offset);
    const pBefore = priceMap.get(before.toISOString().split('T')[0]);
    const pAfter = priceMap.get(after.toISOString().split('T')[0]);
    if (pBefore) return pBefore;
    if (pAfter) return pAfter;
  }
  // Return last known price
  const values = [...priceMap.values()];
  return values[values.length - 1] || 0;
}
