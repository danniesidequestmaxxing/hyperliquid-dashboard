'use client';

import { useMemo } from 'react';
import { KPICard } from '@/components/ui/kpi-card';
import { HIP3VolumeShareChart } from '@/components/charts/HIP3VolumeShareChart';
import { HIP3StakedChart } from '@/components/charts/HIP3StakedChart';
import { generateHIP3Data } from '@/lib/mock-data';
import { formatUSD, formatPercent, formatNumber } from '@/lib/constants';
import { useApiData } from '@/lib/use-api-data';

interface Hip3ApiResponse {
  daily: {
    date: string;
    total_volume: number;
    total_fees: number;
    total_users: number;
    total_trades: number;
    total_liquidations: number;
    hip3_fee_contribution: number;
    operators: number;
    staked_hype: number;
    hip3_volume: number;
    total_hl_volume: number;
    total_hl_fees: number;
    hip3_protocol_fees: number;
  }[];
  operators: {
    name: string;
    dex_id: string;
    volume: number;
    fees: number;
    users: number;
    trades: number;
    liquidations: number;
    staked_hype: number;
    active: boolean;
  }[];
  kpis: {
    totalVolume: number;
    totalFees: number;
    totalUsers: number;
    operators: number;
    stakedHype: number;
    avgFeeContribution: number;
    latestFeeContribution: number;
  };
  networkStaking?: {
    totalStakedMillions: number;
    stakingPercentage: number;
    yieldPercentage: number;
    activeValidators: number;
  } | null;
}

