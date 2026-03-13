// Investment signal engine for HYPE
// Combines valuation, momentum, fee growth, and catalyst metrics
// into a composite Buy / Hold / Sell recommendation

export type SignalRating = 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG SELL';

export interface FactorScore {
  name: string;
  score: number;       // -1 (strong sell) to +1 (strong buy)
  weight: number;      // Relative importance
  signal: SignalRating;
  detail: string;      // Human-readable explanation
  value: string;       // Current metric value
  threshold: string;   // What benchmark it's compared against
}

export interface CompositeSignal {
  overall: SignalRating;
  compositeScore: number;  // -1 to +1
  factors: FactorScore[];
  summary: string;
}

export interface HistoricalSignal {
  date: string;
  price: number;
  compositeScore: number;
  signal: SignalRating;
  fdvMultiple: number;
  feeGrowth: number;
  momentum: number;
}

function scoreToSignal(score: number): SignalRating {
  if (score >= 0.6) return 'STRONG BUY';
  if (score >= 0.2) return 'BUY';
  if (score > -0.2) return 'HOLD';
  if (score > -0.6) return 'SELL';
  return 'STRONG SELL';
}

// ── Factor 1: Valuation (FDV/Fees Multiple) ──
// Lower = cheaper = more attractive
function scoreValuation(currentMultiple: number, historicalMultiples: number[]): FactorScore {
  const sorted = [...historicalMultiples].sort((a, b) => a - b);
  const percentile = sorted.filter(v => v <= currentMultiple).length / sorted.length;

  // Score: cheap (<15x) → +1, fair (24.5x) → 0, expensive (>35x) → -1
  let score: number;
  if (currentMultiple <= 12) score = 1.0;
  else if (currentMultiple <= 15) score = 0.8;
  else if (currentMultiple <= 18) score = 0.5;
  else if (currentMultiple <= 22) score = 0.2;
  else if (currentMultiple <= 27) score = 0.0;
  else if (currentMultiple <= 30) score = -0.3;
  else if (currentMultiple <= 35) score = -0.6;
  else score = -1.0;

  const pctLabel = `${(percentile * 100).toFixed(0)}th`;

  let detail: string;
  if (score >= 0.5) detail = `Trading at ${currentMultiple.toFixed(1)}x — historically cheap (${pctLabel} percentile). Valuation is compelling relative to fee generation.`;
  else if (score >= 0) detail = `Trading at ${currentMultiple.toFixed(1)}x — near fair value (${pctLabel} percentile). Not expensive but limited margin of safety.`;
  else detail = `Trading at ${currentMultiple.toFixed(1)}x — elevated valuation (${pctLabel} percentile). Fees need to grow into this price.`;

  return {
    name: 'Valuation (FDV/Fees)',
    score,
    weight: 0.25,
    signal: scoreToSignal(score),
    detail,
    value: `${currentMultiple.toFixed(1)}x`,
    threshold: '24.5x fair value',
  };
}

// ── Factor 2: Price Momentum ──
// Price vs moving averages + trend direction
function scoreMomentum(prices: number[]): FactorScore {
  if (prices.length < 50) {
    return { name: 'Price Momentum', score: 0, weight: 0.20, signal: 'HOLD', detail: 'Insufficient data', value: 'N/A', threshold: '50d MA crossover' };
  }

  const current = prices[prices.length - 1];
  const ma20 = avg(prices.slice(-20));
  const ma50 = avg(prices.slice(-50));

  // Trend: is 20d MA above 50d MA?
  const maCross = ma20 > ma50;
  // Price vs 50d MA
  const priceVsMa50 = (current - ma50) / ma50;
  // Recent momentum: 14d rate of change
  const roc14 = prices.length >= 14 ? (current - prices[prices.length - 14]) / prices[prices.length - 14] : 0;

  let score = 0;
  // Price above 50d MA: bullish
  if (priceVsMa50 > 0.10) score += 0.3;
  else if (priceVsMa50 > 0) score += 0.15;
  else if (priceVsMa50 > -0.10) score -= 0.15;
  else score -= 0.3;

  // MA crossover
  if (maCross) score += 0.25;
  else score -= 0.25;

  // Recent momentum
  if (roc14 > 0.05) score += 0.2;
  else if (roc14 > 0) score += 0.1;
  else if (roc14 > -0.05) score -= 0.1;
  else score -= 0.2;

  score = clamp(score, -1, 1);

  const trendWord = maCross ? 'bullish' : 'bearish';
  const priceVsMA = priceVsMa50 >= 0 ? 'above' : 'below';
  const detail = `Price is ${(Math.abs(priceVsMa50) * 100).toFixed(1)}% ${priceVsMA} 50d MA. 20d/50d MA cross is ${trendWord}. 14d change: ${(roc14 * 100).toFixed(1)}%.`;

  return {
    name: 'Price Momentum',
    score,
    weight: 0.20,
    signal: scoreToSignal(score),
    detail,
    value: `${priceVsMA} 50d MA`,
    threshold: '50d MA crossover',
  };
}

