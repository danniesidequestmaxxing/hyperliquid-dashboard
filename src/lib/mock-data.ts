// Realistic mock data generators for the HYPE dashboard
// Based on: HL daily volume ~$3-8B, daily fees ~$1-3M, take rate ~3.5-4.0 bps, FDV ~$35B, OI ~$5-10B

import { format, subDays } from 'date-fns';

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function generateDateRange(days: number) {
  const dates: string[] = [];
  for (let i = days; i >= 0; i--) {
    dates.push(format(subDays(new Date(), i), 'yyyy-MM-dd'));
  }
  return dates;
}

// Smooth random walk for realistic time series
function randomWalk(start: number, days: number, volatility: number, drift = 0): number[] {
  const values: number[] = [start];
  for (let i = 1; i <= days; i++) {
    const change = (Math.random() - 0.5) * 2 * volatility + drift;
    values.push(Math.max(0, values[i - 1] * (1 + change)));
  }
  return values;
}

export function generateFinancialsData(days = 365) {
  const dates = generateDateRange(days);
  const volumes = randomWalk(5.2e9, days, 0.08, 0.002);
  const feeRates = randomWalk(3.74, days, 0.03);
  // Generate FDV/fees multiple directly as random walk around 24.5x benchmark
  const multiples = randomWalk(24.5, days, 0.03);
  const oi = randomWalk(7.5e9, days, 0.06);
  const btcPrices = randomWalk(85000, days, 0.04, 0.001);

  return dates.map((date, i) => {
    const totalVolume = volumes[i];
    const perpVolume = totalVolume * rand(0.88, 0.95);
    const spotVolume = totalVolume - perpVolume;
    const takeRate = feeRates[i];
    const dailyFees = totalVolume * (takeRate / 10_000);

    // Calculate 30d MA fees for FDV derivation
    const recentFees = dates.slice(Math.max(0, i - 29), i + 1).map((_, j) => {
      const idx = Math.max(0, i - 29) + j;
      return volumes[idx] * (feeRates[idx] / 10_000);
    });
    const fees30dMA = recentFees.reduce((s, v) => s + v, 0) / recentFees.length;
    const fdvMultiple = multiples[i];
    // Derive FDV from the multiple and fees so the chart stays consistent
    const currentFdv = fees30dMA * 365 * fdvMultiple;

    return {
      date,
      perp_volume: perpVolume,
      spot_volume: spotVolume,
      total_volume: totalVolume,
      daily_fees: dailyFees,
      take_rate_bps: takeRate,
      fdv: currentFdv,
      fdv_multiple: fdvMultiple,
      open_interest: oi[i],
      hype_price: currentFdv / 1e9,
      btc_price: btcPrices[i],
    };
  });
}

export function generateCompetitorData(days = 900) {
  const dates = generateDateRange(days);
  // DEX perp volumes ($ absolute) — start smaller for longer lookback
  const hlVol = randomWalk(1.2e9, days, 0.06, 0.003);
  const lighterVol = randomWalk(0.4e9, days, 0.07, 0.004);
  const asterVol = randomWalk(0.6e9, days, 0.06, 0.003);
  const edgexVol = randomWalk(0.3e9, days, 0.07, 0.004);
  const otherDexVol = randomWalk(0.8e9, days, 0.05, 0.002);
  // Top 5 CEX perp volumes
  const binanceVol = randomWalk(30e9, days, 0.04, 0.001);
  const bybitVol = randomWalk(10e9, days, 0.05, 0.001);
  const okxVol = randomWalk(8e9, days, 0.04, 0.001);
  const bitgetVol = randomWalk(4e9, days, 0.05, 0.002);
  const gateVol = randomWalk(2e9, days, 0.06, 0.001);

  return dates.map((date, i) => ({
    date,
    Hyperliquid: hlVol[i],
    Lighter: lighterVol[i],
    Aster: asterVol[i],
    edgeX: edgexVol[i],
    'Other DEX': otherDexVol[i],
    Binance: binanceVol[i],
    Bybit: bybitVol[i],
    OKX: okxVol[i],
    Bitget: bitgetVol[i],
    'Gate.io': gateVol[i],
  }));
}

export function generateTVLData(days = 900) {
  const dates = generateDateRange(days);
  // Start smaller for longer lookback — grows over time
  const hlTVL = randomWalk(0.5e9, days, 0.03, 0.003);
  const asterTVL = randomWalk(0.2e9, days, 0.04, 0.004);
  const lighterTVL = randomWalk(0.1e9, days, 0.05, 0.004);
  const edgexTVL = randomWalk(0.05e9, days, 0.06, 0.005);

  return dates.map((date, i) => ({
    date,
    Hyperliquid: hlTVL[i],
    Aster: asterTVL[i],
    Lighter: lighterTVL[i],
    edgeX: edgexTVL[i],
  }));
}

