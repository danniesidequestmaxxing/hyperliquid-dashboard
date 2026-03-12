'use client';

import { cn } from '@/lib/utils';

const ranges = ['30D', '90D', '180D', '1Y', 'All'] as const;

interface TimeRangeSelectorProps {
  selected: string;
  onChange: (range: string) => void;
}

export function TimeRangeSelector({ selected, onChange }: TimeRangeSelectorProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-md bg-[#0a0a0f] p-0.5 border border-[#1e1e2e]">
      {ranges.map((range) => (
        <button
          key={range}
          onClick={() => onChange(range)}
          className={cn(
            'px-2.5 py-1 text-[11px] font-mono font-medium rounded transition-all',
            selected === range
              ? 'bg-[#5ae9b5]/10 text-[#5ae9b5] border border-[#5ae9b5]/20'
              : 'text-[#8888a0] hover:text-[#e2e2e8] border border-transparent'
          )}
        >
          {range}
        </button>
      ))}
    </div>
  );
}
