'use client';

import { useMemo } from 'react';
import { MarketShareChart } from '@/components/charts/MarketShareChart';
import { BridgeTVLChart } from '@/components/charts/BridgeTVLChart';
import { CompetitorTable } from '@/components/charts/CompetitorTable';
import { generateCompetitorData, generateTVLData, getCompetitorTable } from '@/lib/mock-data';
import { useApiData } from '@/lib/use-api-data';

interface CompetitorApiData {
  table: { name: string; type: 'CEX' | 'DEX'; volume24h: number; volume30d: number; fees24h: number; takeRate: number; color: string; fdv?: number; fdvRevenueMultiple?: number; impliedHLPrice?: number }[];
  tvlHistory: Record<string, string | number>[];
  hlVolHistory: { date: string; Hyperliquid: number }[];
  competitorSnapshot: { name: string; volume24h: number; type: string }[];
  hypePrice?: number;
}

export default function CompetitivePage() {
  const { data: apiData } = useApiData<CompetitorApiData>(
    '/api/data/competitors',
    null,
    300_000
  );

  // Use mock data as fallback for market share chart (no real historical volume API available)
  const { data: mockShareData } = useApiData(
    '__mock__',
    () => generateCompetitorData(900),
  );

  // Use real table data if available, otherwise mock
  const tableData = apiData?.table && apiData.table.length > 0 ? apiData.table : getCompetitorTable();

  // Use real TVL data from API (DefiLlama), fallback to extended mock
  const tvlData = useMemo(() => {
    if (apiData?.tvlHistory && apiData.tvlHistory.length > 0) {
      return apiData.tvlHistory as { date: string; Hyperliquid: number; Aster: number; Lighter: number; edgeX: number }[];
    }
    return generateTVLData(900);
  }, [apiData?.tvlHistory]);

  const shareData = mockShareData;

  if (!shareData) return <div className="min-h-[400px]" />;

  return (
    <div className="space-y-4">
      <MarketShareChart data={shareData} />
      <BridgeTVLChart data={tvlData} />
      <CompetitorTable data={tableData} hypePrice={apiData?.hypePrice} />
    </div>
  );
}
