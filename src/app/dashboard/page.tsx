'use client';

import { KPICard } from '@/components/ui/kpi-card';
import { VolumeFeesChart } from '@/components/charts/VolumeFeesChart';
import { FDVMultipleChart } from '@/components/charts/FDVMultipleChart';
import { PriceOverlayChart } from '@/components/charts/PriceOverlayChart';
import { BTCCorrelationChart } from '@/components/charts/BTCCorrelationChart';
import { generateFinancialsData } from '@/lib/mock-data';
import { formatUSD, formatMultiple } from '@/lib/constants';
import { useApiData } from '@/lib/use-api-data';

interface FinancialDataPoint {
  date: string;
  perp_volume: number;
  spot_volume: number;
  total_volume: number;
  daily_fees: number;
  take_rate_bps: number;
  fdv: number;
  fdv_multiple: number;
  open_interest: number;
  hype_price: number;
  btc_price: number;
}

export default function FinancialsPage() {
  const { data, loading } = useApiData<FinancialDataPoint[]>(
    '/api/data/financials',
    () => generateFinancialsData(365),
    300_000
  );

  if (loading || !data || data.length < 2) return <div className="min-h-[400px]" />;

  const latest = data[data.length - 1];
  const prev = data[data.length - 2];
  const recentFees = data.slice(-14).map(d => d.daily_fees);
  const recentMultiples = data.slice(-14).map(d => d.fdv_multiple);
  const recentVolumes = data.slice(-14).map(d => d.total_volume);

  const feesChange = prev.daily_fees > 0 ? ((latest.daily_fees - prev.daily_fees) / prev.daily_fees) * 100 : 0;
  const volChange = prev.total_volume > 0 ? ((latest.total_volume - prev.total_volume) / prev.total_volume) * 100 : 0;
  const multipleChange = prev.fdv_multiple > 0
    ? ((latest.fdv_multiple - prev.fdv_multiple) / prev.fdv_multiple) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KPICard
          label="Daily Fees"
          value={formatUSD(latest.daily_fees)}
          change={feesChange}
          subtitle="24h"
          sparkline={recentFees}
          accentColor="#f59e0b"
        />
        <KPICard
          label="FDV / Fees"
          value={formatMultiple(latest.fdv_multiple)}
          change={multipleChange}
          subtitle="annualized"
          sparkline={recentMultiples}
          accentColor="#a855f7"
        />
        <KPICard
          label="Total Volume"
          value={formatUSD(latest.total_volume)}
          change={volChange}
          subtitle="24h"
          sparkline={recentVolumes}
          accentColor="#22d3ee"
        />
      </div>

      <VolumeFeesChart data={data} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <FDVMultipleChart data={data} />
        <PriceOverlayChart data={data} />
      </div>
      <BTCCorrelationChart data={data} />
    </div>
  );
}
