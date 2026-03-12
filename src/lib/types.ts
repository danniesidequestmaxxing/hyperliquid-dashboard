// Core daily metrics for Hyperliquid
export interface DailyMetrics {
  date: string; // YYYY-MM-DD
  // Token
  hype_price_usd: number;
  hype_market_cap: number;
  hype_fdv: number;
  hype_circulating_supply: number;
  // Volume
  perp_volume_usd: number;
  spot_volume_usd: number;
  total_volume_usd: number;
  // Fees
  daily_fees_usd: number;
  daily_revenue_usd: number;
  perp_fees_usd: number;
  spot_fees_usd: number;
  // Derived
  realized_take_rate_bps: number;
  take_rate_7d_ma_bps: number;
  fdv_annualized_fees_multiple: number;
  // OI & TVL
  total_open_interest_usd: number;
  bridge_tvl_usd: number;
  hlp_tvl_usd: number;
}

// Competitor volume data
export interface CompetitorVolume {
  date: string;
  protocol_slug: string;
  protocol_name: string;
  daily_volume: number;
  daily_fees: number;
  take_rate_bps: number;
}

// Competitor TVL data
export interface CompetitorTVL {
  date: string;
  protocol_slug: string;
  bridge_tvl_usd: number;
}

// HIP-3 metrics
export interface HIP3Metrics {
  date: string;
  hip3_volume_usd: number;
  hip3_fees_usd: number;
  hip3_protocol_share_usd: number;
  hip3_volume_share_pct: number;
  hip3_operator_count: number;
  hip3_staked_hype: number;
  hip3_auction_fees_usd: number;
}

// Network health metrics
export interface NetworkHealth {
  date: string;
  total_open_interest_usd: number;
  liquidation_volume_usd: number;
  funding_rate_avg_bps: number;
  adl_events_count: number;
  unique_addresses: number;
  addresses_bridged_out: number;
  capital_stickiness_pct: number;
}

// Per-asset snapshot
export interface AssetSnapshot {
  date: string;
  asset_symbol: string;
  mark_price: number;
  funding_rate: number;
  open_interest_usd: number;
  volume_24h_usd: number;
}

// Market share data point for charts
export interface MarketSharePoint {
  date: string;
  [protocol: string]: string | number; // protocol_slug: volume or share
}

// KPI card props
export interface KPIData {
  label: string;
  value: string;
  change?: number; // % change from previous period
  subtitle?: string;
  trend?: 'up' | 'down' | 'flat';
}

// Chart time range
export type TimeRange = '30D' | '90D' | '180D' | '1Y' | 'All';

// API response types
export interface DefiLlamaFeesResponse {
  total24h: number;
  total48hto24h: number;
  total7d: number;
  total30d: number;
  totalAllTime: number;
  totalDataChart: [number, number][];
  totalDataChartBreakdown: [number, Record<string, Record<string, number>>][];
}

export interface DefiLlamaVolumeResponse {
  total24h: number;
  total48hto24h: number;
  totalDataChart: [number, number][];
  totalDataChartBreakdown: [number, Record<string, Record<string, number>>][];
}

export interface DefiLlamaProtocolResponse {
  currentChainTvls: Record<string, number>;
  chainTvls: Record<string, { tvl: [number, number][] }>;
  tvl: [number, number][];
}

export interface HyperliquidMetaAndAssetCtxs {
  universe: { name: string; szDecimals: number; maxLeverage: number }[];
  assetCtxs: {
    funding: string;
    openInterest: string;
    prevDayPx: string;
    dayNtlVlm: string;
    markPx: string;
  }[];
}

export interface CoinGeckoResponse {
  market_data: {
    current_price: { usd: number };
    market_cap: { usd: number };
    fully_diluted_valuation: { usd: number };
    total_volume: { usd: number };
    circulating_supply: number;
    total_supply: number;
  };
}
