'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
    COMPLETED: { label: 'Hoàn thành', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
    CONFIRMED: { label: 'Đã xác nhận', color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
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

  // ── Expanded match detail ──
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [matchDetails, setMatchDetails] = useState<MatchDetails | null>(null);
  const [lineupsData, setLineupsData] = useState<LineupFormState>({ teamA: {}, teamB: {} });

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
  const [selectedPhase, setSelectedPhase] = useState<'all' | 'group' | 'playoff'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCourtFilter, setSelectedCourtFilter] = useState<string>('all');

  // ── Modals ──
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [matchToStart, setMatchToStart] = useState<MatchListItem | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<MatchListItem | null>(null);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [matchToLock, setMatchToLock] = useState<MatchListItem | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // UX context
  // ─────────────────────────────────────────────────────────────────────────
  const uxContext = buildTournamentUxContext({
    tournament,
    stats: {
      matchesCount: matches.length,
      lineupReadyCount: matches.filter((m) => m.status === 'LINEUP_READY' || m.status === 'READY').length,
      scoringReadyCount: matches.filter((m) => m.status === 'READY').length,
      completedMatches: matches.filter((m) => m.status === 'COMPLETED' || m.status === 'CONFIRMED').length,
      resultConfirmedMatches: matches.filter((m) => m.status === 'CONFIRMED').length,
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
      if (requireCourtConfig) fetchCourts();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchMatches, fetchCourts, requireCourtConfig]);

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
    setMatchToStart(m);
    setStartModalOpen(true);
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
    if (!matchToLock) return;
    setActionLoading(true);
    try {
      await apiFetch(`/matches/${matchToLock.id}/lineups/lock`, { method: 'POST' });
      toast('Đã khóa đội hình thi đấu!', 'success');
      setLockModalOpen(false);
      setMatchToLock(null);
      fetchMatches();
      // Refresh expanded details if this is the expanded match
      if (expandedMatchId === matchToLock.id) {
        await handleExpandMatch(matchToLock.id);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Không thể khóa đội hình.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Submit lineup
  // ─────────────────────────────────────────────────────────────────────────
  const handleSubmitLineup = async (teamKey: 'teamA' | 'teamB') => {
    if (!matchDetails) return;
    const teamId = teamKey === 'teamA' ? matchDetails.teamAId : matchDetails.teamBId;
    if (!teamId) return;

    const segmentsPayload = Object.keys(lineupsData[teamKey]).map((segmentId) => ({
      segmentId,
      playerIds: lineupsData[teamKey][segmentId].filter(Boolean),
    }));

    setActionLoading(true);
    try {
      await apiFetch(`/matches/${matchDetails.id}/lineups`, {
        method: 'PUT',
        body: {
          teamLineups: [{ teamId, segments: segmentsPayload }],
        },
      });
      toast(`Đã lưu đội hình ${teamKey === 'teamA' ? 'Đội A' : 'Đội B'}!`, 'success');
      // Reload expanded details
      const updated = await apiFetch<MatchDetails>(`/matches/${matchDetails.id}`);
      setMatchDetails(updated);
      const newLineups: LineupFormState = { teamA: {}, teamB: {} };
      updated.segments.forEach((seg) => {
        newLineups.teamA[seg.id] = updated.lineups
          .find((l) => l.segmentId === seg.id && l.teamId === updated.teamAId)
          ?.players.map((p) => p.playerProfileId) ?? [];
        newLineups.teamB[seg.id] = updated.lineups
          .find((l) => l.segmentId === seg.id && l.teamId === updated.teamBId)
          ?.players.map((p) => p.playerProfileId) ?? [];
      });
      setLineupsData(newLineups);
      fetchMatches();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Không thể lưu đội hình.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Filtered matches
  // ─────────────────────────────────────────────────────────────────────────
  const filteredMatches = matches.filter((m) => {
    if (selectedPhase === 'group' && !m.group) return false;
    if (selectedPhase === 'playoff' && m.group) return false;
    if (selectedStatus !== 'all' && m.status !== selectedStatus) return false;
    if (requireCourtConfig && selectedCourtFilter !== 'all') {
      const courtLabel = m.court ? formatCourtLabel(m.court) : (m.courtName ?? '');
      if (courtLabel !== selectedCourtFilter) return false;
    }
    return true;
  });

  const groupMatches = filteredMatches.filter((m) => m.group);
  const playoffMatches = filteredMatches.filter((m) => !m.group);

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
    const isRunningOrDone = ['RUNNING', 'COMPLETED', 'CONFIRMED'].includes(m.status);
    const courtLabel = m.court ? formatCourtLabel(m.court) : (m.courtName ?? null);
    const canEditTeam = (teamKey: 'teamA' | 'teamB'): boolean => {
      if (!matchDetails || matchDetails.status === 'READY') return false;
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
              {(m.status === 'RUNNING' || m.status === 'COMPLETED') && (
                <Link
                  href={`/admin/${tournament?.id}/scoring/${m.id}`}
                  className="text-amber-400 hover:text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-xs flex items-center gap-1"
                >
                  <Zap className="w-3.5 h-3.5" />
                  {m.status === 'RUNNING' ? 'Ghi điểm' : 'Xác nhận KQ'}
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
                  {canLockLineups && matchDetails.status !== 'READY' && (
                    <button
                      onClick={() => confirmLockLineup(m)}
                      className="flex items-center gap-1 border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all"
                      disabled={actionLoading}
                    >
                      <Lock className="w-3 h-3" />
                      Khóa Đội Hình
                    </button>
                  )}
                </div>

                {matchDetails.status === 'READY' && (
                  <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-2.5 py-1.5 text-[10px] text-emerald-350 flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>Đội hình đã được BTC khóa. Trận đấu sẵn sàng thi đấu.</span>
                  </div>
                )}

                {/* Team lineups */}
                <div className="grid grid-cols-1 gap-4">
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
                                onChange={(e) => {
                                  setLineupsData((prev) => {
                                    const list = [...(prev.teamA[segment.id] ?? [])];
                                    list[idx] = e.target.value;
                                    return { ...prev, teamA: { ...prev.teamA, [segment.id]: list } };
                                  });
                                }}
                                disabled={!isTeamEditable || matchDetails.status === 'READY'}
                                className="w-full rounded-lg border border-slate-700/60 bg-slate-950/60 px-2 py-1.5 text-[11px] text-slate-200 outline-none focus:border-amber-500/50 disabled:opacity-60"
                              >
                                <option value="">-- Chọn VĐV --</option>
                                {matchDetails.teamA?.members?.map((member) => (
                                  <option key={member.playerProfile.id} value={member.playerProfile.id}>
                                    {member.playerProfile.fullName} ({getMemberGender(member) === 'MALE' ? '♂' : '♀'})
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

                    {submitLineupAccess.allowed && matchDetails.status !== 'READY' && (
                      <button
                        onClick={() => handleSubmitLineup('teamA')}
                        disabled={actionLoading}
                        className="w-full flex items-center justify-center gap-1 rounded-lg border border-sky-500/20 bg-sky-500/8 text-sky-400 hover:bg-sky-500/15 text-[11px] font-bold py-1.5 transition-all disabled:opacity-50"
                      >
                        {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Lưu Lineup Đội A
                      </button>
                    )}
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
                                onChange={(e) => {
                                  setLineupsData((prev) => {
                                    const list = [...(prev.teamB[segment.id] ?? [])];
                                    list[idx] = e.target.value;
                                    return { ...prev, teamB: { ...prev.teamB, [segment.id]: list } };
                                  });
                                }}
                                disabled={!isTeamEditable || matchDetails.status === 'READY'}
                                className="w-full rounded-lg border border-slate-700/60 bg-slate-950/60 px-2 py-1.5 text-[11px] text-slate-200 outline-none focus:border-amber-500/50 disabled:opacity-60"
                              >
                                <option value="">-- Chọn VĐV --</option>
                                {matchDetails.teamB?.members?.map((member) => (
                                  <option key={member.playerProfile.id} value={member.playerProfile.id}>
                                    {member.playerProfile.fullName} ({getMemberGender(member) === 'MALE' ? '♂' : '♀'})
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

                    {submitLineupAccess.allowed && matchDetails.status !== 'READY' && (
                      <button
                        onClick={() => handleSubmitLineup('teamB')}
                        disabled={actionLoading}
                        className="w-full flex items-center justify-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/8 text-rose-400 hover:bg-rose-500/15 text-[11px] font-bold py-1.5 transition-all disabled:opacity-50"
                      >
                        {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Lưu Lineup Đội B
                      </button>
                    )}
                  </div>
                </div>

                {/* Scoring link */}
                {(m.status === 'RUNNING' || m.status === 'COMPLETED') && (
                  <div className="pt-2 border-t border-slate-800">
                    <Link
                      href={`/admin/${tournament?.id}/scoring/${m.id}`}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 hover:bg-amber-500/25 text-xs font-bold py-2 transition-all"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      {m.status === 'RUNNING' ? 'Vào bảng ghi điểm' : 'Xem / Xác nhận kết quả'}
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
    { label: 'Hoàn thành', value: matches.filter((m) => ['COMPLETED', 'CONFIRMED'].includes(m.status)).length, icon: Check, color: 'text-emerald-400' },
    { label: 'Đang đấu', value: matches.filter((m) => m.status === 'RUNNING').length, icon: Play, color: 'text-yellow-400' },
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Phase filter */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-1">
          {(['all', 'group', 'playoff'] as const).map((phase) => (
            <button
              key={phase}
              onClick={() => setSelectedPhase(phase)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${selectedPhase === phase ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {phase === 'all' ? 'Tất cả' : phase === 'group' ? 'Vòng bảng' : 'Playoff'}
            </button>
          ))}
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
          onClick={() => fetchMatches()}
          className="rounded-xl border border-slate-800 bg-slate-900/50 p-1.5 text-slate-500 hover:text-amber-400 transition-all"
          title="Tải lại"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        <div className="ml-auto text-xs text-slate-500">
          {filteredMatches.length} / {matches.length} trận
        </div>
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
                Vòng bảng ({groupMatches.length} trận)
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
