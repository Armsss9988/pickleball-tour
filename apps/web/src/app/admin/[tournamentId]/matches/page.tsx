'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { io } from 'socket.io-client';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';
import { PageLoading } from '@/components/loading-skeleton';
import {
  Trophy,
  Play,
  Calendar,
  AlertTriangle,
  Target,
  Zap,
  ChevronRight,
  Edit3,
  Trash2,
  Save,
  X,
  Loader2,
  Lock,
  Users,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  BarChart3,
  Check,
  ClipboardList,
  Info,
  RefreshCw,
} from '@/components/icons';
import { getCurrentUser } from '@/lib/current-user';
import { buildTournamentUxContext } from '@/lib/tournament-ux-context';
import { getActionAccess } from '@/lib/tournament-ux-policy';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Court {
  id: string;
  venueName: string | null;
  name: string;
}

interface Conflict {
  courtId: string | null;
  courtName: string;
  scheduledTime: string;
  matchIds: string[];
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
  segmentOrder: number;
  status?: string | null;
}

interface MatchLineup {
  segmentId: string;
  teamId: string;
  status?: string | null;
  players: { playerProfileId: string; playerProfile?: { id: string; fullName: string; gender?: string | null } }[];
  validationResult?: { valid: boolean; errors: string[] } | null;
}

interface MatchDetails {
  id: string;
  status: string;
  matchNo?: number | null;
  roundNo?: number | null;
  label?: string | null;
  scheduledTime?: string | null;
  courtId?: string | null;
  courtName?: string | null;
  teamAId?: string | null;
  teamBId?: string | null;
  teamA?: {
    id?: string;
    name?: string | null;
    members?: MatchPlayer[] | null;
  } | null;
  teamB?: {
    id?: string;
    name?: string | null;
    members?: MatchPlayer[] | null;
  } | null;
  group?: { id: string; code: string; name: string } | null;
  court?: Court | null;
  segments: MatchSegment[];
  lineups: MatchLineup[];
  result?: { winnerTeamId?: string | null; teamAScore?: number | null; teamBScore?: number | null } | null;
}

interface MatchListItem {
  id: string;
  status: string;
  matchNo?: number | null;
  roundNo?: number | null;
  label?: string | null;
  scheduledTime?: string | null;
  courtId?: string | null;
  courtName?: string | null;
  teamAId?: string | null;
  teamBId?: string | null;
  teamA?: { id?: string; name?: string | null } | null;
  teamB?: { id?: string; name?: string | null } | null;
  group?: { id: string; code: string; name: string } | null;
  court?: Court | null;
  result?: { winnerTeamId?: string | null; teamAScore?: number | null; teamBScore?: number | null } | null;
}

interface EditFormState {
  scheduledTime: string;
  courtId: string;
  courtName: string;
  matchNo: string;
}

interface ScheduleGenerateFormState {
  startTime: string;
  durationMinutes: string;
}

type LineupFormState = Record<'teamA' | 'teamB', Record<string, string[]>>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCourtLabel(court: Pick<Court, 'name' | 'venueName'> | null | undefined) {
  if (!court) return '';
  return court.venueName?.trim() ? `${court.venueName.trim()} - ${court.name}` : court.name;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  } catch {
    return '';
  }
}

function getMatchLabel(match: MatchListItem) {
  if (match.group) return `Bảng ${match.group.code} · Lượt ${match.roundNo ?? '—'}`;
  return match.label ?? 'Playoff';
}

