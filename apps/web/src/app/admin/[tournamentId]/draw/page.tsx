'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';
import { PageLoading } from '@/components/loading-skeleton';
import { Dices, History, Shuffle, Users, CheckCircle2, AlertTriangle } from '@/components/icons';
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
  const currentUser = useMemo(() => getCurrentUser(), []);

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
      } else {
        setPreviewDraw(null);
      }
    } catch (error: unknown) {
      console.error(error);
      toast(getErrorMessage(error, 'Lỗi tải lịch sử bốc thăm.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, tournament]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDraws();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDraws]);

  const uxContext = useMemo(
    () => buildTournamentUxContext({ tournament, stats: playerStats }),
    [playerStats, tournament],
  );

  const drawAccess = useMemo(
    () => getActionAccess('drawTeams', currentUser.role, uxContext),
    [currentUser.role, uxContext],
  );

  const teamComposition = useMemo(() => getTeamComposition(tournament), [tournament]);
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
      name: `Đội ${code}`,
      index,
      players: teamPlayers,
      malesCount,
      femalesCount,
    };
  }), [manualAssignments, manualTeamCodes, players]);

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
      await apiFetch(`/tournaments/${tournament!.id}/team-draws/${previewDraw.id}/confirm`, {
        method: 'POST',
      });

      toast('Đã xác nhận bốc thăm thành công! 8 đội tuyển đã được lập chính thức.', 'success');
      setPreviewDraw(null);
      setConfirmModalOpen(false);
      await loadDraws();
      await reloadTournament();
    } catch (error: unknown) {
      toast(getErrorMessage(error, 'Lỗi xác nhận kết quả bốc thăm.'), 'error');
    } finally {
      setActionLoading(false);
    }
  }, [drawAccess.allowed, drawAccess.reason, loadDraws, previewDraw, reloadTournament, toast, tournament]);

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

      {officialTeams.length > 0 && (
        <div className="card p-6 space-y-4 shadow-xl">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Users className="w-5 h-5 text-amber-500" />
            Đội chính thức ({officialTeams.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {officialTeams.map((team) => {
              const males = team.members.filter((member) => normalizeGender(member.playerProfile?.gender) === 'MALE').length;
              const females = team.members.filter((member) => normalizeGender(member.playerProfile?.gender) === 'FEMALE').length;

              return (
                <div key={team.id} className="rounded-xl border border-slate-800 bg-slate-950/35 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-100">{team.name}</div>
                      <div className="text-[10px] font-semibold text-slate-500">
                        {males} Nam · {females} Nữ
                      </div>
                    </div>
                    <span className="rounded border border-slate-800 bg-slate-900 px-2 py-0.5 text-xs font-mono text-slate-400">
                      {team.code}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {team.members.map((member, index) => {
                      const player = member.playerProfile;
                      const gender = normalizeGender(player?.gender);

                      return (
                        <div key={member.id} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg bg-slate-900/50 px-2.5 py-1.5 text-xs">
                          <span className="truncate font-semibold text-slate-300">
                            #{index + 1} {player?.fullName ?? member.playerId}
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
                disabled={!drawAccess.allowed || actionLoading}
                className="w-full btn btn-secondary py-2.5 bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Xác nhận kết quả bốc thăm
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
      {activeTeamsOutput.length > 0 && (
        <div className="space-y-4 pt-4">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            Kết quả chia đội xem trước (8 Đội)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-scale-in">
            {activeTeamsOutput.map((team) => (
              <div key={team.code} className="card p-4 space-y-4 hover:border-amber-500/40 hover:bg-slate-800/20 transition-all shadow-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="font-bold text-sm text-amber-400">{team.name}</div>
                  <div className="text-xs font-mono bg-slate-900 px-2 py-0.5 rounded text-slate-400 border border-slate-800">{team.code}</div>
                </div>
                
                <div className="space-y-2">
                  {team.players.map((player, idx: number) => (
                    <div key={player.id} className="flex items-center justify-between text-xs py-0.5 hover:bg-slate-800/45 px-1 rounded transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">#{idx + 1}</span>
                        <span className="font-semibold text-slate-350">{player.fullName}</span>
                      </div>
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${normalizeGender(player.gender) === 'MALE' ? 'bg-sky-500/10 text-sky-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {normalizeGender(player.gender) === 'MALE' ? '♂' : '♀'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm font-bold text-slate-100">{team.name}</div>
                        <div className={`text-[10px] font-bold ${teamValid ? 'text-emerald-400' : 'text-amber-400'}`}>
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
