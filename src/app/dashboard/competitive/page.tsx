'use client';

import { MarketShareChart } from '@/components/charts/MarketShareChart';
import { BridgeTVLChart } from '@/components/charts/BridgeTVLChart';
import { CompetitorTable } from '@/components/charts/CompetitorTable';
import { generateCompetitorData, generateTVLData, getCompetitorTable } from '@/lib/mock-data';
import { useApiData } from '@/lib/use-api-data';

interface CompetitorApiData {
  table: { name: string; type: 'CEX' | 'DEX'; volume24h: number; volume30d: number; fees24h: number; takeRate: number; color: string }[];
  tvlHistory: Record<string, string | number>[];
  hlVolHistory: { date: string; Hyperliquid: number }[];
  competitorSnapshot: { name: string; volume24h: number; type: string }[];
}

export default function CompetitivePage() {
  const { data: apiData } = useApiData<CompetitorApiData>(
    '/api/data/competitors',
    null,
    300_000
  );

  // Use mock data as fallback for charts that need historical series
  const { data: mockShareData } = useApiData(
    '__mock__', // Won't actually fetch
    () => generateCompetitorData(180),
  );
  const { data: mockTvlData } = useApiData(
    '__mock_tvl__',
    () => generateTVLData(180),
  );

  // Use real table data if available, otherwise mock
  const tableData = apiData?.table || getCompetitorTable();
  // Historical TVL/competitor volumes need daily DB snapshots; using mock for charts
  const tvlData = mockTvlData;
  const shareData = mockShareData;

  if (!shareData || !tvlData) return <div className="min-h-[400px]" />;

  return (
    <div className="space-y-4">
      <MarketShareChart data={shareData} />
      <BridgeTVLChart data={tvlData} />
      <CompetitorTable data={tableData} />
    </div>
  );
}
