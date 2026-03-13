// Dune Analytics API client — free tier (2,500 credits/month)
// Dashboard: https://dune.com/lifewillbeokay/hyperliquid-staking
// Query 4505080: per-validator staking data (L1 validators, not HIP-3 operators)

const BASE = 'https://api.dune.com/api/v1';

function getApiKey(): string {
  const key = process.env.DUNE_API_KEY;
  if (!key) throw new Error('DUNE_API_KEY not set');
  return key;
}

function headers() {
  return { 'X-Dune-API-Key': getApiKey() };
}

export function hasDuneApiKey(): boolean {
  return !!process.env.DUNE_API_KEY;
}

// ── Validator staking data from Dune query 4505080 ──
export interface ValidatorStakeEntry {
  date: string;
  validator_name: string;
  validator_address: string;
  validator_stake_millions: number;
  validator_stake_percentage: number;
  commission: number;
  is_active: boolean;
  total_stake_millions: number;
  validator_count: number;
  active_validators: number;
  yield_percentage: number;
  staking_percentage: number;
}

interface DuneQueryResponse {
  execution_id: string;
  query_id: number;
  state: string;
  result: {
    rows: Record<string, unknown>[];
    metadata: {
      column_names: string[];
      result_set_bytes: number;
      total_row_count: number;
    };
  };
}

const STAKING_QUERY_ID = 4505080;

/**
 * Fetch latest validator staking snapshot from Dune.
 * Returns all validators from the most recent date with their staked amounts.
 */
export async function fetchValidatorStaking(): Promise<{
  validators: ValidatorStakeEntry[];
  totalStakedMillions: number;
  stakingPercentage: number;
  yieldPercentage: number;
  activeValidators: number;
}> {
  const url = `${BASE}/query/${STAKING_QUERY_ID}/results?limit=50&sort_by=date+desc`;
  const res = await fetch(url, {
    headers: headers(),
    next: { revalidate: 3600 }, // Cache 1 hour (staking changes slowly)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Dune API ${res.status}: ${text}`);
  }

  const data: DuneQueryResponse = await res.json();
  const rows = data.result?.rows || [];

  if (rows.length === 0) {
    throw new Error('No staking data returned from Dune');
  }

  // Get the most recent date from the first row
  const latestDate = rows[0].date as string;

  // Filter to only the latest date's rows
  const latestRows = rows.filter(r => r.date === latestDate);

  const validators: ValidatorStakeEntry[] = latestRows.map(r => ({
    date: r.date as string,
    validator_name: r.validator_name as string,
    validator_address: r.validator_address as string,
    validator_stake_millions: Number(r.validator_stake_millions || 0),
    validator_stake_percentage: Number(r.validator_stake_percentage || 0),
    commission: Number(r.commission || 0),
    is_active: Boolean(r.is_active),
    total_stake_millions: Number(r.total_stake_millions || 0),
    validator_count: Number(r.validator_count || 0),
    active_validators: Number(r.active_validators || 0),
    yield_percentage: Number(r.yield_percentage || 0),
    staking_percentage: Number(r.staking_percentage || 0),
  }));

  // Sort by stake descending
  validators.sort((a, b) => b.validator_stake_millions - a.validator_stake_millions);

  // Extract aggregate stats from first row (same for all rows on same date)
  const first = validators[0];

  return {
    validators,
    totalStakedMillions: first.total_stake_millions,
    stakingPercentage: first.staking_percentage,
    yieldPercentage: first.yield_percentage,
    activeValidators: first.active_validators,
  };
}
