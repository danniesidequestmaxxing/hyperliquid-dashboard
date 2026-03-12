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
    };
  });
}

export function generateCompetitorData(days = 90) {
  const dates = generateDateRange(days);
  // DEX perp volumes ($ absolute)
  const hlVol = randomWalk(5.2e9, days, 0.08, 0.002);
  const lighterVol = randomWalk(2.8e9, days, 0.09, 0.003);
  const asterVol = randomWalk(3.4e9, days, 0.07, 0.002);
  const edgexVol = randomWalk(2.1e9, days, 0.08, 0.003);
  const otherDexVol = randomWalk(2.5e9, days, 0.06, 0.001);
  // Top 5 CEX perp volumes
  const binanceVol = randomWalk(45e9, days, 0.05, 0.001);
  const bybitVol = randomWalk(18e9, days, 0.06, 0.001);
  const okxVol = randomWalk(12e9, days, 0.05, 0.001);
  const bitgetVol = randomWalk(8e9, days, 0.06, 0.002);
  const gateVol = randomWalk(4e9, days, 0.07, 0.001);

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

export function generateTVLData(days = 90) {
  const dates = generateDateRange(days);
  const hlTVL = randomWalk(4.7e9, days, 0.03, 0.001);
  const asterTVL = randomWalk(1.8e9, days, 0.04, 0.003);
  const lighterTVL = randomWalk(1.1e9, days, 0.05, 0.002);
  const edgexTVL = randomWalk(0.4e9, days, 0.06, 0.004);

  return dates.map((date, i) => ({
    date,
    Hyperliquid: hlTVL[i],
    Aster: asterTVL[i],
    Lighter: lighterTVL[i],
    edgeX: edgexTVL[i],
  }));
}

export function generateHIP3Data(days = 90) {
  const dates = generateDateRange(days);
  const totalHLVolumes = randomWalk(5.2e9, days, 0.08, 0.002);
  const totalHLFeeRates = randomWalk(3.74, days, 0.03);
  // HIP-3 starts slow and ramps up
  const baseVolShare = dates.map((_, i) => {
    const ramp = Math.min(1, i / 60); // ramps over 60 days
    return rand(0.5, 1.5) + ramp * rand(2, 4);
  });
  const operators = dates.map((_, i) => Math.min(20, Math.floor(3 + i / 10)));

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

export function generateNetworkHealthData(days = 90) {
  const dates = generateDateRange(days);
  const oi = randomWalk(7.5e9, days, 0.06);
  const liqs = randomWalk(45e6, days, 0.25);

  return dates.map((date, i) => ({
    date,
    open_interest: oi[i],
    liquidation_volume: liqs[i],
    funding_rate: rand(-2, 5),
    adl_events: Math.random() > 0.95 ? Math.floor(rand(1, 5)) : 0,
    capital_stickiness: rand(89, 94),
    bridged_aster: rand(3, 6),
    bridged_lighter: rand(1, 3),
    bridged_edgex: rand(0.5, 2),
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
    // DEXs
    { name: 'Hyperliquid', type: 'DEX' as const, volume24h: 5.2e9, volume30d: 148e9, fees24h: 1.95e6, takeRate: 3.74, color: '#5ae9b5' },
    { name: 'Aster', type: 'DEX' as const, volume24h: 3.4e9, volume30d: 95e9, fees24h: 0.85e6, takeRate: 2.50, color: '#f59e0b' },
    { name: 'Lighter', type: 'DEX' as const, volume24h: 2.8e9, volume30d: 82e9, fees24h: 0.13e6, takeRate: 0.46, color: '#a855f7' },
    { name: 'edgeX', type: 'DEX' as const, volume24h: 2.1e9, volume30d: 58e9, fees24h: 0.42e6, takeRate: 2.00, color: '#22d3ee' },
    { name: 'Jupiter Perps', type: 'DEX' as const, volume24h: 0.9e9, volume30d: 25e9, fees24h: 0.36e6, takeRate: 4.00, color: '#c084fc' },
    { name: 'Drift', type: 'DEX' as const, volume24h: 0.7e9, volume30d: 19e9, fees24h: 0.28e6, takeRate: 4.00, color: '#fb923c' },
  ];
}
