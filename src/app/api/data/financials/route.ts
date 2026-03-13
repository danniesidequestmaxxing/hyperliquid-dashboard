import { NextResponse } from 'next/server';
import { fetchFeeHistory, fetchDerivativesVolumeHistory, fetchDexVolumeHistory, fetchPriceHistory } from '@/lib/api/defillama';
import { SUPPLY_PARAMS } from '@/lib/constants';

export const revalidate = 300; // Cache for 5 minutes

const HYPE_TOTAL_SUPPLY = SUPPLY_PARAMS.TOTAL_SUPPLY;

// Compute circulating supply for a given date, accounting for unlocks and buybacks
function getCirculatingSupply(
  date: string,
  cumulativeBuybackTokens: number
): number {
  const unlockStart = new Date(SUPPLY_PARAMS.UNLOCK_START + '-01');
  const d = new Date(date);

  let unlockTokens = 0;
  if (d >= unlockStart) {
    // Months since unlock start (partial months count as full)
    const monthsDiff =
      (d.getFullYear() - unlockStart.getFullYear()) * 12 +
      (d.getMonth() - unlockStart.getMonth());
    unlockTokens = Math.max(0, monthsDiff) * SUPPLY_PARAMS.MONTHLY_UNLOCK_HYPE;
  }

  // Circulating = initial + unlocks - buybacks (floor at initial)
  const circulating = SUPPLY_PARAMS.INITIAL_CIRCULATING + unlockTokens - cumulativeBuybackTokens;
  return Math.max(circulating, SUPPLY_PARAMS.INITIAL_CIRCULATING);
}

export async function GET() {
  try {
    const [fees, perpVol, spotVol, prices, btcPrices] = await Promise.allSettled([
      fetchFeeHistory('hyperliquid'),
      fetchDerivativesVolumeHistory('hyperliquid'),
      fetchDexVolumeHistory('hyperliquid'),
      fetchPriceHistory('hyperliquid', 400),
      fetchPriceHistory('bitcoin', 400),
    ]);

    const feeData = fees.status === 'fulfilled' ? fees.value : [];
    const perpData = perpVol.status === 'fulfilled' ? perpVol.value : [];
    const spotData = spotVol.status === 'fulfilled' ? spotVol.value : [];
    const priceData = prices.status === 'fulfilled' ? prices.value : [];
    const btcData = btcPrices.status === 'fulfilled' ? btcPrices.value : [];

    // Build lookup maps by date string
    const feeMap = new Map(feeData.map(d => [tsToDate(d.timestamp), d.value]));
    const perpMap = new Map(perpData.map(d => [tsToDate(d.timestamp), d.value]));
    const spotMap = new Map(spotData.map(d => [tsToDate(d.timestamp), d.value]));
    const priceMap = new Map(priceData.map(d => [tsToDate(d.timestamp), d.price]));
    const btcMap = new Map(btcData.map(d => [tsToDate(d.timestamp), d.price]));

    // Use fees as the base date set (most complete for our needs)
    const allDates = new Set([...feeMap.keys(), ...perpMap.keys()]);
    const sortedDates = [...allDates].sort();

    // Track cumulative buyback tokens for SWPE circulating supply adjustment
    let cumulativeBuybackTokens = 0;

    // Build the financials array matching chart interface
    const result = sortedDates.map((date, i) => {
      const dailyFees = feeMap.get(date) || 0;
      const perpVolume = perpMap.get(date) || 0;
      const spotVolume = spotMap.get(date) || 0;
      const totalVolume = perpVolume + spotVolume;
      const takeRateBps = totalVolume > 0 ? (dailyFees / totalVolume) * 10_000 : 0;
      const price = priceMap.get(date) || findClosestPrice(date, priceMap);
      const fdv = price * HYPE_TOTAL_SUPPLY;

      // Accumulate buyback tokens: 99% of fees converted to HYPE at current price
      if (price > 0) {
        cumulativeBuybackTokens += (dailyFees * SUPPLY_PARAMS.BUYBACK_REVENUE_PCT) / price;
      }

      // Compute 30d MA of daily fees for multiples
      const startIdx = Math.max(0, i - 29);
      const recentDates = sortedDates.slice(startIdx, i + 1);
      const recentFees = recentDates.map(d => feeMap.get(d) || 0);
      const fees30dMA = recentFees.reduce((s, v) => s + v, 0) / recentFees.length;
      const annualizedRevenue = fees30dMA * 365;

      // FDV / Annualized Fees (legacy metric, now secondary)
      const fdvMultiple = annualizedRevenue > 0 ? fdv / annualizedRevenue : 0;

      // SWPE: Supply-Weighted P/E = RFS Market Cap / Annualized Revenue
      // RFS Market Cap = circulating supply × price (float-adjusted)
      const circulatingSupply = getCirculatingSupply(date, cumulativeBuybackTokens);
      const rfsMarketCap = circulatingSupply * price;
      const swpe = annualizedRevenue > 0 ? rfsMarketCap / annualizedRevenue : 0;

      return {
        date,
        perp_volume: perpVolume,
        spot_volume: spotVolume,
        total_volume: totalVolume,
        daily_fees: dailyFees,
        take_rate_bps: takeRateBps,
        fdv,
        fdv_multiple: fdvMultiple,
        swpe,
        circulating_supply: circulatingSupply,
        rfs_market_cap: rfsMarketCap,
        open_interest: 0, // Filled from health endpoint
        hype_price: price,
        btc_price: btcMap.get(date) || findClosestPrice(date, btcMap),
        market_cap: rfsMarketCap, // Now uses actual circulating supply instead of static ratio
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
