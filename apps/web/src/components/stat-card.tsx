import type { LucideIcon } from './icons';
import Link from 'next/link';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: {
    value: string;
    positive?: boolean;
    type?: 'success' | 'warning' | 'error' | 'info';
  };
  color?: 'amber' | 'sky' | 'emerald' | 'rose' | 'violet';
  href?: string;
}

const colorMap = {
  amber:   { bg: 'bg-amber-500/15',   text: 'text-amber-400' },
  sky:     { bg: 'bg-sky-500/15',      text: 'text-sky-400' },
  emerald: { bg: 'bg-emerald-500/15',  text: 'text-emerald-400' },
  rose:    { bg: 'bg-rose-500/15',     text: 'text-rose-400' },
  violet:  { bg: 'bg-violet-500/15',   text: 'text-violet-400' },
};

const trendStyles = {
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  error: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  info: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
};

function getTrendIcon(type: 'success' | 'warning' | 'error' | 'info') {
  switch (type) {
    case 'success': return '↑';
    case 'error': return '↓';
    case 'warning': return '⚠';
    default: return '→';
  }
}

export function StatCard({ icon: Icon, label, value, trend, color = 'amber', href }: StatCardProps) {
  const c = colorMap[color];
  const trendType = trend?.type ?? (trend?.positive ? 'success' : 'error');
  const styleClass = trendStyles[trendType];
  const trendIcon = getTrendIcon(trendType);

  const content = (
    <>
      {/* Top Flex Row: Icon on left, Trend Badge on right */}
      <div className="flex items-center justify-between gap-3 mb-4 w-full">
        <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
        
        {trend && (
          <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap border flex-shrink-0 ${styleClass}`}>
            {trendIcon} {trend.value}
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
    </>
  );

  const baseClassName = "bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:bg-slate-800/70 transition-all duration-200 group flex flex-col justify-between h-full relative";

  if (href) {
    return (
      <Link href={href} className={`${baseClassName} cursor-pointer hover:border-amber-500/40 hover:-translate-y-0.5 shadow-md hover:shadow-lg`}>
        {content}
      </Link>
    );
  }

  return (
    <div className={baseClassName}>
      {content}
    </div>
  );
}

