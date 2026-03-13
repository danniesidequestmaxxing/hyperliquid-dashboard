// CoinGecko API client — free tier, no auth required
// Rate limits: 30 calls/min, 10K calls/month

const BASE = 'https://api.coingecko.com/api/v3';

// Map display names → CoinGecko coin IDs
const COMPETITOR_GECKO_IDS: Record<string, string> = {
  'Hyperliquid': 'hyperliquid',
  'Lighter': 'lighter',
  'Aster': 'aster-2',
  'dYdX': 'dydx-chain',
  'Jupiter Perps': 'jupiter',
  'Drift': 'drift-protocol',
  'Vertex': 'vertex-protocol',
  'GMX': 'gmx',
  'Aevo': 'aevo',
};

// Reverse map: geckoId → display name
const GECKO_TO_DISPLAY: Record<string, string> = {};
for (const [display, id] of Object.entries(COMPETITOR_GECKO_IDS)) {
  GECKO_TO_DISPLAY[id] = display;
}

export { COMPETITOR_GECKO_IDS };

interface CoinGeckoMarketEntry {
  id: string;
  fully_diluted_valuation: number | null;
  market_cap: number | null;
  current_price: number | null;
}

/**
 * Fetch live FDVs for all competitors in a single API call.
 * Returns map of display name → FDV in USD.
 */
export async function fetchCompetitorFDVs(): Promise<Record<string, number>> {
  const ids = Object.values(COMPETITOR_GECKO_IDS).join(',');
  const url = `${BASE}/coins/markets?ids=${ids}&vs_currency=usd&order=market_cap_desc&per_page=20&sparkline=false`;

  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) {
    throw new Error(`CoinGecko API ${res.status}`);
  }

  const data: CoinGeckoMarketEntry[] = await res.json();
  const fdvMap: Record<string, number> = {};

  for (const coin of data) {
    const displayName = GECKO_TO_DISPLAY[coin.id];
    if (displayName && coin.fully_diluted_valuation) {
      fdvMap[displayName] = coin.fully_diluted_valuation;
    }
  }

  return fdvMap;
}
