// CoinGlass API client — requires CG-API-KEY header
// Base URL: https://open-api-v4.coinglass.com

const BASE = 'https://open-api-v4.coinglass.com';

function getApiKey(): string {
  const key = process.env.COINGLASS_API_KEY;
  if (!key) throw new Error('COINGLASS_API_KEY not set');
  return key;
}

function headers() {
  return { 'CG-API-KEY': getApiKey() };
}

// ── Aggregated OI History (across all exchanges for a symbol) ──
// Normalized entry (CoinGlass returns string fields: time, open, high, low, close)
export interface OIHistoryEntry {
  t: number; // timestamp ms
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeEntry(raw: any): OIHistoryEntry {
  return {
    t: Number(raw.time ?? raw.t ?? 0),
    o: Number(raw.open ?? raw.o ?? 0),
    h: Number(raw.high ?? raw.h ?? 0),
    l: Number(raw.low ?? raw.l ?? 0),
    c: Number(raw.close ?? raw.c ?? 0),
  };
}

export async function fetchOIAggregatedHistory(
  symbol: string,
  interval = '1d',
  limit = 365
): Promise<OIHistoryEntry[]> {
  const url = `${BASE}/api/futures/open-interest/aggregated-history?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, {
    headers: headers(),
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`CoinGlass OI history ${symbol}: ${res.status} ${text}`);
  }
  const json = await res.json();
  if (json.code !== '0' && json.code !== 0) {
    throw new Error(`CoinGlass OI error: ${json.msg || JSON.stringify(json)}`);
  }
  return (json.data || []).map(normalizeEntry);
}

// ── Liquidation Aggregated History ──
// CoinGlass returns: { time, aggregated_long_liquidation_usd, aggregated_short_liquidation_usd }
export interface LiquidationHistoryEntry {
  t: number; // timestamp ms
  longLiqUsd: number;
  shortLiqUsd: number;
  c: number; // total liquidation (long + short) for compatibility
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeLiqEntry(raw: any): LiquidationHistoryEntry {
  const longLiq = Number(raw.aggregated_long_liquidation_usd ?? 0);
  const shortLiq = Number(raw.aggregated_short_liquidation_usd ?? 0);
  return {
    t: Number(raw.time ?? raw.t ?? 0),
    longLiqUsd: longLiq,
    shortLiqUsd: shortLiq,
    c: longLiq + shortLiq,
  };
}

export async function fetchLiquidationAggregatedHistory(
  symbol: string,
  interval = '1d',
  limit = 365
): Promise<LiquidationHistoryEntry[]> {
  // exchange_list is required — comma-separated exchange names
  const exchanges = 'Binance,OKX,Bybit,Bitget,dYdX,Hyperliquid';
  const url = `${BASE}/api/futures/liquidation/aggregated-history?symbol=${symbol}&interval=${interval}&limit=${limit}&exchange_list=${exchanges}`;
  const res = await fetch(url, {
    headers: headers(),
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`CoinGlass liquidation history ${symbol}: ${res.status} ${text}`);
  }
  const json = await res.json();
  if (json.code !== '0' && json.code !== 0) {
    throw new Error(`CoinGlass liquidation error: ${json.msg || JSON.stringify(json)}`);
  }
  return (json.data || []).map(normalizeLiqEntry);
}

// ── Exchange-specific OI History (try Hyperliquid) ──
export async function fetchExchangeOIHistory(
  exchange: string,
  symbol: string,
  interval = '1d',
  limit = 365
): Promise<OIHistoryEntry[]> {
  const url = `${BASE}/api/futures/open-interest/exchange-history-chart?exchange=${exchange}&symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, {
    headers: headers(),
    next: { revalidate: 300 },
  });
  if (!res.ok) return []; // Silently fail — fall back to aggregated
  const json = await res.json();
  if (json.code !== '0' && json.code !== 0) return [];
  return (json.data || []).map(normalizeEntry);
}

// ── Check if API key is valid ──
export function hasApiKey(): boolean {
  return !!process.env.COINGLASS_API_KEY;
}
