'use client';

import { KPICard } from '@/components/ui/kpi-card';
import { HIP3VolumeShareChart } from '@/components/charts/HIP3VolumeShareChart';
import { HIP3StakedChart } from '@/components/charts/HIP3StakedChart';
import { generateHIP3Data } from '@/lib/mock-data';
import { formatUSD, formatPercent, formatNumber } from '@/lib/constants';
import { useApiData } from '@/lib/use-api-data';

export default function HIP3Page() {
  // HIP-3 specific data requires builder fills CSV parsing — using estimates for now
  const { data } = useApiData(
    '__mock_hip3__',
    () => generateHIP3Data(400),
  );

  if (!data) return <div className="min-h-[400px]" />;

  const latest = data[data.length - 1];
  const prev = data[data.length - 2];

  const feeContribChange = prev.hip3_fee_contribution > 0
    ? (latest.hip3_fee_contribution - prev.hip3_fee_contribution)
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
          value={formatPercent(latest.hip3_fee_contribution)}
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <HIP3VolumeShareChart data={data} />
        <HIP3StakedChart data={data} />
      </div>

      {/* Operator Table */}
      <div className="rounded-lg border border-[#1e1e2e] bg-[#111117] p-4">
        <div className="mb-4">
          <h3 className="text-xs font-mono font-semibold text-[#e2e2e8] uppercase tracking-wider">HIP-3 Operators</h3>
          <p className="text-[10px] font-mono text-[#8888a0] mt-0.5">Known operators and their estimated metrics</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e1e2e]">
                <th className="text-left py-2.5 px-3 text-[10px] font-mono font-semibold text-[#8888a0] uppercase tracking-wider">Operator</th>
                <th className="text-right py-2.5 px-3 text-[10px] font-mono font-semibold text-[#8888a0] uppercase tracking-wider">HYPE Staked</th>
                <th className="text-right py-2.5 px-3 text-[10px] font-mono font-semibold text-[#8888a0] uppercase tracking-wider">Est. 24h Vol</th>
                <th className="text-right py-2.5 px-3 text-[10px] font-mono font-semibold text-[#8888a0] uppercase tracking-wider">Est. 24h Fees</th>
                <th className="text-center py-2.5 px-3 text-[10px] font-mono font-semibold text-[#8888a0] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Unit/TradeXYZ', vol: 82e6, active: true },
                { name: 'Ventuals', vol: 65e6, active: true },
                { name: 'Hyena', vol: 48e6, active: true },
                { name: 'Volmex', vol: 35e6, active: true },
                { name: 'Nunchi', vol: 28e6, active: true },
                { name: 'Felix', vol: 22e6, active: true },
                { name: 'Hyperbot', vol: 18e6, active: true },
                { name: 'Trove', vol: 14e6, active: false },
                { name: 'Flowblock', vol: 10e6, active: false },
              ].map((op) => (
                <tr key={op.name} className="border-b border-[#1e1e2e]/50 hover:bg-[#16161e] transition-colors">
                  <td className="py-2.5 px-3">
                    <span className="text-xs font-mono font-medium text-[#e2e2e8]">{op.name}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs font-mono text-[#e2e2e8]/70">
                    {formatNumber(500_000)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs font-mono text-[#e2e2e8]">
                    {formatUSD(op.vol)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs font-mono text-[#e2e2e8]/70">
                    {formatUSD(op.vol * 0.0008)}
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
