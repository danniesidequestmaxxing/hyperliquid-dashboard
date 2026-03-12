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

// ── Current token price ──
export async function fetchCurrentPrice(geckoId = 'hyperliquid'): Promise<{ price: number; symbol: string }> {
  const res = await fetch(`${COINS_BASE}/prices/current/coingecko:${geckoId}`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`DefiLlama price ${res.status}`);
  const data = await res.json();
  const coin = data.coins?.[`coingecko:${geckoId}`];
  return { price: coin?.price || 0, symbol: coin?.symbol || 'HYPE' };
}
