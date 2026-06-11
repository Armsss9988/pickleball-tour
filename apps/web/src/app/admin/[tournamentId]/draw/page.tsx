'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';
import { PageLoading } from '@/components/loading-skeleton';
import { Dices, History, Shuffle, Users, CheckCircle2, AlertTriangle, Edit3, Save, X } from '@/components/icons';
import { getCurrentUser } from '@/lib/current-user';
import { buildTournamentUxContext } from '@/lib/tournament-ux-context';
import { getActionAccess } from '@/lib/tournament-ux-policy';

interface PlayerStats {
  playersCount: number;
  malesCount: number;
  femalesCount: number;
}

const emptyPlayerStats: PlayerStats = {
  playersCount: 0,
  malesCount: 0,
  femalesCount: 0,
};

interface PlayerLike {
  id: string;
  fullName: string;
  gender: string;
  note?: string | null;
}

interface TeamLike {
  code: string;
  name: string;
  players: PlayerLike[];
}

interface OfficialTeamLike {
  id: string;
  code: string;
  name: string;
  captain?: PlayerLike | null;
  captainPlayerId?: string | null;
  members: {
    id: string;
    playerId: string;
    role?: string | null;
    playerProfile?: PlayerLike | null;
  }[];
}

interface DrawRecord {
  id: string;
  status: string;
  randomSeed: string;
  algorithmVersion: string;
  createdAt: string;
  outputSnapshot?: {
    teams?: TeamLike[];
  } | null;
}

interface PlayersResponse {
  items?: PlayerLike[];
}

type DrawMode = 'auto' | 'manual';

interface TeamCompositionLike {
  teamSize: number;
  maleCount: number;
  femaleCount: number;
}

