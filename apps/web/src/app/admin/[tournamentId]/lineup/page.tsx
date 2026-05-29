'use client';

import { useEffect, useState } from 'react';
import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { getCurrentUser } from '@/lib/current-user';
import { buildTournamentUxContext } from '@/lib/tournament-ux-context';
import { getActionAccess } from '@/lib/tournament-ux-policy';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading-skeleton';
import { ClipboardList, Lock, Save, Users, AlertTriangle } from '@/components/icons';

type TeamKey = 'teamA' | 'teamB';

interface MatchListItem {
  id: string;
  status: string;
  teamAId?: string | null;
  teamBId?: string | null;
  roundNo?: number | null;
  label?: string | null;
  group?: { code: string } | null;
  teamA?: { name?: string | null } | null;
  teamB?: { name?: string | null } | null;
}

interface MatchPlayer {
  playerProfile: {
    id: string;
    fullName: string;
  };
  gender: string;
}

interface MatchSegment {
  id: string;
  name: string;
  segmentKey: string;
}

interface MatchLineup {
  segmentId: string;
  teamId: string;
  players: { playerProfileId: string }[];
}

interface MatchDetails extends MatchListItem {
  teamAId: string;
  teamBId: string;
  teamA?: {
    name?: string | null;
    members?: MatchPlayer[] | null;
  } | null;
  teamB?: {
    name?: string | null;
    members?: MatchPlayer[] | null;
  } | null;
  segments: MatchSegment[];
  lineups: MatchLineup[];
}

type LineupFormState = Record<TeamKey, Record<string, string[]>>;

interface TournamentTeam {
  id: string;
  name: string;
  captain?: {
    userId?: string | null;
  } | null;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
}

function filterLineupMatches(data: MatchListItem[]): MatchListItem[] {
  return data.filter((match) => (
    match.status === 'SCHEDULED'
    || match.status === 'LINEUP_PENDING'
    || match.status === 'LINEUP_READY'
    || match.status === 'READY'
  ));
}

