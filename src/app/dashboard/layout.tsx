'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatUSD } from '@/lib/constants';
import { useApiData } from '@/lib/use-api-data';
import { getLatestKPIs } from '@/lib/mock-data';
import { useState, useEffect } from 'react';

const tabs = [
  { label: 'Financials', href: '/dashboard' },
  { label: 'Signal', href: '/dashboard/signal' },
  { label: 'HIP-3', href: '/dashboard/hip3' },
  { label: 'Competition', href: '/dashboard/competitive' },
  { label: 'Network Health', href: '/dashboard/health' },
];

interface KPIData {
  price: number;
  priceChange: number;
  marketCap: number;
  fdv: number;
  volume24h: number;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: kpis, isLive } = useApiData<KPIData>(
    '/api/data/kpis',
    () => {
      const mock = getLatestKPIs();
      return {
        price: mock.price,
        priceChange: mock.priceChange,
        marketCap: mock.marketCap,
        fdv: mock.fdv,
        volume24h: mock.volume24h,
      };
    },
    60_000 // Refresh every minute
  );
  const [time, setTime] = useState('');

  useEffect(() => {
    setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] noise-bg">
      {/* Top Price Ticker Bar */}
      <header className="sticky top-0 z-50 border-b border-[#1e1e2e] bg-[#0a0a0f]/90 backdrop-blur-xl">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', isLive ? 'bg-[#5ae9b5] pulse-live' : 'bg-[#eab308]')} />
                <span className="text-sm font-bold tracking-tight">
                  <span className="text-[#5ae9b5]">HYPE</span>
                  <span className="text-[#8888a0] font-normal ml-1.5 text-xs">DASHBOARD</span>
                </span>
              </div>
            </div>

            {kpis && (
              <div className="hidden sm:flex items-center gap-6 text-xs font-mono">
                <TickerItem
                  label="HYPE"
                  value={`$${kpis.price.toFixed(2)}`}
                  change={kpis.priceChange}
                  primary
                />
                <div className="w-px h-4 bg-[#1e1e2e]" />
                <TickerItem label="MCap" value={formatUSD(kpis.marketCap)} />
                <TickerItem label="FDV" value={formatUSD(kpis.fdv)} />
                <TickerItem label="24h Vol" value={formatUSD(kpis.volume24h)} />
              </div>
            )}

            <div className="flex items-center gap-2 text-[10px] font-mono text-[#8888a0]">
              {isLive && <span className="text-[#5ae9b5]">LIVE</span>}
              {time && <><span className="hidden md:inline">Updated </span>{time}</>}
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b border-[#1e1e2e] bg-[#0a0a0f]">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="flex items-center gap-0 -mb-px overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = tab.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(tab.href);

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    'relative px-4 py-3 text-xs font-mono font-medium transition-colors whitespace-nowrap',
                    isActive
                      ? 'text-[#5ae9b5]'
                      : 'text-[#8888a0] hover:text-[#e2e2e8]'
                  )}
                >
                  {tab.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#5ae9b5] rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="mx-auto max-w-[1440px] px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}

function TickerItem({
  label,
  value,
  change,
  primary,
}: {
  label: string;
  value: string;
  change?: number;
  primary?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[#8888a0] text-[10px] uppercase tracking-wider">{label}</span>
      <span className={cn('font-semibold', primary ? 'text-[#e2e2e8]' : 'text-[#e2e2e8]/80')}>
        {value}
      </span>
      {change !== undefined && (
        <span className={cn(
          'text-[10px] font-semibold',
          change >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
        )}>
          {change >= 0 ? '+' : ''}{change.toFixed(2)}%
        </span>
      )}
    </div>
  );
}
