import { NextResponse } from 'next/server';
import { fetchAllDerivatives, fetchAllFees, fetchProtocolTVL, fetchDerivativesVolumeHistory } from '@/lib/api/defillama';

export const revalidate = 300;

// Map DefiLlama names to our display names and colors
const DEX_MAP: Record<string, { display: string; color: string; type: 'DEX' | 'CEX' }> = {
  'Hyperliquid': { display: 'Hyperliquid', color: '#5ae9b5', type: 'DEX' },
  'Hyperliquid Perps': { display: 'Hyperliquid', color: '#5ae9b5', type: 'DEX' },
  'Lighter': { display: 'Lighter', color: '#a855f7', type: 'DEX' },
  'Lighter v2': { display: 'Lighter', color: '#a855f7', type: 'DEX' },
  'Aster DEX': { display: 'Aster', color: '#f59e0b', type: 'DEX' },
  'edgeX': { display: 'edgeX', color: '#22d3ee', type: 'DEX' },
  'Jupiter Perpetual Exchange': { display: 'Jupiter Perps', color: '#c084fc', type: 'DEX' },
  'Jupiter Perpetual': { display: 'Jupiter Perps', color: '#c084fc', type: 'DEX' },
  'Drift': { display: 'Drift', color: '#fb923c', type: 'DEX' },
  'Drift Trade': { display: 'Drift', color: '#fb923c', type: 'DEX' },
  'dYdX': { display: 'dYdX', color: '#6366f1', type: 'DEX' },
  'dYdX V4': { display: 'dYdX', color: '#6366f1', type: 'DEX' },
  'Paradex': { display: 'Paradex', color: '#38bdf8', type: 'DEX' },
};

const TVL_SLUGS = [
  { slug: 'hyperliquid', name: 'Hyperliquid', color: '#5ae9b5' },
  { slug: 'lighter-xyz', name: 'Lighter', color: '#a855f7' },
  { slug: 'aster-dex', name: 'Aster', color: '#f59e0b' },
  { slug: 'edgex', name: 'edgeX', color: '#22d3ee' },
];

export async function GET() {
  try {
    const [derivativesResult, feesResult, ...tvlResults] = await Promise.allSettled([
      fetchAllDerivatives(),
      fetchAllFees(),
      ...TVL_SLUGS.map(s => fetchProtocolTVL(s.slug)),
    ]);

    // ── Competitor Table ──
    const derivatives = derivativesResult.status === 'fulfilled' ? derivativesResult.value : [];
    const allFees = feesResult.status === 'fulfilled' ? feesResult.value : [];

    const feeMap = new Map(allFees.map(f => [f.name, f]));

    interface TableRow {
      name: string;
      type: 'DEX' | 'CEX';
      volume24h: number;
      volume30d: number;
      fees24h: number;
      takeRate: number;
      color: string;
    }

    const mapped = derivatives
      .filter(p => DEX_MAP[p.name])
      .map(p => {
        const m = DEX_MAP[p.name];
        const fee = feeMap.get(p.name);
        const vol24h = p.total24h || 0;
        const vol30d = p.total30d || (p.total7d ? p.total7d * 4.3 : 0);
        const fees24h = fee?.total24h || 0;
        const takeRate = vol24h > 0 ? (fees24h / vol24h) * 10_000 : 0;
        return {
          name: m.display,
          type: m.type,
          volume24h: vol24h,
          volume30d: vol30d,
          fees24h,
          takeRate,
          color: m.color,
        } as TableRow;
      });

    // Deduplicate by name (keep highest volume entry)
    const deduped: TableRow[] = [];
    for (const item of mapped) {
      const idx = deduped.findIndex(a => a.name === item.name);
      if (idx === -1) {
        deduped.push(item);
      } else if (item.volume24h > deduped[idx].volume24h) {
        deduped[idx] = item;
      }
    }
    const table = deduped.sort((a, b) => b.volume24h - a.volume24h);

    // ── Historical volume chart (Hyperliquid only for now — competitor history needs daily snapshots) ──
    let hlVolHistory: { date: string; Hyperliquid: number }[] = [];
    try {
      const hlHist = await fetchDerivativesVolumeHistory('hyperliquid');
      hlVolHistory = hlHist.slice(-90).map(d => ({
        date: new Date(d.timestamp * 1000).toISOString().split('T')[0],
        Hyperliquid: d.value,
      }));
    } catch { /* skip */ }

    // ── TVL data ──
    const tvlData: Record<string, { date: string; [key: string]: string | number }[]> = {};
    TVL_SLUGS.forEach((slug, i) => {
      const result = tvlResults[i];
      if (result.status === 'fulfilled') {
        tvlData[slug.name] = result.value.slice(-90).map(d => ({
          date: new Date(d.timestamp * 1000).toISOString().split('T')[0],
          [slug.name]: d.tvl,
        }));
      }
    });

    // Merge TVL data into single array by date
    const tvlDateMap = new Map<string, Record<string, string | number>>();
    for (const [name, entries] of Object.entries(tvlData)) {
      for (const entry of entries) {
        const existing = tvlDateMap.get(entry.date) || { date: entry.date };
        existing[name] = entry[name];
        tvlDateMap.set(entry.date, existing);
      }
    }
    const tvlHistory = [...tvlDateMap.values()].sort((a, b) => (a.date as string).localeCompare(b.date as string));

    // ── Market share chart data from competitor 24h snapshots ──
    // Build a single-day snapshot for the chart (for historical, we'd need a DB)
    const competitorSnapshot = derivatives
      .filter(p => p.total24h && p.total24h > 0)
      .map(p => ({
        name: DEX_MAP[p.name]?.display || p.name,
        volume24h: p.total24h || 0,
        type: DEX_MAP[p.name]?.type || 'DEX',
      }))
      .sort((a, b) => b.volume24h - a.volume24h);

    return NextResponse.json({
      table,
      tvlHistory,
      hlVolHistory,
      competitorSnapshot,
      tvlSlugs: TVL_SLUGS,
    });
  } catch (error) {
    console.error('Competitors API error:', error);
    return NextResponse.json({ error: 'Failed to fetch competitor data' }, { status: 500 });
  }
}