export default function LineupPage() {
  const { tournament, loading: tLoading } = useActiveTournament();
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const { role, user } = currentUser;
  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<MatchListItem | null>(null);
  const [matchDetails, setMatchDetails] = useState<MatchDetails | null>(null);
  const [lineupsData, setLineupsData] = useState<LineupFormState>({ teamA: {}, teamB: {} });
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      if (!tournament) return;

      void (async () => {
        try {
          setLoading(true);
          const [matchesData, teamsData] = await Promise.all([
            apiFetch(`/tournaments/${tournament.id}/matches`) as Promise<MatchListItem[]>,
            apiFetch(`/tournaments/${tournament.id}/teams`) as Promise<TournamentTeam[]>,
          ]);
          setMatches(filterLineupMatches(matchesData));
          setTeams(teamsData);
        } catch (error: unknown) {
          console.error(error);
          toast(getErrorMessage(error, 'Lỗi tải lịch thi đấu.'), 'error');
        } finally {
          setLoading(false);
        }
      })();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [toast, tournament]);

  const ownedTeamIds = teams
    .filter((team) => team.captain?.userId && team.captain.userId === user?.id)
    .map((team) => team.id);
  const tournamentOwnsTeam = ownedTeamIds.length > 0;
  const visibleMatches = role === 'captain'
    ? matches.filter((match) => (
      (match.teamAId ? ownedTeamIds.includes(match.teamAId) : false)
      || (match.teamBId ? ownedTeamIds.includes(match.teamBId) : false)
    ))
    : matches;
  const ownedTeamKey: TeamKey | null = matchDetails
    ? (ownedTeamIds.includes(matchDetails.teamAId) ? 'teamA' : ownedTeamIds.includes(matchDetails.teamBId) ? 'teamB' : null)
    : null;
  const ownedTeamName = matchDetails && ownedTeamKey
    ? (ownedTeamKey === 'teamA' ? matchDetails.teamA?.name : matchDetails.teamB?.name)
    : null;
  const ownedTeamMembers = matchDetails && ownedTeamKey
    ? (ownedTeamKey === 'teamA' ? matchDetails.teamA?.members : matchDetails.teamB?.members)
    : null;

  const uxContext = buildTournamentUxContext({
    tournament,
    stats: {
      matchesCount: matches.length,
      lineupReadyCount: matches.filter((match) => match.status === 'LINEUP_READY' || match.status === 'READY').length,
      scoringReadyCount: matches.filter((match) => match.status === 'READY').length,
      completedMatches: 0,
      resultConfirmedMatches: 0,
    },
    currentUserOwnsTeam: tournamentOwnsTeam,
  });

  const submitAccess = getActionAccess('submitLineup', role, uxContext);
  const canLockLineups = role === 'btc_admin' || role === 'super_admin';
  const selectedStillVisible = selectedMatch ? visibleMatches.some((match) => match.id === selectedMatch.id) : false;
  const activeSelectedMatch = selectedStillVisible ? selectedMatch : null;
  const activeMatchDetails = selectedStillVisible ? matchDetails : null;
  const isLineupLocked = activeMatchDetails?.status === 'READY';
  const captainBlockedForSelectedMatch = role === 'captain' && Boolean(activeMatchDetails) && ownedTeamKey === null;
  const disableLineupEditing = actionLoading || !submitAccess.allowed || isLineupLocked || captainBlockedForSelectedMatch;

  function canEditTeam(teamKey: TeamKey): boolean {
    if (disableLineupEditing) return false;
    if (role !== 'captain') return true;
    return ownedTeamKey === teamKey;
  }

  const handleSelectMatch = async (match: MatchListItem) => {
    setSelectedMatch(match);

    try {
      setLoading(true);
      const details = (await apiFetch(`/matches/${match.id}/lineups`)) as MatchDetails;
      setMatchDetails(details);

      const initial: LineupFormState = { teamA: {}, teamB: {} };
      details.segments.forEach((segment) => {
        initial.teamA[segment.id] = details.lineups
          .find((lineup) => lineup.segmentId === segment.id && lineup.teamId === details.teamAId)
          ?.players.map((player) => player.playerProfileId) || [];
        initial.teamB[segment.id] = details.lineups
          .find((lineup) => lineup.segmentId === segment.id && lineup.teamId === details.teamBId)
          ?.players.map((player) => player.playerProfileId) || [];
      });
      setLineupsData(initial);
    } catch (error: unknown) {
      toast(getErrorMessage(error, 'Lỗi tải chi tiết chặng đấu.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerChange = (teamKey: TeamKey, segmentId: string, playerIdx: number, playerId: string) => {
    setLineupsData((prev) => {
      const nextList = [...(prev[teamKey][segmentId] || [])];
      nextList[playerIdx] = playerId;
      return {
        ...prev,
        [teamKey]: {
          ...prev[teamKey],
          [segmentId]: nextList,
        },
      };
    });
  };

  const handleSubmitLineup = async (teamKey: TeamKey) => {
    if (!matchDetails || !submitAccess.allowed || !canEditTeam(teamKey)) return;

    const teamId = teamKey === 'teamA' ? matchDetails.teamAId : matchDetails.teamBId;
    const segmentsPayload = Object.keys(lineupsData[teamKey]).map((segmentId) => ({
      segmentId,
      playerIds: lineupsData[teamKey][segmentId].filter(Boolean),
    }));

    setActionLoading(true);
    try {
      await apiFetch(`/matches/${matchDetails.id}/lineups`, {
        method: 'PUT',
        body: {
          teamLineups: [{
            teamId,
            segments: segmentsPayload,
          }],
        },
      });

      toast(`Đã lưu đội hình thi đấu cho ${teamKey === 'teamA' ? 'Đội A' : 'Đội B'} thành công!`, 'success');
      if (selectedMatch) {
        await handleSelectMatch(selectedMatch);
      }
    } catch (error: unknown) {
      toast(getErrorMessage(error, 'Đội hình không hợp lệ theo quy chế thi đấu.'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLockLineups = async () => {
    if (!matchDetails || !canLockLineups || isLineupLocked) return;
    setActionLoading(true);

    try {
      await apiFetch(`/matches/${matchDetails.id}/lineups/lock`, {
        method: 'POST',
      });

      toast('Đã khóa đội hình thành công! Trận đấu đã sẵn sàng để thi đấu.', 'success');
      setSelectedMatch(null);
      setMatchDetails(null);
      setLockModalOpen(false);
      if (tournament) {
        const [matchesData, teamsData] = await Promise.all([
          apiFetch(`/tournaments/${tournament.id}/matches`) as Promise<MatchListItem[]>,
          apiFetch(`/tournaments/${tournament.id}/teams`) as Promise<TournamentTeam[]>,
        ]);
        setMatches(filterLineupMatches(matchesData));
        setTeams(teamsData);
      }
    } catch (error: unknown) {
      toast(getErrorMessage(error, 'Lỗi khóa đội hình.'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (tLoading || (loading && matches.length === 0)) {
    return <PageLoading />;
  }

  if (!submitAccess.allowed) {
    return (
      <div className="premium-container space-y-6 animate-scale-in">
        <PageHeader
          title="Khai Báo Đội Hình Thi Đấu"
          description="Chỉ hiện thao tác khi trận đấu đã được tạo và vai trò của bạn được phép khai báo."
          icon={ClipboardList}
        />

        <div className="card p-6 shadow-xl">
          <EmptyState
            icon={Lock}
            title={role === 'captain' ? 'Chưa thể khai báo đội hình' : 'Bạn chưa thể dùng mục này'}
            description={submitAccess.reason ?? 'Hiện chưa có điều kiện để khai báo đội hình thi đấu.'}
            actionLabel={submitAccess.nextLabel}
            actionHref={submitAccess.nextHref}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="premium-container space-y-6 animate-scale-in">
      <PageHeader
        title="Khai Báo Đội Hình Thi Đấu"
        description="Đăng ký thành viên thi đấu cho từng chặng tiếp sức (Đôi Nam, Đôi Nữ, Đôi Nam Nữ) trước giờ bóng lăn."
        icon={ClipboardList}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card h-fit space-y-4 p-6 shadow-xl">
          <h3 className="flex items-center gap-2 border-b border-slate-800 pb-3 text-base font-bold text-slate-100">
            <ClipboardList className="h-5 w-5 text-amber-500" />
            Trận đấu chờ lineup
          </h3>

          {visibleMatches.length > 0 ? (
            <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
              {visibleMatches.map((match) => (
                <div
                  key={match.id}
                  onClick={() => handleSelectMatch(match)}
                  className={`cursor-pointer rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 shadow transition-all hover:border-amber-500 hover:bg-slate-800/25 ${activeSelectedMatch?.id === match.id ? 'border-amber-500 bg-amber-500/5' : ''}`}
                >
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-500">
                    {match.group ? `Bảng ${match.group.code} · Lượt ${match.roundNo}` : match.label || 'Playoff'}
                  </div>
                  <div className="text-sm font-semibold text-slate-200">
                    {match.teamA?.name || 'Chờ xác định'} vs {match.teamB?.name || 'Chờ xác định'}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Mã: #{match.id.substring(0, 8)}</span>
                    <span className="rounded border border-amber-500/10 bg-amber-500/5 px-2 py-0.5 font-mono text-[9px] uppercase text-amber-500/80">
                      {match.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ClipboardList}
              title={role === 'captain' ? 'Bạn chưa có trận nào cần khai báo lineup' : 'Chưa có trận cần khai báo lineup'}
              description={role === 'captain'
                ? (tournamentOwnsTeam
                  ? 'Đội của bạn chưa có trận nào cần khai báo lineup ở thời điểm này.'
                  : 'Tài khoản đội trưởng này chưa được gán làm captain cho đội nào trong giải.')
                : (submitAccess.reason ?? 'BTC cần sinh lịch thi đấu trước khi đội trưởng hoặc BTC khai báo lineup.')}
              actionLabel={submitAccess.nextLabel}
              actionHref={submitAccess.nextHref}
            />
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          {activeMatchDetails ? (
            <div className="card animate-scale-in space-y-6 p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-base font-bold text-slate-100">
                  <Users className="h-5 w-5 text-amber-500" />
                  Khai báo Lineup trận đấu
                </div>
                {canLockLineups && !isLineupLocked && (
                  <button
                    onClick={() => setLockModalOpen(true)}
                    className="btn btn-secondary flex items-center gap-1.5 border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20"
                    disabled={actionLoading}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Khóa Đội Hình
                  </button>
                )}
              </div>

              {isLineupLocked && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
                  Lineup của trận này đã khóa. Bạn có thể xem lại danh sách thi đấu nhưng không thể chỉnh sửa nữa.
                </div>
              )}

              {role === 'captain' && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
                  Bạn đang ở chế độ đội trưởng. Bạn chỉ có thể sửa lineup cho đội mình phụ trách. Việc khóa lineup do BTC thực hiện.
                </div>
              )}

              {captainBlockedForSelectedMatch && (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
                  Bạn không phải đội trưởng của một trong hai đội ở trận này, nên chỉ có thể xem lineup mà không thể chỉnh sửa.
                </div>
              )}

              {role === 'captain' && matchDetails && ownedTeamKey && ownedTeamMembers ? (
                <div className="space-y-4">
                  <h4 className="flex items-center justify-between border-b border-slate-800 pb-2 text-sm font-bold text-amber-400">
                    <span>{ownedTeamName}</span>
                    <span className="text-[10px] font-normal text-slate-500">Đội của bạn</span>
                  </h4>

                  {matchDetails.segments.map((segment) => (
                    <div key={segment.id} className="space-y-2 rounded-xl border border-slate-850 bg-slate-900/60 p-3 transition-colors hover:border-slate-800">
                      <div className="text-xs font-bold text-slate-300">{segment.name} ({segment.segmentKey})</div>

                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: 2 }).map((_, slotIdx) => (
                          <select
                            key={slotIdx}
                            value={lineupsData[ownedTeamKey][segment.id]?.[slotIdx] || ''}
                            onChange={(event) => handlePlayerChange(ownedTeamKey, segment.id, slotIdx, event.target.value)}
                            className="premium-input text-xs"
                            disabled={!canEditTeam(ownedTeamKey)}
                          >
                            <option value="">-- Chọn VĐV --</option>
                            {ownedTeamMembers.map((member) => (
                              <option key={member.playerProfile.id} value={member.playerProfile.id}>
                                {member.playerProfile.fullName} ({member.gender === 'MALE' ? '♂ Nam' : '♀ Nữ'})
                              </option>
                            ))}
                          </select>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => handleSubmitLineup(ownedTeamKey)}
                    className="btn btn-secondary flex w-full items-center justify-center gap-2 border-slate-700 py-2.5 text-xs hover:bg-slate-800"
                    disabled={!canEditTeam(ownedTeamKey)}
                  >
                    <Save className="h-4 w-4" />
                    Lưu Lineup Đội Của Bạn
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="flex items-center justify-between border-b border-slate-800 pb-2 text-sm font-bold text-sky-400">
                    <span>{activeMatchDetails.teamA?.name}</span>
                    <span className="text-[10px] font-normal text-slate-500">Đội A</span>
                  </h4>

                  {activeMatchDetails.segments.map((segment) => (
                    <div key={segment.id} className="space-y-2 rounded-xl border border-slate-850 bg-slate-900/60 p-3 transition-colors hover:border-slate-800">
                      <div className="text-xs font-bold text-slate-300">{segment.name} ({segment.segmentKey})</div>

                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: 2 }).map((_, slotIdx) => (
                          <select
                            key={slotIdx}
                            value={lineupsData.teamA[segment.id]?.[slotIdx] || ''}
                            onChange={(event) => handlePlayerChange('teamA', segment.id, slotIdx, event.target.value)}
                            className="premium-input text-xs"
                            disabled={!canEditTeam('teamA')}
                          >
                            <option value="">-- Chọn VĐV --</option>
                            {activeMatchDetails.teamA?.members?.map((member) => (
                              <option key={member.playerProfile.id} value={member.playerProfile.id}>
                                {member.playerProfile.fullName} ({member.gender === 'MALE' ? '♂ Nam' : '♀ Nữ'})
                              </option>
                            ))}
                          </select>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => handleSubmitLineup('teamA')}
                    className="btn btn-secondary flex w-full items-center justify-center gap-2 border-slate-700 py-2.5 text-xs hover:bg-slate-800"
                    disabled={!canEditTeam('teamA')}
                  >
                    <Save className="h-4 w-4" />
                    Lưu Lineup Đội A
                  </button>
                </div>

                <div className="space-y-4">
                  <h4 className="flex items-center justify-between border-b border-slate-800 pb-2 text-sm font-bold text-rose-400">
                    <span>{activeMatchDetails.teamB?.name}</span>
                    <span className="text-[10px] font-normal text-slate-500">Đội B</span>
                  </h4>

                  {activeMatchDetails.segments.map((segment) => (
                    <div key={segment.id} className="space-y-2 rounded-xl border border-slate-850 bg-slate-900/60 p-3 transition-colors hover:border-slate-800">
                      <div className="text-xs font-bold text-slate-300">{segment.name} ({segment.segmentKey})</div>

                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: 2 }).map((_, slotIdx) => (
                          <select
                            key={slotIdx}
                            value={lineupsData.teamB[segment.id]?.[slotIdx] || ''}
                            onChange={(event) => handlePlayerChange('teamB', segment.id, slotIdx, event.target.value)}
                            className="premium-input text-xs"
                            disabled={!canEditTeam('teamB')}
                          >
                            <option value="">-- Chọn VĐV --</option>
                            {activeMatchDetails.teamB?.members?.map((member) => (
                              <option key={member.playerProfile.id} value={member.playerProfile.id}>
                                {member.playerProfile.fullName} ({member.gender === 'MALE' ? '♂ Nam' : '♀ Nữ'})
                              </option>
                            ))}
                          </select>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => handleSubmitLineup('teamB')}
                    className="btn btn-secondary flex w-full items-center justify-center gap-2 border-slate-700 py-2.5 text-xs hover:bg-slate-800"
                    disabled={!canEditTeam('teamB')}
                  >
                    <Save className="h-4 w-4" />
                    Lưu Lineup Đội B
                  </button>
                </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 rounded-3xl border border-dashed border-slate-800 bg-slate-800/10 p-10 py-20 text-center text-xs italic text-slate-500 shadow-inner">
              <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-slate-600" />
              <p>Vui lòng chọn một trận đấu bên trái để bắt đầu khai báo danh sách thi đấu.</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={lockModalOpen}
        title="Khóa danh sách thi đấu?"
        description="Thao tác này sẽ chính thức khóa lineup thi đấu của cả 2 đội cho trận này và chuyển trận đấu sang trạng thái sẵn sàng thi đấu. Bạn sẽ không thể sửa đổi sau khi khóa."
        confirmLabel="Khóa ngay"
        cancelLabel="Hủy"
        variant="warning"
        loading={actionLoading}
        onConfirm={handleLockLineups}
        onCancel={() => setLockModalOpen(false)}
      />
    </div>
  );
}
