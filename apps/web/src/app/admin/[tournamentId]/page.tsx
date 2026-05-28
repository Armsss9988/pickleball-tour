'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ActionGate } from '@/components/action-gate';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading-skeleton';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  ClipboardList,
  Dices,
  RefreshCw,
  Settings,
  Shield,
  Target,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from '@/components/icons';
import { apiFetch } from '@/lib/api-client';
import { getCurrentUser, type CurrentUserState } from '@/lib/current-user';
import { buildTournamentUxContext } from '@/lib/tournament-ux-context';
import {
  getActionAccess,
  getHumanStatusLabel,
  getNextRecommendedAction,
  getPrimaryRole,
  getPublishReadiness,
  type ActionKey,
  type AppRole,
} from '@/lib/tournament-ux-policy';
import { useActiveTournament } from '@/lib/use-tournament';

interface PlayerPreview {
  id: string;
  fullName: string;
  gender: string;
}

interface MatchLike {
  status: string;
}

interface RulesetCompositionLike {
  teamSize?: number | null;
  maleCount?: number | null;
  femaleCount?: number | null;
}

interface RulesetSegmentLike {
  id?: string | null;
  name?: string | null;
  genderRule?: string | null;
  playerCount?: number | null;
  targetScore?: number | null;
}

interface RulesetLike {
  name?: string | null;
  teamCompositionRule?: RulesetCompositionLike | null;
  teamComposition?: RulesetCompositionLike | null;
  segmentDefinitions?: RulesetSegmentLike[] | null;
  segments?: RulesetSegmentLike[] | null;
  scoringConfig?: {
    winScore?: number | null;
  } | null;
}

interface DashboardStats {
  playersCount: number;
  malesCount: number;
  femalesCount: number;
  teamsCount: number;
  matchesCount: number;
  completedMatches: number;
  resultConfirmedMatches: number;
  lineupReadyCount: number;
  scoringReadyCount: number;
  recentPlayers: PlayerPreview[];
}

interface ActionCardConfig {
  key: ActionKey;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

interface RoleLaneConfig {
  title: string;
  subtitle: string;
  role: AppRole;
  actionKey: ActionKey;
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  ownsTeam?: boolean;
}

const emptyStats: DashboardStats = {
  playersCount: 0,
  malesCount: 0,
  femalesCount: 0,
  teamsCount: 0,
  matchesCount: 0,
  completedMatches: 0,
  resultConfirmedMatches: 0,
  lineupReadyCount: 0,
  scoringReadyCount: 0,
  recentPlayers: [],
};

const guestUser: CurrentUserState = {
  user: null,
  role: 'guest',
  authenticated: false,
};

function subscribeToUserStore(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleStorage = () => onStoreChange();
  window.addEventListener('storage', handleStorage);

  return () => window.removeEventListener('storage', handleStorage);
}

function countMatches(matches: MatchLike[], statuses: string[]) {
  return matches.filter((match) => statuses.includes(match.status)).length;
}

function getRoleLabel(role: AppRole): string {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'btc_admin':
      return 'BTC/Admin';
    case 'scorer':
      return 'Trọng tài';
    case 'captain':
      return 'HLV/Captain';
    default:
      return 'Khách';
  }
}

function getPublicStateLabel(isPublic: boolean): string {
  return isPublic ? 'Đang công khai' : 'Chưa công khai';
}

function getPlayerTrendText(requiredPlayers: number | null, currentPlayers: number) {
  if (requiredPlayers === null) {
    return { value: 'Chưa đủ ruleset', positive: false };
  }

  if (currentPlayers >= requiredPlayers) {
    return { value: `Đủ ${requiredPlayers}`, positive: true };
  }

  return { value: `Thiếu ${requiredPlayers - currentPlayers}`, positive: false };
}

function getRulesetComposition(ruleset: RulesetLike | null | undefined) {
  return ruleset?.teamCompositionRule ?? ruleset?.teamComposition ?? null;
}

function getRulesetSegments(ruleset: RulesetLike | null | undefined): RulesetSegmentLike[] {
  if (Array.isArray(ruleset?.segmentDefinitions)) {
    return ruleset.segmentDefinitions;
  }

  if (Array.isArray(ruleset?.segments)) {
    return ruleset.segments;
  }

  return [];
}

