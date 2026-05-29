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
  ExternalLink,
  type LucideIcon,
} from '@/components/icons';
import { StepperProgress, type Step } from '@/components/stepper-progress';
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

function normalizeGender(gender: string | null | undefined) {
  return (gender ?? '').trim().toUpperCase();
}

function getRoleLabel(role: AppRole): string {
  switch (role) {
    case 'super_admin':
      return 'Quản trị viên (Super Admin)';
    case 'btc_admin':
      return 'Ban tổ chức (BTC Admin)';
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
    return { value: 'Chờ luật thi đấu', type: 'warning' as const };
  }

  if (currentPlayers >= requiredPlayers) {
    return { value: `Đủ ${requiredPlayers}`, type: 'success' as const };
  }

  return { value: `Thiếu ${requiredPlayers - currentPlayers}`, type: 'warning' as const };
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

function PublishActionCard({
  allowed,
  isPublishing,
  onPublish,
  message,
}: {
  allowed: boolean;
  isPublishing: boolean;
  onPublish: () => void;
  message?: string | null;
}) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
          <ArrowRight className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-200">Công khai giải</div>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Khi đủ điều kiện, thao tác này sẽ bật giải ra khu vực công khai cho khách xem.
          </p>
          {message && (
            <p className="mt-2 text-xs leading-relaxed text-slate-300">{message}</p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onPublish}
        disabled={!allowed || isPublishing}
        className={[
          'mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
          allowed && !isPublishing
            ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
            : 'cursor-not-allowed bg-slate-800 text-slate-500',
        ].join(' ')}
      >
        <ArrowRight className="h-3.5 w-3.5" />
        {isPublishing ? 'Đang công khai...' : 'Công khai ngay'}
      </button>
    </div>
  );
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
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!tournament) {
      return;
    }
    const activeTournament = tournament;

    async function loadStats() {
      try {
        setLoadingStats(true);

        const playersData = await apiFetch(`/tournaments/${activeTournament.id}/players`);
        const players = Array.isArray(playersData?.items) ? playersData.items : [];
        const teamsData = await apiFetch(`/tournaments/${activeTournament.id}/teams`);
        const teams = Array.isArray(teamsData) ? teamsData : [];

        let matches: MatchLike[] = [];
        try {
          const matchData = await apiFetch(`/tournaments/${activeTournament.id}/matches`);
          matches = Array.isArray(matchData) ? matchData : [];
        } catch {
          matches = [];
        }

        setStats({
          playersCount: players.length,
          malesCount: players.filter((player: { gender: string }) => normalizeGender(player.gender) === 'MALE').length,
          femalesCount: players.filter((player: { gender: string }) => normalizeGender(player.gender) === 'FEMALE').length,
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
  const publishAccess = useMemo(() => getActionAccess('publishTournament', role, uxContext), [role, uxContext]);

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
        label: 'Luật thi đấu',
        description: 'Khai báo đội hình, chặng đấu và cách tính điểm trước khi vận hành.',
        href: `/admin/${tournament.id}/ruleset`,
        icon: Settings,
      },
      {
        key: 'addPlayers',
        label: 'Nhập vận động viên',
        description: 'Bổ sung danh sách thi đấu và theo dõi đủ nam nữ theo luật.',
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
    ];
  }, [tournament]);

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

  const ruleset = tournament.ruleset as RulesetLike | undefined;
  const composition = getRulesetComposition(ruleset);
  const segments = getRulesetSegments(ruleset);
  const isAdminRole = role === 'btc_admin' || role === 'super_admin';

  const targetTeams = useMemo(() => {
    return (uxContext.requiredPlayers && composition?.teamSize)
      ? (uxContext.requiredPlayers / composition.teamSize)
      : 8;
  }, [uxContext.requiredPlayers, composition?.teamSize]);

  const playerTrend = getPlayerTrendText(uxContext.requiredPlayers, stats.playersCount);

  const teamTrend = uxContext.hasValidRuleset
    ? stats.teamsCount >= targetTeams
      ? { value: `Đủ ${targetTeams} đội`, type: 'success' as const }
      : { value: `Hiện có ${stats.teamsCount}/${targetTeams}`, type: 'warning' as const }
    : { value: 'Chờ luật thi đấu', type: 'warning' as const };

  const matchTrend = stats.matchesCount > 0
    ? { value: `${stats.lineupReadyCount} sẵn sàng`, type: stats.lineupReadyCount === stats.matchesCount ? 'success' as const : 'info' as const }
    : { value: 'Chờ sinh lịch', type: 'warning' as const };

  const matchProgressTrend = stats.matchesCount > 0
    ? {
        value: `${Math.round((stats.completedMatches / stats.matchesCount) * 100)}% hoàn thành`,
        type: stats.completedMatches === stats.matchesCount ? 'success' as const : 'info' as const,
      }
    : {
        value: 'Chờ thi đấu',
        type: 'warning' as const,
      };

  const steps = useMemo<Step[]>(() => {
    if (!tournament) return [];

    // Step 1: Thông tin giải
    const step1Status = uxContext.hasTournamentInfo ? 'completed' : 'active';

    // Step 2: Luật thi đấu
    const step2Status = uxContext.hasValidRuleset
      ? 'completed'
      : step1Status === 'completed' ? 'active' : 'locked';

    // Step 3: Nhập VĐV
    const hasPlayers = uxContext.hasValidRuleset &&
      uxContext.requiredPlayers !== null &&
      uxContext.playerTotal === uxContext.requiredPlayers &&
      uxContext.maleCount === uxContext.requiredMales &&
      uxContext.femaleCount === uxContext.requiredFemales;
    const step3Status = hasPlayers
      ? 'completed'
      : step2Status === 'completed' ? 'active' : 'locked';

    // Step 4: Bốc thăm
    const hasTeams = stats.teamsCount >= targetTeams ||
      !['DRAFT', 'PLAYER_IMPORT', 'PLAYERS_READY'].includes(uxContext.status);
    const step4Status = hasTeams
      ? 'completed'
      : step3Status === 'completed' ? 'active' : 'locked';

    // Step 5: Phân bảng
    const step5Status = uxContext.groupsAssigned
      ? 'completed'
      : step4Status === 'completed' ? 'active' : 'locked';

    // Step 6: Sinh lịch
    const step6Status = uxContext.matchCount > 0
      ? 'completed'
      : step5Status === 'completed' ? 'active' : 'locked';

    // Step 7: Thi đấu
    const step7Status = (uxContext.completedMatchCount === uxContext.matchCount && uxContext.matchCount > 0)
      ? 'completed'
      : step6Status === 'completed' ? 'active' : 'locked';

    // Step 8: Hoàn tất
    const step8Status = ['COMPLETED', 'PUBLISHED'].includes(uxContext.status)
      ? 'completed'
      : step7Status === 'completed' ? 'active' : 'locked';

    return [
      { key: 'info', label: 'Thông tin giải', status: step1Status },
      { key: 'ruleset', label: 'Luật thi đấu', status: step2Status },
      { key: 'players', label: 'Nhập VĐV', status: step3Status },
      { key: 'draw', label: 'Bốc thăm đội', status: step4Status },
      { key: 'groups', label: 'Phân bảng', status: step5Status },
      { key: 'matches', label: 'Sinh lịch thi đấu', status: step6Status },
      { key: 'running', label: 'Thi đấu', status: step7Status },
      { key: 'completed', label: 'Hoàn tất', status: step8Status },
    ];
  }, [tournament, uxContext, stats.teamsCount, targetTeams]);

  const publishCardText = publishReadiness.ready
    ? tournament.publicEnabled
      ? 'Giải đang hiển thị công khai'
      : 'Có thể công khai ngay'
    : `${publishReadiness.missing.length} mục còn thiếu`;

  const captainAction = tournament
    ? {
        access: getActionAccess('submitLineup', 'captain', { ...uxContext, currentUserOwnsTeam: true }),
        href: `/admin/${tournament.id}/lineup`,
        label: uxContext.matchCount > 0 ? 'Vào khu lineup đội' : 'Chưa có trận để nhập lineup',
        description: uxContext.matchCount > 0
          ? 'Kiểm tra các trận đội của bạn cần khai báo hoặc đã khóa lineup.'
          : 'BTC cần sinh lịch thi đấu trước khi HLV/Captain có thể thao tác.',
      }
    : null;
  const scorerActions = tournament
    ? [
        {
          access: getActionAccess('scoreMatch', 'scorer', uxContext),
          href: `/admin/${tournament.id}/scoring`,
          label: uxContext.scoringReadyCount > 0 ? 'Mở bàn trọng tài' : 'Chưa có trận sẵn sàng chấm điểm',
          description: uxContext.scoringReadyCount > 0
            ? `${uxContext.scoringReadyCount} trận có thể vào chấm điểm hoặc tiếp tục xử lý.`
            : 'Cần có lịch thi đấu và lineup đã khóa trước khi trọng tài bắt đầu.',
          icon: Zap,
        },
        {
          access: getActionAccess('confirmResults', 'scorer', uxContext),
          href: `/admin/${tournament.id}/scoring`,
          label: uxContext.completedMatchCount > 0 ? 'Xác nhận kết quả trận' : 'Chưa có trận để xác nhận',
          description: uxContext.completedMatchCount > 0
            ? `${uxContext.completedMatchCount} trận đã hoàn thành và chờ chốt kết quả.`
            : 'Kết quả chỉ xuất hiện sau khi trận đấu được hoàn tất.',
          icon: BarChart3,
        },
      ]
    : [];

  async function handlePublish() {
    if (!tournament || !publishAccess.allowed || isPublishing) {
      return;
    }

    const confirmed = window.confirm(
      'Công khai giải sẽ mở trang public cho khách xem lịch, kết quả và các thông tin liên quan. Bạn có chắc muốn tiếp tục?',
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsPublishing(true);
      setPublishMessage(null);
      await apiFetch(`/tournaments/${tournament.id}/publish`, { method: 'POST' });
      await reload();
      setPublishMessage('Giải đã được công khai. Dữ liệu mới đã được tải lại.');
    } catch (error) {
      setPublishMessage(error instanceof Error ? error.message : 'Không thể công khai giải lúc này.');
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="premium-container space-y-6">
      <PageHeader
        icon={Trophy}
        title={tournament.name}
        description={tournament.venueName ? tournament.venueName.replace(/\s*,\s*/g, ', ').trim() : 'Chưa thiết lập địa điểm'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={tournament.status} size="md" />
            {tournament.publicEnabled ? (
              publishReadiness.ready ? (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  Đang công khai
                </span>
              ) : (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
                  Đang công khai (Chưa hoàn thiện)
                </span>
              )
            ) : (
              <span className="rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1 text-xs font-semibold text-slate-400">
                Chưa công khai
              </span>
            )}
            {tournament.publicEnabled && (
              <a
                href={`/t/${tournament.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Xem trang công khai</span>
              </a>
            )}
            {isAdminRole && (
              <Link href={`/admin/${tournament.id}/tournament`} className="btn btn-secondary btn-sm">
                <Settings className="w-4 h-4" /> Thiết lập
              </Link>
            )}
            <button
              type="button"
              onClick={reload}
              className="btn btn-secondary btn-sm p-2"
              title="Tải lại dữ liệu"
              aria-label="Tải lại dữ liệu"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {isAdminRole && (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 shadow-inner">
          <StepperProgress steps={steps} />
        </div>
      )}

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
                compact={true}
                className="border-amber-500/20 bg-slate-950/45"
              />
            </div>
          </div>
        </div>

        {isAdminRole ? (
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
              {publishAccess.allowed ? (
                <PublishActionCard
                  allowed={publishAccess.allowed}
                  isPublishing={isPublishing}
                  onPublish={handlePublish}
                  message={publishMessage}
                />
              ) : (
                <ActionGate
                  access={publishAccess}
                  href={`/admin/${tournament.id}`}
                  label="Công khai giải"
                  description="Chỉ bật khi các dữ liệu bắt buộc đã hoàn tất."
                />
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/65 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Tình trạng giải
            </div>
            <h3 className="mt-1 text-lg font-bold text-slate-100">
              {role === 'scorer' ? 'Bàn trọng tài' : 'Khu đội của bạn'}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {role === 'scorer'
                ? 'Bạn chỉ thấy các thông tin cần cho việc chấm điểm và xác nhận kết quả.'
                : 'Bạn chỉ thấy các thông tin cần cho việc theo dõi lịch và khai báo lineup của đội mình.'}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger">
        {isAdminRole ? (
          <StatCard
            icon={Users}
            label="Vận động viên"
            value={stats.playersCount}
            color="sky"
            trend={playerTrend}
            href={`/admin/${tournament.id}/players`}
          />
        ) : (
          <StatCard
            icon={ClipboardList}
            label={role === 'scorer' ? 'Trận chờ xử lý' : 'Trận của đội'}
            value={role === 'scorer' ? stats.scoringReadyCount : stats.matchesCount}
            color="sky"
            trend={role === 'scorer'
              ? { value: `${stats.completedMatches} đã xong`, type: stats.completedMatches > 0 ? 'success' as const : 'info' as const }
              : { value: `${uxContext.lineupReadyCount} đã sẵn sàng`, type: uxContext.lineupReadyCount > 0 ? 'success' as const : 'info' as const }}
            href={role === 'scorer' ? `/admin/${tournament.id}/scoring` : `/admin/${tournament.id}/lineup`}
          />
        )}
        {isAdminRole ? (
          <StatCard
            icon={Shield}
            label="Đội thi đấu"
            value={stats.teamsCount}
            color="violet"
            trend={teamTrend}
            href={`/admin/${tournament.id}/teams`}
          />
        ) : (
          <StatCard
            icon={Target}
            label={role === 'scorer' ? 'Trận đã hoàn thành' : 'Lineup sẵn sàng'}
            value={role === 'scorer' ? stats.completedMatches : uxContext.lineupReadyCount}
            color="violet"
            trend={{ value: 'Chi tiết', type: 'info' as const }}
            href={role === 'scorer' ? `/admin/${tournament.id}/scoring` : `/admin/${tournament.id}/lineup`}
          />
        )}
        <StatCard
          icon={Target}
          label="Trận đấu"
          value={stats.matchesCount}
          color="amber"
          trend={matchTrend}
          href={`/admin/${tournament.id}/matches`}
        />
        <StatCard
          icon={Trophy}
          label="Kết quả đã chốt"
          value={stats.resultConfirmedMatches}
          color="emerald"
          trend={matchProgressTrend}
          href={`/admin/${tournament.id}/standings`}
        />
      </div>

      {isAdminRole ? (
        <>
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
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/45 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/80 text-amber-400">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-200">BTC/Admin</div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">Thiết lập và mở khóa dữ liệu vận hành.</p>
                  </div>
                </div>
                <div className="mt-4">
                  <ActionGate
                    access={nextActionAccess}
                    href={nextAction.href}
                    label={nextAction.label}
                    description={nextAction.description}
                    className="bg-slate-900/55"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-950/45 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/80 text-amber-400">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-200">HLV/Captain</div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">Khai báo đội hình cho đội của mình.</p>
                  </div>
                </div>
                <div className="mt-4">
                  <ActionGate
                    access={captainAction?.access ?? { allowed: false }}
                    href={captainAction?.href ?? `/admin/${tournament.id}/lineup`}
                    label={captainAction?.label ?? 'Khu lineup đội'}
                    description={captainAction?.description ?? 'Theo dõi các trận của đội.'}
                    className="bg-slate-900/55"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-950/45 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/80 text-amber-400">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-200">Trọng tài</div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">Chấm điểm và xác nhận kết quả trận.</p>
                  </div>
                </div>
                <div className="mt-4">
                  <ActionGate
                    access={scorerActions[0]?.access ?? { allowed: false }}
                    href={scorerActions[0]?.href ?? `/admin/${tournament.id}/scoring`}
                    label={scorerActions[0]?.label ?? 'Mở bàn trọng tài'}
                    description={scorerActions[0]?.description ?? 'Theo dõi các trận đã sẵn sàng chấm điểm.'}
                    className="bg-slate-900/55"
                  />
                </div>
              </div>
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
                    stats.recentPlayers.map((player) => {
                      const gender = normalizeGender(player.gender);

                      return (
                        <div key={player.id} className="flex items-center gap-3 rounded-lg bg-slate-950/35 px-3 py-2">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white ${
                            gender === 'MALE'
                              ? 'bg-gradient-to-br from-sky-500 to-violet-500'
                              : 'bg-gradient-to-br from-pink-500 to-rose-500'
                          }`}>
                            {player.fullName.split(' ').pop()?.[0] || '?'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-slate-200">{player.fullName}</div>
                          </div>
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                            {gender === 'MALE' ? 'Nam' : gender === 'FEMALE' ? 'Nữ' : 'Chưa rõ'}
                          </span>
                        </div>
                      );
                    })
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
                      Luật thi đấu hiện tại
                    </div>
                    <h3 className="mt-1 text-lg font-bold text-slate-100">
                      {ruleset?.name || 'Chưa đặt tên luật thi đấu'}
                    </h3>
                  </div>
                  <Link
                    href={`/admin/${tournament.id}/ruleset`}
                    className="text-xs font-semibold text-amber-400 transition-colors hover:text-amber-300"
                  >
                    Mở luật thi đấu →
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
                    <div className="text-[11px] font-medium text-slate-500">Tình trạng luật thi đấu</div>
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
                    Luật thi đấu chưa có chặng thi đấu. Hệ thống sẽ tiếp tục khóa bốc thăm và sinh lịch cho đến khi đủ cấu hình.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Việc của bạn
                </div>
                <h3 className="mt-1 text-lg font-bold text-slate-100">
                  {role === 'scorer' ? 'Chấm điểm và chốt kết quả' : 'Lineup đội của bạn'}
                </h3>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              {role === 'scorer' ? scorerActions.map((action) => {
                const Icon = action.icon;

                return (
                  <ActionGate
                    key={action.label}
                    access={action.access}
                    href={action.href}
                    label={action.label}
                    description={action.description}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                      <Icon className="h-5 w-5" />
                    </div>
                  </ActionGate>
                );
              }) : (
                <ActionGate
                  access={captainAction?.access ?? { allowed: false }}
                  href={captainAction?.href ?? `/admin/${tournament.id}/lineup`}
                  label={captainAction?.label ?? 'Vào khu lineup đội'}
                  description={captainAction?.description ?? 'Theo dõi các trận của đội.'}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                </ActionGate>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Tóm tắt nhanh
            </div>
            <h3 className="mt-1 text-lg font-bold text-slate-100">
              {role === 'scorer' ? 'Ưu tiên các trận đã sẵn sàng' : 'Chờ BTC mở các bước phụ thuộc'}
            </h3>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-300">
              {role === 'scorer' ? (
                <>
                  <p>{stats.scoringReadyCount > 0
                    ? `${stats.scoringReadyCount} trận đã sẵn sàng để vào bàn trọng tài.`
                    : 'Hiện chưa có trận nào đủ điều kiện chấm điểm.'}</p>
                  <p>{stats.completedMatches > 0
                    ? `${stats.completedMatches} trận đã hoàn thành, kiểm tra để xác nhận kết quả khi phù hợp.`
                    : 'Kết quả xác nhận sẽ xuất hiện sau khi trận đấu hoàn tất.'}</p>
                </>
              ) : (
                <>
                  <p>{uxContext.matchCount > 0
                    ? `${uxContext.matchCount} trận đã có trong lịch. Bạn có thể vào khu lineup để xem trận của đội mình.`
                    : 'BTC chưa sinh lịch thi đấu, nên đội của bạn chưa có trận để khai báo lineup.'}</p>
                  <p>{uxContext.lineupReadyCount > 0
                    ? `${uxContext.lineupReadyCount} trận trong hệ thống đã đi tới bước lineup hoặc thi đấu.`
                    : 'Khi lịch được tạo, khu lineup sẽ tự mở cho đội có quyền thao tác.'}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
