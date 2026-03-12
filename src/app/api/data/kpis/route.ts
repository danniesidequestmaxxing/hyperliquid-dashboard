import { NextResponse } from 'next/server';
import { fetchCurrentPrice, fetchFeeHistory, fetchDerivativesVolumeHistory } from '@/lib/api/defillama';
import { fetchAggregateStats } from '@/lib/api/hyperliquid-api';

export const revalidate = 60; // Refresh every minute

const HYPE_TOTAL_SUPPLY = 1_000_000_000;
const HYPE_CIRC_RATIO = 0.336;

export async function GET() {
  try {
    const [priceResult, feesResult, volResult, hlResult] = await Promise.allSettled([
      fetchCurrentPrice('hyperliquid'),
      fetchFeeHistory('hyperliquid'),
      fetchDerivativesVolumeHistory('hyperliquid'),
      fetchAggregateStats(),
    ]);

    const price = priceResult.status === 'fulfilled' ? priceResult.value.price : 0;
    const feeHistory = feesResult.status === 'fulfilled' ? feesResult.value : [];
    const volHistory = volResult.status === 'fulfilled' ? volResult.value : [];
    const hlStats = hlResult.status === 'fulfilled' ? hlResult.value : null;

    // Latest and previous day fees
    const latestFees = feeHistory[feeHistory.length - 1]?.value || 0;
    const prevFees = feeHistory[feeHistory.length - 2]?.value || latestFees;
    const feesChange = prevFees > 0 ? ((latestFees - prevFees) / prevFees) * 100 : 0;

    // Latest volume
    const latestVol = volHistory[volHistory.length - 1]?.value || 0;
    const prevVol = volHistory[volHistory.length - 2]?.value || latestVol;
    const volChange = prevVol > 0 ? ((latestVol - prevVol) / prevVol) * 100 : 0;

    // FDV and multiple
    const fdv = price * HYPE_TOTAL_SUPPLY;
    const marketCap = price * HYPE_TOTAL_SUPPLY * HYPE_CIRC_RATIO;

    // 30d MA fees for multiple
    const recent30 = feeHistory.slice(-30).map(d => d.value);
    const fees30dMA = recent30.length > 0 ? recent30.reduce((s, v) => s + v, 0) / recent30.length : 0;
    const fdvMultiple = fees30dMA > 0 ? fdv / (fees30dMA * 365) : 0;

    // Previous day multiple for change calc
    const recent30prev = feeHistory.slice(-31, -1).map(d => d.value);
    const fees30dMAPrev = recent30prev.length > 0 ? recent30prev.reduce((s, v) => s + v, 0) / recent30prev.length : fees30dMA;
    const prevMultiple = fees30dMAPrev > 0 ? fdv / (fees30dMAPrev * 365) : fdvMultiple;
    const multipleChange = prevMultiple > 0 ? ((fdvMultiple - prevMultiple) / prevMultiple) * 100 : 0;

    // Take rate
    const takeRate = latestVol > 0 ? (latestFees / latestVol) * 10_000 : 0;
    const prevTakeRate = prevVol > 0 ? (prevFees / prevVol) * 10_000 : takeRate;
    const takeRateChange = prevTakeRate > 0 ? ((takeRate - prevTakeRate) / prevTakeRate) * 100 : 0;

    // Price change (approximate from FDV change since we only have current price)
    const priceChange = feesChange; // Rough proxy

    return NextResponse.json({
      price,
      priceChange,
      marketCap,
      fdv,
      volume24h: latestVol,
      volumeChange: volChange,
      dailyFees: latestFees,
      feesChange,
      takeRate,
      takeRateChange,
      fdvMultiple,
      multipleChange,
      oi: hlStats?.totalOI || 0,
      oiChange: 0, // Would need historical OI
    });
  } catch (error) {
    console.error('KPIs API error:', error);
    return NextResponse.json({ error: 'Failed to fetch KPIs' }, { status: 500 });
  }
}
