'use client';

import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { TimeRangeSelector } from './TimeRangeSelector';

interface DataPoint {
  date: string;
  hype_price: number;
  btc_price: number;
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const xd = x[i] - mx;
    const yd = y[i] - my;
    num += xd * yd;
    dx += xd * xd;
    dy += yd * yd;
  }
  const denom = Math.sqrt(dx * dy);
  return denom > 0 ? num / denom : 0;
}

function computeBeta(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let cov = 0, varX = 0;
  for (let i = 0; i < n; i++) {
    const xd = x[i] - mx;
    cov += xd * (y[i] - my);
    varX += xd * xd;
  }
  return varX > 0 ? cov / varX : 0;
}

export function BTCCorrelationChart({ data }: { data: DataPoint[] }) {
  const [range, setRange] = useState('180D');

  const filtered = useMemo(() => {
    const dayMap: Record<string, number> = { '30D': 30, '90D': 90, '180D': 180, '1Y': 365 };
    const days = range === 'All' ? data.length : dayMap[range] || 180;
    return data.slice(-days).filter(d => d.hype_price > 0 && d.btc_price > 0);
  }, [data, range]);

  const enriched = useMemo(() => {
    if (filtered.length < 30) return [];
    const window = 30;

    return filtered.map((d, i) => {
      if (i < window - 1) {
        return {
          date: d.date,
          hypeNorm: 100,
          btcNorm: 100,
          correlation: null as number | null,
          beta: null as number | null,
        };
      }

      const slice = filtered.slice(i - window + 1, i + 1);
      const hypeReturns = slice.slice(1).map((s, j) => (s.hype_price - slice[j].hype_price) / slice[j].hype_price);
      const btcReturns = slice.slice(1).map((s, j) => (s.btc_price - slice[j].btc_price) / slice[j].btc_price);

      const corr = pearsonCorrelation(btcReturns, hypeReturns);
      const beta = computeBeta(btcReturns, hypeReturns);

      // Normalize prices to 100 at the start
      const baseHype = filtered[0].hype_price;
      const baseBTC = filtered[0].btc_price;

      return {
        date: d.date,
        hypeNorm: (d.hype_price / baseHype) * 100,
        btcNorm: (d.btc_price / baseBTC) * 100,
        correlation: Math.round(corr * 100) / 100,
        beta: Math.round(beta * 100) / 100,
      };
    });
  }, [filtered]);

  if (enriched.length === 0) return null;

  // Current stats
  const latest = enriched[enriched.length - 1];
  const corr = latest.correlation ?? 0;
  const beta = latest.beta ?? 0;

  const corrColor = Math.abs(corr) > 0.6 ? '#f59e0b' : Math.abs(corr) > 0.3 ? '#8888a0' : '#22c55e';
  const betaColor = beta > 1.5 ? '#ef4444' : beta > 1 ? '#f59e0b' : '#22c55e';

  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#111117] p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-mono font-semibold text-[#e2e2e8] uppercase tracking-wider">BTC Correlation & Beta</h3>
          <p className="text-[10px] font-mono text-[#8888a0] mt-0.5">Normalized price performance with 30d rolling correlation</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-[#8888a0]">30d Corr:</span>
              <span className="font-semibold" style={{ color: corrColor }}>{corr.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#8888a0]">Beta:</span>
              <span className="font-semibold" style={{ color: betaColor }}>{beta.toFixed(2)}</span>
            </div>
          </div>
          <TimeRangeSelector selected={range} onChange={setRange} />
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={enriched} margin={{ top: 4, right: 50, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />

            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#8888a0', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={{ stroke: '#1e1e2e' }}
              tickFormatter={(v) => {
                const d = new Date(v);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
              interval={Math.floor(enriched.length / 6)}
            />

            {/* Left: normalized price index */}
            <YAxis
              yAxisId="price"
              tick={{ fontSize: 10, fill: '#8888a0', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v.toFixed(0)}`}
              width={36}
            />

            {/* Right: correlation */}
            <YAxis
              yAxisId="corr"
              orientation="right"
              domain={[-1, 1]}
              tick={{ fontSize: 10, fill: '#8888a0', fontFamily: 'var(--font-geist-mono)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => v.toFixed(1)}
              width={32}
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border border-[#1e1e2e] bg-[#0a0a0f]/95 backdrop-blur-sm px-3 py-2 text-[10px] font-mono">
                    <div className="text-[#8888a0] mb-1">{label}</div>
                    {payload.map((p) => (
                      <div key={p.name} className="flex justify-between gap-4" style={{ color: p.color }}>
                        <span>{p.name}</span>
                        <span className="font-semibold">
                          {p.name === '30d Corr' ? Number(p.value).toFixed(2) :
                           p.name === 'Beta' ? Number(p.value).toFixed(2) :
                           `${Number(p.value).toFixed(1)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />

            <ReferenceLine yAxisId="price" y={100} stroke="#1e1e2e" strokeDasharray="4 4" />
            <ReferenceLine yAxisId="corr" y={0} stroke="#1e1e2e" strokeDasharray="4 4" />

            {/* Correlation area */}
            <Area
              yAxisId="corr"
              type="monotone"
              dataKey="correlation"
              name="30d Corr"
              stroke="#f59e0b"
              fill="#f59e0b"
              fillOpacity={0.08}
              strokeWidth={1}
              strokeOpacity={0.6}
              dot={false}
              connectNulls
            />

            {/* BTC normalized */}
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="btcNorm"
              name="BTC"
              stroke="#f7931a"
              strokeWidth={1.5}
              strokeOpacity={0.7}
              dot={false}
              activeDot={{ r: 2, fill: '#f7931a' }}
            />

            {/* HYPE normalized */}
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="hypeNorm"
              name="HYPE"
              stroke="#5ae9b5"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: '#5ae9b5' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend + interpretation */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-4 text-[10px] font-mono text-[#8888a0]">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-[2px] bg-[#5ae9b5]" />
            <span>HYPE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-[2px] bg-[#f7931a] opacity-70" />
            <span>BTC</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-sm bg-[#f59e0b]/20 border border-[#f59e0b]/30" />
            <span>30d Correlation</span>
          </div>
        </div>
        <div className="text-[10px] font-mono text-[#8888a0]">
          {beta > 1.3 ? (
            <span>High beta — <span className="text-[#ef4444]">amplifies BTC moves {beta.toFixed(1)}x</span></span>
          ) : beta > 0.8 ? (
            <span>Moderate beta — <span className="text-[#f59e0b]">tracks BTC ~{beta.toFixed(1)}x</span></span>
          ) : beta > 0 ? (
            <span>Low beta — <span className="text-[#22c55e]">partially decoupled from BTC</span></span>
          ) : (
            <span>Negative beta — <span className="text-[#22c55e]">inversely correlated with BTC</span></span>
          )}
        </div>
      </div>
    </div>
  );
}