export function generateHIP3Data(days = 400) {
  const dates = generateDateRange(days);
  const totalHLVolumes = randomWalk(3.0e9, days, 0.06, 0.002);
  const totalHLFeeRates = randomWalk(3.74, days, 0.03);
  // HIP-3 starts slow and ramps up over time
  const baseVolShare = dates.map((_, i) => {
    const ramp = Math.min(1, i / 120); // ramps over 120 days for longer lookback
    return rand(0.3, 1.0) + ramp * rand(2, 4);
  });
  const operators = dates.map((_, i) => Math.min(20, Math.floor(2 + i / 20)));

  return dates.map((date, i) => {
    const hip3Volume = baseVolShare[i] / 100 * totalHLVolumes[i];
    const hip3Fees = hip3Volume * 0.0008; // ~8 bps average HIP-3 fee
    const totalHLFees = totalHLVolumes[i] * (totalHLFeeRates[i] / 10_000);
    const hip3ProtocolFees = hip3Fees * 0.5; // 50% protocol share

    return {
      date,
      hip3_volume_share: baseVolShare[i],
      hip3_volume: hip3Volume,
      total_hl_volume: totalHLVolumes[i],
      total_hl_fees: totalHLFees,
      hip3_fees: hip3Fees,
      hip3_protocol_fees: hip3ProtocolFees,
      hip3_fee_contribution: totalHLFees > 0 ? (hip3ProtocolFees / totalHLFees) * 100 : 0,
      operators: operators[i],
      staked_hype: operators[i] * 500_000,
      auction_fees: rand(30_000, 80_000),
    };
  });
}

export function generateNetworkHealthData(days = 900) {
  const dates = generateDateRange(days);
  // Start lower for longer lookback — OI grew substantially over 2+ years
  const oi = randomWalk(1.5e9, days, 0.04, 0.003);
  const liqs = randomWalk(15e6, days, 0.20, 0.001);

  return dates.map((date, i) => ({
    date,
    open_interest: oi[i],
    liquidation_volume: liqs[i],
    funding_rate: rand(-2, 5),
    adl_events: Math.random() > 0.95 ? Math.floor(rand(1, 5)) : 0,
  }));
}

export function getLatestKPIs() {
  const data = generateFinancialsData(30);
  const latest = data[data.length - 1];
  const prev = data[data.length - 2];

  return {
    price: latest.hype_price,
    priceChange: ((latest.hype_price - prev.hype_price) / prev.hype_price) * 100,
    marketCap: latest.fdv * 0.24, // ~24% circulating
    fdv: latest.fdv,
    volume24h: latest.total_volume,
    dailyFees: latest.daily_fees,
    feesChange: ((latest.daily_fees - prev.daily_fees) / prev.daily_fees) * 100,
    takeRate: latest.take_rate_bps,
    takeRateChange: ((latest.take_rate_bps - prev.take_rate_bps) / prev.take_rate_bps) * 100,
    fdvMultiple: latest.fdv_multiple,
    multipleChange: ((latest.fdv_multiple - prev.fdv_multiple) / prev.fdv_multiple) * 100,
    oi: latest.open_interest,
    oiChange: ((latest.open_interest - prev.open_interest) / prev.open_interest) * 100,
  };
}

// Competitor table data
export function getCompetitorTable() {
  return [
    // CEXs
    { name: 'Binance', type: 'CEX' as const, volume24h: 45e9, volume30d: 1.3e12, fees24h: 22.5e6, takeRate: 5.00, color: '#F0B90B' },
    { name: 'Bybit', type: 'CEX' as const, volume24h: 18e9, volume30d: 510e9, fees24h: 7.2e6, takeRate: 4.00, color: '#F7A600' },
    { name: 'OKX', type: 'CEX' as const, volume24h: 12e9, volume30d: 340e9, fees24h: 4.8e6, takeRate: 4.00, color: '#FFFFFF' },
    { name: 'Bitget', type: 'CEX' as const, volume24h: 8e9, volume30d: 225e9, fees24h: 3.2e6, takeRate: 4.00, color: '#00C8B5' },
    { name: 'Gate.io', type: 'CEX' as const, volume24h: 4e9, volume30d: 112e9, fees24h: 1.6e6, takeRate: 4.00, color: '#2354E6' },
    // DEXs (with FDV and valuation multiples from Caladan comps table)
    { name: 'Hyperliquid', type: 'DEX' as const, volume24h: 5.2e9, volume30d: 148e9, fees24h: 1.95e6, takeRate: 3.74, color: '#5ae9b5', fdv: 22e9, fdvRevenueMultiple: 30.9 },
    { name: 'Aster', type: 'DEX' as const, volume24h: 3.4e9, volume30d: 95e9, fees24h: 0.85e6, takeRate: 2.50, color: '#f59e0b', fdv: 5.06e9, fdvRevenueMultiple: 16.3, impliedHLPrice: 11.6 },
    { name: 'Lighter', type: 'DEX' as const, volume24h: 2.8e9, volume30d: 82e9, fees24h: 0.13e6, takeRate: 0.46, color: '#a855f7', fdv: 1.79e9, fdvRevenueMultiple: 37.7, impliedHLPrice: 26.8 },
    { name: 'edgeX', type: 'DEX' as const, volume24h: 2.1e9, volume30d: 58e9, fees24h: 0.42e6, takeRate: 2.00, color: '#22d3ee' },
    { name: 'Jupiter Perps', type: 'DEX' as const, volume24h: 0.9e9, volume30d: 25e9, fees24h: 0.36e6, takeRate: 4.00, color: '#c084fc', fdv: 8.25e9, fdvRevenueMultiple: 62.8, impliedHLPrice: 44.7 },
    { name: 'Drift', type: 'DEX' as const, volume24h: 0.7e9, volume30d: 19e9, fees24h: 0.28e6, takeRate: 4.00, color: '#fb923c', fdv: 1.53e9, fdvRevenueMultiple: 15.0, impliedHLPrice: 10.7 },
    { name: 'Vertex', type: 'DEX' as const, volume24h: 0.6e9, volume30d: 17e9, fees24h: 0.12e6, takeRate: 2.00, color: '#10b981', fdv: 0.38e9, fdvRevenueMultiple: 8.7, impliedHLPrice: 6.2 },
    { name: 'GMX', type: 'DEX' as const, volume24h: 0.5e9, volume30d: 14e9, fees24h: 0.50e6, takeRate: 10.0, color: '#3b82f6', fdv: 0.32e9, fdvRevenueMultiple: 1.8, impliedHLPrice: 1.3 },
    { name: 'Aevo', type: 'DEX' as const, volume24h: 0.4e9, volume30d: 11e9, fees24h: 0.08e6, takeRate: 2.00, color: '#8b5cf6', fdv: 0.65e9, fdvRevenueMultiple: 22.3, impliedHLPrice: 15.9 },
    { name: 'Paradex', type: 'DEX' as const, volume24h: 0.3e9, volume30d: 8e9, fees24h: 0.06e6, takeRate: 2.00, color: '#38bdf8' },
  ];
}

