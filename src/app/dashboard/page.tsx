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
  swpe?: number;
  circulating_supply?: number;
  rfs_market_cap?: number;
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
  const recentSwpe = data.slice(-14).map(d => d.swpe || d.fdv_multiple);
  const recentVolumes = data.slice(-14).map(d => d.total_volume);

  const feesChange = prev.daily_fees > 0 ? ((latest.daily_fees - prev.daily_fees) / prev.daily_fees) * 100 : 0;
  const volChange = prev.total_volume > 0 ? ((latest.total_volume - prev.total_volume) / prev.total_volume) * 100 : 0;
  const swpeChange = (prev.swpe || prev.fdv_multiple) > 0
    ? (((latest.swpe || latest.fdv_multiple) - (prev.swpe || prev.fdv_multiple)) / (prev.swpe || prev.fdv_multiple)) * 100 : 0;

  const swpeValue = latest.swpe || latest.fdv_multiple;

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
          label="SWPE (Float P/E)"
          value={formatMultiple(swpeValue)}
          change={swpeChange}
          subtitle="yrs of earnings to buy float"
          sparkline={recentSwpe}
          accentColor="#5ae9b5"
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
