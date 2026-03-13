import { NextResponse } from 'next/server';
import {
  fetchHip3DexTimeseries,
  fetchHip3AllDexStats,
  HIP3_OPERATORS,
  HIP3_OPERATOR_IDS,
  type Hip3DailyEntry,
} from '@/lib/api/hyperzap';
import { fetchFeeHistory } from '@/lib/api/defillama';
import { fetchValidatorStaking, hasDuneApiKey } from '@/lib/api/dune';

export const revalidate = 300; // 5 min cache

interface OperatorDayData {
  volume: number;
  fees: number;
  users: number;
  trades: number;
  liquidations: number;
}

interface DailyRow {
  date: string;
  total_volume: number;
  total_fees: number;
  total_users: number;
  total_trades: number;
  total_liquidations: number;
  hip3_fee_contribution: number;
  operators: number;
  staked_hype: number;
  // Fields needed by HIP3VolumeShareChart
  hip3_volume: number;
  total_hl_volume: number;
  total_hl_fees: number;
  hip3_protocol_fees: number;
  by_operator: Record<string, OperatorDayData>;
}

interface OperatorRow {
  name: string;
  dex_id: string;
  volume: number;
  fees: number;
  users: number;
  trades: number;
  liquidations: number;
  staked_hype: number;
  active: boolean;
}

