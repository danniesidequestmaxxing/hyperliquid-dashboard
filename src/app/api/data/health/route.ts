import { NextResponse } from 'next/server';
import { fetchAggregateStats } from '@/lib/api/hyperliquid-api';

export const revalidate = 60; // Refresh every minute for OI/funding

export async function GET() {
  try {
    const stats = await fetchAggregateStats();

    // Top assets for funding heatmap
    const fundingHeatmap = stats.topAssets.map(a => ({
      name: a.name,
      oi: a.oiUsd,
      fundingRate: a.fundingAnnualized,
    }));

    return NextResponse.json({
      totalOI: stats.totalOI,
      totalVolume24h: stats.totalVolume24h,
      avgFundingRate: stats.avgFunding * 8760 * 100, // annualized bps
      fundingHeatmap,
    });
  } catch (error) {
    console.error('Health API error:', error);
    return NextResponse.json({ error: 'Failed to fetch health data' }, { status: 500 });
  }
}