export default function AdminDashboardPage() {
  const { tournament, loading: tLoading, error: tError, reload } = useActiveTournament();
  const currentUser = useSyncExternalStore(
    subscribeToUserStore,
    getCurrentUser,
    () => guestUser,
  );
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!tournament) {
      return;
    }

    async function loadStats() {
      try {
        setLoadingStats(true);

        const playersData = await apiFetch(`/tournaments/${tournament.id}/players`);
        const players = Array.isArray(playersData?.items) ? playersData.items : [];
        const teamsData = await apiFetch(`/tournaments/${tournament.id}/teams`);
        const teams = Array.isArray(teamsData) ? teamsData : [];

        let matches: MatchLike[] = [];
        try {
          const matchData = await apiFetch(`/tournaments/${tournament.id}/matches`);
          matches = Array.isArray(matchData) ? matchData : [];
        } catch {
          matches = [];
        }

        setStats({
          playersCount: players.length,
          malesCount: players.filter((player: { gender: string }) => player.gender === 'MALE').length,
          femalesCount: players.filter((player: { gender: string }) => player.gender === 'FEMALE').length,
          teamsCount: teams.length,
          matchesCount: matches.length,
          completedMatches: countMatches(matches, ['COMPLETED', 'RESULT_CONFIRMED']),
          resultConfirmedMatches: countMatches(matches, ['RESULT_CONFIRMED']),
          lineupReadyCount: countMatches(matches, ['LINEUP_READY', 'READY', 'RUNNING', 'SEGMENT_BREAK', 'COMPLETED', 'RESULT_CONFIRMED']),
          scoringReadyCount: countMatches(matches, ['READY', 'RUNNING', 'SEGMENT_BREAK', 'COMPLETED']),
          recentPlayers: players.slice(0, 5),
        });
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setLoadingStats(false);
      }
    }

    loadStats();
  }, [tournament]);

  const role = useMemo(() => {
    if (currentUser.authenticated) {
      return currentUser.role;
    }

    return getPrimaryRole(currentUser.user?.roles ?? []);
  }, [currentUser]);

  const uxContext = useMemo(() => {
    return buildTournamentUxContext({
      tournament,
      stats: {
        playersCount: stats.playersCount,
        malesCount: stats.malesCount,
        femalesCount: stats.femalesCount,
        teamsCount: stats.teamsCount,
        matchesCount: stats.matchesCount,
        completedMatches: stats.completedMatches,
        resultConfirmedMatches: stats.resultConfirmedMatches,
        lineupReadyCount: stats.lineupReadyCount,
        scoringReadyCount: stats.scoringReadyCount,
      },
      currentUserOwnsTeam: role === 'captain',
    });
  }, [role, stats, tournament]);

  const nextAction = useMemo(() => getNextRecommendedAction(role, uxContext), [role, uxContext]);
  const nextActionAccess = useMemo(
    () => getActionAccess(nextAction.key, role, uxContext),
    [nextAction.key, role, uxContext],
  );
  const publishReadiness = useMemo(() => getPublishReadiness(uxContext), [uxContext]);

  const actionCards = useMemo<ActionCardConfig[]>(() => {
    if (!tournament) {
      return [];
    }

    return [
      {
        key: 'editTournament',
        label: 'Thông tin giải',
        description: 'Sửa tên giải, địa điểm và thông tin công khai để người xem hiểu giải ngay từ đầu.',
        href: `/admin/${tournament.id}/tournament`,
        icon: Trophy,
      },
      {
        key: 'editRuleset',
        label: 'Cấu hình ruleset',
        description: 'Khai báo đội hình, chặng đấu và cách tính điểm trước khi vận hành.',
        href: `/admin/${tournament.id}/ruleset`,
        icon: Settings,
      },
      {
        key: 'addPlayers',
        label: 'Nhập vận động viên',
        description: 'Bổ sung danh sách thi đấu và theo dõi đủ nam nữ theo ruleset.',
        href: `/admin/${tournament.id}/players`,
        icon: Users,
      },
      {
        key: 'drawTeams',
        label: 'Bốc thăm đội',
        description: 'Chỉ mở khi đã đủ vận động viên theo số lượng yêu cầu.',
        href: `/admin/${tournament.id}/draw`,
        icon: Dices,
      },
      {
        key: 'assignGroups',
        label: 'Phân bảng',
        description: 'Đưa các đội vào bảng trước khi sinh lịch trận đấu.',
        href: `/admin/${tournament.id}/groups`,
        icon: Shield,
      },
      {
        key: 'configureSchedule',
        label: 'Cấu hình lịch',
        description: 'Thiết lập sân, khung giờ và thông tin mở giải ngay từ đầu.',
        href: `/admin/${tournament.id}/groups`,
        icon: Calendar,
      },
      {
        key: 'generateMatches',
        label: 'Sinh lịch thi đấu',
        description: 'Tạo trận đấu thật sau khi đã phân bảng xong.',
        href: `/admin/${tournament.id}/groups`,
        icon: Target,
      },
      {
        key: 'scoreMatch',
        label: 'Mở bàn trọng tài',
        description: 'Theo dõi các trận đã sẵn sàng chấm điểm.',
        href: `/admin/${tournament.id}/scoring`,
        icon: Zap,
      },
      {
        key: 'confirmResults',
        label: 'Xác nhận kết quả',
        description: 'Kiểm tra các trận đã hoàn thành để chốt kết quả cuối cùng.',
        href: `/admin/${tournament.id}/scoring`,
        icon: BarChart3,
      },
      {
        key: 'publishTournament',
        label: 'Công khai giải',
        description: 'Chỉ mở khi giải đã hoàn tất và dữ liệu công khai đã sẵn sàng.',
        href: `/admin/${tournament.id}`,
        icon: ArrowRight,
      },
    ];
  }, [tournament]);

  const roleLanes = useMemo<RoleLaneConfig[]>(() => {
    if (!tournament) {
      return [];
    }

    return [
      {
        title: 'BTC/Admin',
        subtitle: 'Thiết lập và mở khóa dữ liệu vận hành',
        role: 'btc_admin',
        actionKey: nextAction.key,
        href: nextAction.href,
        label: nextAction.label,
        description: nextAction.description,
        icon: Trophy,
      },
      {
        title: 'HLV/Captain',
        subtitle: 'Khai báo đội hình cho đội của mình',
        role: 'captain',
        actionKey: 'submitLineup',
        href: `/admin/${tournament.id}/lineup`,
        label: uxContext.matchCount > 0 ? 'Nhập lineup đội' : 'Chờ lịch thi đấu',
        description: uxContext.matchCount > 0
          ? `${uxContext.lineupReadyCount} trận đã sẵn sàng chuyển sang bước lineup hoặc thi đấu.`
          : 'BTC cần sinh lịch thi đấu trước khi HLV/Captain có việc để làm.',
        icon: ClipboardList,
        ownsTeam: true,
      },
      {
        title: 'Trọng tài',
        subtitle: 'Chấm điểm và xác nhận kết quả trận',
        role: 'scorer',
        actionKey: 'scoreMatch',
        href: `/admin/${tournament.id}/scoring`,
        label: uxContext.scoringReadyCount > 0 ? 'Mở bàn trọng tài' : 'Chưa có trận sẵn sàng',
        description: uxContext.scoringReadyCount > 0
          ? `${uxContext.scoringReadyCount} trận có thể vào chấm điểm hoặc tiếp tục xử lý.`
          : 'Cần có lịch thi đấu và lineup đã khóa trước khi trọng tài bắt đầu.',
        icon: Zap,
      },
    ];
  }, [nextAction.description, nextAction.href, nextAction.key, nextAction.label, tournament, uxContext]);

  if (tLoading || loadingStats) {
    return <PageLoading />;
  }

  if (tError || !tournament) {
    return (
      <div className="premium-container">
        <EmptyState
          icon={Trophy}
          title="Lỗi tải dữ liệu"
          description={tError || 'Không thể thiết lập giải đấu.'}
          actionLabel="Tải lại trang"
          onAction={reload}
        />
      </div>
    );
  }

  const playerTrend = getPlayerTrendText(uxContext.requiredPlayers, stats.playersCount);
  const teamTrend = stats.teamsCount >= 8
    ? { value: 'Đủ 8 đội', positive: true }
    : { value: `Hiện có ${stats.teamsCount}/8`, positive: false };
  const matchProgressTrend = stats.matchesCount > 0
    ? {
        value: `${Math.round((stats.completedMatches / stats.matchesCount) * 100)}%`,
        positive: stats.completedMatches > 0,
      }
    : undefined;
  const publishCardText = publishReadiness.ready
    ? tournament.publicEnabled
      ? 'Giải đang hiển thị công khai'
      : 'Có thể công khai ngay'
    : `${publishReadiness.missing.length} mục còn thiếu`;

  const ruleset = tournament.ruleset as RulesetLike | undefined;
  const composition = getRulesetComposition(ruleset);
  const segments = getRulesetSegments(ruleset);

  return (
    <div className="premium-container space-y-6">
      <PageHeader
        icon={Trophy}
        title={tournament.name}
        description={tournament.venueName || 'Chưa thiết lập địa điểm'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={tournament.status} size="md" />
            <span className="rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1 text-xs font-semibold text-slate-300">
              {getPublicStateLabel(Boolean(tournament.publicEnabled))}
            </span>
            <Link href={`/admin/${tournament.id}/tournament`} className="btn btn-secondary btn-sm">
              <Settings className="w-4 h-4" /> Thiết lập
            </Link>
            <button type="button" onClick={reload} className="btn btn-secondary btn-sm">
              <RefreshCw className="w-4 h-4" /> Tải lại
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/8 via-slate-900/80 to-slate-900/95 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.35)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300/90">
                Việc cần làm tiếp theo
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-100">
                {nextAction.label}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                {nextAction.description}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="rounded-full border border-slate-700/60 bg-slate-900/70 px-2.5 py-1">
                  Vai trò hiện tại: {getRoleLabel(role)}
                </span>
                <span className="rounded-full border border-slate-700/60 bg-slate-900/70 px-2.5 py-1">
                  Trạng thái: {getHumanStatusLabel(tournament.status)}
                </span>
                {currentUser.user?.displayName && (
                  <span className="rounded-full border border-slate-700/60 bg-slate-900/70 px-2.5 py-1">
                    Người dùng: {currentUser.user.displayName}
                  </span>
                )}
              </div>
            </div>

            <div className="w-full max-w-xl lg:min-w-[340px]">
              <ActionGate
                access={nextActionAccess}
                href={nextAction.href}
                label={nextAction.label}
                description={nextAction.description}
                className="border-amber-500/20 bg-slate-950/45"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </ActionGate>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/65 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Checklist công khai
              </div>
              <h3 className="mt-1 text-lg font-bold text-slate-100">
                {publishReadiness.ready ? 'Đủ điều kiện công khai' : 'Chưa thể công khai'}
              </h3>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
              publishReadiness.ready
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-amber-500/10 text-amber-400'
            }`}>
              {publishCardText}
            </span>
          </div>

          {publishReadiness.ready ? (
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Dữ liệu cốt lõi đã đủ. Bạn có thể công khai giải khi đã sẵn sàng cho người xem bên ngoài.
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {publishReadiness.missing.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-slate-700/60 bg-slate-950/70 px-3 py-1 text-xs font-medium text-slate-300"
                >
                  Còn thiếu: {item}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4">
            <ActionGate
              access={getActionAccess('publishTournament', role, uxContext)}
              href={`/admin/${tournament.id}`}
              label="Công khai giải"
              description="Chỉ bật khi các dữ liệu bắt buộc đã hoàn tất."
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger">
        <StatCard
          icon={Users}
          label="Vận động viên"
          value={stats.playersCount}
          color="sky"
          trend={playerTrend}
        />
        <StatCard
          icon={Shield}
          label="Đội thi đấu"
          value={stats.teamsCount}
          color="violet"
          trend={teamTrend}
        />
        <StatCard
          icon={Target}
          label="Trận đấu"
          value={stats.matchesCount}
          color="amber"
          trend={stats.matchesCount > 0 ? { value: `${stats.lineupReadyCount} đã sẵn sàng`, positive: stats.lineupReadyCount > 0 } : undefined}
        />
        <StatCard
          icon={Trophy}
          label="Kết quả đã chốt"
          value={stats.resultConfirmedMatches}
          color="emerald"
          trend={matchProgressTrend}
        />
      </div>

      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Theo từng vai
            </div>
            <h3 className="mt-1 text-lg font-bold text-slate-100">
              Mỗi người vào app sẽ thấy đúng việc của mình
            </h3>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          {roleLanes.map((lane) => {
            const laneContext = lane.ownsTeam
              ? { ...uxContext, currentUserOwnsTeam: true }
              : uxContext;
            const laneAccess = getActionAccess(lane.actionKey, lane.role, laneContext);
            const LaneIcon = lane.icon;

            return (
              <div key={lane.title} className="rounded-xl border border-slate-800/80 bg-slate-950/45 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/80 text-amber-400">
                    <LaneIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-200">{lane.title}</div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{lane.subtitle}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <ActionGate
                    access={laneAccess}
                    href={lane.href}
                    label={lane.label}
                    description={lane.description}
                    className="bg-slate-900/55"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Thao tác nhanh
              </div>
              <h3 className="mt-1 text-lg font-bold text-slate-100">
                Không còn link tắt bypass bước khóa
              </h3>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {actionCards.map((action) => {
              const access = getActionAccess(action.key, role, uxContext);
              const Icon = action.icon;

              return (
                <ActionGate
                  key={action.key}
                  access={access}
                  href={action.href}
                  label={action.label}
                  description={action.description}
                  className="min-h-[116px]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                    <Icon className="h-5 w-5" />
                  </div>
                </ActionGate>
              );
            })}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Vận động viên
                </div>
                <h3 className="mt-1 text-lg font-bold text-slate-100">
                  {stats.playersCount} người đã nhập
                </h3>
              </div>
              <Link
                href={`/admin/${tournament.id}/players`}
                className="text-xs font-semibold text-amber-400 transition-colors hover:text-amber-300"
              >
                Quản lý →
              </Link>
            </div>

            <div className="mt-4 rounded-xl border border-slate-800/70 bg-slate-950/40 p-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-9 text-xs font-semibold text-slate-400">Nam</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-violet-500 transition-all duration-500"
                      style={{ width: stats.playersCount > 0 ? `${(stats.malesCount / stats.playersCount) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs font-bold text-slate-300">{stats.malesCount}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-9 text-xs font-semibold text-slate-400">Nữ</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-500"
                      style={{ width: stats.playersCount > 0 ? `${(stats.femalesCount / stats.playersCount) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs font-bold text-slate-300">{stats.femalesCount}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {stats.recentPlayers.length > 0 ? (
                stats.recentPlayers.map((player) => (
                  <div key={player.id} className="flex items-center gap-3 rounded-lg bg-slate-950/35 px-3 py-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white ${
                      player.gender === 'MALE'
                        ? 'bg-gradient-to-br from-sky-500 to-violet-500'
                        : 'bg-gradient-to-br from-pink-500 to-rose-500'
                    }`}>
                      {player.fullName.split(' ').pop()?.[0] || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-200">{player.fullName}</div>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      {player.gender === 'MALE' ? 'Nam' : 'Nữ'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-slate-800/80 px-4 py-5 text-center text-xs italic text-slate-500">
                  Chưa có vận động viên. Hãy nhập danh sách trước khi bốc thăm.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Ruleset hiện tại
                </div>
                <h3 className="mt-1 text-lg font-bold text-slate-100">
                  {ruleset?.name || 'Chưa đặt tên ruleset'}
                </h3>
              </div>
              <Link
                href={`/admin/${tournament.id}/ruleset`}
                className="text-xs font-semibold text-amber-400 transition-colors hover:text-amber-300"
              >
                Mở ruleset →
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-950/40 px-4 py-3">
                <div className="text-[11px] font-medium text-slate-500">Đội hình mỗi đội</div>
                <div className="mt-1 text-sm font-semibold text-slate-200">
                  {composition
                    ? `${composition.teamSize || 0} người (${composition.maleCount || 0} nam, ${composition.femaleCount || 0} nữ)`
                    : 'Chưa khai báo'}
                </div>
              </div>
              <div className="rounded-xl bg-slate-950/40 px-4 py-3">
                <div className="text-[11px] font-medium text-slate-500">Chặng thi đấu</div>
                <div className="mt-1 text-sm font-semibold text-slate-200">
                  {segments.length > 0 ? `${segments.length} chặng đã cấu hình` : 'Chưa có chặng nào'}
                </div>
              </div>
              <div className="rounded-xl bg-slate-950/40 px-4 py-3">
                <div className="text-[11px] font-medium text-slate-500">Điểm mục tiêu</div>
                <div className="mt-1 text-sm font-semibold text-slate-200">
                  {ruleset?.scoringConfig?.winScore ? `${ruleset.scoringConfig.winScore} điểm` : 'Chưa khai báo'}
                </div>
              </div>
              <div className="rounded-xl bg-slate-950/40 px-4 py-3">
                <div className="text-[11px] font-medium text-slate-500">Tình trạng ruleset</div>
                <div className="mt-1 text-sm font-semibold text-slate-200">
                  {uxContext.hasValidRuleset ? 'Đã đủ dữ liệu để vận hành' : 'Cần bổ sung trước khi bốc thăm'}
                </div>
              </div>
            </div>

            {segments.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-3">
                {segments.slice(0, 3).map((segment, index: number) => (
                  <div
                    key={segment.id ?? segment.name ?? index}
                    className="flex items-center gap-3 rounded-xl border border-slate-800/70 bg-slate-950/35 px-3 py-2.5"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-[11px] font-bold text-slate-950">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-200">
                        {segment.name || `Chặng ${index + 1}`}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {segment.genderRule || 'Không giới hạn'} · {segment.playerCount || 0} VĐV
                      </div>
                    </div>
                    <div className="text-xs font-bold text-amber-400">
                      {segment.targetScore ? `${segment.targetScore}đ` : 'Chưa có điểm'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-dashed border-slate-800/80 px-4 py-5 text-center text-xs italic text-slate-500">
                Ruleset chưa có chặng thi đấu. Hệ thống sẽ tiếp tục khóa bốc thăm và sinh lịch cho đến khi đủ cấu hình.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
