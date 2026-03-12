// Hyperliquid native API client - free, no auth required

const API_URL = 'https://api.hyperliquid.xyz/info';

export interface AssetContext {
  name: string;
  markPx: number;
  openInterest: number;  // in asset units
  oiUsd: number;         // OI * markPx
  funding: number;       // hourly funding rate
  fundingAnnualized: number; // annualized bps
  volume24h: number;
}

export async function fetchMetaAndAssetCtxs(): Promise<AssetContext[]> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`HL API ${res.status}`);
  const data = await res.json();

  const meta = data[0]?.universe || [];
  const ctxs = data[1] || [];

  return meta.map((m: { name: string }, i: number) => {
    const c = ctxs[i] || {};
    const markPx = parseFloat(c.markPx || '0');
    const oi = parseFloat(c.openInterest || '0');
    const funding = parseFloat(c.funding || '0');

    return {
      name: m.name,
      markPx,
      openInterest: oi,
      oiUsd: oi * markPx,
      funding,
      fundingAnnualized: funding * 8760 * 100, // hourly → annualized bps
      volume24h: parseFloat(c.dayNtlVlm || '0'),
    };
  });
}

// Get aggregate stats
export async function fetchAggregateStats(): Promise<{
  totalOI: number;
  totalVolume24h: number;
  avgFunding: number;
  topAssets: AssetContext[];
}> {
  const assets = await fetchMetaAndAssetCtxs();

  const totalOI = assets.reduce((s, a) => s + a.oiUsd, 0);
  const totalVolume24h = assets.reduce((s, a) => s + a.volume24h, 0);

  // Weighted average funding by OI
  const weightedFunding = assets.reduce((s, a) => s + a.funding * a.oiUsd, 0);
  const avgFunding = totalOI > 0 ? weightedFunding / totalOI : 0;

  // Top assets by OI
  const topAssets = [...assets]
    .sort((a, b) => b.oiUsd - a.oiUsd)
    .slice(0, 10);

  return { totalOI, totalVolume24h, avgFunding, topAssets };
}