export async function GET() {
  try {
    // Fetch all 6 operators' timeseries in parallel
    const timeseriesResults = await Promise.allSettled(
      HIP3_OPERATOR_IDS.map((id) => fetchHip3DexTimeseries(id))
    );

    // Fetch aggregate stats for operator table
    const aggregateStats = await fetchHip3AllDexStats();

    // Fetch total HL fee history from DefiLlama (for fee contribution calc)
    let hlFeeHistory: { timestamp: number; value: number }[] = [];
    try {
      hlFeeHistory = await fetchFeeHistory('hyperliquid');
    } catch {
      console.warn('Failed to fetch HL fee history for HIP-3 contribution calc');
    }

    // Fetch L1 validator staking data from Dune (optional)
    let networkStaking: {
      totalStakedMillions: number;
      stakingPercentage: number;
      yieldPercentage: number;
      activeValidators: number;
    } | null = null;

    if (hasDuneApiKey()) {
      try {
        const duneData = await fetchValidatorStaking();
        networkStaking = {
          totalStakedMillions: duneData.totalStakedMillions,
          stakingPercentage: duneData.stakingPercentage,
          yieldPercentage: duneData.yieldPercentage,
          activeValidators: duneData.activeValidators,
        };
      } catch (duneError) {
        console.warn('Dune staking fetch failed, continuing without:', duneError);
      }
    }

    // Build a lookup: date string → total HL fees
    const hlFeeByDate: Record<string, number> = {};
    for (const entry of hlFeeHistory) {
      const d = new Date(entry.timestamp * 1000);
      const dateStr = d.toISOString().split('T')[0];
      hlFeeByDate[dateStr] = entry.value;
    }

    // Collect per-operator timeseries keyed by date
    const operatorTimeseries: Record<string, Record<string, Hip3DailyEntry>> = {};
    for (let i = 0; i < HIP3_OPERATOR_IDS.length; i++) {
      const result = timeseriesResults[i];
      const id = HIP3_OPERATOR_IDS[i];
      if (result.status === 'fulfilled' && result.value.length > 0) {
        operatorTimeseries[id] = {};
        for (const entry of result.value) {
          operatorTimeseries[id][entry.date] = entry;
        }
      }
    }

    // Get all unique dates across operators, sorted
    const allDatesSet = new Set<string>();
    for (const id of Object.keys(operatorTimeseries)) {
      for (const date of Object.keys(operatorTimeseries[id])) {
        allDatesSet.add(date);
      }
    }
    const allDates = Array.from(allDatesSet).sort();

    // Count active operators over time (an operator is "active" from its first date onwards)
    const operatorFirstDate: Record<string, string> = {};
    for (const id of Object.keys(operatorTimeseries)) {
      const dates = Object.keys(operatorTimeseries[id]).sort();
      if (dates.length > 0) operatorFirstDate[id] = dates[0];
    }

    // Merge into daily rows
    const daily: DailyRow[] = allDates.map((date) => {
      const byOperator: Record<string, OperatorDayData> = {};
      let totalVolume = 0;
      let totalFees = 0;
      let totalUsers = 0;
      let totalTrades = 0;
      let totalLiquidations = 0;

      for (const id of Object.keys(operatorTimeseries)) {
        const entry = operatorTimeseries[id][date];
        if (entry) {
          const name = HIP3_OPERATORS[id] || id;
          byOperator[name] = {
            volume: entry.volume,
            fees: entry.total_fees,
            users: entry.unique_users,
            trades: entry.trade_count,
            liquidations: entry.liquidation_count,
          };
          totalVolume += entry.volume;
          totalFees += entry.total_fees;
          totalUsers += entry.unique_users;
          totalTrades += entry.trade_count;
          totalLiquidations += entry.liquidation_count;
        }
      }

      // Count operators active on this date
      const activeOps = Object.entries(operatorFirstDate).filter(
        ([, firstDate]) => firstDate <= date
      ).length;

      // Compute fee contribution = hip3 daily fees / total HL daily fees × 100
      const hlDailyFees = hlFeeByDate[date] || 0;
      const feeContribution = hlDailyFees > 0 ? (totalFees / hlDailyFees) * 100 : 0;

      return {
        date,
        total_volume: totalVolume,
        total_fees: totalFees,
        total_users: totalUsers,
        total_trades: totalTrades,
        total_liquidations: totalLiquidations,
        hip3_fee_contribution: Math.min(feeContribution, 100), // cap at 100%
        operators: activeOps,
        staked_hype: activeOps * 500_000, // 500K HYPE requirement per HIP-3 operator
        // Chart-compatible fields
        hip3_volume: totalVolume,
        total_hl_volume: totalVolume * (100 / Math.max(feeContribution, 1)), // rough estimate
        total_hl_fees: hlDailyFees || totalFees * (100 / Math.max(feeContribution, 1)),
        hip3_protocol_fees: totalFees * 0.5, // 50% protocol share
        by_operator: byOperator,
      };
    });

    // Build operator table from aggregate stats
    const operators: OperatorRow[] = aggregateStats.map((stat) => ({
      name: HIP3_OPERATORS[stat.dex_name] || stat.dex_name,
      dex_id: stat.dex_name,
      volume: stat.volume,
      fees: stat.total_fees,
      users: stat.unique_users,
      trades: stat.trade_count,
      liquidations: stat.liquidation_count,
      staked_hype: 500_000, // HIP-3 minimum requirement per operator
      active: true,
    }));

    // Sort operators by volume descending
    operators.sort((a, b) => b.volume - a.volume);

    // Compute KPIs from aggregated data
    const totalVolume = aggregateStats.reduce((s, d) => s + d.volume, 0);
    const totalFees = aggregateStats.reduce((s, d) => s + d.total_fees, 0);
    const totalUsers = aggregateStats.reduce((s, d) => s + d.unique_users, 0);
    // Use most recent day with non-zero fee contribution (today may be incomplete)
    const daysWithContrib = daily.filter(d => d.hip3_fee_contribution > 0);
    const latestCompleteDay = daysWithContrib[daysWithContrib.length - 1];
    const avgFeeContribution = daysWithContrib.length > 0
      ? daysWithContrib.reduce((s, d) => s + d.hip3_fee_contribution, 0) / daysWithContrib.length
      : 0;

    return NextResponse.json({
      daily,
      operators,
      kpis: {
        totalVolume,
        totalFees,
        totalUsers,
        operators: operators.length,
        stakedHype: operators.length * 500_000,
        avgFeeContribution,
        latestFeeContribution: latestCompleteDay?.hip3_fee_contribution || 0,
      },
      // L1 network staking data from Dune (null if unavailable)
      networkStaking,
    });
  } catch (error) {
    console.error('HIP-3 API error:', error);
    return NextResponse.json({ error: 'Failed to fetch HIP-3 data' }, { status: 500 });
  }
}