// Supply & Buybacks mock data
export function generateSupplyData() {
  const months: string[] = [];
  const start = new Date(2025, 0, 1); // Jan 2025
  for (let i = 0; i < 20; i++) { // 20 months (Jan 2025 - Aug 2026)
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  let circulatingSupply = 336_000_000;
  let cumulativeNetChange = 0;
  const priceWalk = randomWalk(22, months.length, 0.08, 0.01);
  const feeWalk = randomWalk(60_000_000, months.length, 0.1, 0.005); // ~$60M/month

  const monthly = months.map((month, i) => {
    const avgPrice = priceWalk[i];
    const monthFees = feeWalk[i];
    const unlocks = month >= '2025-11' ? 10_000_000 : 0;
    const buybackUsd = monthFees * 0.99;
    const buybacks = avgPrice > 0 ? Math.round(buybackUsd / avgPrice) : 0;
    const netChange = unlocks - buybacks;
    cumulativeNetChange += netChange;
    circulatingSupply += netChange;
    const isProjected = month > format(new Date(), 'yyyy-MM');

    return {
      month,
      unlocks,
      grossUnlocks: unlocks,
      unlocksUsd: unlocks * avgPrice,
      buybacks,
      buybacksUsd: buybackUsd,
      netChange: Math.round(netChange),
      cumulativeNetChange: Math.round(cumulativeNetChange),
      circulatingSupply: Math.round(circulatingSupply),
      avgPrice,
      isProjected,
    };
  });

  const latestPrice = priceWalk[priceWalk.length - 1];
  const fees30dMA = feeWalk[feeWalk.length - 1] / 30;
  const annualizedFees = fees30dMA * 365;
  const annualBuybackTokens = latestPrice > 0 ? (annualizedFees * 0.99) / latestPrice : 0;
  const netMonthlyPressure = 10_000_000 - annualBuybackTokens / 12;

  const historicalMonths = monthly.filter(m => !m.isProjected);
  const lastHist = historicalMonths[historicalMonths.length - 1];
  const prevHist = historicalMonths[historicalMonths.length - 2];

  // Daily price history
  const priceDays = randomWalk(18, 365, 0.03, 0.002);
  const priceHistory = generateDateRange(365).map((date, i) => ({
    date,
    price: priceDays[Math.min(i, priceDays.length - 1)],
  }));

  return {
    kpis: {
      circulatingSupply: lastHist?.circulatingSupply || 336_000_000,
      circulatingChangePct: prevHist
        ? ((lastHist.circulatingSupply - prevHist.circulatingSupply) / prevHist.circulatingSupply) * 100
        : 0,
      monthlyUnlockUsd: 10_000_000 * latestPrice,
      annualBuybackTokens: Math.round(annualBuybackTokens),
      netMonthlyPressure: Math.round(netMonthlyPressure),
      netMonthlyPressureUsd: netMonthlyPressure * latestPrice,
      neutralizationPct: (annualizedFees / 2_600_000_000) * 100,
      annualizedRevenue: annualizedFees,
      hypePrice: latestPrice,
    },
    monthly,
    priceHistory,
  };
}
