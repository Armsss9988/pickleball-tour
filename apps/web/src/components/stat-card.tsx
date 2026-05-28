'use client';

import type { LucideIcon } from './icons';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: { value: string; positive: boolean };
  color?: 'amber' | 'sky' | 'emerald' | 'rose' | 'violet';
}

const colorMap = {
  amber:   { bg: 'bg-amber-500/15',   text: 'text-amber-400' },
  sky:     { bg: 'bg-sky-500/15',      text: 'text-sky-400' },
  emerald: { bg: 'bg-emerald-500/15',  text: 'text-emerald-400' },
  rose:    { bg: 'bg-rose-500/15',     text: 'text-rose-400' },
  violet:  { bg: 'bg-violet-500/15',   text: 'text-violet-400' },
};

export function StatCard({ icon: Icon, label, value, trend, color = 'amber' }: StatCardProps) {
  const c = colorMap[color];

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:bg-slate-800/70 transition-all duration-200 group flex flex-col justify-between h-full relative">
      {/* Top Flex Row: Icon on left, Trend Badge on right */}
      <div className="flex items-center justify-between gap-3 mb-4 w-full">
        <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
        
        {trend && (
          <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap border flex-shrink-0 ${
            trend.positive
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      
      {/* Content Block */}
      <div className="space-y-1">
        <div className="text-2xl font-black text-slate-100 tracking-tight font-[var(--font-space-grotesk)]">
          {value}
        </div>
        <div className="text-xs sm:text-sm text-slate-400 font-semibold">{label}</div>
      </div>
    </div>
  );
}

