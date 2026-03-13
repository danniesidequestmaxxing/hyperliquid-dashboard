// DefiLlama API client - free, no auth required

const BASE = 'https://api.llama.fi';
const COINS_BASE = 'https://coins.llama.fi';

// ── Fee history ──
export async function fetchFeeHistory(protocol = 'hyperliquid'): Promise<{ timestamp: number; value: number }[]> {
  const res = await fetch(`${BASE}/summary/fees/${protocol}`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`DefiLlama fees ${res.status}`);
  const data = await res.json();
  const chart: [number, number][] = data.totalDataChart || [];
  return chart.map(([ts, val]) => ({ timestamp: ts, value: val }));
}

// ── Derivatives (perp) volume history ──
export async function fetchDerivativesVolumeHistory(protocol = 'hyperliquid'): Promise<{ timestamp: number; value: number }[]> {
  const res = await fetch(`${BASE}/summary/derivatives/${protocol}`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`DefiLlama derivatives ${res.status}`);
  const data = await res.json();
  const chart: [number, number][] = data.totalDataChart || [];
  return chart.map(([ts, val]) => ({ timestamp: ts, value: val }));
}

// ── DEX spot volume history ──
export async function fetchDexVolumeHistory(protocol = 'hyperliquid'): Promise<{ timestamp: number; value: number }[]> {
  const res = await fetch(`${BASE}/summary/dexs/${protocol}`, { next: { revalidate: 300 } });
  if (!res.ok) return []; // Spot volume may not be available for all protocols
  const data = await res.json();
  const chart: [number, number][] = data.totalDataChart || [];
  return chart.map(([ts, val]) => ({ timestamp: ts, value: val }));
}

// ── Protocol TVL history ──
export async function fetchProtocolTVL(protocol = 'hyperliquid'): Promise<{ timestamp: number; tvl: number }[]> {
  const res = await fetch(`${BASE}/protocol/${protocol}`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`DefiLlama TVL ${res.status}`);
  const data = await res.json();
  const tvl: { date: number; totalLiquidityUSD: number }[] = data.tvl || [];
  return tvl.map(d => ({ timestamp: d.date, tvl: d.totalLiquidityUSD }));
}

// ── All derivatives protocols (for competitor comparison) ──
export interface DerivativeProtocol {
  name: string;
  defillamaId: string;
  total24h: number | null;
  total7d: number | null;
  total30d: number | null;
  change_1d: number | null;
  category: string;
}

export async function fetchAllDerivatives(): Promise<DerivativeProtocol[]> {
  const res = await fetch(`${BASE}/overview/derivatives`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`DefiLlama overview ${res.status}`);
  const data = await res.json();
  return (data.protocols || []).map((p: Record<string, unknown>) => ({
    name: p.name as string,
    defillamaId: p.defillamaId as string,
    total24h: p.total24h as number | null,
    total7d: p.total7d as number | null,
    total30d: p.total30d as number | null,
    change_1d: p.change_1d as number | null,
    category: p.category as string,
  }));
}

