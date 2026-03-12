import { pgTable, serial, date, numeric, integer, timestamp, varchar, unique } from 'drizzle-orm/pg-core';

export const dailyHyperliquidMetrics = pgTable('daily_hyperliquid_metrics', {
  id: serial('id').primaryKey(),
  date: date('date').notNull().unique(),
  // Token
  hype_price_usd: numeric('hype_price_usd', { precision: 18, scale: 8 }),
  hype_market_cap: numeric('hype_market_cap', { precision: 20, scale: 2 }),
  hype_fdv: numeric('hype_fdv', { precision: 20, scale: 2 }),
  hype_circulating_supply: numeric('hype_circulating_supply', { precision: 18, scale: 2 }),
  // Volume
  perp_volume_usd: numeric('perp_volume_usd', { precision: 20, scale: 2 }),
  spot_volume_usd: numeric('spot_volume_usd', { precision: 20, scale: 2 }),
  total_volume_usd: numeric('total_volume_usd', { precision: 20, scale: 2 }),
  // Fees
  daily_fees_usd: numeric('daily_fees_usd', { precision: 18, scale: 2 }),
  daily_revenue_usd: numeric('daily_revenue_usd', { precision: 18, scale: 2 }),
  perp_fees_usd: numeric('perp_fees_usd', { precision: 18, scale: 2 }),
  spot_fees_usd: numeric('spot_fees_usd', { precision: 18, scale: 2 }),
  // Derived
  realized_take_rate_bps: numeric('realized_take_rate_bps', { precision: 10, scale: 4 }),
  take_rate_7d_ma_bps: numeric('take_rate_7d_ma_bps', { precision: 10, scale: 4 }),
  fdv_annualized_fees_multiple: numeric('fdv_annualized_fees_multiple', { precision: 10, scale: 2 }),
  // OI & TVL
  total_open_interest_usd: numeric('total_open_interest_usd', { precision: 20, scale: 2 }),
  bridge_tvl_usd: numeric('bridge_tvl_usd', { precision: 20, scale: 2 }),
  hlp_tvl_usd: numeric('hlp_tvl_usd', { precision: 20, scale: 2 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const dailyCompetitorVolumes = pgTable('daily_competitor_volumes', {
  id: serial('id').primaryKey(),
  date: date('date').notNull(),
  protocol_slug: varchar('protocol_slug', { length: 100 }).notNull(),
  protocol_name: varchar('protocol_name', { length: 200 }),
  daily_volume: numeric('daily_volume', { precision: 20, scale: 2 }),
  daily_fees: numeric('daily_fees', { precision: 18, scale: 2 }),
  take_rate_bps: numeric('take_rate_bps', { precision: 10, scale: 4 }),
}, (table) => [
  unique('uq_competitor_vol_date_slug').on(table.date, table.protocol_slug),
]);

export const dailyCompetitorTvl = pgTable('daily_competitor_tvl', {
  id: serial('id').primaryKey(),
  date: date('date').notNull(),
  protocol_slug: varchar('protocol_slug', { length: 100 }).notNull(),
  bridge_tvl_usd: numeric('bridge_tvl_usd', { precision: 20, scale: 2 }),
}, (table) => [
  unique('uq_competitor_tvl_date_slug').on(table.date, table.protocol_slug),
]);

export const dailyHip3Metrics = pgTable('daily_hip3_metrics', {
  id: serial('id').primaryKey(),
  date: date('date').notNull().unique(),
  hip3_volume_usd: numeric('hip3_volume_usd', { precision: 20, scale: 2 }),
  hip3_fees_usd: numeric('hip3_fees_usd', { precision: 18, scale: 2 }),
  hip3_protocol_share_usd: numeric('hip3_protocol_share_usd', { precision: 18, scale: 2 }),
  hip3_volume_share_pct: numeric('hip3_volume_share_pct', { precision: 8, scale: 4 }),
  hip3_operator_count: integer('hip3_operator_count'),
  hip3_staked_hype: numeric('hip3_staked_hype', { precision: 18, scale: 2 }),
  hip3_auction_fees_usd: numeric('hip3_auction_fees_usd', { precision: 18, scale: 2 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const dailyNetworkHealth = pgTable('daily_network_health', {
  id: serial('id').primaryKey(),
  date: date('date').notNull().unique(),
  total_open_interest_usd: numeric('total_open_interest_usd', { precision: 20, scale: 2 }),
  liquidation_volume_usd: numeric('liquidation_volume_usd', { precision: 20, scale: 2 }),
  funding_rate_avg_bps: numeric('funding_rate_avg_bps', { precision: 10, scale: 4 }),
  adl_events_count: integer('adl_events_count').default(0),
  unique_addresses: integer('unique_addresses'),
  addresses_bridged_out: integer('addresses_bridged_out'),
  capital_stickiness_pct: numeric('capital_stickiness_pct', { precision: 8, scale: 4 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const assetLevelSnapshots = pgTable('asset_level_snapshots', {
  id: serial('id').primaryKey(),
  date: date('date').notNull(),
  asset_symbol: varchar('asset_symbol', { length: 20 }).notNull(),
  mark_price: numeric('mark_price', { precision: 20, scale: 8 }),
  funding_rate: numeric('funding_rate', { precision: 18, scale: 10 }),
  open_interest_usd: numeric('open_interest_usd', { precision: 20, scale: 2 }),
  volume_24h_usd: numeric('volume_24h_usd', { precision: 20, scale: 2 }),
}, (table) => [
  unique('uq_asset_date_symbol').on(table.date, table.asset_symbol),
]);
