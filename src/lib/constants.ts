// Protocol color palette (dark theme)
export const COLORS = {
  background: '#0a0a0f',
  card: '#111117',
  cardBorder: '#1e1e2e',
  textPrimary: '#e2e2e8',
  textSecondary: '#8888a0',
  gridLine: '#1a1a2e',

  // Protocol brand colors
  hyperliquid: '#5ae9b5',
  lighter: '#a855f7',
  aster: '#f59e0b',
  edgex: '#22d3ee',
  others: '#64748b',

  // Metric accents
  positive: '#22c55e',
  negative: '#ef4444',
  warning: '#eab308',
  benchmark: '#6366f1',
} as const;

// Benchmarks from Messari research
export const BENCHMARKS = {
  TAKE_RATE_BPS: 3.74,           // HL historical take rate (Dec 2025 - Jan 2026)
  FDV_FEES_MULTIPLE: 24.5,       // HL FDV/annualized fees historical
  HIP3_VOLUME_SHARE_TARGET: 5,   // Base case target %
  HIP3_STAKING_REQUIREMENT: 500_000, // HYPE per operator
  HIP3_AVG_FEE_RATE: 0.0008,    // ~8 bps average (double main exchange)
  HIP3_PROTOCOL_FEE_SHARE: 0.50, // 50% to protocol
  LIGHTER_TAKE_RATE_BPS: 0.46,   // Lighter's take rate for comparison
  PERP_DEX_MULTIPLE_RANGE: { low: 2, high: 29 }, // dYdX to GMX range
  SWPE_CHEAP: 3,     // SWPE below 3 = undervalued (from Skewga/0xCryptoSam analysis)
  SWPE_FAIR: 5,      // SWPE 3-5 = fair value range
  SWPE_EXPENSIVE: 7, // SWPE above 7 = expensive
} as const;

// Token supply & buyback parameters (from Caladan research memo, Jan 2026)
export const SUPPLY_PARAMS = {
  TOTAL_SUPPLY: 1_000_000_000,
  INITIAL_CIRCULATING: 336_000_000,
  MONTHLY_UNLOCK_HYPE: 10_000_000,
  ANNUAL_UNLOCK_HYPE: 119_000_000,
  UNLOCK_START: '2025-11',
  BUYBACK_REVENUE_PCT: 0.99,
  AF_COST_BASIS: 23.61,
  NEUTRALIZATION_REV: 2_600_000_000,
} as const;

// Sell-through scenarios — team restakes most unlocks, only ~10-15% historically sold
export const SELL_THROUGH_SCENARIOS = {
  base: {
    label: 'Base Case',
    shortLabel: 'Base',
    rate: 0.15,
    description: 'Team historically sells ~10-15%, rest restaked',
  },
  bear: {
    label: 'Bear Case',
    shortLabel: 'Bear',
    rate: 0.50,
    description: 'Conservative: 50% of unlocks hit the market',
  },
  worst: {
    label: 'Worst Case',
    shortLabel: 'Worst',
    rate: 1.00,
    description: 'All unlocks sold — maximum dilution scenario',
  },
} as const;

export type SellThroughScenario = keyof typeof SELL_THROUGH_SCENARIOS;
export const DEFAULT_SCENARIO: SellThroughScenario = 'bear';

/** Neutralization revenue scales with sell-through rate */
export function getNeutralizationRevenue(sellThroughRate: number): number {
  return SUPPLY_PARAMS.NEUTRALIZATION_REV * sellThroughRate;
}

// Peer valuation multiples for overlay (from Caladan comps analysis)
export const PEER_MULTIPLES = {
  lighter: { name: 'Lighter', multiple: 24, impliedPrice: 17.1, color: '#a855f7' },
  aster: { name: 'Aster', multiple: 15, impliedPrice: 10.7, color: '#f59e0b' },
} as const;

// DefiLlama protocol slugs
export const PROTOCOL_SLUGS = {
  hyperliquid: { slug: 'hyperliquid', name: 'Hyperliquid', color: COLORS.hyperliquid },
  lighter: { slug: 'lighter', name: 'Lighter', color: COLORS.lighter },
  aster: { slug: 'aster-dex', name: 'Aster', color: COLORS.aster },
  edgex: { slug: 'edgex', name: 'edgeX', color: COLORS.edgex },
  jupiter: { slug: 'jupiter-perpetual-exchange', name: 'Jupiter Perps', color: '#c084fc' },
  drift: { slug: 'drift-trade', name: 'Drift', color: '#fb923c' },
  paradex: { slug: 'paradex', name: 'Paradex', color: '#38bdf8' },
} as const;

export const COMPETITOR_SLUGS = Object.values(PROTOCOL_SLUGS);

// API endpoints
export const API = {
  HYPERLIQUID: 'https://api.hyperliquid.xyz/info',
  DEFILLAMA_BASE: 'https://api.llama.fi',
  DEFILLAMA_PRO: 'https://pro-api.llama.fi',
  COINGECKO: 'https://api.coingecko.com/api/v3',
  HL_BUILDER_FILLS: 'https://stats-data.hyperliquid.xyz/Mainnet/builder_fills',
} as const;

// Time range options for charts
export const TIME_RANGES = [
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '180D', days: 180 },
  { label: '1Y', days: 365 },
  { label: 'All', days: 0 },
] as const;

// Number formatting helpers
export function formatUSD(value: number, compact = true): string {
  if (compact) {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  }
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatBps(value: number): string {
  return `${value.toFixed(2)} bps`;
}

export function formatMultiple(value: number): string {
  return `${value.toFixed(1)}x`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatNumber(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString();
}
