interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusColorMap: Record<string, string> = {
  // Gray
  DRAFT: 'bg-slate-700/50 text-slate-400',
  PENDING: 'bg-slate-700/50 text-slate-400',
  LINEUP_PENDING: 'bg-slate-700/50 text-slate-400',
  UNCLAIMED: 'bg-slate-700/50 text-slate-400',
  PREVIEW: 'bg-slate-700/50 text-slate-400',

  // Amber
  RUNNING: 'bg-amber-500/15 text-amber-400',
  ONGOING: 'bg-amber-500/15 text-amber-400',
  ACTIVE: 'bg-amber-500/15 text-amber-400',
  IN_PROGRESS: 'bg-amber-500/15 text-amber-400',
  PLAYER_IMPORT: 'bg-amber-500/15 text-amber-400',
  SEGMENT_BREAK: 'bg-amber-500/15 text-amber-400',
  KNOCKOUT_RUNNING: 'bg-amber-500/15 text-amber-400',

  // Emerald
  COMPLETED: 'bg-emerald-500/15 text-emerald-400',
  CONFIRMED: 'bg-emerald-500/15 text-emerald-400',
  RESULT_CONFIRMED: 'bg-emerald-500/15 text-emerald-400',
  APPROVED: 'bg-emerald-500/15 text-emerald-400',
  VALID: 'bg-emerald-500/15 text-emerald-400',
  CLAIMED: 'bg-emerald-500/15 text-emerald-400',
  PUBLISHED: 'bg-emerald-500/15 text-emerald-400',
  PLAYERS_READY: 'bg-emerald-500/15 text-emerald-400',
  GROUP_COMPLETED: 'bg-emerald-500/15 text-emerald-400',

  // Rose
  CANCELLED: 'bg-rose-500/15 text-rose-400',
  REJECTED: 'bg-rose-500/15 text-rose-400',
  ERROR: 'bg-rose-500/15 text-rose-400',
  INVALID: 'bg-rose-500/15 text-rose-400',
  SKIPPED: 'bg-rose-500/15 text-rose-400',

  // Sky
  SCHEDULED: 'bg-sky-500/15 text-sky-400',
  READY: 'bg-sky-500/15 text-sky-400',
  LINEUP_READY: 'bg-sky-500/15 text-sky-400',
  TEAM_DRAW_COMPLETED: 'bg-sky-500/15 text-sky-400',
  GROUP_ASSIGNED: 'bg-sky-500/15 text-sky-400',
  SCHEDULE_GENERATED: 'bg-sky-500/15 text-sky-400',
  KNOCKOUT_GENERATED: 'bg-sky-500/15 text-sky-400',

  // Violet
  LOCKED: 'bg-violet-500/15 text-violet-400',
  SUBMITTED: 'bg-violet-500/15 text-violet-400',
};

function formatStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const colors = statusColorMap[status] ?? 'bg-slate-700/50 text-slate-400';
  const sizeClass = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center rounded-full font-semibold uppercase tracking-wide ${colors} ${sizeClass}`}>
      {formatStatus(status)}
    </span>
  );
}
