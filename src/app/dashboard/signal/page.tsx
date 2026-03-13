'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { generateFinancialsData, generateHIP3Data, generateSupplyData } from '@/lib/mock-data';
import { computeSignal, computeHistoricalSignals, type SignalRating, type FactorScore, type CompositeSignal, type HistoricalSignal } from '@/lib/signal-engine';
import { formatUSD, formatMultiple } from '@/lib/constants';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { useApiData } from '@/lib/use-api-data';

const signalColors: Record<SignalRating, string> = {
  'STRONG BUY': '#22c55e',
  'BUY': '#4ade80',
  'HOLD': '#eab308',
  'SELL': '#f87171',
  'STRONG SELL': '#ef4444',
};

const signalBg: Record<SignalRating, string> = {
  'STRONG BUY': 'bg-[#22c55e]/10 border-[#22c55e]/30',
  'BUY': 'bg-[#4ade80]/10 border-[#4ade80]/30',
  'HOLD': 'bg-[#eab308]/10 border-[#eab308]/30',
  'SELL': 'bg-[#f87171]/10 border-[#f87171]/30',
  'STRONG SELL': 'bg-[#ef4444]/10 border-[#ef4444]/30',
};

export default function SignalPage() {
  const { data: financials } = useApiData<ReturnType<typeof generateFinancialsData>>(
    '/api/data/financials',
    () => generateFinancialsData(365),
    300_000
  );
  const { data: hip3ApiData } = useApiData<{ daily: ReturnType<typeof generateHIP3Data> }>(
    '/api/data/hip3',
    null,
    300_000
  );
  const { data: hip3MockData } = useApiData(
    '__mock_hip3_signal__',
    () => generateHIP3Data(365),
  );
  // Use real HIP-3 daily data if available, otherwise fall back to mock
  const hip3Data = hip3ApiData?.daily && hip3ApiData.daily.length > 0
    ? hip3ApiData.daily
    : hip3MockData;
  const { data: supplyData } = useApiData(
    '/api/data/supply',
    () => generateSupplyData(),
    300_000
  );

  const signal = useMemo(() => {
    if (!financials || !hip3Data) return null;
    const supply = supplyData?.kpis ? {
      neutralizationPct: supplyData.kpis.neutralizationPct,
      netMonthlyPressure: supplyData.kpis.netMonthlyPressure,
    } : undefined;
    return computeSignal({ financials, hip3: hip3Data, supply });
  }, [financials, hip3Data, supplyData]);

  const historicalSignals = useMemo(() => {
    if (!financials || !hip3Data) return null;
    return computeHistoricalSignals(financials, hip3Data);
  }, [financials, hip3Data]);

  if (!financials || !hip3Data || !signal || !historicalSignals) {
    return <div className="min-h-[400px]" />;
  }

  return (
    <div className="space-y-4">
      {/* Signal Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <SignalGauge signal={signal} />
        <div className="lg:col-span-2">
          <SignalSummary signal={signal} />
        </div>
      </div>

      {/* Factor Breakdown */}
      <FactorBreakdown factors={signal.factors} />

      {/* Historical Signal Chart */}
      <HistoricalSignalChart data={historicalSignals} />

      {/* Signal Logic Reference */}
      <SignalLogicReference />
    </div>
  );
}