// ── Factor 3: Fee Growth ──
// Are protocol fees accelerating or decelerating?
function scoreFeeGrowth(dailyFees: number[]): FactorScore {
  if (dailyFees.length < 60) {
    return { name: 'Fee Growth', score: 0, weight: 0.25, signal: 'HOLD', detail: 'Insufficient data', value: 'N/A', threshold: '30d vs 60d MA' };
  }

  const ma30 = avg(dailyFees.slice(-30));
  const ma60 = avg(dailyFees.slice(-60));
  const ma90 = dailyFees.length >= 90 ? avg(dailyFees.slice(-90)) : ma60;

  // Fee acceleration: 30d MA vs 60d MA
  const feeGrowthRate = (ma30 - ma60) / ma60;
  // Longer trend: 30d vs 90d
  const longerTrend = (ma30 - ma90) / ma90;

  let score = 0;
  // Short-term growth
  if (feeGrowthRate > 0.15) score += 0.5;
  else if (feeGrowthRate > 0.05) score += 0.3;
  else if (feeGrowthRate > -0.05) score += 0;
  else if (feeGrowthRate > -0.15) score -= 0.3;
  else score -= 0.5;

  // Longer trend adds conviction
  if (longerTrend > 0.10) score += 0.3;
  else if (longerTrend > 0) score += 0.1;
  else if (longerTrend > -0.10) score -= 0.1;
  else score -= 0.3;

  score = clamp(score, -1, 1);

  const growthPct = (feeGrowthRate * 100).toFixed(1);
  const direction = feeGrowthRate >= 0 ? 'growing' : 'declining';
  const detail = `30d avg fees ${direction} at ${growthPct}% vs 60d avg. ${longerTrend >= 0 ? 'Longer-term trend supportive.' : 'Longer-term trend weakening.'} Sustainable fee growth directly supports valuation.`;

  return {
    name: 'Fee Growth',
    score,
    weight: 0.25,
    signal: scoreToSignal(score),
    detail,
    value: `${feeGrowthRate >= 0 ? '+' : ''}${growthPct}%`,
    threshold: '30d vs 60d fee MA',
  };
}

// ── Factor 4: HIP-3 Catalyst ──
// Is HIP-3 adoption accelerating? More operators = more fee contribution = catalyst
function scoreCatalyst(
  hip3FeeContributions: number[],
  operatorCounts: number[],
): FactorScore {
  if (hip3FeeContributions.length < 30) {
    return { name: 'HIP-3 Catalyst', score: 0, weight: 0.10, signal: 'HOLD', detail: 'Insufficient data', value: 'N/A', threshold: 'Adoption trajectory' };
  }

  const recentContrib = avg(hip3FeeContributions.slice(-7));
  const olderContrib = avg(hip3FeeContributions.slice(-30, -7));
  const contribGrowth = olderContrib > 0 ? (recentContrib - olderContrib) / olderContrib : 0;

  const currentOps = operatorCounts[operatorCounts.length - 1] || 0;
  const oldOps = operatorCounts[Math.max(0, operatorCounts.length - 30)] || 0;
  const opsGrowth = oldOps > 0 ? (currentOps - oldOps) / oldOps : 0;

  let score = 0;
  // Fee contribution trending up
  if (contribGrowth > 0.20) score += 0.4;
  else if (contribGrowth > 0.05) score += 0.2;
  else if (contribGrowth > -0.05) score += 0;
  else score -= 0.2;

  // Operator growth
  if (opsGrowth > 0.20) score += 0.4;
  else if (opsGrowth > 0) score += 0.2;
  else score -= 0.1;

  // Absolute level matters too
  if (recentContrib > 5) score += 0.2;
  else if (recentContrib > 2) score += 0.1;

  score = clamp(score, -1, 1);

  const detail = `HIP-3 contributing ${recentContrib.toFixed(1)}% of protocol fees (${contribGrowth >= 0 ? 'up' : 'down'} ${(Math.abs(contribGrowth) * 100).toFixed(0)}% vs prior month). ${currentOps} active operators (${opsGrowth >= 0 ? '+' : ''}${(opsGrowth * 100).toFixed(0)}% growth). ${score > 0.2 ? 'Catalyst active.' : score > -0.2 ? 'Catalyst neutral.' : 'Catalyst fading.'}`;

  return {
    name: 'HIP-3 Catalyst',
    score,
    weight: 0.10,
    signal: scoreToSignal(score),
    detail,
    value: `${recentContrib.toFixed(1)}% of fees`,
    threshold: 'Adoption trajectory',
  };
}

