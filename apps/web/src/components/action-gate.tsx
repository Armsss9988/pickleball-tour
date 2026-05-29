'use client';

import Link from 'next/link';
import { ArrowRight, Lock } from './icons';
import type { AccessResult } from '@/lib/tournament-ux-policy';

interface ActionGateProps {
  access: AccessResult;
  href: string;
  label: string;
  description: string;
  className?: string;
  children?: React.ReactNode;
  compact?: boolean;
}

export function ActionGate({
  access,
  href,
  label,
  description,
  className = '',
  children,
  compact = false,
}: ActionGateProps) {
  if (compact) {
    if (!access.allowed) {
      return (
        <div
          className={[
            'rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg',
            className,
          ].join(' ')}
          title={access.reason ?? description}
          aria-disabled="true"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Lock className="h-3.5 w-3.5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chưa thể thực hiện</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-300 font-medium">
                {access.reason ?? description}
              </p>

              {access.required && (
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                  {access.required}
                </p>
              )}

              {access.nextHref && access.nextLabel && (
                <Link
                  href={access.nextHref}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 transition-colors hover:text-amber-300"
                >
                  {access.nextLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <Link
        href={href}
        className={[
          'flex items-center justify-between rounded-xl bg-amber-500 px-5 py-3.5 font-bold text-slate-950 transition-all duration-150 shadow-[0_4px_20px_rgba(245,158,11,0.25)]',
          'hover:bg-amber-400 hover:scale-[1.015] active:scale-[0.985]',
          className,
        ].join(' ')}
      >
        <span className="text-sm font-bold tracking-wide">Bắt đầu thực hiện</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
    );
  }

  if (!access.allowed) {
    return (
      <div
        className={[
          'rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 opacity-85',
          className,
        ].join(' ')}
        title={access.reason ?? description}
        aria-disabled="true"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-800/90 text-slate-500">
            <Lock className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-300">{label}</div>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              {access.reason ?? description}
            </p>

            {access.required && (
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {access.required}
              </p>
            )}

            {access.nextHref && access.nextLabel && (
              <Link
                href={access.nextHref}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 transition-colors hover:text-amber-300"
              >
                {access.nextLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={[
        'flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/50 px-4 py-3 text-left transition-all duration-150',
        'hover:border-amber-500/30 hover:bg-slate-800/80',
        className,
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-200">{label}</div>
        <div className="mt-1 text-xs leading-relaxed text-slate-500">{description}</div>
      </div>
      {children ?? <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-600" />}
    </Link>
  );
}
