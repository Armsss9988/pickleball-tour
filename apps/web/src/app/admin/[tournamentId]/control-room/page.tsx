'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Dices,
  ExternalLink,
  GitBranch,
  RefreshCw,
  Shield,
  Target,
  Trophy,
  Users,
} from '@/components/icons';
import type { LucideIcon } from '@/components/icons';
import { PageLoading } from '@/components/loading-skeleton';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { useToast } from '@/components/toast';
import { apiFetch } from '@/lib/api-client';
import { getCurrentUser } from '@/lib/current-user';
import { buildTournamentUxContext } from '@/lib/tournament-ux-context';
import {
  getActionAccess,
  getDependencyWarnings,
  getHumanStatusLabel,
} from '@/lib/tournament-ux-policy';
import { useActiveTournament } from '@/lib/use-tournament';
import { ControlRoomScrollspy, type ControlRoomSectionLink } from './control-room-scrollspy';
import {
  getAssignedGroupCount,
  getLineupMatches,
  getMatchOperationCounts,
  getVenueSummary,
  groupStandingsByGroup,
} from './control-room-utils';
import { useControlRoomData } from './use-control-room-data';

const sections: ControlRoomSectionLink[] = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'draw', label: 'Đội tuyển' },
  { id: 'groups', label: 'Bảng đấu' },
  { id: 'lineup', label: 'Lineup' },
  { id: 'matches', label: 'Trận đấu' },
  { id: 'standings', label: 'BXH' },
  { id: 'bracket', label: 'Bracket' },
];

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
}

function SectionShell({
  id,
  icon: Icon,
  title,
  description,
  children,
  action,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-slate-700/50 bg-slate-900/55 p-5 shadow-xl">
      <div className="mb-4 flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-100">{title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{description}</p>
          </div>
        </div>
        {action ? <div className="flex flex-shrink-0 items-center gap-2">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function MetricTile({ label, value, tone = 'slate' }: { label: string; value: React.ReactNode; tone?: 'slate' | 'amber' | 'emerald' | 'rose' | 'sky' }) {
  const toneClass = {
    slate: 'border-slate-800 bg-slate-950/35 text-slate-200',
    amber: 'border-amber-500/20 bg-amber-500/8 text-amber-300',
    emerald: 'border-emerald-500/20 bg-emerald-500/8 text-emerald-300',
    rose: 'border-rose-500/20 bg-rose-500/8 text-rose-300',
    sky: 'border-sky-500/20 bg-sky-500/8 text-sky-300',
  }[tone];

  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClass}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">{label}</div>
      <div className="mt-1 text-lg font-black">{value}</div>
    </div>
  );
}

function DetailLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-amber-500/35 hover:text-amber-300"
    >
      {children}
      <ExternalLink className="h-3.5 w-3.5" />
    </Link>
  );
}