// ── Factor 5: Supply Pressure ──
// Net inflationary/deflationary pressure from unlocks vs buybacks
function scoreSupplyPressure(neutralizationPct: number, netMonthlyPressure: number): FactorScore {
  // neutralizationPct: % of unlock supply offset by buybacks (0-100+)
  // netMonthlyPressure: net HYPE tokens added/removed per month (positive = inflationary)

  let score: number;
  if (neutralizationPct >= 100) score = 0.8;       // Fully deflationary
  else if (neutralizationPct >= 75) score = 0.4;    // Mostly offset
  else if (neutralizationPct >= 50) score = 0.0;    // Half offset
  else if (neutralizationPct >= 25) score = -0.4;   // Mostly inflationary
  else score = -0.8;                                  // Heavy dilution

  // Adjust for absolute pressure magnitude
  const monthlyPressurePct = (netMonthlyPressure / 336_000_000) * 100; // as % of circ supply
  if (monthlyPressurePct > 3) score -= 0.2;  // >3% monthly inflation is severe
  else if (monthlyPressurePct < -1) score += 0.2;  // Deflation is positive

  score = clamp(score, -1, 1);

  const direction = netMonthlyPressure > 0 ? 'inflationary' : 'deflationary';
  const detail = `Buybacks offset ${neutralizationPct.toFixed(0)}% of unlock supply. Net ${direction} pressure of ${Math.abs(netMonthlyPressure / 1e6).toFixed(1)}M HYPE/month (${Math.abs(monthlyPressurePct).toFixed(1)}% of circ supply). ${neutralizationPct >= 50 ? 'Supply dynamics manageable.' : 'Significant dilution headwind.'}`;

  return {
    name: 'Supply Pressure',
    score,
    weight: 0.10,
    signal: scoreToSignal(score),
    detail,
    value: `${neutralizationPct.toFixed(0)}% offset`,
    threshold: '100% = net neutral',
  };
}

// ── Factor 6: BTC Correlation ──
// High correlation + BTC weakness = bearish; low correlation = independent catalyst story
function scoreBTCCorrelation(hypeReturns: number[], btcReturns: number[], btcMomentum: number): FactorScore {
  if (hypeReturns.length < 30 || btcReturns.length < 30) {
    return { name: 'BTC Regime', score: 0, weight: 0.05, signal: 'HOLD', detail: 'Insufficient data', value: 'N/A', threshold: 'Correlation + BTC trend' };
  }

  const corr = pearsonCorr(btcReturns.slice(-30), hypeReturns.slice(-30));
  const beta = computeBetaHelper(btcReturns.slice(-30), hypeReturns.slice(-30));

  let score = 0;

  // If BTC is strong and HYPE is correlated → tailwind
  if (btcMomentum > 0.05 && corr > 0.5) score = 0.3;
  // If BTC is weak and HYPE is correlated → headwind
  else if (btcMomentum < -0.05 && corr > 0.5) score = -0.4;
  // If HYPE is decoupled → slightly positive (independent story)
  else if (corr < 0.3) score = 0.2;
  // High beta amplifies risk
  else if (beta > 1.5 && btcMomentum < 0) score = -0.3;
  else score = 0;

  score = clamp(score, -1, 1);

  const corrLabel = corr > 0.6 ? 'highly correlated' : corr > 0.3 ? 'moderately correlated' : 'weakly correlated';
  const btcDir = btcMomentum > 0 ? 'bullish' : 'bearish';
  const detail = `HYPE is ${corrLabel} with BTC (ρ=${corr.toFixed(2)}, β=${beta.toFixed(2)}). BTC 30d trend is ${btcDir} (${(btcMomentum * 100).toFixed(1)}%). ${corr > 0.5 && btcMomentum < 0 ? 'High correlation + BTC weakness = headwind.' : corr < 0.3 ? 'Low correlation suggests idiosyncratic drivers.' : 'Monitoring macro regime.'}`;

  return {
    name: 'BTC Regime',
    score,
    weight: 0.05,
    signal: scoreToSignal(score),
    detail,
    value: `ρ=${corr.toFixed(2)} β=${beta.toFixed(1)}`,
    threshold: 'Correlation + BTC trend',
  };
}