function getMatchStatusBadge(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    SCHEDULED: { label: 'Đã lên lịch', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
    LINEUP_PENDING: { label: 'Chờ lineup', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    LINEUP_READY: { label: 'Lineup xong', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
    READY: { label: 'Sẵn sàng', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    RUNNING: { label: 'Đang đấu', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20 animate-pulse' },
    SEGMENT_BREAK: { label: 'Nghỉ chặng', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20 animate-pulse' },
    COMPLETED: { label: 'Chờ xác nhận', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
    CONFIRMED: { label: 'Đã kết thúc', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    RESULT_CONFIRMED: { label: 'Đã kết thúc', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    CANCELLED: { label: 'Đã hủy', color: 'text-rose-450 bg-rose-500/10 border-rose-500/20' },
    WALKOVER: { label: 'Bỏ cuộc', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  };
  const s = map[status] ?? { label: status, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${s.color}`}>
      {s.label}
    </span>
  );
}

function getPlayerCountForSegment(segmentKey: string, ruleset: any): number {
  const segs = ruleset?.segmentDefinitions ?? ruleset?.segments ?? [];
  const found = segs.find((s: any) => s.segmentKey === segmentKey);
  return found?.playerCount ?? 2;
}

function getMemberGender(member: MatchPlayer): string {
  return String(member.playerProfile?.gender ?? member.gender ?? '').trim().toUpperCase();
}

function getFilteredMembers(
  members: MatchPlayer[],
  segmentId: string,
  segmentKey: string,
  slotIdx: number,
  teamKey: 'teamA' | 'teamB',
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
    filtered = filtered.filter(m => getMemberGender(m) === 'MALE');
  } else if (genderRule === 'female_only') {
    filtered = filtered.filter(m => getMemberGender(m) === 'FEMALE');
  } else if (genderRule === 'mixed') {
    const otherSlotIdx = 1 - slotIdx;
    const otherPlayerId = lineupsData[teamKey]?.[segmentId]?.[otherSlotIdx];
    if (otherPlayerId) {
      const otherPlayer = members.find(m => m.playerProfile?.id === otherPlayerId);
      if (otherPlayer) {
        const otherGender = getMemberGender(otherPlayer);
        if (otherGender === 'MALE') {
          filtered = filtered.filter(m => getMemberGender(m) === 'FEMALE');
        } else if (otherGender === 'FEMALE') {
          filtered = filtered.filter(m => getMemberGender(m) === 'MALE');
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
    const gender = getMemberGender(m);
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
      if (player && getMemberGender(player) === String(rule.gender).toUpperCase()) {
        filtered = filtered.filter(m => m.playerProfile.id !== pId);
      }
    });
  });

  return filtered;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MatchesPage() {
  const { tournament, loading: tLoading, reload: reloadTournament } = useActiveTournament();
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const { role, user } = currentUser;
  const isBtcAdmin = role === 'btc_admin' || role === 'super_admin';

  // Feature flags from ruleset
  const requireCourtConfig = tournament?.ruleset?.requireCourtConfig !== false;
  const requireScheduleConfig = tournament?.ruleset?.requireScheduleConfig !== false;

  // ── Data state ──
  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // ── Standings state ──
  const [standingsData, setStandingsData] = useState<any[]>([]);
  const [standingsGroups, setStandingsGroups] = useState<any[]>([]);

  // ── Expanded match detail ──
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [matchDetails, setMatchDetails] = useState<MatchDetails | null>(null);
  const [lineupsData, setLineupsData] = useState<LineupFormState>({ teamA: {}, teamB: {} });

  const handlePlayerChange = (teamKey: 'teamA' | 'teamB', segmentId: string, playerIdx: number, playerId: string) => {
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
            const count = getPlayerCountForSegment(segment.segmentKey, tournament?.ruleset);
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
                  tournament?.ruleset
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

  // ── Inline edit ──
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    scheduledTime: '',
    courtId: '',
    courtName: '',
    matchNo: '',
  });

  // ── Schedule generate ──
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<ScheduleGenerateFormState>({
    startTime: '',
    durationMinutes: '30',
  });

  // ── Filters ──
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCourtFilter, setSelectedCourtFilter] = useState<string>('all');

  // ── Modals ──
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [matchToStart, setMatchToStart] = useState<MatchListItem | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<MatchListItem | null>(null);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [matchToLock, setMatchToLock] = useState<MatchListItem | null>(null);
  // Publish gate — shown when user tries to start a match but tournament is not yet public
  const [publishGateModalOpen, setPublishGateModalOpen] = useState(false);
  const [publishGateLoading, setPublishGateLoading] = useState(false);
  const [pendingStartMatch, setPendingStartMatch] = useState<MatchListItem | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // UX context
  // ─────────────────────────────────────────────────────────────────────────
  const uxContext = buildTournamentUxContext({
    tournament,
    stats: {
      matchesCount: matches.length,
      lineupReadyCount: matches.filter((m) => m.status === 'LINEUP_READY' || m.status === 'READY').length,
      scoringReadyCount: matches.filter((m) => m.status === 'READY').length,
      completedMatches: matches.filter((m) => ['COMPLETED', 'CONFIRMED', 'RESULT_CONFIRMED'].includes(m.status)).length,
      resultConfirmedMatches: matches.filter((m) => ['CONFIRMED', 'RESULT_CONFIRMED'].includes(m.status)).length,
    },
  });

  const canLockLineups = isBtcAdmin;
  const canEditSchedule = isBtcAdmin;
  const canStartMatch = role === 'scorer' || isBtcAdmin;
  const canDeleteMatch = isBtcAdmin;
  const submitLineupAccess = getActionAccess('submitLineup', role, uxContext);

  // ─────────────────────────────────────────────────────────────────────────
  // Data fetching
  // ─────────────────────────────────────────────────────────────────────────
  const fetchMatches = useCallback(async () => {
    if (!tournament) return;
    try {
      setLoading(true);
      const data = await apiFetch<MatchListItem[]>(`/tournaments/${tournament.id}/matches`);
      setMatches(data);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Lỗi tải danh sách trận.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, tournament]);

  const fetchStandings = useCallback(async () => {
    if (!tournament) return;
    try {
      const groupData = await apiFetch(`/tournaments/${tournament.id}/groups`);
      setStandingsGroups(groupData || []);

      const standingsData = await apiFetch(`/tournaments/${tournament.id}/standings`);
      setStandingsData(standingsData || []);
    } catch (e) {
      console.error('Lỗi tải BXH cho trang trận đấu:', e);
    }
  }, [tournament]);

  const fetchCourts = useCallback(async () => {
    if (!tournament) return;
    try {
      const data = await apiFetch<Court[]>(`/tournaments/${tournament.id}/courts`);
      setCourts(data);
    } catch {
      // Courts are optional
    }
  }, [tournament]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMatches();
      fetchStandings();
      if (requireCourtConfig) fetchCourts();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchMatches, fetchStandings, fetchCourts, requireCourtConfig]);

  // WebSocket connection for real-time score updates
  useEffect(() => {
    if (!tournament) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    const socket = io(`${wsUrl}/ws`, {
      transports: ['websocket'],
    });

    const joinRoom = () => {
      socket.emit('joinTournament', { tournamentId: tournament.id });
      console.log('Matches page connected to socket room:', `tournament:${tournament.id}`);
    };

    socket.on('connect', () => {
      joinRoom();
    });

    socket.on('score.updated', (payload: any) => {
      console.log('Realtime score update detected on matches page:', payload);
      // Soft-reload data to show updated live scores and standings immediately!
      void fetchMatches();
      void fetchStandings();
    });

    if (socket.connected) {
      joinRoom();
    }

    return () => {
      if (socket) {
        socket.emit('leaveTournament', { tournamentId: tournament.id });
        socket.disconnect();
      }
    };
  }, [tournament, fetchMatches, fetchStandings]);

  // ─────────────────────────────────────────────────────────────────────────
  // Match expansion & lineup data
  // ─────────────────────────────────────────────────────────────────────────
  const handleExpandMatch = async (matchId: string) => {
    if (expandedMatchId === matchId) {
      setExpandedMatchId(null);
      setMatchDetails(null);
      return;
    }

    setExpandedMatchId(matchId);
    setMatchDetails(null);
    setLineupsData({ teamA: {}, teamB: {} });

    try {
      setDetailsLoading(true);
      const details = await apiFetch<MatchDetails>(`/matches/${matchId}`);
      setMatchDetails(details);

      // Initialize lineup form
      const initial: LineupFormState = { teamA: {}, teamB: {} };
      details.segments.forEach((seg) => {
        initial.teamA[seg.id] = details.lineups
          .find((l) => l.segmentId === seg.id && l.teamId === details.teamAId)
          ?.players.map((p) => p.playerProfileId) ?? [];
        initial.teamB[seg.id] = details.lineups
          .find((l) => l.segmentId === seg.id && l.teamId === details.teamBId)
          ?.players.map((p) => p.playerProfileId) ?? [];
      });
      setLineupsData(initial);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Lỗi tải chi tiết trận.', 'error');
    } finally {
      setDetailsLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Inline edit handlers
  // ─────────────────────────────────────────────────────────────────────────
  const startEditing = (m: MatchListItem) => {
    setEditingMatchId(m.id);
    setEditForm({
      scheduledTime: toDatetimeLocal(m.scheduledTime),
      courtId: m.courtId ?? '',
      courtName: m.courtName ?? (m.court ? formatCourtLabel(m.court) : ''),
      matchNo: m.matchNo?.toString() ?? '',
    });
  };

  const cancelEditing = () => {
    setEditingMatchId(null);
    setEditForm({ scheduledTime: '', courtId: '', courtName: '', matchNo: '' });
  };

  const handleSaveEdit = async (matchId: string) => {
    if (!canEditSchedule) return;

    let resolvedCourtId: string | null = null;
    let resolvedCourtName: string | null = null;

    if (requireCourtConfig) {
      if (editForm.courtId && editForm.courtId !== 'custom') {
        const selectedCourt = courts.find((c) => c.id === editForm.courtId);
        resolvedCourtId = editForm.courtId;
        resolvedCourtName = selectedCourt ? formatCourtLabel(selectedCourt) : null;
      } else if (editForm.courtId === 'custom' && editForm.courtName.trim()) {
        const trimmedName = editForm.courtName.trim();
        const existing = courts.find((c) => c.name.toLowerCase() === trimmedName.toLowerCase());
        if (existing) {
          resolvedCourtId = existing.id;
          resolvedCourtName = formatCourtLabel(existing);
        } else {
          try {
            const newCourt = await apiFetch<Court>(`/tournaments/${tournament!.id}/courts`, {
              method: 'POST',
              body: { name: trimmedName },
            });
            resolvedCourtId = newCourt.id;
            resolvedCourtName = formatCourtLabel(newCourt);
            toast(`Đã tạo sân "${trimmedName}" và gán cho trận.`, 'success');
            fetchCourts();
          } catch {
            resolvedCourtName = trimmedName;
          }
        }
      } else if (editForm.courtName.trim()) {
        resolvedCourtName = editForm.courtName.trim();
      }
    }

    setActionLoading(true);
    try {
      await apiFetch(`/matches/${matchId}/schedule`, {
        method: 'PATCH',
        body: {
          scheduledTime: requireScheduleConfig && editForm.scheduledTime
            ? new Date(editForm.scheduledTime).toISOString()
            : undefined,
          courtId: resolvedCourtId || undefined,
          courtName: resolvedCourtName || undefined,
          matchNo: editForm.matchNo ? parseInt(editForm.matchNo, 10) : undefined,
        },
      });
      toast('Đã cập nhật thông tin trận đấu!', 'success');
      cancelEditing();
      fetchMatches();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Không thể lưu thông tin trận.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Start match
  // ─────────────────────────────────────────────────────────────────────────
  const confirmStartMatch = (m: MatchListItem) => {
    // Guard: if tournament is not published yet, show publish gate first
    if (!tournament?.publicEnabled) {
      setPendingStartMatch(m);
      setPublishGateModalOpen(true);
      return;
    }
    setMatchToStart(m);
    setStartModalOpen(true);
  };

  const handlePublishAndContinue = async () => {
    if (!tournament) return;
    setPublishGateLoading(true);
    try {
      await apiFetch(`/tournaments/${tournament.id}/publish`, { method: 'POST' });
      toast('Giải đã được công khai! Bạn có thể bắt đầu trận.', 'success');
      reloadTournament();
      setPublishGateModalOpen(false);
      if (pendingStartMatch) {
        // Proceed to the start match confirmation
        setMatchToStart(pendingStartMatch);
        setPendingStartMatch(null);
        setStartModalOpen(true);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Không thể công khai giải.', 'error');
    } finally {
      setPublishGateLoading(false);
    }
  };

  const cancelPublishGate = () => {
    setPublishGateModalOpen(false);
    setPendingStartMatch(null);
  };

  const handleStartMatch = async () => {
    if (!matchToStart) return;
    setActionLoading(true);
    try {
      await apiFetch(`/matches/${matchToStart.id}/start`, { method: 'POST' });
      toast('Trận đấu đã bắt đầu!', 'success');
      setStartModalOpen(false);
      setMatchToStart(null);
      fetchMatches();
      reloadTournament();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Không thể bắt đầu trận đấu.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Delete match
  // ─────────────────────────────────────────────────────────────────────────
  const confirmDeleteMatch = (m: MatchListItem) => {
    setMatchToDelete(m);
    setDeleteModalOpen(true);
  };

  const handleDeleteMatch = async () => {
    if (!matchToDelete) return;
    setActionLoading(true);
    try {
      await apiFetch(`/matches/${matchToDelete.id}`, { method: 'DELETE' });
      toast('Đã xóa trận đấu.', 'success');
      setDeleteModalOpen(false);
      setMatchToDelete(null);
      if (expandedMatchId === matchToDelete.id) {
        setExpandedMatchId(null);
        setMatchDetails(null);
      }
      fetchMatches();
      reloadTournament();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Không thể xóa trận đấu này.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Generate group schedule
  // ─────────────────────────────────────────────────────────────────────────
  const handleGenerateGroupSchedule = async () => {
    if (!tournament) return;
    setActionLoading(true);
    try {
      await apiFetch(`/tournaments/${tournament.id}/schedule/generate-group-stage`, {
        method: 'POST',
        body: {
          startTime: requireScheduleConfig && scheduleForm.startTime
            ? new Date(scheduleForm.startTime).toISOString()
            : undefined,
          durationMinutes: parseInt(scheduleForm.durationMinutes, 10) || 30,
        },
      });
      toast('Đã sinh lịch thi đấu vòng bảng thành công!', 'success');
      setGenerateModalOpen(false);
      fetchMatches();
      reloadTournament();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Không thể sinh lịch thi đấu.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Lock lineup
  // ─────────────────────────────────────────────────────────────────────────
  const confirmLockLineup = (m: MatchListItem) => {
    setMatchToLock(m);
    setLockModalOpen(true);
  };

  const handleLockLineups = async () => {
    if (!matchToLock || !matchDetails) return;
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

      toast('Đã lưu và khóa đội hình thi đấu thành công! Trận đấu đã sẵn sàng.', 'success');
      setLockModalOpen(false);
      setMatchToLock(null);
      fetchMatches();
      // Refresh expanded details if this is the expanded match
      if (expandedMatchId === matchDetails.id) {
        await handleExpandMatch(matchDetails.id);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Không thể khóa đội hình. Vui lòng kiểm tra lại thiết lập.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  const filteredMatches = matches.filter((m) => {
    if (selectedPhase === 'playoff') {
      if (m.group) return false;
    } else {
      if (!m.group) return false;
      if (selectedPhase !== 'all' && m.group.code !== selectedPhase) return false;
    }
    if (selectedStatus !== 'all' && m.status !== selectedStatus) return false;
    if (requireCourtConfig && selectedCourtFilter !== 'all') {
      const courtLabel = m.court ? formatCourtLabel(m.court) : (m.courtName ?? '');
      if (courtLabel !== selectedCourtFilter) return false;
    }
    return true;
  });

  const groupMatches = filteredMatches.filter((m) => m.group);
  const playoffMatches = filteredMatches.filter((m) => !m.group);

  const groupsInMatches = useMemo(() => {
    return Array.from(new Set(matches.map(m => m.group?.code).filter(Boolean))).sort() as string[];
  }, [matches]);

  // Unique courts for filter
  const courtOptions = Array.from(
    new Set(
      matches
        .map((m) => (m.court ? formatCourtLabel(m.court) : m.courtName))
        .filter(Boolean)
    )
  ) as string[];

  // ─────────────────────────────────────────────────────────────────────────
  // Match card renderer
  // ─────────────────────────────────────────────────────────────────────────
  const renderMatchCard = (m: MatchListItem) => {
    const isExpanded = expandedMatchId === m.id;
    const isEditing = editingMatchId === m.id;
    const isLineupLocked = matchDetails && matchDetails.id === m.id
      ? ['READY', 'RUNNING', 'SEGMENT_BREAK', 'COMPLETED', 'CONFIRMED', 'RESULT_CONFIRMED', 'CANCELLED', 'WALKOVER'].includes(matchDetails.status)
      : ['READY', 'RUNNING', 'SEGMENT_BREAK', 'COMPLETED', 'CONFIRMED', 'RESULT_CONFIRMED', 'CANCELLED', 'WALKOVER'].includes(m.status);
    const isRunningOrDone = ['RUNNING', 'SEGMENT_BREAK', 'COMPLETED', 'CONFIRMED', 'RESULT_CONFIRMED'].includes(m.status);
    const courtLabel = m.court ? formatCourtLabel(m.court) : (m.courtName ?? null);
    const canEditTeam = (teamKey: 'teamA' | 'teamB'): boolean => {
      if (isLineupLocked) return false;
      if (!matchDetails) return false;
      if (role === 'captain') {
        const ownedTeamIds = [matchDetails.teamAId, matchDetails.teamBId].filter(Boolean);
        const myTeamId = teamKey === 'teamA' ? matchDetails.teamAId : matchDetails.teamBId;
        return ownedTeamIds.includes(myTeamId ?? '');
      }
      return submitLineupAccess.allowed;
    };

    return (
      <div
        key={m.id}
        className="rounded-2xl border border-slate-800/80 bg-slate-900/60 overflow-hidden transition-all hover:border-slate-700 shadow-sm"
      >
        {/* Card Header */}
        <div className="p-3.5">
          <div className="flex items-start justify-between gap-2">
            {/* Left: Match info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                  {getMatchLabel(m)}
                  {m.matchNo ? ` · #${m.matchNo}` : ''}
                </span>
                {getMatchStatusBadge(m.status)}
                {m.result?.winnerTeamId && (
                  <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                    <Trophy className="w-3 h-3" />
                    Đã có KQ
                  </span>
                )}
              </div>

              <div className="mt-1.5 text-sm font-bold text-slate-100">
                <span className="text-sky-400">{m.teamA?.name ?? '?'}</span>
                <span className="text-slate-500 mx-1.5 font-normal text-xs">vs</span>
                <span className="text-rose-400">{m.teamB?.name ?? '?'}</span>
              </div>

              {m.result && (
                <div className="mt-1 text-xs font-mono text-amber-400 font-bold">
                  {m.result.teamAScore ?? '—'} – {m.result.teamBScore ?? '—'}
                </div>
              )}

              <div className="mt-1.5 flex items-center gap-3 flex-wrap text-[11px] text-slate-500">
                {requireScheduleConfig && m.scheduledTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-600" />
                    {formatDateTime(m.scheduledTime)}
                  </span>
                )}
                {requireCourtConfig && courtLabel && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-600" />
                    {courtLabel}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Edit schedule button */}
              {canEditSchedule && !isRunningOrDone && (
                isEditing ? (
                  <button
                    onClick={cancelEditing}
                    className="text-slate-500 hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-800 transition-all"
                    title="Hủy chỉnh sửa"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => startEditing(m)}
                    className="text-slate-500 hover:text-amber-400 p-1.5 rounded-lg hover:bg-amber-500/10 transition-all"
                    title="Chỉnh sửa lịch & sân"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )
              )}

              {/* Start match */}
              {canStartMatch && m.status === 'READY' && (
                <button
                  onClick={() => confirmStartMatch(m)}
                  className="text-emerald-400 hover:text-emerald-300 p-1.5 rounded-lg hover:bg-emerald-500/10 transition-all"
                  title="Bắt đầu trận"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Link to scoring */}
              {['READY', 'RUNNING', 'SEGMENT_BREAK', 'COMPLETED', 'RESULT_CONFIRMED'].includes(m.status) && (
                <Link
                  href={`/score/${m.id}`}
                  target="_blank"
                  className="text-amber-400 hover:text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-xs flex items-center gap-1"
                >
                  <Zap className="w-3.5 h-3.5" />
                  {['RUNNING', 'SEGMENT_BREAK'].includes(m.status) ? 'Ghi điểm' : 
                   m.status === 'READY' ? 'Bàn Trọng Tài' :
                   m.status === 'COMPLETED' ? 'Xác nhận KQ' : 'Xem kết quả'}
                </Link>
              )}

              {/* Delete */}
              {canDeleteMatch && m.status === 'SCHEDULED' && (
                <button
                  onClick={() => confirmDeleteMatch(m)}
                  className="text-slate-600 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-500/10 transition-all"
                  title="Xóa trận"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Expand button */}
              <button
                onClick={() => handleExpandMatch(m.id)}
                className="text-slate-500 hover:text-amber-400 p-1.5 rounded-lg hover:bg-slate-800 transition-all"
                title={isExpanded ? 'Thu gọn' : 'Xem đội hình'}
              >
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Inline Edit Form */}
          {isEditing && (
            <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                Chỉnh sửa lịch & sân
              </div>
              <div className={`grid gap-2 ${(requireScheduleConfig || requireCourtConfig) ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                {requireScheduleConfig && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Giờ thi đấu
                    </label>
                    <input
                      type="datetime-local"
                      value={editForm.scheduledTime}
                      onChange={(e) => setEditForm((f) => ({ ...f, scheduledTime: e.target.value }))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-500/50 [color-scheme:dark]"
                    />
                  </div>
                )}

                {requireCourtConfig && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Sân thi đấu
                    </label>
                    <select
                      value={editForm.courtId}
                      onChange={(e) => {
                        setEditForm((f) => ({ ...f, courtId: e.target.value, courtName: '' }));
                      }}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-500/50"
                    >
                      <option value="">-- Chưa chọn sân --</option>
                      {courts.map((c) => (
                        <option key={c.id} value={c.id}>{formatCourtLabel(c)}</option>
                      ))}
                      <option value="custom">Nhập tên sân khác...</option>
                      {Array.from(new Set(matches.map((mm) => mm.courtName).filter(Boolean))).map((custName) => (
                        <option key={custName} value={custName as string}>{custName as string}</option>
                      ))}
                    </select>
                    {editForm.courtId === 'custom' && (
                      <input
                        type="text"
                        placeholder="Tên sân mới..."
                        value={editForm.courtName}
                        onChange={(e) => setEditForm((f) => ({ ...f, courtName: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-500/50"
                      />
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Số trận (#)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.matchNo}
                    onChange={(e) => setEditForm((f) => ({ ...f, matchNo: e.target.value }))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-500/50"
                    placeholder="Số trận"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleSaveEdit(m.id)}
                  disabled={actionLoading}
                  className="flex items-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-xs font-bold px-3 py-1.5 transition-all"
                >
                  {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Lưu
                </button>
                <button
                  onClick={cancelEditing}
                  className="flex items-center gap-1 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 text-xs px-3 py-1.5 transition-all"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Expanded: lineup panel */}
        {isExpanded && (
          <div className="border-t border-slate-800 pt-3 px-3.5 pb-3.5 text-xs space-y-4">
            {detailsLoading ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                <span>Đang tải thông tin đội hình...</span>
              </div>
            ) : matchDetails && matchDetails.id === m.id ? (
              <div className="space-y-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                {/* Lineup header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-500" />
                    Đội hình thi đấu
                  </span>
                </div>

                {isLineupLocked && (
                  <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-2.5 py-1.5 text-[10px] text-emerald-350 flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>
                      {matchDetails.status === 'READY'
                        ? 'Đội hình đã được BTC khóa. Trận đấu sẵn sàng thi đấu.'
                        : 'Trận đấu đang diễn ra hoặc đã kết thúc. Đội hình được khóa cố định.'}
                    </span>
                  </div>
                )}

                {/* Team lineups */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Team A */}
                  <div className="space-y-3">
                    <div className="font-semibold text-sky-400 border-b border-slate-800/60 pb-1 flex justify-between">
                      <span>{matchDetails.teamA?.name}</span>
                      <span className="text-[10px] text-slate-500">Đội A</span>
                    </div>

                    {matchDetails.segments.map((segment) => {
                      const limit = getPlayerCountForSegment(segment.segmentKey, tournament?.ruleset);
                      const selectedPlayers = lineupsData.teamA[segment.id] ?? [];
                      const isTeamEditable = canEditTeam('teamA');
                      const lineupEntry = matchDetails.lineups.find(
                        (l) => l.segmentId === segment.id && l.teamId === matchDetails.teamAId
                      );
                      const isInvalid = lineupEntry?.status === 'INVALID';

                      return (
                        <div
                          key={segment.id}
                          className={`rounded-xl border p-2.5 space-y-2 transition-colors ${isInvalid ? 'border-rose-500/30 bg-rose-500/5' : 'border-slate-800/60 bg-slate-900/40'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-300">{segment.name}</span>
                            {isInvalid && (
                              <span className="text-[9px] text-rose-400 flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3" /> Chưa hợp lệ
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {Array.from({ length: limit }).map((_, idx) => (
                              <select
                                key={idx}
                                value={selectedPlayers[idx] ?? ''}
                                onChange={(e) => handlePlayerChange('teamA', segment.id, idx, e.target.value)}
                                disabled={!isTeamEditable || ['READY', 'RUNNING', 'COMPLETED', 'CONFIRMED'].includes(matchDetails.status)}
                                className="w-full rounded-lg border border-slate-700/60 bg-slate-950/60 px-2 py-1.5 text-[11px] text-slate-200 outline-none focus:border-amber-500/50 disabled:opacity-60"
                              >
                                <option value="">-- Chọn VĐV --</option>
                                {getFilteredMembers(
                                  matchDetails.teamA?.members || [],
                                  segment.id,
                                  segment.segmentKey,
                                  idx,
                                  'teamA',
                                  lineupsData,
                                  matchDetails.segments,
                                  tournament?.ruleset
                                ).map((member) => (
                                  <option key={member.playerProfile.id} value={member.playerProfile.id}>
                                    {member.playerProfile.fullName} ({getMemberGender(member) === 'MALE' ? '♂ Nam' : '♀ Nữ'})
                                  </option>
                                ))}
                              </select>
                            ))}
                          </div>
                          {isInvalid && lineupEntry?.validationResult?.errors && (
                            <div className="text-[10px] text-rose-400 space-y-0.5">
                              {lineupEntry.validationResult.errors.map((e, i) => (
                                <div key={i}>• {e}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Team B */}
                  <div className="space-y-3">
                    <div className="font-semibold text-rose-400 border-b border-slate-800/60 pb-1 flex justify-between">
                      <span>{matchDetails.teamB?.name}</span>
                      <span className="text-[10px] text-slate-500">Đội B</span>
                    </div>

                    {matchDetails.segments.map((segment) => {
                      const limit = getPlayerCountForSegment(segment.segmentKey, tournament?.ruleset);
                      const selectedPlayers = lineupsData.teamB[segment.id] ?? [];
                      const isTeamEditable = canEditTeam('teamB');
                      const lineupEntry = matchDetails.lineups.find(
                        (l) => l.segmentId === segment.id && l.teamId === matchDetails.teamBId
                      );
                      const isInvalid = lineupEntry?.status === 'INVALID';

                      return (
                        <div
                          key={segment.id}
                          className={`rounded-xl border p-2.5 space-y-2 transition-colors ${isInvalid ? 'border-rose-500/30 bg-rose-500/5' : 'border-slate-800/60 bg-slate-900/40'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-300">{segment.name}</span>
                            {isInvalid && (
                              <span className="text-[9px] text-rose-400 flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3" /> Chưa hợp lệ
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {Array.from({ length: limit }).map((_, idx) => (
                              <select
                                key={idx}
                                value={selectedPlayers[idx] ?? ''}
                                onChange={(e) => handlePlayerChange('teamB', segment.id, idx, e.target.value)}
                                disabled={!isTeamEditable || ['READY', 'RUNNING', 'COMPLETED', 'CONFIRMED'].includes(matchDetails.status)}
                                className="w-full rounded-lg border border-slate-700/60 bg-slate-950/60 px-2 py-1.5 text-[11px] text-slate-200 outline-none focus:border-amber-500/50 disabled:opacity-60"
                              >
                                <option value="">-- Chọn VĐV --</option>
                                {getFilteredMembers(
                                  matchDetails.teamB?.members || [],
                                  segment.id,
                                  segment.segmentKey,
                                  idx,
                                  'teamB',
                                  lineupsData,
                                  matchDetails.segments,
                                  tournament?.ruleset
                                ).map((member) => (
                                  <option key={member.playerProfile.id} value={member.playerProfile.id}>
                                    {member.playerProfile.fullName} ({getMemberGender(member) === 'MALE' ? '♂ Nam' : '♀ Nữ'})
                                  </option>
                                ))}
                              </select>
                            ))}
                          </div>
                          {isInvalid && lineupEntry?.validationResult?.errors && (
                            <div className="text-[10px] text-rose-400 space-y-0.5">
                              {lineupEntry.validationResult.errors.map((e, i) => (
                                <div key={i}>• {e}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Unified Lock Button */}
                {canLockLineups && !isLineupLocked && (
                  <div className="flex justify-center pt-4 border-t border-slate-800/60">
                    <button
                      onClick={() => confirmLockLineup(m)}
                      disabled={actionLoading}
                      className="w-full sm:w-auto px-10 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 text-slate-950 font-bold text-xs sm:text-sm rounded-xl cursor-pointer shadow-lg shadow-emerald-500/15 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] mx-auto"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Lock className="w-4 h-4" />
                      )}
                      Xác Nhận & Khóa Đội Hình Thi Đấu
                    </button>
                  </div>
                )}

                {/* Scoring link */}
                {['READY', 'RUNNING', 'SEGMENT_BREAK', 'COMPLETED', 'RESULT_CONFIRMED'].includes(m.status) && (
                  <div className="pt-2 border-t border-slate-800">
                    <Link
                      href={`/score/${m.id}`}
                      target="_blank"
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 hover:bg-amber-500/25 text-xs font-bold py-2 transition-all"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      {['RUNNING', 'SEGMENT_BREAK'].includes(m.status) ? 'Vào bảng ghi điểm' :
                       m.status === 'READY' ? 'Mở bàn trọng tài' :
                       m.status === 'COMPLETED' ? 'Xem / Xác nhận kết quả' : 'Xem chi tiết kết quả'}
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 text-center text-[11px] text-slate-500 italic">
                Không thể tải chi tiết trận đấu.
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────────────────────────────────
  if (tLoading || (loading && matches.length === 0)) {
    return <PageLoading />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Stats
  // ─────────────────────────────────────────────────────────────────────────
  const stats = [
    { label: 'Tổng trận', value: matches.length, icon: Target, color: 'text-amber-400' },
    { label: 'Hoàn thành', value: matches.filter((m) => ['COMPLETED', 'CONFIRMED', 'RESULT_CONFIRMED'].includes(m.status)).length, icon: Check, color: 'text-emerald-400' },
    { label: 'Đang đấu', value: matches.filter((m) => ['RUNNING', 'SEGMENT_BREAK'].includes(m.status)).length, icon: Play, color: 'text-yellow-400' },
    { label: 'Chờ lineup', value: matches.filter((m) => ['LINEUP_PENDING', 'LINEUP_READY', 'READY'].includes(m.status)).length, icon: ClipboardList, color: 'text-violet-400' },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="premium-container space-y-6 animate-scale-in">
      <PageHeader
        title="Quản Lý Trận Đấu"
        description="Xem lịch, phân công sân, quản lý đội hình và theo dõi trạng thái tất cả trận đấu của giải."
        icon={Calendar}
        actions={
          isBtcAdmin && (
            <button
              onClick={() => setGenerateModalOpen(true)}
              className="btn btn-primary flex items-center gap-2 font-semibold text-sm"
              disabled={actionLoading}
            >
              <RefreshCw className="w-4 h-4" />
              Sinh lịch vòng bảng
            </button>
          )
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3 flex items-center gap-3">
            <s.icon className={`w-5 h-5 flex-shrink-0 ${s.color}`} />
            <div>
              <div className="text-xl font-bold text-slate-100">{s.value}</div>
              <div className="text-[11px] text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid View */}
      <div className={`grid grid-cols-1 gap-6 ${selectedPhase !== 'playoff' ? 'lg:grid-cols-3' : ''}`}>
        {/* Left Column: Matches list & Filters */}
        <div className={`space-y-6 ${selectedPhase !== 'playoff' ? 'lg:col-span-2' : ''}`}>
          {/* Filters */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {/* Primary Stage filter */}
              <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-1">
                <button
                  type="button"
                  onClick={() => setSelectedPhase('all')}
                  className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${selectedPhase !== 'playoff' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Vòng Bảng
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPhase('playoff')}
                  className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${selectedPhase === 'playoff' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Playoffs
                </button>
              </div>

              {/* Status filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-amber-500/50"
              >
                <option value="all">Mọi trạng thái</option>
                <option value="SCHEDULED">Đã lên lịch</option>
                <option value="LINEUP_PENDING">Chờ lineup</option>
                <option value="LINEUP_READY">Lineup xong</option>
                <option value="READY">Sẵn sàng</option>
                <option value="RUNNING">Đang đấu</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="CONFIRMED">Đã xác nhận</option>
              </select>

              {/* Court filter - only if requireCourtConfig */}
              {requireCourtConfig && courtOptions.length > 0 && (
                <select
                  value={selectedCourtFilter}
                  onChange={(e) => setSelectedCourtFilter(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-amber-500/50"
                >
                  <option value="all">Mọi sân</option>
                  {courtOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}

              {/* Refresh */}
              <button
                onClick={() => { void fetchMatches(); void fetchStandings(); }}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-1.5 text-slate-500 hover:text-amber-400 transition-all"
                title="Tải lại"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <div className="ml-auto text-xs text-slate-500">
                {filteredMatches.length} / {matches.length} trận
              </div>
            </div>

            {/* Level 2: Sub-tabs for Group Stage (only visible when Vòng Bảng is active) */}
            {selectedPhase !== 'playoff' && (
              <div className="flex flex-wrap items-center gap-1 bg-slate-900/20 p-1 rounded-xl border border-slate-800/40 max-w-max transition-all animate-scale-in">
                <button
                  type="button"
                  onClick={() => setSelectedPhase('all')}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${selectedPhase === 'all' ? 'bg-slate-800 text-amber-400 border border-slate-700/50 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Tất cả
                </button>
                {groupsInMatches.map((groupCode) => (
                  <button
                    key={groupCode}
                    type="button"
                    onClick={() => setSelectedPhase(groupCode)}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${selectedPhase === groupCode ? 'bg-slate-800 text-amber-400 border border-slate-700/50 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Bảng {groupCode}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Match lists */}
          {matches.length === 0 ? (
            <div className="p-10 bg-slate-800/10 border border-dashed border-slate-800 rounded-3xl text-center space-y-3">
              <Calendar className="w-10 h-10 text-slate-700 mx-auto" />
              <div className="text-slate-500 text-sm font-medium">Chưa có trận đấu nào</div>
              <div className="text-slate-600 text-xs">
                BTC cần sinh lịch thi đấu vòng bảng hoặc bảng đấu chưa được thiết lập.
              </div>
              {isBtcAdmin && (
                <button
                  onClick={() => setGenerateModalOpen(true)}
                  className="mt-2 btn btn-primary text-sm inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Sinh lịch thi đấu vòng bảng
                </button>
              )}
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="p-8 bg-slate-800/10 border border-dashed border-slate-800 rounded-3xl text-center text-xs text-slate-500 italic py-10">
              Không tìm thấy trận đấu nào phù hợp với bộ lọc.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Group stage */}
              {groupMatches.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                    <BarChart3 className="w-4 h-4 text-amber-500" />
                    Vòng bảng {selectedPhase !== 'all' && selectedPhase !== 'playoff' ? `· Bảng ${selectedPhase}` : ''} ({groupMatches.length} trận)
                  </div>
                  <div className="space-y-2">
                    {groupMatches.map(renderMatchCard)}
                  </div>
                </div>
              )}

              {/* Playoffs */}
              {playoffMatches.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Playoffs ({playoffMatches.length} trận)
                  </div>
                  <div className="space-y-2">
                    {playoffMatches.map(renderMatchCard)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Real-time Standings — hidden in Playoffs tab */}
        {selectedPhase !== 'playoff' && (
        <div className="space-y-6 lg:border-l lg:border-slate-850/60 lg:pl-6">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              BXH Cập Nhật Real-time
            </h3>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Live
            </span>
          </div>

          {standingsGroups.length > 0 ? (
            standingsGroups.map(group => {
              const groupStds = standingsData.filter(s => s.groupId === group.id).sort((a, b) => a.rank - b.rank);
              return (
                <div key={group.id} className="card p-4 space-y-3 shadow-md bg-slate-900/30 border border-slate-850/60">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <div className="font-bold text-xs text-amber-500">{group.name}</div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-850/50 text-slate-500 font-semibold">
                          <th className="py-2 w-7 text-center">#</th>
                          <th className="px-2">Đội</th>
                          <th className="text-center px-1">Trận</th>
                          <th className="text-center px-1">T</th>
                          <th className="text-center px-1">B</th>
                          <th className="text-center px-1">HS</th>
                          <th className="text-right py-2 px-1">Đ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850/30 text-slate-300">
                        {groupStds.length > 0 ? (
                          groupStds.map((s, index) => (
                            <tr key={s.id} className="hover:bg-slate-800/10 transition-colors">
                              <td className="py-2 text-center">
                                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ${
                                  index === 0 ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30' : 
                                  index === 1 ? 'bg-slate-300/15 text-slate-355 border border-slate-300/30' :
                                  'bg-slate-800 text-slate-500'
                                }`}>
                                  {s.rank}
                                </span>
                              </td>
                              <td className="font-semibold text-slate-200 px-2 truncate max-w-[120px]" title={s.team?.name || ''}>
                                {s.team?.name || '—'}
                              </td>
                              <td className="text-center text-slate-400 px-1">{s.matchesPlayed}</td>
                              <td className="text-center text-emerald-500 font-medium px-1">{s.wins}</td>
                              <td className="text-center text-rose-500 font-medium px-1">{s.losses}</td>
                              <td className="text-center text-slate-450 font-mono px-1">
                                {s.pointsFor - s.pointsAgainst > 0 ? `+${s.pointsFor - s.pointsAgainst}` : s.pointsFor - s.pointsAgainst}
                              </td>
                              <td className="text-right font-mono font-bold text-slate-200 py-2 px-1">{s.points}đ</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="text-center text-slate-500 italic py-4 text-[10px]">
                              Chưa có đội tuyển trong bảng đấu
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 bg-slate-800/10 border border-dashed border-slate-800 rounded-2xl text-center text-xs text-slate-500 italic">
              Chưa thiết lập bảng xếp hạng.
            </div>
          )}
        </div>
        )}
      </div>

      {/* ── Modals ── */}

      {/* Generate group schedule modal (custom - has form fields) */}
      {generateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setGenerateModalOpen(false)} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-in">
            <button
              onClick={() => setGenerateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>

            <h3 className="text-lg font-semibold text-slate-100 mb-2">Sinh lịch thi đấu vòng bảng?</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Thao tác này sẽ tạo lại toàn bộ lịch vòng bảng hiện tại. Lịch cũ nếu có sẽ bị ghi đè.
            </p>

            <div className="space-y-3 mb-6">
              {requireScheduleConfig && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 block">Thời gian bắt đầu</label>
                  <input
                    type="datetime-local"
                    value={scheduleForm.startTime}
                    onChange={(e) => setScheduleForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500/50 [color-scheme:dark]"
                  />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 block">Thời lượng mỗi trận (phút)</label>
                <input
                  type="number"
                  min="10"
                  max="180"
                  value={scheduleForm.durationMinutes}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setGenerateModalOpen(false)}
                className="btn btn-ghost btn-sm"
                disabled={actionLoading}
              >
                Hủy
              </button>
              <button
                onClick={handleGenerateGroupSchedule}
                className="btn btn-primary btn-sm"
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                ) : 'Sinh lịch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish gate modal — shown when starting a match but tournament is not yet public */}
      {publishGateModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-emerald-500/20 bg-slate-900 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-start gap-4 p-6 pb-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-2xl">
                🌐
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-slate-100">
                  Giải chưa được công khai
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">
                  Để bắt đầu trận đấu, giải cần được công khai trước để khán giả và hệ thống có thể theo dõi realtime.
                </p>
              </div>
            </div>

            {/* Match info */}
            {pendingStartMatch && (
              <div className="mx-6 mb-4 rounded-xl border border-slate-700/60 bg-slate-800/50 px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Trận chờ bắt đầu
                </div>
                <div className="text-sm font-semibold text-slate-200">
                  {pendingStartMatch.teamA?.name ?? 'Đội A'} vs {pendingStartMatch.teamB?.name ?? 'Đội B'}
                </div>
              </div>
            )}

            {/* Note */}
            <div className="mx-6 mb-5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
              <p className="text-xs leading-relaxed text-amber-300">
                Công khai giải cho phép khán giả xem lịch thi đấu và theo dõi điểm số theo thời gian thực. Bạn vẫn có thể quản lý giải sau khi đã công khai.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-6 py-4">
              <button
                type="button"
                onClick={cancelPublishGate}
                disabled={publishGateLoading}
                className="btn btn-ghost btn-sm"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handlePublishAndContinue}
                disabled={publishGateLoading}
                className="btn btn-sm inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-bold text-white hover:from-emerald-400 hover:to-teal-400 disabled:opacity-60 transition-all"
              >
                {publishGateLoading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Đang công khai...
                  </>
                ) : (
                  <>
                    🌐 Công khai &amp; Bắt đầu trận
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start match modal */}

      <ConfirmModal
        open={startModalOpen}
        title="Bắt đầu trận đấu?"
        description={`Bạn có chắc chắn muốn bắt đầu trận đấu giữa "${matchToStart?.teamA?.name}" và "${matchToStart?.teamB?.name}"? Trạng thái trận đấu sẽ chuyển sang ĐANG CHẠY và đội hình thi đấu sẽ bị KHÓA.`}
        confirmLabel="Bắt đầu"
        cancelLabel="Hủy"
        variant="warning"
        loading={actionLoading}
        onConfirm={handleStartMatch}
        onCancel={() => {
          setStartModalOpen(false);
          setMatchToStart(null);
        }}
      />

      {/* Delete match modal */}
      <ConfirmModal
        open={deleteModalOpen}
        title="Xóa trận đấu này?"
        description={`Bạn có chắc chắn muốn xóa trận đấu giữa "${matchToDelete?.teamA?.name}" và "${matchToDelete?.teamB?.name}"? Thao tác này KHÔNG THỂ HOÀN TÁC và sẽ xóa vĩnh viễn trận đấu khỏi hệ thống.`}
        confirmLabel="Xóa trận đấu"
        cancelLabel="Hủy"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDeleteMatch}
        onCancel={() => {
          setDeleteModalOpen(false);
          setMatchToDelete(null);
        }}
      />

      {/* Lock lineup modal */}
      <ConfirmModal
        open={lockModalOpen}
        title="Khóa đội hình thi đấu?"
        description={`Bạn có chắc chắn muốn khóa đội hình thi đấu cho trận "${matchToLock?.teamA?.name} vs ${matchToLock?.teamB?.name}"? Trạng thái trận đấu sẽ chuyển sang SẴN SÀNG (READY) và không thể thay đổi đội hình được nữa.`}
        confirmLabel="Khóa ngay"
        cancelLabel="Hủy"
        variant="warning"
        loading={actionLoading}
        onConfirm={handleLockLineups}
        onCancel={() => {
          setLockModalOpen(false);
          setMatchToLock(null);
        }}
      />
    </div>
  );
}
