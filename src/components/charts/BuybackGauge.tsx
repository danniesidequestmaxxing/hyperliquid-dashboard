'use client';

import { formatUSD } from '@/lib/constants';

interface Props {
  currentRevenue: number;
  requiredRevenue: number;
  neutralizationPct: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export function BuybackGauge({ currentRevenue, requiredRevenue, neutralizationPct }: Props) {
  const pct = Math.min(Math.max(neutralizationPct, 0), 100);

  // Arc spans from -90° (left) to 90° (right) — a 180° semicircle
  const startAngle = -90;
  const endAngle = 90;
  const filledAngle = startAngle + (pct / 100) * (endAngle - startAngle);

  const cx = 120;
  const cy = 110;
  const r = 80;

  // Color based on percentage
  const getColor = (p: number) => {
    if (p < 33) return '#ef4444';
    if (p < 66) return '#eab308';
    return '#22c55e';
  };

  const gaugeColor = getColor(pct);

  // Needle position
  const needleAngle = startAngle + (pct / 100) * (endAngle - startAngle);
  const needleEnd = polarToCartesian(cx, cy, r - 10, needleAngle);

  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#111117] p-4">
      <div className="mb-4">
        <h3 className="text-xs font-mono font-semibold text-[#e2e2e8] uppercase tracking-wider">Buyback Neutralization</h3>
        <p className="text-[10px] font-mono text-[#8888a0] mt-0.5">Revenue needed to fully offset employee unlocks</p>
      </div>

      <div className="flex flex-col items-center">
        <svg width="240" height="140" viewBox="0 0 240 140">
          {/* Background arc */}
          <path
            d={describeArc(cx, cy, r, startAngle, endAngle)}
            fill="none"
            stroke="#1e1e2e"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Filled arc */}
          {pct > 0 && (
            <path
              d={describeArc(cx, cy, r, startAngle, filledAngle)}
              fill="none"
              stroke={gaugeColor}
              strokeWidth="16"
              strokeLinecap="round"
              opacity={0.6}
            />
          )}

          {/* Needle */}
          <line
            x1={cx}
            y1={cy}
            x2={needleEnd.x}
            y2={needleEnd.y}
            stroke="#e2e2e8"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r="4" fill="#e2e2e8" />

          {/* Percentage text */}
          <text
            x={cx}
            y={cy - 20}
            textAnchor="middle"
            className="font-mono"
            fill={gaugeColor}
            fontSize="24"
            fontWeight="bold"
          >
            {pct.toFixed(0)}%
          </text>

          {/* Labels */}
          <text x={cx} y={cy + 2} textAnchor="middle" fill="#8888a0" fontSize="9" className="font-mono">
            neutralized
          </text>

          {/* Scale labels */}
          <text x={cx - r - 5} y={cy + 14} textAnchor="middle" fill="#8888a0" fontSize="8" className="font-mono">0%</text>
          <text x={cx + r + 5} y={cy + 14} textAnchor="middle" fill="#8888a0" fontSize="8" className="font-mono">100%</text>
        </svg>

        {/* Revenue comparison */}
        <div className="w-full mt-2 space-y-2">
          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-[#1e1e2e] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                backgroundColor: gaugeColor,
                opacity: 0.6,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#8888a0]">Current</span>
            <span className="text-[#e2e2e8] font-semibold">{formatUSD(currentRevenue)}/yr</span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#8888a0]">Needed to neutralize</span>
            <span className="text-[#e2e2e8] font-semibold">{formatUSD(requiredRevenue)}/yr</span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#8888a0]">Revenue gap</span>
            <span className="text-[#ef4444] font-semibold">{formatUSD(requiredRevenue - currentRevenue)}/yr</span>
          </div>
        </div>

        <p className="text-[10px] font-mono text-[#8888a0] text-center mt-3 leading-relaxed">
          At current revenue, buybacks offset <span className="text-[#e2e2e8] font-semibold">{pct.toFixed(0)}%</span> of
          the <span className="text-[#e2e2e8]">10M HYPE/month</span> employee unlock pressure.
          Revenue needs to grow <span className="text-[#ef4444] font-semibold">{((requiredRevenue / Math.max(currentRevenue, 1)) - 1).toFixed(1)}x</span> to fully neutralize.
        </p>
      </div>
    </div>
  );
}