function pearsonCorr(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;
  const mx = x.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const my = y.slice(0, n).reduce((s, v) => s + v, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const xd = x[i] - mx;
    const yd = y[i] - my;
    num += xd * yd;
    dx += xd * xd;
    dy += yd * yd;
  }
  return Math.sqrt(dx * dy) > 0 ? num / Math.sqrt(dx * dy) : 0;
}

function computeBetaHelper(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;
  const mx = x.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const my = y.slice(0, n).reduce((s, v) => s + v, 0) / n;
  let cov = 0, varX = 0;
  for (let i = 0; i < n; i++) {
    cov += (x[i] - mx) * (y[i] - my);
    varX += (x[i] - mx) ** 2;
  }
  return varX > 0 ? cov / varX : 0;
}

// ── Factor 7: Volume Trend ──
// Rising volume confirms price moves
function scoreVolumeTrend(volumes: number[]): FactorScore {
  if (volumes.length < 30) {
    return { name: 'Volume Trend', score: 0, weight: 0.05, signal: 'HOLD', detail: 'Insufficient data', value: 'N/A', threshold: '7d vs 30d avg' };
  }

  const ma7 = avg(volumes.slice(-7));
  const ma30 = avg(volumes.slice(-30));
  const volChange = (ma7 - ma30) / ma30;

  let score: number;
  if (volChange > 0.20) score = 0.6;
  else if (volChange > 0.05) score = 0.3;
  else if (volChange > -0.05) score = 0;
  else if (volChange > -0.20) score = -0.3;
  else score = -0.6;

  const direction = volChange >= 0 ? 'expanding' : 'contracting';
  const detail = `7d avg volume ${direction} by ${(Math.abs(volChange) * 100).toFixed(1)}% vs 30d avg. ${volChange > 0 ? 'Rising volume confirms market interest.' : 'Declining volume suggests waning interest.'}`;

  return {
    name: 'Volume Trend',
    score,
    weight: 0.05,
    signal: scoreToSignal(score),
    detail,
    value: `${volChange >= 0 ? '+' : ''}${(volChange * 100).toFixed(1)}%`,
    threshold: '7d vs 30d volume',
  };
}

