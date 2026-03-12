// Compute derived metrics from raw data

export function computeTakeRate(dailyFees: number, totalVolume: number): number {
  if (totalVolume === 0) return 0;
  return (dailyFees / totalVolume) * 10_000; // basis points
}

export function computeFdvFeesMultiple(fdv: number, fees30dMA: number): number {
  if (fees30dMA === 0) return 0;
  const annualizedFees = fees30dMA * 365;
  return fdv / annualizedFees;
}

export function computeMovingAverage(values: number[], window: number): number {
  if (values.length === 0) return 0;
  const slice = values.slice(-window);
  return slice.reduce((sum, v) => sum + v, 0) / slice.length;
}

export function computeHIP3Metrics(
  hip3Volume: number,
  totalPerpVolume: number,
  operatorCount: number
) {
  const volumeSharePct = totalPerpVolume > 0 ? (hip3Volume / totalPerpVolume) * 100 : 0;
  const hip3Fees = hip3Volume * 0.0008; // ~8 bps average
  const protocolShare = hip3Fees * 0.50;
  const stakedHype = operatorCount * 500_000;

  return {
    volumeSharePct,
    hip3Fees,
    protocolShare,
    stakedHype,
  };
}

export function computeMarketShare(
  protocolVolume: number,
  totalMarketVolume: number
): number {
  if (totalMarketVolume === 0) return 0;
  return (protocolVolume / totalMarketVolume) * 100;
}

export function computeCapitalStickiness(
  totalAddresses: number,
  addressesBridgedOut: number
): number {
  if (totalAddresses === 0) return 100;
  return (1 - addressesBridgedOut / totalAddresses) * 100;
}

// Format timestamp to YYYY-MM-DD
export function tsToDate(ts: number): string {
  return new Date(ts * 1000).toISOString().split('T')[0];
}

// Get percentage change between two values
export function pctChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}
