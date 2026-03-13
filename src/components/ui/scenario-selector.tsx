'use client';

import { SELL_THROUGH_SCENARIOS, type SellThroughScenario } from '@/lib/constants';

const scenarios = Object.entries(SELL_THROUGH_SCENARIOS) as [
  SellThroughScenario,
  (typeof SELL_THROUGH_SCENARIOS)[SellThroughScenario],
][];

interface ScenarioSelectorProps {
  selected: SellThroughScenario;
  onChange: (scenario: SellThroughScenario) => void;
}

export function ScenarioSelector({ selected, onChange }: ScenarioSelectorProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-[10px] font-mono uppercase tracking-wider text-[#8888a0]">
        Sell-Through
      </span>
      <div className="flex items-center gap-0.5 rounded-md bg-[#0a0a0f] p-0.5 border border-[#1e1e2e]">
        {scenarios.map(([key, config]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`px-2.5 py-1 text-[11px] font-mono font-medium rounded transition-all ${
              selected === key
                ? 'bg-[#5ae9b5]/10 text-[#5ae9b5] border border-[#5ae9b5]/20'
                : 'text-[#8888a0] hover:text-[#e2e2e8] border border-transparent'
            }`}
          >
            {config.shortLabel} ({(config.rate * 100).toFixed(0)}%)
          </button>
        ))}
      </div>
      <span className="text-[10px] font-mono text-[#8888a0] hidden md:inline">
        {SELL_THROUGH_SCENARIOS[selected].description}
      </span>
    </div>
  );
}
