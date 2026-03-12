import { API } from '@/lib/constants';

interface AssetContext {
  funding: string;
  openInterest: string;
  prevDayPx: string;
  dayNtlVlm: string;
  markPx: string;
  premium?: string;
  oraclePx?: string;
}

interface UniverseEntry {
  name: string;
  szDecimals: number;
  maxLeverage: number;
}

type MetaAndAssetCtxsResponse = [
  { universe: UniverseEntry[] },
  AssetContext[]
];

async function postInfo<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(API.HYPERLIQUID, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Hyperliquid API error: ${res.status}`);
  return res.json();
}

// Get all perpetual assets metadata + current context (OI, volume, funding, prices)
export async function getMetaAndAssetCtxs() {
  const raw = await postInfo<MetaAndAssetCtxsResponse>({ type: 'metaAndAssetCtxs' });
  const universe = raw[0].universe;
  const ctxs = raw[1];

  const assets = universe.map((asset, i) => {
    const ctx = ctxs[i];
    const markPrice = parseFloat(ctx.markPx);
    const openInterest = parseFloat(ctx.openInterest);
    return {
      symbol: asset.name,
      maxLeverage: asset.maxLeverage,
      markPrice,
      fundingRate: parseFloat(ctx.funding),
      openInterestUsd: openInterest * markPrice,
      volume24hUsd: parseFloat(ctx.dayNtlVlm),
    };
  });

  const totalOI = assets.reduce((sum, a) => sum + a.openInterestUsd, 0);
  const totalVolume = assets.reduce((sum, a) => sum + a.volume24hUsd, 0);
  const avgFundingRate = assets.length > 0
    ? assets.reduce((sum, a) => sum + a.fundingRate, 0) / assets.length
    : 0;

  return { assets, totalOI, totalVolume, avgFundingRate };
}

// Get candle data for a specific asset
export async function getCandleSnapshot(
  coin: string,
  interval: string,
  startTime: number,
  endTime?: number
) {
  return postInfo<{ t: number; o: string; h: string; l: string; c: string; v: string }[]>({
    type: 'candleSnapshot',
    req: {
      coin,
      interval,
      startTime,
      ...(endTime ? { endTime } : {}),
    },
  });
}