// ── Signal Gauge ──
function SignalGauge({ signal }: { signal: CompositeSignal }) {
  const { overall, compositeScore } = signal;
  const color = signalColors[overall];

  // Map -1..+1 to 0..180 degrees for gauge
  const angle = ((compositeScore + 1) / 2) * 180;
  // SVG arc for the gauge
  const gaugeRadius = 80;
  const cx = 100;
  const cy = 95;

  return (
    <div className={`rounded-lg border ${signalBg[overall]} p-5 flex flex-col items-center justify-center`}>
      <span className="text-[10px] font-mono text-[#8888a0] uppercase tracking-widest mb-2">Overall Signal</span>

      {/* Gauge SVG */}
      <svg width="200" height="110" viewBox="0 0 200 110">
        {/* Background arc */}
        <path
          d={describeArc(cx, cy, gaugeRadius, 180, 360)}
          fill="none"
          stroke="#1e1e2e"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Colored zones */}
        <path d={describeArc(cx, cy, gaugeRadius, 180, 216)} fill="none" stroke="#22c55e" strokeWidth="12" strokeLinecap="round" opacity="0.3" />
        <path d={describeArc(cx, cy, gaugeRadius, 216, 252)} fill="none" stroke="#4ade80" strokeWidth="12" opacity="0.3" />
        <path d={describeArc(cx, cy, gaugeRadius, 252, 288)} fill="none" stroke="#eab308" strokeWidth="12" opacity="0.3" />
        <path d={describeArc(cx, cy, gaugeRadius, 288, 324)} fill="none" stroke="#f87171" strokeWidth="12" opacity="0.3" />
        <path d={describeArc(cx, cy, gaugeRadius, 324, 360)} fill="none" stroke="#ef4444" strokeWidth="12" strokeLinecap="round" opacity="0.3" />

        {/* Needle */}
        {(() => {
          const needleAngle = 180 + angle;
          const rad = (needleAngle * Math.PI) / 180;
          const nx = cx + (gaugeRadius - 20) * Math.cos(rad);
          const ny = cy + (gaugeRadius - 20) * Math.sin(rad);
          return (
            <>
              <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="3" strokeLinecap="round" />
              <circle cx={cx} cy={cy} r="5" fill={color} />
            </>
          );
        })()}

        {/* Labels */}
        <text x="18" y="100" fill="#22c55e" fontSize="8" fontFamily="var(--font-geist-mono)">BUY</text>
        <text x="170" y="100" fill="#ef4444" fontSize="8" fontFamily="var(--font-geist-mono)">SELL</text>
      </svg>

      <span className="text-2xl font-mono font-bold mt-1" style={{ color }}>{overall}</span>
      <span className="text-[10px] font-mono text-[#8888a0] mt-0.5">
        Score: {compositeScore >= 0 ? '+' : ''}{compositeScore.toFixed(2)}
      </span>
    </div>
  );
}

// ── Signal Summary ──
function SignalSummary({ signal }: { signal: CompositeSignal }) {
  const { overall, summary, factors } = signal;
  const color = signalColors[overall];

  const bullCount = factors.filter(f => f.score > 0.2).length;
  const bearCount = factors.filter(f => f.score < -0.2).length;
  const neutralCount = factors.length - bullCount - bearCount;

  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#111117] p-5 h-full flex flex-col justify-between">
      <div>
        <h3 className="text-xs font-mono font-semibold text-[#e2e2e8] uppercase tracking-wider mb-3">Signal Analysis</h3>
        <p className="text-sm font-mono text-[#e2e2e8]/80 leading-relaxed">{summary}</p>
      </div>

      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#1e1e2e]">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
          <span className="text-[10px] font-mono text-[#8888a0]">{bullCount} Bullish</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#eab308]" />
          <span className="text-[10px] font-mono text-[#8888a0]">{neutralCount} Neutral</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
          <span className="text-[10px] font-mono text-[#8888a0]">{bearCount} Bearish</span>
        </div>
        <div className="ml-auto text-[10px] font-mono text-[#8888a0]">
          Updated: <span className="text-[#e2e2e8]">today</span>
        </div>
      </div>
    </div>
  );
}

// ── Factor Breakdown ──
function FactorBreakdown({ factors }: { factors: FactorScore[] }) {
  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#111117] p-4">
      <h3 className="text-xs font-mono font-semibold text-[#e2e2e8] uppercase tracking-wider mb-4">Factor Breakdown</h3>

      <div className="space-y-3">
        {factors.map((factor) => (
          <FactorRow key={factor.name} factor={factor} />
        ))}
      </div>
    </div>
  );
}

