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
  matchNo?: number | null;
  roundNo?: number | null;
  label?: string | null;
  group?: { code: string } | null;
  teamA?: { name?: string | null } | null;
  teamB?: { name?: string | null } | null;
}

interface MatchPlayer {
  id?: string;
  playerProfile: {
    id: string;
    fullName: string;
    gender?: string | null;
  };
  gender?: string | null;
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
  status?: string;
  validationResult?: {
    valid: boolean;
    errors: string[];
  } | null;
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

function getMatchLabel(match: MatchListItem | MatchDetails) {
  const stageLabel = match.group
    ? `Bảng ${match.group.code} · Lượt ${match.roundNo || '—'}`
    : match.label || 'Playoff';
  const matchNo = 'matchNo' in match && match.matchNo ? ` · Trận ${match.matchNo}` : '';
  return `${stageLabel}${matchNo}`;
}

function getMatchTeamsLabel(match: MatchListItem | MatchDetails) {
  return `${match.teamA?.name || 'Chờ xác định'} vs ${match.teamB?.name || 'Chờ xác định'}`;
}

function getLineupMemberGender(member: MatchPlayer) {
  return String(member.playerProfile?.gender ?? member.gender ?? '').trim().toUpperCase();
}

function getFilteredMembers(
  members: MatchPlayer[],
  segmentId: string,
  segmentKey: string,
  slotIdx: number,
  teamKey: TeamKey,
  lineupsData: LineupFormState,
  segments: MatchSegment[],
  ruleset: any
) {
  if (!Array.isArray(members)) return [];

  // Find segment definitions
  const rulesetSegments = ruleset?.segmentDefinitions || ruleset?.segments || [];
  const segmentDef = rulesetSegments.find((s: any) => s.segmentKey === segmentKey);

  // Fallback gender rule detection
  let genderRule = segmentDef?.genderRule;
  if (!genderRule) {
    const keyLower = segmentKey.toLowerCase();
    if (keyLower.includes('mens') || keyLower.includes('men')) {
      genderRule = 'male_only';
    } else if (keyLower.includes('womens') || keyLower.includes('women')) {
      genderRule = 'female_only';
    } else if (keyLower.includes('mixed')) {
      genderRule = 'mixed';
    } else {
      genderRule = 'any';
    }
  }

  let filtered = [...members];

  // 1. Filter by gender rules
  if (genderRule === 'male_only') {
    filtered = filtered.filter(m => getLineupMemberGender(m) === 'MALE');
  } else if (genderRule === 'female_only') {
    filtered = filtered.filter(m => getLineupMemberGender(m) === 'FEMALE');
  } else if (genderRule === 'mixed') {
    const otherSlotIdx = 1 - slotIdx;
    const otherPlayerId = lineupsData[teamKey]?.[segmentId]?.[otherSlotIdx];
    if (otherPlayerId) {
      const otherPlayer = members.find(m => m.playerProfile?.id === otherPlayerId);
      if (otherPlayer) {
        const otherGender = getLineupMemberGender(otherPlayer);
        if (otherGender === 'MALE') {
          filtered = filtered.filter(m => getLineupMemberGender(m) === 'FEMALE');
        } else if (otherGender === 'FEMALE') {
          filtered = filtered.filter(m => getLineupMemberGender(m) === 'MALE');
        }
      }
    }
  }

  // 2. Filter duplicate players in the same segment
  const currentSegmentPlayers = lineupsData[teamKey]?.[segmentId] || [];
  const selectedOtherPlayerIds = currentSegmentPlayers.filter((_, idx) => idx !== slotIdx);
  filtered = filtered.filter(m => !selectedOtherPlayerIds.includes(m.playerProfile.id));

  // 3. Filter by max appearances limit per player (playerLimitRules / playerLimits)
  const playerSegmentCounts: Record<string, number> = {};
  Object.entries(lineupsData[teamKey] || {}).forEach(([sId, playerIds]) => {
    if (sId === segmentId) return; // ignore current segment
    playerIds.forEach(id => {
      if (!id) return;
      playerSegmentCounts[id] = (playerSegmentCounts[id] || 0) + 1;
    });
  });

  let maxMale = 1;
  let maxFemale = 2;
  const limitRules = ruleset?.playerLimitRules || ruleset?.playerLimits;
  if (ruleset?.noOverlapAllPlayers || (Array.isArray(limitRules) && limitRules.every((l: any) => l.maxSegments === 1))) {
    maxMale = 1;
    maxFemale = 1;
  } else if (Array.isArray(limitRules)) {
    const mLimit = limitRules.find((l: any) => String(l.gender).toUpperCase() === 'MALE');
    const fLimit = limitRules.find((l: any) => String(l.gender).toUpperCase() === 'FEMALE');
    if (mLimit) maxMale = mLimit.maxSegments;
    if (fLimit) maxFemale = fLimit.maxSegments;
  }

  filtered = filtered.filter(m => {
    const gender = getLineupMemberGender(m);
    const count = playerSegmentCounts[m.playerProfile.id] || 0;
    const maxAllowed = gender === 'MALE' ? maxMale : maxFemale;
    return count < maxAllowed;
  });

  // 4. Filter by forbidden segment overlaps (overlapRules)
  const rulesetOverlapRules = ruleset?.overlapRules || [
    {
      segmentAKey: 'mens_doubles',
      segmentBKey: 'mixed_doubles',
      gender: 'MALE',
      isForbidden: true
    }
  ];

  const activeRules = rulesetOverlapRules.filter((r: any) => 
    (r.segmentAKey === segmentKey || r.segmentBKey === segmentKey) && r.isForbidden !== false
  );

  activeRules.forEach((rule: any) => {
    const otherKey = rule.segmentAKey === segmentKey ? rule.segmentBKey : rule.segmentAKey;
    const otherSegment = segments.find(s => s.segmentKey === otherKey);
    if (!otherSegment) return;

    const otherPlayers = lineupsData[teamKey]?.[otherSegment.id] || [];
    otherPlayers.forEach(pId => {
      if (!pId) return;
      const player = members.find(m => m.playerProfile.id === pId);
      if (player && getLineupMemberGender(player) === String(rule.gender).toUpperCase()) {
        filtered = filtered.filter(m => m.playerProfile.id !== pId);
      }
    });
  });

  return filtered;
}

export default function LineupPage() {
  const { tournament, loading: tLoading } = useActiveTournament();
  const getPlayerCountForSegment = (segmentKey: string) => {
    const rulesetSegments = (tournament as any)?.ruleset?.segmentDefinitions || (tournament as any)?.ruleset?.segments || [];
    const matched = rulesetSegments.find((s: any) => s.segmentKey === segmentKey);
    return matched?.playerCount ?? 2;
  };
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

  const getTeamValidationErrors = (teamId: string | null | undefined): string[] => {
    if (!matchDetails || !teamId) return [];
    const lineups = matchDetails.lineups.filter((l) => l.teamId === teamId);
    const invalidLineup = lineups.find((l) => l.status === 'INVALID');
    return invalidLineup?.validationResult?.errors || [];
  };

  const teamAErrors = matchDetails ? getTeamValidationErrors(matchDetails.teamAId) : [];
  const teamBErrors = matchDetails ? getTeamValidationErrors(matchDetails.teamBId) : [];
  const ownedTeamErrors = matchDetails && ownedTeamKey ? (ownedTeamKey === 'teamA' ? teamAErrors : teamBErrors) : [];

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
      // 1. Calculate the next edited segment lineup state
      const nextTeamState = { ...prev[teamKey] };
      const nextSegmentList = [...(nextTeamState[segmentId] || [])];
      nextSegmentList[playerIdx] = playerId;
      nextTeamState[segmentId] = nextSegmentList;

      const updatedState = {
        ...prev,
        [teamKey]: nextTeamState
      };

      // 2. Perform a cleanup pass for other segments/slots of this team
      const teamMembers = teamKey === 'teamA' ? matchDetails?.teamA?.members : matchDetails?.teamB?.members;
      if (teamMembers && matchDetails) {
        let changed = true;
        let iteration = 0;
        // Clean iteratively up to 3 times to handle dependencies stability
        while (changed && iteration < 3) {
          changed = false;
          iteration++;
          
          for (const segment of matchDetails.segments) {
            const currentPlayers = updatedState[teamKey][segment.id] || [];
            const count = getPlayerCountForSegment(segment.segmentKey);
            for (let idx = 0; idx < count; idx++) {
              const currentVal = currentPlayers[idx];
              if (currentVal) {
                const filtered = getFilteredMembers(
                  teamMembers,
                  segment.id,
                  segment.segmentKey,
                  idx,
                  teamKey,
                  updatedState,
                  matchDetails.segments,
                  (tournament as any)?.ruleset
                );
                const isValid = filtered.some(m => m.playerProfile.id === currentVal);
                if (!isValid) {
                  const updatedSegmentList = [...(updatedState[teamKey][segment.id] || [])];
                  updatedSegmentList[idx] = '';
                  updatedState[teamKey][segment.id] = updatedSegmentList;
                  changed = true;
                }
              }
            }
          }
        }
      }

      return updatedState;
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

  const handleDrawSegmentOrder = async () => {
    if (!matchDetails) return;
    setActionLoading(true);
    try {
      const seed = `SEG-ORDER-${matchDetails.id}-${Date.now()}`;
      await apiFetch(`/matches/${matchDetails.id}/segments/draw-order`, {
        method: 'POST',
        body: { seed },
      });
      toast('Bốc thăm thứ tự chặng thi đấu thành công!', 'success');
      if (selectedMatch) {
        await handleSelectMatch(selectedMatch);
      }
    } catch (error: unknown) {
      console.error(error);
      toast(getErrorMessage(error, 'Lỗi bốc thăm thứ tự chặng.'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMoveSegment = async (index: number, direction: 'up' | 'down') => {
    if (!matchDetails) return;
    const newSegments = [...matchDetails.segments];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSegments.length) return;

    // Swap segments
    const temp = newSegments[index];
    newSegments[index] = newSegments[targetIndex];
    newSegments[targetIndex] = temp;

    setActionLoading(true);
    try {
      await apiFetch(`/matches/${matchDetails.id}/segments/order`, {
        method: 'PUT',
        body: {
          keys: newSegments.map((s) => s.segmentKey),
        },
      });
      toast('Đã cập nhật thứ tự chặng đấu thành công!', 'success');
      if (selectedMatch) {
        await handleSelectMatch(selectedMatch);
      }
    } catch (error: unknown) {
      console.error(error);
      toast(getErrorMessage(error, 'Lỗi cập nhật thứ tự chặng.'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLockLineups = async () => {
    if (!matchDetails || !canLockLineups || isLineupLocked) return;
    setActionLoading(true);

    try {
      // 1. Gather and submit lineups for both teams to validate and save them
      const teamLineups = [];

      teamLineups.push({
        teamId: matchDetails.teamAId,
        segments: Object.keys(lineupsData.teamA).map((segmentId) => ({
          segmentId,
          playerIds: lineupsData.teamA[segmentId].filter(Boolean),
        })),
      });

      teamLineups.push({
        teamId: matchDetails.teamBId,
        segments: Object.keys(lineupsData.teamB).map((segmentId) => ({
          segmentId,
          playerIds: lineupsData.teamB[segmentId].filter(Boolean),
        })),
      });

      // Save lineups
      await apiFetch(`/matches/${matchDetails.id}/lineups`, {
        method: 'PUT',
        body: { teamLineups },
      });

      // Lock lineups
      await apiFetch(`/matches/${matchDetails.id}/lineups/lock`, {
        method: 'POST',
      });

      toast('Đã lưu và khóa đội hình thành công! Trận đấu đã sẵn sàng để thi đấu.', 'success');
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
      console.error(error);
      toast(getErrorMessage(error, 'Đội hình chưa hợp lệ hoặc có lỗi khi khóa đội hình.'), 'error');
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
                    {getMatchLabel(match)}
                  </div>
                  <div className="text-sm font-semibold text-slate-200">
                    {getMatchTeamsLabel(match)}
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] text-slate-500">
                    <span className="truncate">Đội A: <strong className="text-sky-300">{match.teamA?.name || '—'}</strong></span>
                    <span className="truncate">Đội B: <strong className="text-rose-300">{match.teamB?.name || '—'}</strong></span>
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
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/35 px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-500">
                  {getMatchLabel(activeMatchDetails)}
                </div>
                <div className="mt-1 text-base font-bold text-slate-100">
                  {getMatchTeamsLabel(activeMatchDetails)}
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-xl border border-sky-500/15 bg-sky-500/5 px-3 py-2 text-sky-200">
                    Đội A: <strong>{activeMatchDetails.teamA?.name || '—'}</strong>
                  </div>
                  <div className="rounded-xl border border-rose-500/15 bg-rose-500/5 px-3 py-2 text-rose-200">
                    Đội B: <strong>{activeMatchDetails.teamB?.name || '—'}</strong>
                  </div>
                </div>
              </div>

              {/* Cấu hình thứ tự chặng thi đấu cho thể thức relay */}
              {(tournament as any)?.ruleset?.matchFormat === 'relay' && activeMatchDetails && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/10 p-4 space-y-3.5 shadow-inner">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
                        🎲 Thứ tự chặng thi đấu
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Có thể thay đổi thứ tự thi đấu trước khi khóa đội hình trận đấu.
                      </p>
                    </div>
                    
                    {canLockLineups && !isLineupLocked && (
                      <button
                        onClick={handleDrawSegmentOrder}
                        disabled={actionLoading}
                        className="btn btn-xs bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/20 px-2 py-1 flex items-center gap-1 cursor-pointer transition-all font-semibold"
                      >
                        🎲 Bốc thăm
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {activeMatchDetails.segments.map((segment, idx) => {
                      const rulesetSegments = (tournament as any)?.ruleset?.segmentDefinitions || (tournament as any)?.ruleset?.segments || [];
                      const rSeg = rulesetSegments.find((s: any) => s.segmentKey === segment.segmentKey);
                      const isDrawable = rSeg?.isDrawable !== false;

                      return (
                        <div
                          key={segment.id}
                          className="flex items-center justify-between px-3.5 py-2 bg-slate-950/25 border border-slate-850 rounded-xl hover:border-slate-800 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-850 text-[10px] font-bold text-slate-400 flex items-center justify-center border border-slate-800">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-200">{segment.name}</span>
                            <span 
                              className={`text-[9px] px-1 py-0.2 rounded font-medium ${isDrawable ? 'text-sky-450 bg-sky-500/5' : 'text-slate-500 bg-slate-800'}`}
                              title={isDrawable ? 'Cho phép bốc thăm/thay đổi thứ tự' : 'Thứ tự cố định'}
                            >
                              {isDrawable ? '🎲' : '🔒'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/8 px-2 py-0.5 rounded border border-amber-500/15">
                              Chạm {segment.targetScore ?? (idx + 1) * 8}đ
                            </span>

                            {canLockLineups && !isLineupLocked && isDrawable && (
                              <div className="flex items-center gap-1 ml-1">
                                <button
                                  disabled={actionLoading || idx === 0}
                                  onClick={() => handleMoveSegment(idx, 'up')}
                                  className="w-5 h-5 flex items-center justify-center rounded border border-slate-800 bg-slate-900/60 text-xs text-slate-400 hover:text-sky-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer"
                                  title="Di chuyển lên"
                                >
                                  ▲
                                </button>
                                <button
                                  disabled={actionLoading || idx === activeMatchDetails.segments.length - 1}
                                  onClick={() => handleMoveSegment(idx, 'down')}
                                  className="w-5 h-5 flex items-center justify-center rounded border border-slate-800 bg-slate-900/60 text-xs text-slate-400 hover:text-sky-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer"
                                  title="Di chuyển xuống"
                                >
                                  ▼
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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

                  {ownedTeamErrors.length > 0 && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 text-xs text-red-400 space-y-2">
                      <div className="font-bold flex items-center gap-1.5 text-red-400">
                        <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                        Đội hình chưa hợp lệ theo điều lệ giải:
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-red-300/90 font-medium">
                        {ownedTeamErrors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {matchDetails.segments.map((segment) => (
                    <div key={segment.id} className="space-y-2 rounded-xl border border-slate-850 bg-slate-900/60 p-3 transition-colors hover:border-slate-800">
                      <div className="text-xs font-bold text-slate-300">{segment.name}</div>

                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: getPlayerCountForSegment(segment.segmentKey) }).map((_, slotIdx) => (
                          <select
                            key={slotIdx}
                            value={lineupsData[ownedTeamKey][segment.id]?.[slotIdx] || ''}
                            onChange={(event) => handlePlayerChange(ownedTeamKey, segment.id, slotIdx, event.target.value)}
                            className="premium-input text-xs"
                            disabled={!canEditTeam(ownedTeamKey)}
                          >
                            <option value="">-- Chọn VĐV --</option>
                            {getFilteredMembers(
                              ownedTeamMembers,
                              segment.id,
                              segment.segmentKey,
                              slotIdx,
                              ownedTeamKey,
                              lineupsData,
                              activeMatchDetails.segments,
                              (tournament as any)?.ruleset
                            ).map((member) => (
                              <option key={member.playerProfile.id} value={member.playerProfile.id}>
                                {member.playerProfile.fullName} ({getLineupMemberGender(member) === 'MALE' ? '♂ Nam' : '♀ Nữ'})
                              </option>
                            ))}
                          </select>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-col items-center justify-center pt-6 mt-4 border-t border-slate-800/80">
                    <button
                      onClick={() => handleSubmitLineup(ownedTeamKey)}
                      className="px-8 py-3.5 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-sky-500/20 active:scale-98 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!canEditTeam(ownedTeamKey) || actionLoading}
                    >
                      <Save className="h-4 w-4" />
                      Xác Nhận & Gửi Đội Hình
                    </button>
                    <p className="text-[10px] text-slate-500 mt-2 text-center max-w-sm">
                      Lưu và gửi đội hình chính thức của đội bạn lên ban tổ chức giải.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <h4 className="flex items-center justify-between border-b border-slate-800 pb-2 text-sm font-bold text-sky-400">
                        <span>{activeMatchDetails.teamA?.name}</span>
                        <span className="text-[10px] font-normal text-slate-500">Đội A</span>
                      </h4>

                      {teamAErrors.length > 0 && (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 text-xs text-red-400 space-y-2">
                          <div className="font-bold flex items-center gap-1.5 text-red-400">
                            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                            Đội hình chưa hợp lệ theo điều lệ giải:
                          </div>
                          <ul className="list-disc pl-4 space-y-1 text-red-300/90 font-medium">
                            {teamAErrors.map((err, idx) => (
                              <li key={idx}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {activeMatchDetails.segments.map((segment) => (
                        <div key={segment.id} className="space-y-2 rounded-xl border border-slate-850 bg-slate-900/60 p-3 transition-colors hover:border-slate-800">
                          <div className="text-xs font-bold text-slate-300">{segment.name}</div>

                          <div className="grid grid-cols-2 gap-2">
                            {Array.from({ length: getPlayerCountForSegment(segment.segmentKey) }).map((_, slotIdx) => (
                              <select
                                key={slotIdx}
                                value={lineupsData.teamA[segment.id]?.[slotIdx] || ''}
                                onChange={(event) => handlePlayerChange('teamA', segment.id, slotIdx, event.target.value)}
                                className="premium-input text-xs"
                                disabled={!canEditTeam('teamA')}
                              >
                                <option value="">-- Chọn VĐV --</option>
                                {getFilteredMembers(
                                  activeMatchDetails.teamA?.members || [],
                                  segment.id,
                                  segment.segmentKey,
                                  slotIdx,
                                  'teamA',
                                  lineupsData,
                                  activeMatchDetails.segments,
                                  (tournament as any)?.ruleset
                                ).map((member) => (
                                  <option key={member.playerProfile.id} value={member.playerProfile.id}>
                                    {member.playerProfile.fullName} ({getLineupMemberGender(member) === 'MALE' ? '♂ Nam' : '♀ Nữ'})
                                  </option>
                                ))}
                              </select>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <h4 className="flex items-center justify-between border-b border-slate-800 pb-2 text-sm font-bold text-rose-400">
                        <span>{activeMatchDetails.teamB?.name}</span>
                        <span className="text-[10px] font-normal text-slate-500">Đội B</span>
                      </h4>

                      {teamBErrors.length > 0 && (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 text-xs text-red-400 space-y-2">
                          <div className="font-bold flex items-center gap-1.5 text-red-400">
                            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                            Đội hình chưa hợp lệ theo điều lệ giải:
                          </div>
                          <ul className="list-disc pl-4 space-y-1 text-red-300/90 font-medium">
                            {teamBErrors.map((err, idx) => (
                              <li key={idx}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {activeMatchDetails.segments.map((segment) => (
                        <div key={segment.id} className="space-y-2 rounded-xl border border-slate-850 bg-slate-900/60 p-3 transition-colors hover:border-slate-800">
                          <div className="text-xs font-bold text-slate-300">{segment.name}</div>

                          <div className="grid grid-cols-2 gap-2">
                            {Array.from({ length: getPlayerCountForSegment(segment.segmentKey) }).map((_, slotIdx) => (
                              <select
                                key={slotIdx}
                                value={lineupsData.teamB[segment.id]?.[slotIdx] || ''}
                                onChange={(event) => handlePlayerChange('teamB', segment.id, slotIdx, event.target.value)}
                                className="premium-input text-xs"
                                disabled={!canEditTeam('teamB')}
                              >
                                <option value="">-- Chọn VĐV --</option>
                                {getFilteredMembers(
                                  activeMatchDetails.teamB?.members || [],
                                  segment.id,
                                  segment.segmentKey,
                                  slotIdx,
                                  'teamB',
                                  lineupsData,
                                  activeMatchDetails.segments,
                                  (tournament as any)?.ruleset
                                ).map((member) => (
                                  <option key={member.playerProfile.id} value={member.playerProfile.id}>
                                    {member.playerProfile.fullName} ({getLineupMemberGender(member) === 'MALE' ? '♂ Nam' : '♀ Nữ'})
                                  </option>
                                ))}
                              </select>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {canLockLineups && !isLineupLocked && (
                    <div className="flex flex-col items-center justify-center pt-8 mt-6 border-t border-slate-800/80 w-full">
                      <button
                        onClick={() => setLockModalOpen(true)}
                        className="px-12 py-5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-extrabold text-sm uppercase tracking-widest rounded-2xl shadow-xl hover:shadow-emerald-500/20 active:scale-98 transition-all flex items-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={actionLoading}
                      >
                        <Lock className="h-5 w-5" />
                        Xác Nhận & Khóa Đội Hình Thi Đấu
                      </button>
                      <p className="text-[11px] text-slate-500 mt-3 text-center max-w-md">
                        Nhấn để lưu toàn bộ đội hình của cả hai đội, tự động kiểm tra quy chế và chính thức khóa danh sách thi đấu.
                      </p>
                    </div>
                  )}
                </>
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
