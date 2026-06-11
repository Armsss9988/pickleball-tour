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

const statusTranslationMap: Record<string, string> = {
  // Tournament Statuses
  DRAFT: 'Bản nháp',
  PLAYER_IMPORT: 'Nhập VĐV',
  PLAYERS_READY: 'Đủ VĐV',
  TEAM_DRAW_COMPLETED: 'Đã bốc thăm',
  GROUP_ASSIGNED: 'Đã chia bảng',
  SCHEDULE_GENERATED: 'Đã sinh lịch',
  ONGOING: 'Đang diễn ra',
  RUNNING: 'Đang diễn ra',
  GROUP_COMPLETED: 'Xong vòng bảng',
  KNOCKOUT_GENERATED: 'Đã chia nhánh',
  KNOCKOUT_RUNNING: 'Đang đấu loại',
  COMPLETED: 'Đã hoàn tất',
  PUBLISHED: 'Đã công khai',
  ACTIVE: 'Hoạt động',

  // Match / Lineup / Other Statuses
  SCHEDULED: 'Chưa bắt đầu',
  LINEUP_PENDING: 'Chờ lineup',
  LINEUP_READY: 'Đã nộp lineup',
  READY: 'Sẵn sàng',
  RUNNING: 'Đang đấu',
  SEGMENT_BREAK: 'Nghỉ chặng',
  RESULT_CONFIRMED: 'Đã kết thúc',
  CANCELLED: 'Đã hủy',
  WALKOVER: 'Bỏ cuộc',
  PENDING: 'Chờ xử lý',
  UNCLAIMED: 'Chưa nhận',
  CLAIMED: 'Đã nhận',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị từ chối',
  VALID: 'Hợp lệ',
  INVALID: 'Không hợp lệ',
  LOCKED: 'Đã khóa',
  SUBMITTED: 'Đã gửi',
  PREVIEW: 'Bản thử nghiệm',
};

function formatStatus(status: string): string {
  if (statusTranslationMap[status]) {
    return statusTranslationMap[status];
  }
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