function FactorRow({ factor }: { factor: FactorScore }) {
  const color = signalColors[factor.signal];
  // Score bar: -1 to +1 mapped to 0% to 100%
  const barPct = ((factor.score + 1) / 2) * 100;
  const weightPct = (factor.weight * 100).toFixed(0);

  return (
    <div className="border border-[#1e1e2e]/50 rounded-md p-3 hover:bg-[#16161e] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold text-[#e2e2e8]">{factor.name}</span>
          <span className="text-[9px] font-mono text-[#8888a0] bg-[#1e1e2e] px-1.5 py-0.5 rounded">{weightPct}% weight</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold" style={{ color }}>{factor.value}</span>
          <span
            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
            style={{ color, backgroundColor: `${color}15` }}
          >
            {factor.signal}
          </span>
        </div>
      </div>

      {/* Score bar */}
      <div className="relative h-1.5 bg-[#1e1e2e] rounded-full mb-2 overflow-hidden">
        {/* Center line (neutral) */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#8888a0]/30" />
        {/* Score indicator */}
        <div
          className="absolute top-0 h-full rounded-full transition-all"
          style={{
            left: barPct < 50 ? `${barPct}%` : '50%',
            width: `${Math.abs(barPct - 50)}%`,
            backgroundColor: color,
            opacity: 0.6,
          }}
        />
        {/* Dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-[#111117]"
          style={{ left: `calc(${barPct}% - 5px)`, backgroundColor: color }}
        />
      </div>

      <p className="text-[10px] font-mono text-[#8888a0] leading-relaxed">{factor.detail}</p>
      <p className="text-[9px] font-mono text-[#8888a0]/60 mt-1">Benchmark: {factor.threshold}</p>
    </div>
  );
}

// ── Historical Signal Chart ──
function HistoricalSignalChart({ data }: { data: HistoricalSignal[] }) {
  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#111117] p-4">
      <div className="mb-4">
        <h3 className="text-xs font-mono font-semibold text-[#e2e2e8] uppercase tracking-wider">Historical Signal Overlay</h3>
        <p className="text-[10px] font-mono text-[#8888a0] mt-0.5">HYPE price with composite signal score | Green zone = buy, Red zone = sell</p>
      </div>

      <div className="h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />

            {/* Buy zone background */}
            <ReferenceArea yAxisId="signal" y1={0.2} y2={1} fill="#22c55e" fillOpacity={0.04} />
            {/* Sell zone background */}
            <ReferenceArea yAxisId="signal" y1={-1} y2={-0.2} fill="#ef4444" fillOpacity={0.04} />

            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#8888a0', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={{ stroke: '#1e1e2e' }}
              tickFormatter={(v) => {
                const d = new Date(v);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
              interval={Math.floor(data.length / 8)}
            />
            <YAxis
              yAxisId="price"
              orientation="left"
              tick={{ fontSize: 10, fill: '#8888a0', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v.toFixed(0)}`}
              width={48}
            />
            <YAxis
              yAxisId="signal"
              orientation="right"
              tick={{ fontSize: 10, fill: '#8888a0', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={false}
              domain={[-1, 1]}
              ticks={[-1, -0.5, 0, 0.5, 1]}
              tickFormatter={(v) => {
                if (v >= 0.6) return 'S.BUY';
                if (v >= 0.2) return 'BUY';
                if (v > -0.2) return 'HOLD';
                if (v > -0.6) return 'SELL';
                return 'S.SELL';
              }}
              width={44}
            />
            <Tooltip content={<SignalTooltip />} />

            {/* Neutral reference line */}
            <ReferenceLine yAxisId="signal" y={0} stroke="#8888a0" strokeDasharray="4 4" strokeWidth={1} />
            <ReferenceLine yAxisId="signal" y={0.2} stroke="#22c55e" strokeDasharray="2 4" strokeWidth={1} strokeOpacity={0.3} />
            <ReferenceLine yAxisId="signal" y={-0.2} stroke="#ef4444" strokeDasharray="2 4" strokeWidth={1} strokeOpacity={0.3} />

            {/* Signal score area */}
            <Area
              yAxisId="signal"
              type="monotone"
              dataKey="compositeScore"
              fill="#5ae9b5"
              fillOpacity={0.08}
              stroke="none"
              name="Signal Score"
            />

            {/* Price line */}
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="price"
              stroke="#e2e2e8"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: '#e2e2e8' }}
              name="HYPE Price"
            />

            {/* Signal score line */}
            <Line
              yAxisId="signal"
              type="monotone"
              dataKey="compositeScore"
              stroke="#5ae9b5"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: '#5ae9b5' }}
              name="Signal"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#1e1e2e]">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded-full bg-[#e2e2e8]" />
          <span className="text-[10px] font-mono text-[#8888a0]">HYPE Price</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded-full bg-[#5ae9b5]" />
          <span className="text-[10px] font-mono text-[#8888a0]">Composite Signal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#22c55e]/10 border border-[#22c55e]/30" />
          <span className="text-[10px] font-mono text-[#8888a0]">Buy Zone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#ef4444]/10 border border-[#ef4444]/30" />
          <span className="text-[10px] font-mono text-[#8888a0]">Sell Zone</span>
        </div>
      </div>
    </div>
  );
}

// ── Signal Logic Reference ──
function SignalLogicReference() {
  const rules = [
    { factor: 'Valuation', buy: 'FDV/Fees < 18x (cheap vs fee generation)', sell: 'FDV/Fees > 30x (overextended)', weight: '25%' },
    { factor: 'Fee Growth', buy: '30d avg fees > 60d avg (accelerating)', sell: '30d avg fees < 60d avg (decelerating)', weight: '25%' },
    { factor: 'Momentum', buy: 'Price above 50d MA, bullish MA cross', sell: 'Price below 50d MA, bearish MA cross', weight: '20%' },
    { factor: 'HIP-3 Catalyst', buy: 'Rising fee contribution, operator growth', sell: 'Stalling adoption, flat contributions', weight: '10%' },
    { factor: 'Supply Pressure', buy: 'Buybacks offset >75% of unlocks', sell: 'Buybacks offset <25% (heavy dilution)', weight: '10%' },
    { factor: 'BTC Regime', buy: 'BTC bullish + correlated, or decoupled', sell: 'BTC bearish + high correlation', weight: '5%' },
    { factor: 'Volume', buy: '7d vol > 30d avg (expanding interest)', sell: '7d vol < 30d avg (waning interest)', weight: '5%' },
  ];

  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#111117] p-4">
      <h3 className="text-xs font-mono font-semibold text-[#e2e2e8] uppercase tracking-wider mb-3">Signal Logic</h3>
      <p className="text-[10px] font-mono text-[#8888a0] mb-4">
        Composite score from -1 (Strong Sell) to +1 (Strong Buy). Each factor is scored independently and weighted by importance.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-[#1e1e2e]">
              <th className="text-left py-2 px-2 text-[10px] font-mono font-semibold text-[#8888a0] uppercase tracking-wider">Factor</th>
              <th className="text-center py-2 px-2 text-[10px] font-mono font-semibold text-[#8888a0] uppercase tracking-wider">Weight</th>
              <th className="text-left py-2 px-2 text-[10px] font-mono font-semibold text-[#22c55e] uppercase tracking-wider">Buy When</th>
              <th className="text-left py-2 px-2 text-[10px] font-mono font-semibold text-[#ef4444] uppercase tracking-wider">Sell When</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.factor} className="border-b border-[#1e1e2e]/50">
                <td className="py-2 px-2 text-xs font-mono font-medium text-[#e2e2e8]">{r.factor}</td>
                <td className="py-2 px-2 text-center text-xs font-mono text-[#8888a0]">{r.weight}</td>
                <td className="py-2 px-2 text-[10px] font-mono text-[#22c55e]/80">{r.buy}</td>
                <td className="py-2 px-2 text-[10px] font-mono text-[#ef4444]/80">{r.sell}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 pt-3 border-t border-[#1e1e2e]">
        <p className="text-[9px] font-mono text-[#8888a0]/60">
          This is not financial advice. Signal is based on quantitative analysis of on-chain and market data.
          Always do your own research and consider your risk tolerance before making investment decisions.
        </p>
      </div>
    </div>
  );
}

// ── Custom Signal Tooltip ──
function SignalTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;

  const price = payload.find(p => p.name === 'HYPE Price');
  const signal = payload.find(p => p.name === 'Signal');
  const signalValue = signal?.value ?? 0;

  let signalLabel: SignalRating = 'HOLD';
  if (signalValue >= 0.6) signalLabel = 'STRONG BUY';
  else if (signalValue >= 0.2) signalLabel = 'BUY';
  else if (signalValue > -0.2) signalLabel = 'HOLD';
  else if (signalValue > -0.6) signalLabel = 'SELL';
  else signalLabel = 'STRONG SELL';

  const color = signalColors[signalLabel];

  return (
    <div className="bg-[#111117]/95 border border-[#1e1e2e] rounded-md px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="text-[10px] font-mono text-[#8888a0] mb-1">{label}</p>
      {price && (
        <p className="text-xs font-mono text-[#e2e2e8]">
          HYPE: <span className="font-semibold">${price.value.toFixed(2)}</span>
        </p>
      )}
      {signal && (
        <p className="text-xs font-mono mt-0.5">
          Signal: <span className="font-semibold" style={{ color }}>
            {signalValue >= 0 ? '+' : ''}{signalValue.toFixed(2)} ({signalLabel})
          </span>
        </p>
      )}
    </div>
  );
}

// ── SVG Arc Helper ──
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}