// ── All DEX protocols (for spot competition) ──
export async function fetchAllDexes(): Promise<DerivativeProtocol[]> {
  const res = await fetch(`${BASE}/overview/dexs`, { next: { revalidate: 300 } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.protocols || []).map((p: Record<string, unknown>) => ({
    name: p.name as string,
    defillamaId: p.defillamaId as string,
    total24h: p.total24h as number | null,
    total7d: p.total7d as number | null,
    total30d: p.total30d as number | null,
    change_1d: p.change_1d as number | null,
    category: p.category as string,
  }));
}

// ── All fee protocols (for competitor fees) ──
export async function fetchAllFees(): Promise<{ name: string; total24h: number | null; total7d: number | null }[]> {
  const res = await fetch(`${BASE}/overview/fees`, { next: { revalidate: 300 } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.protocols || []).map((p: Record<string, unknown>) => ({
    name: p.name as string,
    total24h: p.total24h as number | null,
    total7d: p.total7d as number | null,
  }));
}

// ── Token price history from DefiLlama coins ──
export async function fetchPriceHistory(
  geckoId = 'hyperliquid',
  days = 365
): Promise<{ timestamp: number; price: number }[]> {
  const start = Math.floor(Date.now() / 1000) - days * 86400;
  const url = `${COINS_BASE}/chart/coingecko:${geckoId}?start=${start}&span=${days}&period=1d&searchWidth=600`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`DefiLlama coins ${res.status}`);
  const data = await res.json();
  const prices = data.coins?.[`coingecko:${geckoId}`]?.prices || [];
  return prices.map((p: { timestamp: number; price: number }) => ({
    timestamp: p.timestamp,
    price: p.price,
  }));
}

// ── Multi-protocol derivatives volume history (for market share chart) ──
// DefiLlama slugs for competitors we want to track
const MARKET_SHARE_SLUGS: { slug: string; display: string; type: 'DEX' | 'CEX' }[] = [
  { slug: 'hyperliquid', display: 'Hyperliquid', type: 'DEX' },
  { slug: 'lighter-v2', display: 'Lighter', type: 'DEX' },
  { slug: 'aster-dex', display: 'Aster', type: 'DEX' },
  { slug: 'edgex', display: 'edgeX', type: 'DEX' },
  { slug: 'jupiter-perpetual', display: 'Jupiter Perps', type: 'DEX' },
  { slug: 'drift-trade', display: 'Drift', type: 'DEX' },
  { slug: 'dydx', display: 'dYdX', type: 'DEX' },
  { slug: 'vertex-protocol', display: 'Vertex', type: 'DEX' },
  { slug: 'gmx-v2', display: 'GMX', type: 'DEX' },
  { slug: 'aevo', display: 'Aevo', type: 'DEX' },
];

export { MARKET_SHARE_SLUGS };

export async function fetchMultiProtocolVolumes(): Promise<
  Record<string, string | number>[]
> {
  const results = await Promise.allSettled(
    MARKET_SHARE_SLUGS.map(s => fetchDerivativesVolumeHistory(s.slug))
  );

  // Build per-date lookup for each protocol
  const dateMap = new Map<string, Record<string, string | number>>();

  for (let i = 0; i < MARKET_SHARE_SLUGS.length; i++) {
    const result = results[i];
    const { display } = MARKET_SHARE_SLUGS[i];
    if (result.status === 'fulfilled') {
      for (const entry of result.value) {
        const date = new Date(entry.timestamp * 1000).toISOString().split('T')[0];
        const existing = dateMap.get(date) || { date };
        existing[display] = (existing[display] as number || 0) + entry.value;
        dateMap.set(date, existing);
      }
    }
  }

  // Sort by date and compute "Other DEX" as remainder
  const sorted = [...dateMap.values()].sort((a, b) =>
    (a.date as string).localeCompare(b.date as string)
  );

  // For each row, add "Other DEX" = total - known protocols
  for (const row of sorted) {
    let knownTotal = 0;
    for (const { display } of MARKET_SHARE_SLUGS) {
      knownTotal += (row[display] as number) || 0;
    }
    // We don't have total market volume, so just set Other DEX to 0
    // The chart will show tracked protocols only
    row['Other DEX'] = 0;
  }

  return sorted;
}

// ── Current token price ──
export async function fetchCurrentPrice(geckoId = 'hyperliquid'): Promise<{ price: number; symbol: string }> {
  const res = await fetch(`${COINS_BASE}/prices/current/coingecko:${geckoId}`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`DefiLlama price ${res.status}`);
  const data = await res.json();
  const coin = data.coins?.[`coingecko:${geckoId}`];
  return { price: coin?.price || 0, symbol: coin?.symbol || 'HYPE' };
}