function ListRow({ title, meta, badge }: { title: string; meta?: string; badge?: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/35 px-3 py-2.5">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-slate-200">{title}</div>
        {meta ? <div className="mt-0.5 truncate text-[11px] text-slate-500">{meta}</div> : null}
      </div>
      {badge ? (
        <span className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

export default function ControlRoomPage() {
  const currentUser = useMemo(() => getCurrentUser(), []);
  const { tournament, loading: tournamentLoading, error: tournamentError, reload } = useActiveTournament(currentUser.role);
  const { data, loading, refreshing, error, refreshAll } = useControlRoomData(tournament?.id, reload);
  const { toast } = useToast();
  const [actionKey, setActionKey] = useState<string | null>(null);

  const counts = useMemo(() => getMatchOperationCounts(data.matches), [data.matches]);
  const assignedGroupCount = useMemo(() => getAssignedGroupCount(data.groups), [data.groups]);
  const lineupMatches = useMemo(() => getLineupMatches(data.matches), [data.matches]);
  const standingsByGroup = useMemo(() => groupStandingsByGroup(data.standings), [data.standings]);
  const latestPreviewDraw = data.teamDraws.find((draw) => draw.status === 'PREVIEW') ?? null;
  const confirmedDraw = data.teamDraws.find((draw) => draw.status === 'CONFIRMED') ?? null;
  const venueSummary = getVenueSummary(tournament?.venueName);

  const uxContext = useMemo(() => {
    return buildTournamentUxContext({
      tournament,
      stats: {
        teamsCount: data.teams.length,
        groupsAssigned: assignedGroupCount > 0,
        matchesCount: counts.total,
        lineupReadyCount: counts.lineupReady,
        scoringReadyCount: counts.scoringReady,
        completedMatches: counts.completed,
        resultConfirmedMatches: counts.resultConfirmed,
      },
    });
  }, [assignedGroupCount, counts, data.teams.length, tournament]);

  const drawAccess = useMemo(() => getActionAccess('drawTeams', currentUser.role, uxContext), [currentUser.role, uxContext]);
  const assignGroupsAccess = useMemo(() => getActionAccess('assignGroups', currentUser.role, uxContext), [currentUser.role, uxContext]);
  const bracketAccess = useMemo(() => getActionAccess('confirmResults', currentUser.role, uxContext), [currentUser.role, uxContext]);
  const warnings = useMemo(() => getDependencyWarnings(uxContext), [uxContext]);

  async function runAction(key: string, action: () => Promise<void>, successMessage: string) {
    if (actionKey) return;
    try {
      setActionKey(key);
      await action();
      toast(successMessage, 'success');
      await refreshAll();
    } catch (err) {
      toast(getErrorMessage(err, 'Không thể thực hiện thao tác lúc này.'), 'error');
    } finally {
      setActionKey(null);
    }
  }

  if (tournamentLoading || (loading && !tournament)) {
    return <PageLoading />;
  }

  if (tournamentError || !tournament) {
    return (
      <div className="premium-container">
        <EmptyState
          icon={Shield}
          title="Không thể tải bàn điều phối"
          description={tournamentError || 'Không tìm thấy giải đấu để vận hành.'}
          actionLabel="Tải lại"
          onAction={reload}
        />
      </div>
    );
  }

  return (
    <div className="premium-container animate-scale-in">
      <PageHeader
        icon={Shield}
        title="Bàn Điều Phối Hợp Nhất"
        description={`${tournament.name} · ${venueSummary}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={tournament.status} size="md" />
            <button
              type="button"
              onClick={() => void refreshAll()}
              disabled={refreshing}
              className="btn btn-secondary btn-sm"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Đang tải...' : 'Tải lại'}
            </button>
          </div>
        }
      />

      {error ? (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>{error}</div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <ControlRoomScrollspy sections={sections} />

        <div className="space-y-6">
          <SectionShell
            id="overview"
            icon={Trophy}
            title="Tổng quan vận hành"
            description="Tình trạng dữ liệu cần để BTC điều phối giải mà không lặp lại form thông tin giải hoặc cấu hình sân."
          >
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
              <MetricTile label="Trạng thái" value={getHumanStatusLabel(tournament.status)} tone="amber" />
              <MetricTile label="Đội" value={data.teams.length} tone="sky" />
              <MetricTile label="Đã xếp bảng" value={assignedGroupCount} tone={assignedGroupCount > 0 ? 'emerald' : 'slate'} />
              <MetricTile label="Trận" value={counts.total} tone="slate" />
              <MetricTile label="Kết quả chốt" value={`${counts.resultConfirmed}/${counts.total}`} tone={counts.total > 0 && counts.resultConfirmed === counts.total ? 'emerald' : 'amber'} />
            </div>

            {warnings.length > 0 ? (
              <div className="mt-4 space-y-2">
                {warnings.map((warning, index) => (
                  <div key={`${warning.area}-${index}`} className="flex items-start justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-amber-200">{warning.label}</div>
                      <p className="mt-0.5 text-xs leading-relaxed text-amber-100/80">{warning.reason}</p>
                    </div>
                    <DetailLink href={warning.actionHref}>{warning.actionLabel}</DetailLink>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm font-semibold text-emerald-300">
                Dữ liệu vận hành chính đã sẵn sàng.
              </div>
            )}
          </SectionShell>

          <SectionShell
            id="draw"
            icon={Dices}
            title="Đội tuyển"
            description="Theo dõi đội chính thức và thao tác bốc thăm nhanh khi đủ điều kiện."
            action={<DetailLink href={`/admin/${tournament.id}/draw`}>Mở Đội tuyển</DetailLink>}
          >
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_260px]">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                {data.teams.slice(0, 8).map((team) => (
                  <ListRow
                    key={team.id}
                    title={team.name || team.code || team.id}
                    meta={`${Array.isArray(team.members) ? team.members.length : 0} VĐV`}
                    badge={team.code}
                  />
                ))}
                {data.teams.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-800 px-4 py-8 text-center text-xs text-slate-500 md:col-span-2 xl:col-span-4">
                    Chưa có đội chính thức.
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/35 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Phiên bốc thăm</div>
                <div className="mt-2 text-sm font-semibold text-slate-200">
                  {confirmedDraw ? 'Đã xác nhận đội chính thức' : latestPreviewDraw ? 'Có bản xem trước đang chờ xác nhận' : 'Chưa có bản bốc thăm'}
                </div>
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    disabled={!drawAccess.allowed || Boolean(actionKey)}
                    onClick={() => void runAction(
                      'draw-preview',
                      () => apiFetch(`/tournaments/${tournament.id}/team-draws/preview`, { method: 'POST' }),
                      'Đã tạo bản bốc thăm xem trước.',
                    )}
                    className="btn btn-primary btn-full btn-sm"
                  >
                    Tạo bốc thăm thử
                  </button>
                  {latestPreviewDraw ? (
                    <button
                      type="button"
                      disabled={!drawAccess.allowed || Boolean(actionKey)}
                      onClick={() => void runAction(
                        'draw-confirm',
                        () => apiFetch(`/tournaments/${tournament.id}/team-draws/${latestPreviewDraw.id}/confirm`, { method: 'POST' }),
                        'Đã xác nhận kết quả bốc thăm.',
                      )}
                      className="btn btn-secondary btn-full btn-sm border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    >
                      Xác nhận bốc thăm
                    </button>
                  ) : null}
                  {!drawAccess.allowed ? <p className="text-xs leading-relaxed text-amber-300">{drawAccess.reason}</p> : null}
                </div>
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="groups"
            icon={Target}
            title="Bảng đấu"
            description="Theo dõi phân bảng và dùng thao tác phân bảng ngẫu nhiên nhanh khi đủ điều kiện."
            action={<DetailLink href={`/admin/${tournament.id}/groups`}>Mở Bảng đấu</DetailLink>}
          >
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_260px]">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {data.groups.map((group) => (
                  <div key={group.id} className="rounded-xl border border-slate-800 bg-slate-950/35 p-4">
                    <div className="text-sm font-bold text-amber-400">{group.name || `Bảng ${group.code || ''}`}</div>
                    <div className="mt-3 space-y-2">
                      {(group.groupTeams || []).map((groupTeam: any) => (
                        <ListRow
                          key={groupTeam.id}
                          title={groupTeam.team?.name || groupTeam.teamId || groupTeam.id}
                          meta={`Seed #${groupTeam.seedOrder ?? '-'}`}
                        />
                      ))}
                      {!Array.isArray(group.groupTeams) || group.groupTeams.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-800 px-3 py-6 text-center text-xs text-slate-500">
                          Chưa có đội trong bảng này.
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
                {data.groups.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-800 px-4 py-8 text-center text-xs text-slate-500 md:col-span-2">
                    Chưa có bảng đấu.
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/35 p-4">
                <MetricTile label="Đội đã vào bảng" value={`${assignedGroupCount}/${data.teams.length}`} tone={assignedGroupCount === data.teams.length && data.teams.length > 0 ? 'emerald' : 'amber'} />
                <button
                  type="button"
                  disabled={!assignGroupsAccess.allowed || Boolean(actionKey)}
                  onClick={() => void runAction(
                    'groups-random',
                    () => apiFetch(`/tournaments/${tournament.id}/groups/random-assignment`, { method: 'POST' }),
                    'Đã phân bảng ngẫu nhiên.',
                  )}
                  className="btn btn-primary btn-full btn-sm mt-3"
                >
                  Phân bảng ngẫu nhiên
                </button>
                {!assignGroupsAccess.allowed ? <p className="mt-3 text-xs leading-relaxed text-amber-300">{assignGroupsAccess.reason}</p> : null}
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="lineup"
            icon={ClipboardList}
            title="Lineup"
            description="Các trận đang cần khai báo hoặc khóa đội hình."
            action={<DetailLink href={`/admin/${tournament.id}/lineup`}>Mở Lineup</DetailLink>}
          >
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {lineupMatches.slice(0, 8).map((match) => (
                <ListRow
                  key={match.id}
                  title={`${match.teamA?.name || 'Chờ đội A'} vs ${match.teamB?.name || 'Chờ đội B'}`}
                  meta={match.group ? `Bảng ${match.group.code || '-'} · Lượt ${match.roundNo || '-'}` : match.label || 'Playoff'}
                  badge={match.status}
                />
              ))}
              {lineupMatches.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 px-4 py-8 text-center text-xs text-slate-500 lg:col-span-2">
                  Không có trận nào đang chờ lineup.
                </div>
              ) : null}
            </div>
          </SectionShell>

          <SectionShell
            id="matches"
            icon={Calendar}
            title="Trận đấu"
            description="Tổng quan lịch thi đấu, kết quả và xung đột sân."
            action={<DetailLink href={`/admin/${tournament.id}/matches`}>Mở Trận đấu</DetailLink>}
          >
            {data.conflicts.length > 0 ? (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-sm text-rose-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>Đang có {data.conflicts.length} xung đột lịch hoặc sân. Mở trang trận đấu để xử lý chi tiết.</div>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <MetricTile label="Tổng trận" value={counts.total} tone="slate" />
              <MetricTile label="Sẵn sàng lineup" value={counts.lineupReady} tone="amber" />
              <MetricTile label="Sẵn sàng chấm" value={counts.scoringReady} tone="sky" />
              <MetricTile label="Hoàn tất" value={counts.completed} tone="emerald" />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-2">
              {data.matches.slice(0, 8).map((match) => (
                <ListRow
                  key={match.id}
                  title={`${match.teamA?.name || 'Chờ đội A'} vs ${match.teamB?.name || 'Chờ đội B'}`}
                  meta={match.group ? `Bảng ${match.group.code || '-'} · Trận ${match.matchNo || '-'}` : match.label || 'Playoff'}
                  badge={match.status}
                />
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="standings"
            icon={BarChart3}
            title="Bảng xếp hạng"
            description="BXH được đặt ngay sau khu trận đấu để BTC thấy thay đổi sau khi kết quả được cập nhật."
            action={<DetailLink href={`/admin/${tournament.id}/standings`}>Mở BXH</DetailLink>}
          >
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {data.groups.map((group) => {
                const groupStandings = standingsByGroup[group.id] || [];
                return (
                  <div key={group.id} className="rounded-xl border border-slate-800 bg-slate-950/35 p-4">
                    <div className="mb-3 text-sm font-bold text-amber-400">{group.name || `Bảng ${group.code || ''}`}</div>
                    <div className="space-y-2">
                      {groupStandings.map((standing: any) => (
                        <ListRow
                          key={standing.id || standing.teamId}
                          title={`${standing.rank || '-'} · ${standing.team?.name || standing.teamId || 'Chưa xác định'}`}
                          meta={`${standing.wins ?? 0} thắng · ${standing.losses ?? 0} thua · ${standing.points ?? 0} điểm`}
                        />
                      ))}
                      {groupStandings.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-800 px-3 py-6 text-center text-xs text-slate-500">
                          Chưa có dữ liệu xếp hạng.
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionShell>

          <SectionShell
            id="bracket"
            icon={GitBranch}
            title="Nhánh playoff"
            description="Theo dõi nhánh đấu loại trực tiếp và sinh bracket khi vòng bảng đã sẵn sàng."
            action={<DetailLink href={`/admin/${tournament.id}/bracket`}>Mở Bracket</DetailLink>}
          >
            {data.bracketNodes.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {data.bracketNodes.slice(0, 9).map((node) => (
                  <ListRow
                    key={node.id}
                    title={node.roundName || node.nodeKey || node.id}
                    meta={`${node.teamA?.name || node.sourceA || 'Chờ đội'} vs ${node.teamB?.name || node.sourceB || 'Chờ đội'}`}
                    badge={node.match?.status}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-800 px-4 py-8 text-center">
                <GitBranch className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                <div className="text-sm font-semibold text-slate-300">Chưa có nhánh playoff</div>
                <p className="mt-1 text-xs text-slate-500">Sinh bracket sau khi kết quả vòng bảng đã được xác nhận.</p>
                <button
                  type="button"
                  disabled={!bracketAccess.allowed || Boolean(actionKey)}
                  onClick={() => void runAction(
                    'bracket-generate',
                    () => apiFetch(`/tournaments/${tournament.id}/bracket/generate`, { method: 'POST' }),
                    'Đã sinh nhánh playoff.',
                  )}
                  className="btn btn-primary btn-sm mt-4"
                >
                  <GitBranch className="h-4 w-4" />
                  Sinh bracket
                </button>
              </div>
            )}
          </SectionShell>
        </div>
      </div>
    </div>
  );
}
