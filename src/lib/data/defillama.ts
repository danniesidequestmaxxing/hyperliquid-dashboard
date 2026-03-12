import { API } from '@/lib/constants';

const BASE = API.DEFILLAMA_BASE;

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 300 } }); // 5 min cache
  if (!res.ok) throw new Error(`DefiLlama API error: ${res.status} ${url}`);
  return res.json();
}

// Fees for a specific protocol
export async function getProtocolFees(slug: string) {
  return fetchJSON<{
    total24h: number;
    total48hto24h: number;
    total7d: number;
    total30d: number;
    totalAllTime: number;
    totalDataChart: [number, number][];
    totalDataChartBreakdown: [number, Record<string, Record<string, number>>][];
  }>(`${BASE}/summary/fees/${slug}`);
}

// Perp (derivatives) volume for a specific protocol
export async function getProtocolDerivativesVolume(slug: string) {
  return fetchJSON<{
    total24h: number;
    total48hto24h: number;
    total7d: number;
    total30d: number;
    totalDataChart: [number, number][];
  }>(`${BASE}/summary/derivatives/${slug}`);
}

// Spot (DEX) volume for a specific protocol
export async function getProtocolSpotVolume(slug: string) {
  return fetchJSON<{
    total24h: number;
    total48hto24h: number;
    totalDataChart: [number, number][];
  }>(`${BASE}/summary/dexs/${slug}`);
}

// TVL data for a specific protocol (includes chain breakdown)
export async function getProtocolTVL(slug: string) {
  return fetchJSON<{
    currentChainTvls: Record<string, number>;
    chainTvls: Record<string, { tvl: { date: number; totalLiquidityUSD: number }[] }>;
    tvl: { date: number; totalLiquidityUSD: number }[];
  }>(`${BASE}/protocol/${slug}`);
}

// Overview of all derivatives DEXs (for market share)
export async function getAllDerivativesOverview() {
  return fetchJSON<{
    totalDataChart: [number, number][];
    totalDataChartBreakdown: [number, Record<string, Record<string, number>>][];
    protocols: { name: string; defillamaId: string; total24h: number; total7d: number; total30d: number; change_1d: number; change_7d: number; module: string }[];
  }>(`${BASE}/overview/derivatives?excludeTotalDataChart=false&excludeTotalDataChartBreakdown=false`);
}

// Historical fee chart data for a protocol
export async function getHistoricalFees(slug: string): Promise<{ date: string; fees: number }[]> {
  const data = await getProtocolFees(slug);
  return (data.totalDataChart || []).map(([ts, fees]) => ({
    date: new Date(ts * 1000).toISOString().split('T')[0],
    fees,
  }));
}

// Historical volume chart data for a protocol
export async function getHistoricalVolume(slug: string): Promise<{ date: string; volume: number }[]> {
  const data = await getProtocolDerivativesVolume(slug);
  return (data.totalDataChart || []).map(([ts, volume]) => ({
    date: new Date(ts * 1000).toISOString().split('T')[0],
    volume,
  }));
}