// ── Composite Signal ──
export function computeSignal(data: {
  financials: { date: string; fdv_multiple: number; hype_price: number; daily_fees: number; total_volume: number; btc_price?: number }[];
  hip3: { hip3_fee_contribution: number; operators: number }[];
  supply?: { neutralizationPct: number; netMonthlyPressure: number };
}): CompositeSignal {
  const { financials, hip3, supply } = data;

  const multiples = financials.map(d => d.fdv_multiple);
  const prices = financials.map(d => d.hype_price);
  const fees = financials.map(d => d.daily_fees);
  const volumes = financials.map(d => d.total_volume);
  const hip3Contribs = hip3.map(d => d.hip3_fee_contribution);
  const operators = hip3.map(d => d.operators);

  const currentMultiple = multiples[multiples.length - 1];

  // BTC correlation data
  const btcPrices = financials.map(d => d.btc_price || 0).filter(p => p > 0);
  const hypeReturns = prices.length >= 2 ? prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]) : [];
  const btcReturns = btcPrices.length >= 2 ? btcPrices.slice(1).map((p, i) => (p - btcPrices[i]) / btcPrices[i]) : [];
  const btcMomentum = btcPrices.length >= 30
    ? (btcPrices[btcPrices.length - 1] - btcPrices[btcPrices.length - 30]) / btcPrices[btcPrices.length - 30]
    : 0;

  const factors = [
    scoreValuation(currentMultiple, multiples),
    scoreMomentum(prices),
    scoreFeeGrowth(fees),
    scoreCatalyst(hip3Contribs, operators),
    scoreSupplyPressure(supply?.neutralizationPct ?? 35, supply?.netMonthlyPressure ?? 7_500_000),
    scoreBTCCorrelation(hypeReturns, btcReturns, btcMomentum),
    scoreVolumeTrend(volumes),
  ];

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const compositeScore = factors.reduce((s, f) => s + f.score * f.weight, 0) / totalWeight;
  const overall = scoreToSignal(compositeScore);

  // Generate summary
  const bullFactors = factors.filter(f => f.score > 0.2).map(f => f.name);
  const bearFactors = factors.filter(f => f.score < -0.2).map(f => f.name);

  let summary: string;
  if (overall === 'STRONG BUY') {
    summary = `Multiple factors align bullishly: ${bullFactors.join(', ')}. Valuation is attractive relative to fee generation with positive catalysts.`;
  } else if (overall === 'BUY') {
    summary = `Moderately bullish. Key positives: ${bullFactors.join(', ') || 'mixed signals'}. ${bearFactors.length > 0 ? `Watch: ${bearFactors.join(', ')}.` : 'No major red flags.'}`;
  } else if (overall === 'HOLD') {
    summary = `Mixed signals. ${bullFactors.length > 0 ? `Positives: ${bullFactors.join(', ')}.` : ''} ${bearFactors.length > 0 ? `Negatives: ${bearFactors.join(', ')}.` : ''} Wait for clearer direction.`;
  } else if (overall === 'SELL') {
    summary = `Caution warranted. Key concerns: ${bearFactors.join(', ') || 'mixed signals'}. ${bullFactors.length > 0 ? `Some support from: ${bullFactors.join(', ')}.` : ''}`;
  } else {
    summary = `Multiple factors signal overextension: ${bearFactors.join(', ')}. Consider reducing exposure until valuation resets.`;
  }

  return { overall, compositeScore, factors, summary };
}

// ── Historical Signal Backtest ──
export function computeHistoricalSignals(financials: {
  date: string; fdv_multiple: number; hype_price: number; daily_fees: number; total_volume: number; btc_price?: number;
}[], hip3: { hip3_fee_contribution: number; operators: number }[]): HistoricalSignal[] {
  const signals: HistoricalSignal[] = [];
  const lookback = 90; // Need 90 days of history for proper signals

  for (let i = lookback; i < financials.length; i++) {
    const slice = financials.slice(0, i + 1);

    const multiples = slice.map(d => d.fdv_multiple);
    const prices = slice.map(d => d.hype_price);
    const fees = slice.map(d => d.daily_fees);
    const volumes = slice.map(d => d.total_volume);

    const valScore = scoreValuation(multiples[multiples.length - 1], multiples).score;
    const momScore = scoreMomentum(prices).score;
    const feeScore = scoreFeeGrowth(fees).score;
    const volScore = scoreVolumeTrend(volumes).score;

    // Supply pressure (use default estimates for backtest)
    const supplyScore = scoreSupplyPressure(35, 7_500_000).score;

    const composite = valScore * 0.25 + momScore * 0.20 + feeScore * 0.25 + supplyScore * 0.10 + volScore * 0.05;
    // Normalize to account for skipped factors (catalyst + BTC)
    const activeWeight = 0.85;
    const adjustedComposite = composite / activeWeight;

    signals.push({
      date: financials[i].date,
      price: financials[i].hype_price,
      compositeScore: clamp(adjustedComposite, -1, 1),
      signal: scoreToSignal(clamp(adjustedComposite, -1, 1)),
      fdvMultiple: financials[i].fdv_multiple,
      feeGrowth: fees.length >= 60 ? (avg(fees.slice(-30)) - avg(fees.slice(-60))) / avg(fees.slice(-60)) : 0,
      momentum: prices.length >= 50 ? (prices[prices.length - 1] - avg(prices.slice(-50))) / avg(prices.slice(-50)) : 0,
    });
  }

  return signals;
}

// ── Helpers ──
function avg(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