function normalizeGender(gender: string | null | undefined) {
  return (gender ?? '').trim().toUpperCase();
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function getTeamComposition(tournament: any): TeamCompositionLike | null {
  const composition = tournament?.ruleset?.teamCompositionRule ?? tournament?.ruleset?.teamComposition;
  if (!composition) return null;

  const teamSize = Number(composition.teamSize);
  const maleCount = Number(composition.maleCount ?? 0);
  const femaleCount = Number(composition.femaleCount ?? 0);

  if (!Number.isFinite(teamSize) || teamSize <= 0) return null;

  return {
    teamSize,
    maleCount: Number.isFinite(maleCount) ? maleCount : 0,
    femaleCount: Number.isFinite(femaleCount) ? femaleCount : 0,
  };
}

function teamCodeFromIndex(index: number) {
  return String.fromCharCode(65 + index);
}

export default function DrawPage() {
  const { tournament, loading: tLoading, reload: reloadTournament } = useActiveTournament();
  const { toast } = useToast();
  const [draws, setDraws] = useState<DrawRecord[]>([]);
  const [previewDraw, setPreviewDraw] = useState<DrawRecord | null>(null);
  const [mode, setMode] = useState<DrawMode>('auto');
  const [players, setPlayers] = useState<PlayerLike[]>([]);
  const [officialTeams, setOfficialTeams] = useState<OfficialTeamLike[]>([]);
  const [manualAssignments, setManualAssignments] = useState<Record<string, string>>({});
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats>(emptyPlayerStats);
  const [seed, setSeed] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState<string>('');
  const [editingManualTeamCode, setEditingManualTeamCode] = useState<string | null>(null);
  const [editingManualTeamName, setEditingManualTeamName] = useState<string>('');
  const [manualTeamNames, setManualTeamNames] = useState<Record<string, string>>({});
  const currentUser = useMemo(() => getCurrentUser(), []);

  const [teamsState, setTeamsState] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [draggedTeamPlayer, setDraggedTeamPlayer] = useState<{ playerId: string; sourceTeamCode: string } | null>(null);

  const uxContext = useMemo(
    () => buildTournamentUxContext({ tournament, stats: playerStats }),
    [playerStats, tournament],
  );

  const drawAccess = useMemo(
    () => getActionAccess('drawTeams', currentUser.role, uxContext),
    [currentUser.role, uxContext],
  );

  const handleStartEditTeam = (teamId: string, currentName: string) => {
    setEditingTeamId(teamId);
    setEditingTeamName(currentName);
  };

  const handleCancelEditTeam = () => {
    setEditingTeamId(null);
    setEditingTeamName('');
  };

  const handleUpdateTeamName = async (teamId: string) => {
    const trimmedName = editingTeamName.trim();
    if (!trimmedName) {
      toast('Tên đội không được để trống.', 'error');
      return;
    }

    const isOfficial = officialTeams.some(t => t.id === teamId);
    if (!isOfficial) {
      setTeamsState(prev => prev.map(t => {
        if (t.id === teamId || t.code === teamId) {
          return { ...t, name: trimmedName };
        }
        return t;
      }));
      setHasChanges(true);
      setEditingTeamId(null);
      setEditingTeamName('');
      toast('Cập nhật tên đội tạm thời thành công! Vui lòng lưu thay đổi.', 'success');
      return;
    }

    try {
      setActionLoading(true);
      await apiFetch(`/teams/${teamId}`, {
        method: 'PATCH',
        body: {
          name: trimmedName,
        },
      });

      toast('Cập nhật tên đội thành công!', 'success');
      setEditingTeamId(null);
      setEditingTeamName('');
      await loadDraws();
      await reloadTournament();
    } catch (error: unknown) {
      toast(getErrorMessage(error, 'Lỗi cập nhật tên đội.'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartEditManualTeam = (code: string, currentName: string) => {
    setEditingManualTeamCode(code);
    setEditingManualTeamName(currentName);
  };

  const handleCancelEditManualTeam = () => {
    setEditingManualTeamCode(null);
    setEditingManualTeamName('');
  };

  const handleUpdateManualTeamName = (code: string) => {
    const trimmed = editingManualTeamName.trim();
    if (!trimmed) {
      toast('Tên đội không được để trống.', 'error');
      return;
    }
    setManualTeamNames(prev => ({
      ...prev,
      [code]: trimmed
    }));
    setEditingManualTeamCode(null);
    setEditingManualTeamName('');
  };

  const handleTeamDragStart = useCallback((event: React.DragEvent, playerId: string, sourceTeamCode: string) => {
    setDraggedTeamPlayer({ playerId, sourceTeamCode });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', JSON.stringify({ playerId, sourceTeamCode }));
  }, []);

  const handleTeamDragEnd = useCallback(() => {
    setDraggedTeamPlayer(null);
  }, []);

  const handleTeamDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleTeamDrop = useCallback((event: React.DragEvent, targetTeamCode: string) => {
    event.preventDefault();
    const dataStr = event.dataTransfer.getData('text/plain');
    let playerId = '';
    let sourceTeamCode = '';
    if (dataStr) {
      try {
        const data = JSON.parse(dataStr);
        playerId = data.playerId;
        sourceTeamCode = data.sourceTeamCode;
      } catch {
        // Fallback
      }
    }
    if (!playerId && draggedTeamPlayer) {
      playerId = draggedTeamPlayer.playerId;
      sourceTeamCode = draggedTeamPlayer.sourceTeamCode;
    }

    if (!playerId || !sourceTeamCode || sourceTeamCode === targetTeamCode) return;

    setTeamsState((prev) => {
      const sourceTeam = prev.find((t) => t.code === sourceTeamCode);
      const targetTeam = prev.find((t) => t.code === targetTeamCode);
      const player = sourceTeam?.players.find((p: any) => p.id === playerId);

      if (!sourceTeam || !targetTeam || !player) return prev;

      const nextTeams = prev.map((t) => {
        if (t.code === sourceTeamCode) {
          return {
            ...t,
            players: t.players.filter((p: any) => p.id !== playerId),
          };
        }
        if (t.code === targetTeamCode) {
          return {
            ...t,
            players: [...t.players, player],
          };
        }
        return t;
      });

      setHasChanges(true);
      return nextTeams;
    });

    setDraggedTeamPlayer(null);
  }, [draggedTeamPlayer]);

  const teamComposition = useMemo(() => getTeamComposition(tournament), [tournament]);

  const teamsValidation = useMemo(() => {
    if (!teamComposition || teamsState.length === 0) {
      return {
        valid: true,
        errors: [],
      };
    }

    const errors: string[] = [];
    teamsState.forEach((team) => {
      const malesCount = team.players.filter((player: any) => normalizeGender(player.gender) === 'MALE').length;
      const femalesCount = team.players.filter((player: any) => normalizeGender(player.gender) === 'FEMALE').length;

      if (team.players.length !== teamComposition.teamSize) {
        errors.push(`${team.name} cần có đúng ${teamComposition.teamSize} VĐV (đang có ${team.players.length}).`);
      }
      if (teamComposition.maleCount > 0 && malesCount !== teamComposition.maleCount) {
        errors.push(`${team.name} cần có đúng ${teamComposition.maleCount} Nam (đang có ${malesCount}).`);
      }
      if (teamComposition.femaleCount > 0 && femalesCount !== teamComposition.femaleCount) {
        errors.push(`${team.name} cần có đúng ${teamComposition.femaleCount} Nữ (đang có ${femalesCount}).`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }, [teamsState, teamComposition]);

  const loadDraws = useCallback(async () => {
    if (!tournament) return;
    try {
      setLoading(true);
      const [data, playersData, teamsData] = await Promise.all([
        apiFetch<DrawRecord[]>(`/tournaments/${tournament.id}/team-draws`),
        apiFetch<PlayersResponse>(`/tournaments/${tournament.id}/players`),
        apiFetch<OfficialTeamLike[]>(`/tournaments/${tournament.id}/teams`).catch(() => []),
      ]);

      setDraws(data);
      setOfficialTeams(Array.isArray(teamsData) ? teamsData : []);

      const players = Array.isArray(playersData?.items) ? playersData.items : [];
      setPlayers(players);
      const malesCount = players.filter((player) => normalizeGender(player.gender) === 'MALE').length;
      const femalesCount = players.filter((player) => normalizeGender(player.gender) === 'FEMALE').length;

      setPlayerStats({
        playersCount: players.length,
        malesCount,
        femalesCount,
      });
      
      const activePreview = data.find((draw) => draw.status === 'PREVIEW');
      if (activePreview) {
        setPreviewDraw(activePreview);
        setTeamsState(activePreview.outputSnapshot?.teams || []);
      } else {
        setPreviewDraw(null);
        if (Array.isArray(teamsData) && teamsData.length > 0) {
          const mappedOfficial = teamsData.map(t => ({
            id: t.id,
            code: t.code,
            name: t.name,
            players: t.members.map((m: any) => m.playerProfile).filter(Boolean) as PlayerLike[]
          }));
          setTeamsState(mappedOfficial);
        } else {
          setTeamsState([]);
        }
      }
      setHasChanges(false);
    } catch (error: unknown) {
      console.error(error);
      toast(getErrorMessage(error, 'Lỗi tải lịch sử bốc thăm.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, tournament]);

  const handleSubmitDragDropChanges = useCallback(async () => {
    if (!drawAccess.allowed) {
      toast(drawAccess.reason || 'Chưa thể lưu đội hình.', 'error');
      return;
    }

    if (!teamsValidation.valid) {
      toast(teamsValidation.errors[0] || 'Đội hình sau khi xếp chưa hợp lệ.', 'error');
      return;
    }

    try {
      setActionLoading(true);
      await apiFetch(`/tournaments/${tournament!.id}/teams/manual-assignment`, {
        method: 'POST',
        body: {
          teams: teamsState.map((team) => ({
            code: team.code,
            name: team.name,
            playerIds: team.players.map((player: any) => player.id),
          })),
        },
      });

      toast('Đã lưu cấu trúc đội hình thành công!', 'success');
      setHasChanges(false);
      await loadDraws();
      await reloadTournament();
    } catch (error: unknown) {
      toast(getErrorMessage(error, 'Lỗi lưu cấu trúc đội hình.'), 'error');
    } finally {
      setActionLoading(false);
    }
  }, [drawAccess.allowed, drawAccess.reason, loadDraws, teamsState, teamsValidation.errors, teamsValidation.valid, reloadTournament, toast, tournament]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDraws();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDraws]);

  const manualTeamCount = useMemo(() => {
    if (!teamComposition || players.length === 0) return 0;
    const count = players.length / teamComposition.teamSize;
    return Number.isInteger(count) ? count : 0;
  }, [players.length, teamComposition]);
  const manualTeamCodes = useMemo(
    () => Array.from({ length: manualTeamCount }, (_, index) => teamCodeFromIndex(index)),
    [manualTeamCount],
  );

  const manualTeams = useMemo(() => manualTeamCodes.map((code, index) => {
    const teamPlayers = players.filter((player) => manualAssignments[player.id] === code);
    const malesCount = teamPlayers.filter((player) => normalizeGender(player.gender) === 'MALE').length;
    const femalesCount = teamPlayers.filter((player) => normalizeGender(player.gender) === 'FEMALE').length;

    return {
      code,
      name: manualTeamNames[code] || `Đội ${code}`,
      index,
      players: teamPlayers,
      malesCount,
      femalesCount,
    };
  }), [manualAssignments, manualTeamCodes, players, manualTeamNames]);

  const unassignedPlayers = useMemo(
    () => players.filter((player) => !manualAssignments[player.id]),
    [manualAssignments, players],
  );

  const manualValidation = useMemo(() => {
    if (!teamComposition || manualTeamCount === 0) {
      return {
        valid: false,
        errors: ['Chưa có ruleset hợp lệ để tự xếp đội.'],
      };
    }

    const assignedCount = Object.values(manualAssignments).filter(Boolean).length;
    const errors: string[] = [];
    if (assignedCount !== players.length) {
      errors.push(`Cần xếp đủ ${players.length} VĐV; hiện đã xếp ${assignedCount}.`);
    }

    for (const team of manualTeams) {
      if (team.players.length !== teamComposition.teamSize) {
        errors.push(`${team.name} cần ${teamComposition.teamSize} VĐV, hiện có ${team.players.length}.`);
      }
      if (teamComposition.maleCount > 0 && team.malesCount !== teamComposition.maleCount) {
        errors.push(`${team.name} cần ${teamComposition.maleCount} Nam, hiện có ${team.malesCount}.`);
      }
      if (teamComposition.femaleCount > 0 && team.femalesCount !== teamComposition.femaleCount) {
        errors.push(`${team.name} cần ${teamComposition.femaleCount} Nữ, hiện có ${team.femalesCount}.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }, [manualAssignments, manualTeamCount, manualTeams, players.length, teamComposition]);

  const handleManualTeamChange = useCallback((playerId: string, code: string) => {
    setManualAssignments((current) => ({
      ...current,
      [playerId]: code,
    }));
  }, []);

  const handleRemoveManualAssignment = useCallback((playerId: string) => {
    setManualAssignments((current) => {
      const next = { ...current };
      delete next[playerId];
      return next;
    });
  }, []);

  const handleManualDragStart = useCallback((event: React.DragEvent, playerId: string) => {
    setDraggedPlayerId(playerId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', playerId);
  }, []);

  const handleManualDragEnd = useCallback(() => {
    setDraggedPlayerId(null);
  }, []);

  const handleManualDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleManualDrop = useCallback((event: React.DragEvent, code: string) => {
    event.preventDefault();
    const playerId = event.dataTransfer.getData('text/plain') || draggedPlayerId;
    if (!playerId) return;

    handleManualTeamChange(playerId, code);
    setDraggedPlayerId(null);
  }, [draggedPlayerId, handleManualTeamChange]);

  const handleClearManualAssignments = useCallback(() => {
    setManualAssignments({});
    setManualTeamNames({});
  }, []);

  const handleSubmitManualAssignment = useCallback(async () => {
    if (!drawAccess.allowed) {
      toast(drawAccess.reason || 'Chưa thể xếp đội.', 'error');
      return;
    }

    if (!manualValidation.valid) {
      toast(manualValidation.errors[0] || 'Đội hình tự xếp chưa hợp lệ.', 'error');
      return;
    }

    try {
      setActionLoading(true);
      await apiFetch(`/tournaments/${tournament!.id}/teams/manual-assignment`, {
        method: 'POST',
        body: {
          teams: manualTeams.map((team) => ({
            code: team.code,
            name: team.name,
            playerIds: team.players.map((player) => player.id),
          })),
        },
      });

      toast('Đã lưu đội hình tự xếp thành công!', 'success');
      setManualAssignments({});
      await loadDraws();
      await reloadTournament();
    } catch (error: unknown) {
      toast(getErrorMessage(error, 'Lỗi lưu đội hình tự xếp.'), 'error');
    } finally {
      setActionLoading(false);
    }
  }, [drawAccess.allowed, drawAccess.reason, loadDraws, manualTeams, manualValidation.errors, manualValidation.valid, reloadTournament, toast, tournament]);

  const handleCreatePreview = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawAccess.allowed) {
      toast(drawAccess.reason || 'Chưa thể bốc thăm đội.', 'error');
      return;
    }

    setLoading(true);

    try {
      const draw = await apiFetch<DrawRecord>(`/tournaments/${tournament!.id}/team-draws/preview`, {
        method: 'POST',
        body: { seed: seed.trim() || undefined },
      });

      setPreviewDraw(draw);
      toast('Đã lập bản bốc thăm thử nghiệm! Vui lòng kiểm tra đội hình bên dưới.', 'success');
      await loadDraws();
    } catch (error: unknown) {
      toast(getErrorMessage(error, 'Lỗi bốc thăm thử nghiệm.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [drawAccess.allowed, drawAccess.reason, loadDraws, seed, toast, tournament]);

  const handleConfirmDraw = useCallback(async () => {
    if (!previewDraw) return;
    if (!drawAccess.allowed) {
      toast(drawAccess.reason || 'Chưa thể xác nhận kết quả bốc thăm.', 'error');
      return;
    }

    try {
      setActionLoading(true);
      if (hasChanges) {
        // Nếu có thay đổi kéo thả, ta lưu bản chỉnh sửa này làm đội chính thức
        await apiFetch(`/tournaments/${tournament!.id}/teams/manual-assignment`, {
          method: 'POST',
          body: {
            teams: teamsState.map((team) => ({
              code: team.code,
              name: team.name,
              playerIds: team.players.map((player: any) => player.id),
            })),
          },
        });
        toast('Đã lưu cấu trúc đội bốc thăm đã điều chỉnh thành công!', 'success');
      } else {
        // Nếu không thay đổi, xác nhận bản bốc thăm gốc
        await apiFetch(`/tournaments/${tournament!.id}/team-draws/${previewDraw.id}/confirm`, {
          method: 'POST',
        });
        toast('Đã xác nhận bốc thăm thành công! 8 đội tuyển đã được lập chính thức.', 'success');
      }
      setPreviewDraw(null);
      setConfirmModalOpen(false);
      await loadDraws();
      await reloadTournament();
    } catch (error: unknown) {
      toast(getErrorMessage(error, 'Lỗi xác nhận kết quả bốc thăm.'), 'error');
    } finally {
      setActionLoading(false);
    }
  }, [drawAccess.allowed, drawAccess.reason, loadDraws, previewDraw, reloadTournament, toast, tournament, hasChanges, teamsState]);

  if (tLoading || (loading && draws.length === 0)) {
    return <PageLoading />;
  }

  const activeTeamsOutput = previewDraw?.outputSnapshot?.teams || [];

  return (
    <div className="premium-container space-y-6 animate-scale-in">
      <PageHeader
        title="Đội Tuyển"
        description="Bốc thăm, tự xếp và kiểm tra danh sách đội chính thức trong cùng một màn."
        icon={Dices}
      />

      {officialTeams.length > 0 && teamsState.length > 0 && (
        <div className="card p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-2 flex-wrap">
            <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              Đội chính thức ({officialTeams.length})
            </h3>
            <div className="text-[10px] text-slate-400 italic">
              * Kéo thả thành viên giữa các đội để điều chỉnh đội hình chính thức.
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {teamsState.map((team) => {
              const males = team.players.filter((player: any) => normalizeGender(player.gender) === 'MALE').length;
              const females = team.players.filter((player: any) => normalizeGender(player.gender) === 'FEMALE').length;
              const isEditing = editingTeamId === team.id;
              const composition = teamComposition;
              const teamValid = composition !== null
                && team.players.length === composition.teamSize
                && (composition.maleCount === 0 || males === composition.maleCount)
                && (composition.femaleCount === 0 || females === composition.femaleCount);

              return (
                <div
                  key={team.code}
                  onDragOver={handleTeamDragOver}
                  onDrop={(event) => handleTeamDrop(event, team.code)}
                  className={`rounded-xl border p-4 space-y-3 transition-all ${
                    teamValid
                      ? 'border-slate-800 bg-slate-950/35'
                      : 'border-red-500/25 bg-red-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 gap-2">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <input
                          type="text"
                          value={editingTeamName}
                          onChange={(e) => setEditingTeamName(e.target.value)}
                          className="premium-input text-xs py-1 px-2 flex-1 min-w-0 bg-slate-900 border-slate-700 text-slate-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              void handleUpdateTeamName(team.id);
                            } else if (e.key === 'Escape') {
                              handleCancelEditTeam();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateTeamName(team.id)}
                          disabled={actionLoading}
                          className="p-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25 transition-all"
                          title="Lưu"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditTeam}
                          disabled={actionLoading}
                          className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-450 hover:bg-slate-700 transition-all"
                          title="Hủy"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1 group/team">
                        <div className="flex items-center gap-1.5">
                          <div className="truncate text-sm font-bold text-slate-100">{team.name}</div>
                          {team.id && (
                            <button
                              type="button"
                              onClick={() => handleStartEditTeam(team.id, team.name)}
                              className="opacity-0 group-hover/team:opacity-100 transition-opacity p-0.5 rounded text-slate-500 hover:text-amber-500 hover:bg-slate-900"
                              title="Đổi tên đội"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500">
                          {males} Nam · {females} Nữ
                        </div>
                      </div>
                    )}
                    <span className="rounded border border-slate-800 bg-slate-900 px-2 py-0.5 text-xs font-mono text-slate-400 flex-shrink-0">
                      {team.code}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {team.players.map((player: any, index: number) => {
                      const gender = normalizeGender(player.gender);

                      return (
                        <div
                          key={player.id}
                          draggable={drawAccess.allowed && !actionLoading}
                          onDragStart={(event) => handleTeamDragStart(event, player.id, team.code)}
                          onDragEnd={handleTeamDragEnd}
                          className={`cursor-grab active:cursor-grabbing grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg bg-slate-900/50 px-2.5 py-1.5 text-xs hover:bg-slate-900 transition-colors ${
                            draggedTeamPlayer?.playerId === player.id ? 'opacity-50 ring-1 ring-amber-500/40' : ''
                          }`}
                        >
                          <span className="truncate font-semibold text-slate-350">
                            #{index + 1} {player.fullName}
                          </span>
                          <span className={`text-[10px] font-bold ${gender === 'MALE' ? 'text-sky-400' : 'text-rose-400'}`}>
                            {gender === 'MALE' ? 'Nam' : 'Nữ'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {hasChanges && (
            <div className="flex items-center gap-3 pt-4 border-t border-slate-800 flex-wrap">
              <div className="text-xs text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Bạn đã thay đổi đội hình tuyển. Vui lòng lưu thay đổi.</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadDraws()}
                  disabled={actionLoading}
                  className="btn btn-secondary py-1.5 px-3 text-xs"
                >
                  Hủy thay đổi
                </button>
                <button
                  type="button"
                  onClick={handleSubmitDragDropChanges}
                  disabled={actionLoading || !teamsValidation.valid}
                  className="btn btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Lưu thay đổi
                </button>
              </div>
            </div>
          )}

          {!teamsValidation.valid && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
              <div className="font-bold text-red-300">Đội hình sau điều chỉnh chưa hợp lệ theo ruleset:</div>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-red-200/90 font-medium">
                {teamsValidation.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="inline-flex rounded-xl border border-slate-800 bg-slate-950/60 p-1">
        <button
          type="button"
          onClick={() => setMode('auto')}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            mode === 'auto'
              ? 'bg-amber-500 text-slate-950'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Bốc thăm tự động
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            mode === 'manual'
              ? 'bg-amber-500 text-slate-950'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Tự xếp đội
        </button>
      </div>

      {!drawAccess.allowed && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
          <div>{drawAccess.reason}</div>
          {drawAccess.required && (
            <div className="mt-2 text-xs text-amber-200/80">{drawAccess.required}</div>
          )}
        </div>
      )}

      {mode === 'auto' ? (
      <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Draw Trigger form */}
        <div className="card p-6 space-y-5 shadow-xl">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Shuffle className="w-5 h-5 text-amber-500" />
            Tham số bốc thăm
          </h3>
          
          <form onSubmit={handleCreatePreview} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Mã hạt seeds (Random Seed - Tùy chọn)</label>
              <input
                type="text"
                placeholder="Ví dụ: GOLAB-CUP-2026"
                value={seed}
                onChange={e => setSeed(e.target.value)}
                className="w-full premium-input"
              />
              <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                Để trống để hệ thống tự phát sinh mã ngẫu nhiên. Mã giống nhau sẽ cho ra kết quả bốc thăm giống nhau.
              </p>
            </div>
            
            <button
              type="submit"
              className="w-full btn btn-primary py-2.5 flex items-center justify-center gap-2"
              disabled={loading || !drawAccess.allowed}
            >
              <Shuffle className="w-4 h-4" />
              Tạo bản bốc thăm thử nghiệm
            </button>
          </form>

          {previewDraw && (
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Bạn đang xem bản bốc thăm thử nghiệm (Seed: <strong className="text-slate-200">{previewDraw.randomSeed}</strong>). Bạn cần xác nhận để lưu chính thức kết quả này.
                </span>
              </div>
              <button
                onClick={() => setConfirmModalOpen(true)}
                disabled={!drawAccess.allowed || actionLoading || (hasChanges && !teamsValidation.valid)}
                className="w-full btn btn-secondary py-2.5 bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {hasChanges ? 'Xác nhận bốc thăm đã chỉnh sửa' : 'Xác nhận kết quả bốc thăm'}
              </button>
            </div>
          )}
        </div>

        {/* History of Draws */}
        <div className="lg:col-span-2 card p-6 space-y-4 shadow-xl">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
            <History className="w-5 h-5 text-amber-500" />
            Lịch sử các phiên bốc thăm
          </h3>
          
          {draws.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {draws.map((draw) => (
                <div key={draw.id} className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl flex items-center justify-between hover:bg-slate-900/60 transition-colors">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <span className="text-slate-200">Phiên bốc thăm</span>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${draw.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : draw.status === 'PREVIEW' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-700 text-slate-400'}`}>
                        {draw.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Seed: <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">{draw.randomSeed}</span> · Thuật toán: v{draw.algorithmVersion}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Thời gian: {new Date(draw.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-center py-10 italic">Chưa thực hiện phiên bốc thăm nào.</p>
          )}
        </div>
      </div>

      {/* Stout Preview Grid */}
      {previewDraw && teamsState.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
            <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              Kết quả chia đội xem trước ({teamsState.length} Đội)
            </h3>
            <div className="text-[10px] text-slate-400 italic">
              * Bạn có thể kéo thả thành viên giữa các đội preview dưới đây để tinh chỉnh trước khi xác nhận.
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-scale-in">
            {teamsState.map((team) => {
              const males = team.players.filter((player: any) => normalizeGender(player.gender) === 'MALE').length;
              const females = team.players.filter((player: any) => normalizeGender(player.gender) === 'FEMALE').length;
              const composition = teamComposition;
              const teamValid = composition !== null
                && team.players.length === composition.teamSize
                && (composition.maleCount === 0 || males === composition.maleCount)
                && (composition.femaleCount === 0 || females === composition.femaleCount);
              const isEditing = editingTeamId === team.id || editingTeamId === team.code;

              return (
                <div
                  key={team.code}
                  onDragOver={handleTeamDragOver}
                  onDrop={(event) => handleTeamDrop(event, team.code)}
                  className={`card p-4 space-y-4 hover:border-amber-500/40 transition-all shadow-md ${
                    teamValid
                      ? 'border-slate-850 bg-slate-900/10'
                      : 'border-red-500/25 bg-red-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 gap-2">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <input
                          type="text"
                          value={editingTeamName}
                          onChange={(e) => setEditingTeamName(e.target.value)}
                          className="premium-input text-xs py-1 px-2 flex-1 min-w-0 bg-slate-900 border-slate-700 text-slate-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              void handleUpdateTeamName(team.id || team.code);
                            } else if (e.key === 'Escape') {
                              handleCancelEditTeam();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateTeamName(team.id || team.code)}
                          disabled={actionLoading}
                          className="p-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25 transition-all cursor-pointer"
                          title="Lưu"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditTeam}
                          disabled={actionLoading}
                          className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 transition-all cursor-pointer"
                          title="Hủy"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1 group/team">
                        <div className="flex items-center gap-1.5">
                          <div className="truncate text-sm font-bold text-amber-400">{team.name}</div>
                          <button
                            type="button"
                            onClick={() => handleStartEditTeam(team.id || team.code, team.name)}
                            className="opacity-0 group-hover/team:opacity-100 transition-opacity p-0.5 rounded text-slate-500 hover:text-amber-500 hover:bg-slate-900 cursor-pointer"
                            title="Đổi tên đội"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                    <span className="rounded border border-slate-800 bg-slate-900 px-2 py-0.5 text-xs font-mono text-slate-400 flex-shrink-0">
                      {team.code}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {team.players.map((player: any, idx: number) => {
                      const gender = normalizeGender(player.gender);
                      return (
                        <div
                          key={player.id}
                          draggable={drawAccess.allowed && !actionLoading}
                          onDragStart={(event) => handleTeamDragStart(event, player.id, team.code)}
                          onDragEnd={handleTeamDragEnd}
                          className={`cursor-grab active:cursor-grabbing flex items-center justify-between text-xs py-0.5 hover:bg-slate-800/45 px-1 rounded transition-colors ${
                            draggedTeamPlayer?.playerId === player.id ? 'opacity-50 ring-1 ring-amber-500/40' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500">#{idx + 1}</span>
                            <span className="font-semibold text-slate-350">{player.fullName}</span>
                          </div>
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${gender === 'MALE' ? 'bg-sky-500/10 text-sky-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {gender === 'MALE' ? '♂' : '♀'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {!teamsValidation.valid && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
              <div className="font-bold text-red-300">Đội hình preview sau điều chỉnh chưa hợp lệ theo ruleset:</div>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-red-200/90 font-medium">
                {teamsValidation.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {hasChanges && (
            <div className="flex items-center gap-3 pt-4 border-t border-slate-800 flex-wrap">
              <div className="text-xs text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Bạn đã điều chỉnh kết quả bốc thăm xem trước. Vui lòng xác nhận kết quả bốc thăm để lưu chính thức.</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadDraws()}
                  disabled={actionLoading}
                  className="btn btn-secondary py-1.5 px-3 text-xs"
                >
                  Hủy thay đổi
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmModalOpen(true)}
                  disabled={actionLoading || !teamsValidation.valid}
                  className="btn btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Xác nhận bốc thăm đã chỉnh sửa
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.4fr] gap-6">
          <div className="card p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                VĐV chưa xếp ({unassignedPlayers.length})
              </h3>
              <button
                type="button"
                onClick={handleClearManualAssignments}
                className="btn btn-secondary px-3 py-1.5 text-xs"
                disabled={actionLoading}
              >
                Xóa chọn
              </button>
            </div>

            <div className="max-h-[680px] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-2">
                {unassignedPlayers.length > 0 ? unassignedPlayers.map((player) => (
                  <div
                    key={player.id}
                    draggable={drawAccess.allowed && !actionLoading}
                    onDragStart={(event) => handleManualDragStart(event, player.id)}
                    onDragEnd={handleManualDragEnd}
                    className={`cursor-grab rounded-xl border border-slate-850 bg-slate-950/35 px-3 py-2 active:cursor-grabbing hover:border-amber-500/30 hover:bg-slate-900/40 transition-all ${
                      draggedPlayerId === player.id ? 'opacity-50 ring-1 ring-amber-500/40' : ''
                    }`}
                    title="Kéo VĐV này sang một đội ở bên phải"
                  >
                    <div className="truncate text-sm font-semibold text-slate-200">{player.fullName}</div>
                    <div className={`text-[10px] font-bold ${normalizeGender(player.gender) === 'MALE' ? 'text-sky-400' : 'text-rose-400'}`}>
                      {normalizeGender(player.gender) === 'MALE' ? 'Nam' : 'Nữ'}
                      {player.note ? <span className="ml-2 text-slate-500 font-medium">{player.note}</span> : null}
                    </div>
                  </div>
                )) : (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-6 text-center text-xs font-semibold text-emerald-300">
                    Tất cả VĐV đã được xếp vào đội.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card p-6 space-y-4 shadow-xl">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
                <CheckCircle2 className="w-5 h-5 text-amber-500" />
                Kiểm tra đội hình
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {manualTeams.map((team) => {
                  const composition = teamComposition;
                  const teamValid = composition !== null
                    && team.players.length === composition.teamSize
                    && (composition.maleCount === 0 || team.malesCount === composition.maleCount)
                    && (composition.femaleCount === 0 || team.femalesCount === composition.femaleCount);
                  const isEditing = editingManualTeamCode === team.code;

                  return (
                    <div
                      key={team.code}
                      onDragOver={handleManualDragOver}
                      onDrop={(event) => handleManualDrop(event, team.code)}
                      className={`min-h-[190px] rounded-xl border p-3 transition-all ${
                        teamValid
                          ? 'border-emerald-500/25 bg-emerald-500/5'
                          : draggedPlayerId
                          ? 'border-amber-500/35 bg-amber-500/5'
                          : 'border-slate-800 bg-slate-950/35'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            <input
                              type="text"
                              value={editingManualTeamName}
                              onChange={(e) => setEditingManualTeamName(e.target.value)}
                              className="premium-input text-xs py-0.5 px-1.5 flex-1 min-w-0 bg-slate-900 border-slate-700 text-slate-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateManualTeamName(team.code);
                                } else if (e.key === 'Escape') {
                                  handleCancelEditManualTeam();
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateManualTeamName(team.code)}
                              disabled={actionLoading}
                              className="p-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25 transition-all cursor-pointer"
                              title="Lưu"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditManualTeam}
                              disabled={actionLoading}
                              className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-450 hover:bg-slate-700 transition-all cursor-pointer"
                              title="Hủy"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 min-w-0 flex-1 group/mteam">
                            <div className="text-sm font-bold text-slate-100 truncate">{team.name}</div>
                            <button
                              type="button"
                              onClick={() => handleStartEditManualTeam(team.code, team.name)}
                              className="opacity-0 group-hover/mteam:opacity-100 transition-opacity p-0.5 rounded text-slate-500 hover:text-amber-500 hover:bg-slate-900 cursor-pointer"
                              title="Đổi tên đội"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <div className={`text-[10px] font-bold shrink-0 ${teamValid ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {team.players.length}/{teamComposition?.teamSize ?? 0}
                        </div>
                      </div>
                      <div className="mb-2 text-[11px] text-slate-400">
                        {team.malesCount}/{teamComposition?.maleCount ?? 0} Nam · {team.femalesCount}/{teamComposition?.femaleCount ?? 0} Nữ
                      </div>
                      <div className="space-y-1">
                        {team.players.length > 0 ? team.players.map((player) => (
                          <div
                            key={player.id}
                            draggable={drawAccess.allowed && !actionLoading}
                            onDragStart={(event) => handleManualDragStart(event, player.id)}
                            onDragEnd={handleManualDragEnd}
                            className={`grid grid-cols-[1fr_auto] items-center gap-2 rounded bg-slate-900/60 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-900 transition-colors ${
                              draggedPlayerId === player.id ? 'opacity-50 ring-1 ring-amber-500/40' : ''
                            }`}
                            title="Kéo sang đội khác hoặc bấm Gỡ để trả về danh sách chưa xếp"
                          >
                            <span className="truncate">{player.fullName}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveManualAssignment(player.id)}
                              className="rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-500 hover:bg-slate-800 hover:text-amber-400"
                              disabled={actionLoading}
                            >
                              Gỡ
                            </button>
                          </div>
                        )) : (
                          <div className="rounded-lg border border-dashed border-slate-800 px-3 py-6 text-center text-[11px] italic text-slate-600">
                            Thả VĐV vào đây
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!manualValidation.valid && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
                  <div className="font-bold text-amber-300">Chưa thể lưu đội hình</div>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    {manualValidation.errors.slice(0, 4).map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmitManualAssignment}
                disabled={!drawAccess.allowed || !manualValidation.valid || actionLoading}
                className="w-full btn btn-primary py-2.5 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {actionLoading ? 'Đang lưu...' : 'Lưu đội hình tự xếp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Team Draw Modal */}
      <ConfirmModal
        open={confirmModalOpen}
        title="Xác nhận kết quả bốc thăm?"
        description="Thao tác này sẽ ghi đè mọi đội hình hiện tại và chuyển giải đấu sang trạng thái mới! Bạn có chắc chắn muốn tiến hành?"
        confirmLabel="Bốc thăm"
        cancelLabel="Hủy"
        variant="warning"
        loading={actionLoading}
        onConfirm={handleConfirmDraw}
        onCancel={() => setConfirmModalOpen(false)}
      />
    </div>
  );
}
