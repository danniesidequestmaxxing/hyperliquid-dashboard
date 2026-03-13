// HyperZap API client — free, no auth required
// Source: https://hyperzap.io (powers loris.tools/hip3)

const BASE = 'https://hyperzap.io';

// Operator ID → display name mapping
export const HIP3_OPERATORS: Record<string, string> = {
  xyz: 'TradeXYZ',
  flx: 'Felix',
  vntl: 'Ventuals',
  hyna: 'HyENA',
  km: 'Kinetiq',
  cash: 'Dreamcash',
};

export const HIP3_OPERATOR_IDS = Object.keys(HIP3_OPERATORS);

export interface Hip3DailyEntry {
  date: string;
  volume: number;
  unique_users: number;
  total_fees: number;
  trade_count: number;
  liquidation_count: number;
  fees_usdc: number;
  fees_usdh: number;
  volume_usdc: number;
  volume_usdh: number;
}

export interface Hip3DexAggregate {
  dex_name: string;
  volume: number;
  unique_users: number;
  total_fees: number;
  trade_count: number;
  liquidation_count: number;
  fees_usdc: number;
  fees_usdh: number;
  volume_usdc: number;
  volume_usdh: number;
}

// ── Fetch daily timeseries for one operator ──
export async function fetchHip3DexTimeseries(
  dexName: string,
  period = 'all'
): Promise<Hip3DailyEntry[]> {
  const url = `${BASE}/api/hip3-analytics/timeseries/dex?dex_name=${dexName}&period=${period}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`HyperZap timeseries ${dexName}: ${res.status}`);
  const json = await res.json();
  return json.data || [];
}

// ── Fetch aggregate stats for all operators ──
export async function fetchHip3AllDexStats(
  period = 'all'
): Promise<Hip3DexAggregate[]> {
  const url = `${BASE}/api/hip3-analytics/by-dex?period=${period}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`HyperZap by-dex: ${res.status}`);
  const json = await res.json();
  return json.data || [];
}
