'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/components/toast';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading-skeleton';
import { Shield, Award, Users, Edit3, X, Save, AlertCircle } from '@/components/icons';

export default function TeamsPage() {
  const { tournament, loading: tLoading } = useActiveTournament();
  const { toast } = useToast();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [teamName, setTeamName] = useState('');
  const [captainId, setCaptainId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadTeams = async () => {
    if (!tournament) return;
    try {
      setLoading(true);
      const data = await apiFetch(`/tournaments/${tournament.id}/teams`);
      setTeams(data);
    } catch (e: any) {
      console.error(e);
      toast(e.message || 'Lỗi tải danh sách đội.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
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
      loadTeams();
    } catch (err: any) {
      toast(err.message || 'Lỗi cập nhật đội.', 'error');
    } finally {
      setActionLoading(false);
    }
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teams List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {teams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map(t => {
                const captainName = t.captain?.fullName || 'Chưa chỉ định';
                const males = t.members.filter((m: any) => m.gender === 'MALE').length;
                const females = t.members.filter((m: any) => m.gender === 'FEMALE').length;

                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTeam(t)}
                    className={`card p-5 space-y-3 cursor-pointer hover:border-amber-500 hover:bg-slate-800/10 transition-all shadow-md flex flex-col justify-between ${selectedTeam?.id === t.id ? 'border-amber-500 bg-amber-500/5' : ''}`}
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
                      {t.members.map((m: any) => (
                        <div key={m.id} className="flex justify-between items-center text-[11px] text-slate-400 px-1 py-0.5 rounded hover:bg-slate-900/30">
                          <span>{m.playerProfile.fullName}</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${m.role === 'CAPTAIN' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : m.gender === 'MALE' ? 'bg-sky-500/10 text-sky-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {m.role === 'CAPTAIN' ? 'Đội Trưởng' : m.gender === 'MALE' ? 'Nam' : 'Nữ'}
                          </span>
                        </div>
                      ))}
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
                        {m.playerProfile.fullName} ({m.gender === 'MALE' ? 'Nam' : 'Nữ'})
                      </option>
                    ))}
                  </select>
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