export default function HIP3Page() {
  const { data: apiData } = useApiData<Hip3ApiResponse>(
    '/api/data/hip3',
    null,
    300_000
  );

  // Mock fallback
  const { data: mockData } = useApiData(
    '__mock_hip3__',
    () => generateHIP3Data(400),
  );

  // Use real API data if available, otherwise mock
  const data = useMemo(() => {
    if (apiData?.daily && apiData.daily.length > 0) {
      return apiData.daily;
    }
    return mockData;
  }, [apiData, mockData]);

  const operators = apiData?.operators;
  const networkStaking = apiData?.networkStaking;

  if (!data) return <div className="min-h-[400px]" />;

  const latest = data[data.length - 1];
  const prev = data[data.length - 2];

  // Use most recent day with fee contribution data (today may be incomplete)
  const completeDays = data.filter(d => d.hip3_fee_contribution > 0);
  const latestComplete = completeDays[completeDays.length - 1] || latest;
  const prevComplete = completeDays[completeDays.length - 2] || prev;

  const feeContribChange = prevComplete.hip3_fee_contribution > 0
    ? (latestComplete.hip3_fee_contribution - prevComplete.hip3_fee_contribution)
    : 0;
  const protocolFeesChange = prev.hip3_protocol_fees > 0
    ? ((latest.hip3_protocol_fees - prev.hip3_protocol_fees) / prev.hip3_protocol_fees) * 100
    : 0;

  const recentProtocolFees = data.slice(-14).map(d => d.hip3_protocol_fees);
  const recentContrib = data.slice(-14).map(d => d.hip3_fee_contribution);
  const recentOps = data.slice(-14).map(d => d.operators);
  const recentStaked = data.slice(-14).map(d => d.staked_hype);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="HIP-3 Protocol Fees"
          value={formatUSD(latest.hip3_protocol_fees)}
          change={protocolFeesChange}
          subtitle="50% protocol share"
          sparkline={recentProtocolFees}
          accentColor="#f59e0b"
        />
        <KPICard
          label="Fee Contribution"
          value={formatPercent(latestComplete.hip3_fee_contribution)}
          change={feeContribChange}
          subtitle="of total HL fees"
          sparkline={recentContrib}
          accentColor="#a855f7"
        />
        <KPICard
          label="Operators"
          value={latest.operators.toString()}
          change={latest.operators > prev.operators ? ((latest.operators - prev.operators) / prev.operators) * 100 : 0}
          subtitle="active HIP-3"
          sparkline={recentOps}
          accentColor="#f59e0b"
        />
        <KPICard
          label="HYPE Staked"
          value={formatNumber(latest.staked_hype)}
          change={latest.staked_hype > prev.staked_hype ? ((latest.staked_hype - prev.staked_hype) / prev.staked_hype) * 100 : 0}
          subtitle={`${latest.operators} x 500K`}
          sparkline={recentStaked}
          accentColor="#a855f7"
        />
      </div>

      {/* Network Staking Context (from Dune) */}
      {networkStaking && (
        <div className="rounded-lg border border-[#1e1e2e] bg-[#111117] p-3">
          <div className="flex items-center gap-6 flex-wrap">
            <span className="text-[10px] font-mono text-[#8888a0] uppercase tracking-wider">L1 Network Staking</span>
            <span className="text-[11px] font-mono text-[#e2e2e8]">
              {networkStaking.totalStakedMillions.toFixed(1)}M HYPE staked
            </span>
            <span className="text-[11px] font-mono text-[#e2e2e8]">
              {networkStaking.stakingPercentage.toFixed(1)}% of supply
            </span>
            <span className="text-[11px] font-mono text-[#e2e2e8]">
              {networkStaking.yieldPercentage.toFixed(2)}% APR
            </span>
            <span className="text-[11px] font-mono text-[#e2e2e8]">
              {networkStaking.activeValidators} validators
            </span>
            <span className="text-[10px] font-mono text-[#5ae9b5]">via Dune</span>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <HIP3VolumeShareChart data={data} />
        <HIP3StakedChart data={data} />
      </div>

      {/* Operator Table */}
      <div className="rounded-lg border border-[#1e1e2e] bg-[#111117] p-4">
        <div className="mb-4">
          <h3 className="text-xs font-mono font-semibold text-[#e2e2e8] uppercase tracking-wider">HIP-3 Operators</h3>
          <p className="text-[10px] font-mono text-[#8888a0] mt-0.5">
            {operators ? 'Real operator data from HyperZap' : 'Estimated operator metrics'}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e1e2e]">
                <th className="text-left py-2.5 px-3 text-[10px] font-mono font-semibold text-[#8888a0] uppercase tracking-wider">Operator</th>
                <th className="text-right py-2.5 px-3 text-[10px] font-mono font-semibold text-[#8888a0] uppercase tracking-wider">HYPE Staked</th>
                <th className="text-right py-2.5 px-3 text-[10px] font-mono font-semibold text-[#8888a0] uppercase tracking-wider">Total Volume</th>
                <th className="text-right py-2.5 px-3 text-[10px] font-mono font-semibold text-[#8888a0] uppercase tracking-wider">Total Fees</th>
                <th className="text-right py-2.5 px-3 text-[10px] font-mono font-semibold text-[#8888a0] uppercase tracking-wider">Traders</th>
                <th className="text-center py-2.5 px-3 text-[10px] font-mono font-semibold text-[#8888a0] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {(operators || [
                { name: 'TradeXYZ', dex_id: 'xyz', volume: 82e9, fees: 7.6e6, users: 130000, trades: 26e6, liquidations: 400000, staked_hype: 500000, active: true },
                { name: 'Dreamcash', dex_id: 'cash', volume: 9e9, fees: 0.43e6, users: 5600, trades: 8e6, liquidations: 20000, staked_hype: 500000, active: true },
                { name: 'HyENA', dex_id: 'hyna', volume: 2.6e9, fees: 0.65e6, users: 10500, trades: 1.9e6, liquidations: 30000, staked_hype: 500000, active: true },
                { name: 'Felix', dex_id: 'flx', volume: 2.6e9, fees: 0.37e6, users: 8200, trades: 1.3e6, liquidations: 20000, staked_hype: 500000, active: true },
                { name: 'Kinetiq', dex_id: 'km', volume: 2e9, fees: 0.19e6, users: 5300, trades: 1.8e6, liquidations: 9000, staked_hype: 500000, active: true },
                { name: 'Ventuals', dex_id: 'vntl', volume: 0.37e9, fees: 0.09e6, users: 6300, trades: 380000, liquidations: 17000, staked_hype: 500000, active: true },
              ]).map((op) => (
                <tr key={op.name} className="border-b border-[#1e1e2e]/50 hover:bg-[#16161e] transition-colors">
                  <td className="py-2.5 px-3">
                    <span className="text-xs font-mono font-medium text-[#e2e2e8]">{op.name}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs font-mono text-[#e2e2e8]/70">
                    {formatNumber(op.staked_hype)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs font-mono text-[#e2e2e8]">
                    {formatUSD(op.volume)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs font-mono text-[#e2e2e8]/70">
                    {formatUSD(op.fees)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs font-mono text-[#e2e2e8]/70">
                    {formatNumber(op.users)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                      op.active
                        ? 'text-[#22c55e] bg-[#22c55e]/10'
                        : 'text-[#8888a0] bg-[#8888a0]/10'
                    }`}>
                      {op.active ? 'Active' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
