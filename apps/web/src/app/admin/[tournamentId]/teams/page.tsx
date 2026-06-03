'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/components/toast';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading-skeleton';
import { Shield, Award, Users, Edit3, X, Save, AlertCircle, ArrowLeftRight } from '@/components/icons';

export default function TeamsPage() {
  const { tournament, loading: tLoading } = useActiveTournament();
  const { toast } = useToast();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [teamName, setTeamName] = useState('');
  const [captainId, setCaptainId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [unassignedPlayers, setUnassignedPlayers] = useState<any[]>([]);
  const [playerToSwap, setPlayerToSwap] = useState<any | null>(null);

  const loadData = async () => {
    if (!tournament) return;
    try {
      setLoading(true);
      const [teamsData, playersData] = await Promise.all([
        apiFetch(`/tournaments/${tournament.id}/teams`),
        apiFetch(`/tournaments/${tournament.id}/players`),
      ]);
      setTeams(teamsData);
      
      const players = Array.isArray(playersData?.items) ? playersData.items : [];
      setAllPlayers(players);

      const assignedPlayerIds = new Set(
        teamsData.flatMap((t: any) => t.members.map((m: any) => m.playerId))
      );
      const freeAgents = players.filter((p: any) => !assignedPlayerIds.has(p.id));
      setUnassignedPlayers(freeAgents);
    } catch (e: any) {
      console.error(e);
      toast(e.message || 'Lỗi tải danh sách đội và vận động viên.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tournament]);

  const handleSelectTeam = (team: any) => {
    setSelectedTeam(team);
    setTeamName(team.name);
    setCaptainId(team.captainPlayerId || '');
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;

    setActionLoading(true);
    try {
      await apiFetch(`/teams/${selectedTeam.id}`, {
        method: 'PATCH',
        body: {
          name: teamName.trim() || undefined,
          captainPlayerId: captainId || undefined,
        },
      });

      toast('Cập nhật thông tin đội thành công!', 'success');
      setSelectedTeam(null);
      loadData();
    } catch (err: any) {
      toast(err.message || 'Lỗi cập nhật đội.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSwapPlayers = async (playerBId: string, playerBName: string, teamBName: string) => {
    if (!playerToSwap) return;
    
    const confirmSwap = window.confirm(
      `Hoán đổi VĐV "${playerToSwap.playerName}" (${playerToSwap.teamName}) với "${playerBName}" (${teamBName})?`
    );

    if (!confirmSwap) {
      setPlayerToSwap(null);
      return;
    }

    setActionLoading(true);
    try {
      await apiFetch(`/tournaments/${tournament!.id}/teams/swap-players`, {
        method: 'POST',
        body: {
          playerAId: playerToSwap.playerId,
          playerBId,
        },
      });

      toast('Hoán đổi vận động viên thành công!', 'success');
      setPlayerToSwap(null);
      loadData();
    } catch (err: any) {
      toast(err.message || 'Lỗi hoán đổi VĐV.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReplaceMember = async (oldPlayerId: string, newPlayerId: string) => {
    if (!selectedTeam) return;

    setActionLoading(true);
    try {
      await apiFetch(`/tournaments/${tournament!.id}/teams/${selectedTeam.id}/replace-member`, {
        method: 'POST',
        body: {
          oldPlayerId,
          newPlayerId,
        },
      });

      toast('Thay thế vận động viên bằng VĐV tự do thành công!', 'success');
      setSelectedTeam(null);
      loadData();
    } catch (err: any) {
      toast(err.message || 'Lỗi thay thế VĐV.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMemberClick = (e: React.MouseEvent, m: any, t: any) => {
    e.stopPropagation();
    if (playerToSwap) {
      if (playerToSwap.teamId !== t.id) {
        handleSwapPlayers(m.playerProfile.id, m.playerProfile.fullName, t.name);
      } else {
        toast('Không thể hoán đổi VĐV trong cùng một đội.', 'warning');
      }
    } else {
      handleSelectTeam(t);
    }
  };

  const handleSwapClick = (e: React.MouseEvent, m: any, t: any) => {
    e.stopPropagation();
    setPlayerToSwap({
      playerId: m.playerProfile.id,
      playerName: m.playerProfile.fullName,
      teamId: t.id,
      teamName: t.name,
      gender: m.gender,
    });
  };

  if (tLoading || (loading && teams.length === 0)) {
    return <PageLoading />;
  }

  return (
    <div className="premium-container space-y-6 animate-scale-in">
      <PageHeader
        title="Danh Sách Đội Tuyển"
        description="Hiển thị 8 đội tuyển chính thức của giải đấu, chỉ định đội trưởng và đổi tên đội."
        icon={Shield}
      />

      {playerToSwap && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse shadow-md">
          <div className="text-sm text-slate-200">
            <span className="text-amber-400 font-bold">Chế độ Hoán đổi đang bật:</span> Đang chọn VĐV <strong className="text-slate-100 font-bold">"{playerToSwap.playerName}"</strong> ({playerToSwap.teamName}). Hãy click vào một VĐV khác đội để hoán đổi.
          </div>
          <button
            onClick={() => setPlayerToSwap(null)}
            className="btn btn-secondary py-1 px-3 text-xs border-amber-500/20 text-amber-400 hover:bg-amber-500/20 flex-shrink-0"
          >
            Hủy
          </button>
        </div>
      )}

      {unassignedPlayers.length > 0 && (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-500" />
            Vận động viên tự do ({unassignedPlayers.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {unassignedPlayers.map((p) => (
              <span
                key={p.id}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-950 border border-slate-800 ${
                  p.gender?.toUpperCase() === 'MALE' ? 'text-sky-400' : 'text-rose-400'
                }`}
              >
                <span>{p.gender?.toUpperCase() === 'MALE' ? '♂' : '♀'}</span>
                <strong>{p.fullName}</strong>
                {p.note && <span className="text-[10px] text-slate-500">({p.note})</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
        {/* Teams List (2 cols) */}
        <div className="space-y-4">
          {teams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map(t => {
                const captainName = t.captain?.fullName || 'Chưa chỉ định';
                const males = t.members.filter((m: any) => m.gender?.toUpperCase() === 'MALE').length;
                const females = t.members.filter((m: any) => m.gender?.toUpperCase() === 'FEMALE').length;

                return (
                  <div
                    key={t.id}
                    onClick={() => !playerToSwap && handleSelectTeam(t)}
                    className={`card p-5 space-y-3 cursor-pointer hover:border-amber-500 hover:bg-slate-800/10 transition-all shadow-md flex flex-col justify-between ${
                      selectedTeam?.id === t.id ? 'border-amber-500 bg-amber-500/5' : ''
                    } ${playerToSwap ? 'hover:border-slate-800 hover:bg-slate-900/40' : ''}`}
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="font-bold text-base text-slate-100">{t.name}</div>
                        <span className="text-xs bg-slate-900 border border-slate-850 px-2.5 py-0.5 rounded text-slate-400 font-mono">
                          {t.code}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 space-y-1.5 py-3">
                        <div className="flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span>Đội trưởng: <strong className="text-slate-200">{captainName}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>Lực lượng: {t.members.length} VĐV ({males} Nam + {females} Nữ)</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 border-t border-slate-800 pt-3">
                      {t.members.map((m: any) => {
                        const isSelected = playerToSwap?.playerId === m.playerProfile.id;
                        const isSameTeam = playerToSwap?.teamId === t.id;
                        const isOtherTeam = playerToSwap && !isSameTeam;

                        return (
                          <div
                            key={m.id}
                            onClick={(e) => handleMemberClick(e, m, t)}
                            className={`flex justify-between items-center text-[11px] px-2 py-1 rounded transition-all ${
                              isSelected
                                ? 'bg-amber-500/20 border border-amber-500/50 text-slate-100 font-bold shadow-[0_0_8px_rgba(245,158,11,0.25)] animate-pulse'
                                : isOtherTeam
                                ? 'hover:bg-amber-500/10 cursor-pointer text-slate-200 border border-transparent hover:border-amber-500/30'
                                : isSameTeam && playerToSwap
                                ? 'opacity-40 cursor-not-allowed text-slate-500'
                                : 'hover:bg-slate-900/30 text-slate-400'
                            }`}
                          >
                            <span className="flex items-center gap-1.5 truncate mr-2">
                              {m.playerProfile.fullName}
                            </span>
                            
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                                m.role === 'CAPTAIN'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : m.gender?.toUpperCase() === 'MALE'
                                  ? 'bg-sky-500/10 text-sky-400'
                                  : 'bg-rose-500/10 text-rose-400'
                              }`}>
                                {m.role === 'CAPTAIN' ? 'Đội Trưởng' : m.gender?.toUpperCase() === 'MALE' ? 'Nam' : 'Nữ'}
                              </span>
                              
                              {!playerToSwap && (
                                <button
                                  type="button"
                                  onClick={(e) => handleSwapClick(e, m, t)}
                                  className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-amber-400 transition-colors"
                                  title="Hoán đổi với VĐV ở đội khác"
                                  disabled={actionLoading}
                                >
                                  <ArrowLeftRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Shield}
              title="Chưa có đội tuyển"
              description="Hãy bốc thăm chia đội tại màn hình Bốc Thăm trước để lập 8 đội tuyển tự động."
            />
          )}
        </div>

        {/* Update Side panel (1 col) */}
        <div>
          {selectedTeam ? (
            <div className="card p-6 space-y-5 sticky top-6 shadow-xl border-amber-500/30 animate-scale-in">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
                <Edit3 className="w-5 h-5 text-amber-500" />
                Chỉnh sửa đội tuyển
              </h3>
              
              <form onSubmit={handleUpdateTeam} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tên đội tuyển</label>
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                    className="w-full premium-input font-semibold"
                    disabled={actionLoading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Đội trưởng (Captain)</label>
                  <select
                    value={captainId}
                    onChange={e => setCaptainId(e.target.value)}
                    className="w-full premium-input"
                    disabled={actionLoading}
                  >
                    <option value="">-- Chưa chỉ định --</option>
                    {selectedTeam.members.map((m: any) => (
                      <option key={m.playerProfile.id} value={m.playerProfile.id}>
                        {m.playerProfile.fullName} ({m.gender?.toUpperCase() === 'MALE' ? 'Nam' : 'Nữ'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Free Agent Replacement Section */}
                <div className="space-y-2.5 pt-4 border-t border-slate-800">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Thay thế thành viên (VĐV tự do)
                  </label>
                  {selectedTeam.members.map((m: any) => {
                    const sameGenderFreeAgents = unassignedPlayers.filter(
                      (p) => p.gender?.toUpperCase() === m.gender?.toUpperCase()
                    );
                    return (
                      <div key={m.id} className="space-y-1.5 p-2.5 bg-slate-950/40 border border-slate-850 rounded-xl">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-200 truncate max-w-[130px]">{m.playerProfile.fullName}</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                            m.gender?.toUpperCase() === 'MALE'
                              ? 'bg-sky-500/10 text-sky-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {m.gender?.toUpperCase() === 'MALE' ? 'Nam' : 'Nữ'}
                          </span>
                        </div>
                        {sameGenderFreeAgents.length > 0 ? (
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleReplaceMember(m.playerProfile.id, e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="w-full text-[10px] bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-300 focus:outline-none focus:border-amber-500/40"
                            disabled={actionLoading}
                          >
                            <option value="">-- Thay thế bằng VĐV tự do --</option>
                            {sameGenderFreeAgents.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.fullName} {p.note ? `(${p.note})` : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[10px] text-slate-500 block italic">
                            Không có VĐV tự do cùng giới tính.
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 btn btn-primary py-2.5 flex items-center justify-center gap-2"
                    disabled={actionLoading}
                  >
                    <Save className="w-4 h-4" />
                    Lưu
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTeam(null)}
                    className="btn btn-secondary py-2.5 flex items-center justify-center gap-2"
                    disabled={actionLoading}
                  >
                    <X className="w-4 h-4" />
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-6 bg-slate-800/10 border border-dashed border-slate-800 rounded-3xl text-center text-xs text-slate-500 italic space-y-2 py-10 shadow-inner">
              <AlertCircle className="w-8 h-8 text-slate-650 mx-auto mb-2" />
              <p>Chọn một đội tuyển bên trái để thực hiện chỉnh sửa cấu hình.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

