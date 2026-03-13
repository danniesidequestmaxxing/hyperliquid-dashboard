import { NextResponse } from 'next/server';
import { fetchAggregateStats } from '@/lib/api/hyperliquid-api';
import {
  fetchOIAggregatedHistory,
  fetchLiquidationAggregatedHistory,
  hasApiKey,
} from '@/lib/api/coinglass';

export const revalidate = 60; // Refresh every minute for real-time OI/funding

export async function GET() {
  try {
    // ── Real-time data from Hyperliquid API ──
    const stats = await fetchAggregateStats();

    const fundingHeatmap = stats.topAssets.map(a => ({
      name: a.name,
      oi: a.oiUsd,
      fundingRate: a.fundingAnnualized,
    }));

    // ── Historical data from CoinGlass (if API key available) ──
    let history: { date: string; open_interest: number; liquidation_volume: number }[] | null = null;

    if (hasApiKey()) {
      try {
        // Fetch OI history for top 3 coins and sum them
        const symbols = ['BTC', 'ETH', 'SOL'];
        const [oiResults, liqResults] = await Promise.all([
          Promise.allSettled(symbols.map(s => fetchOIAggregatedHistory(s, '1d', 365))),
          Promise.allSettled(symbols.map(s => fetchLiquidationAggregatedHistory(s, '1d', 365))),
        ]);

        // Helper: CoinGlass timestamps may be seconds or ms
        const toDateStr = (t: number): string | null => {
          if (!t || typeof t !== 'number') return null;
          const ms = t < 1e12 ? t * 1000 : t; // seconds → ms
          const d = new Date(ms);
          if (isNaN(d.getTime())) return null;
          return d.toISOString().split('T')[0];
        };

        // Merge OI data: group by date, sum close values across symbols
        const oiByDate: Record<string, number> = {};
        for (const result of oiResults) {
          if (result.status === 'fulfilled') {
            for (const entry of result.value) {
              const date = toDateStr(entry.t);
              if (!date) continue;
              oiByDate[date] = (oiByDate[date] || 0) + entry.c;
            }
          }
        }

        // Merge liquidation data: group by date, sum close values
        const liqByDate: Record<string, number> = {};
        for (const result of liqResults) {
          if (result.status === 'fulfilled') {
            for (const entry of result.value) {
              const date = toDateStr(entry.t);
              if (!date) continue;
              liqByDate[date] = (liqByDate[date] || 0) + entry.c;
            }
          }
        }

        // Combine into sorted daily array
        const allDates = new Set([...Object.keys(oiByDate), ...Object.keys(liqByDate)]);
        const sortedDates = Array.from(allDates).sort();

        if (sortedDates.length > 0) {
          history = sortedDates.map(date => ({
            date,
            open_interest: oiByDate[date] || 0,
            liquidation_volume: liqByDate[date] || 0,
          }));
        }
      } catch (cgError) {
        console.warn('CoinGlass history fetch failed, returning null:', cgError);
      }
    }

    return NextResponse.json({
      totalOI: stats.totalOI,
      totalVolume24h: stats.totalVolume24h,
      avgFundingRate: stats.avgFunding * 8760 * 100, // annualized bps
      fundingHeatmap,
      history,
    });
  } catch (error) {
    console.error('Health API error:', error);
    return NextResponse.json({ error: 'Failed to fetch health data' }, { status: 500 });
  }
}
