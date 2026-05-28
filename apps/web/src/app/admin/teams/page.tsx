'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';

export default function TeamsPage() {
  const { tournament, loading: tLoading, error: tError } = useActiveTournament();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [teamName, setTeamName] = useState('');
  const [captainId, setCaptainId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadTeams = async () => {
    if (!tournament) return;
    try {
      setLoading(true);
      const data = await apiFetch(`/tournaments/${tournament.id}/teams`);
      setTeams(data);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Lỗi tải danh sách đội.');
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
    setError('');
    setSuccess('');
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await apiFetch(`/teams/${selectedTeam.id}`, {
        method: 'PATCH',
        body: {
          name: teamName.trim() || undefined,
          captainPlayerId: captainId || undefined,
        },
      });

      setSuccess('Cập nhật thông tin đội thành công!');
      loadTeams();
      setSelectedTeam(null);
    } catch (err: any) {
      setError(err.message || 'Lỗi cập nhật đội.');
    } finally {
      setLoading(false);
    }
  };

  if (tLoading || loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <span className="login-spinner" style={{ width: '40px', height: '40px', borderTopColor: 'var(--brand-500)' }} />
      </div>
    );
  }

  return (
    <div className="premium-container p-6 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">🎽 Danh Sách Đội Tuyển</h1>
          <p className="text-xs text-slate-400 mt-1">
            Hiển thị 8 đội tuyển chính thức của giải đấu, chỉ định đội trưởng và đổi tên đội.
          </p>
        </div>
      </div>

      {error && <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">⚠️ {error}</div>}
      {success && <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">✓ {success}</div>}

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
                    className={`card p-5 space-y-3 cursor-pointer hover:border-brand-500 transition-all ${selectedTeam?.id === t.id ? 'border-brand-500 bg-brand-500/5' : ''}`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                      <div className="font-bold text-base text-slate-200">{t.name}</div>
                      <span className="text-xs bg-slate-850 px-2.5 py-1 rounded text-slate-400 font-mono">
                        {t.code}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 space-y-1">
                      <div>🎖️ Đội trưởng: <strong className="text-slate-200">{captainName}</strong></div>
                      <div>👥 Lực lượng: {t.members.length} VĐV ({males} Nam + {females} Nữ)</div>
                    </div>

                    <div className="space-y-1 border-t border-slate-850 pt-2 text-xs">
                      {t.members.map((m: any) => (
                        <div key={m.id} className="flex justify-between items-center text-[11px] text-slate-400">
                          <span>{m.playerProfile.fullName}</span>
                          <span className={m.role === 'CAPTAIN' ? 'text-amber-400 font-bold' : 'text-slate-500'}>
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
            <div className="card p-10 text-center text-muted italic">
              Chưa có đội tuyển nào được lập. Hãy bốc thăm đội hình ở mục Bốc Thăm trước.
            </div>
          )}
        </div>

        {/* Update Side panel (1 col) */}
        <div>
          {selectedTeam ? (
            <div className="card p-6 space-y-4 sticky top-6">
              <h3 className="font-bold text-sm">⚙️ Chỉnh sửa đội tuyển</h3>
              
              <form onSubmit={handleUpdateTeam} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Tên đội tuyển</label>
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                    className="w-full premium-input font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Đội trưởng (Captain)</label>
                  <select
                    value={captainId}
                    onChange={e => setCaptainId(e.target.value)}
                    className="w-full premium-input"
                  >
                    <option value="">-- Chưa chỉ định --</option>
                    {selectedTeam.members.map((m: any) => (
                      <option key={m.playerProfile.id} value={m.playerProfile.id}>
                        {m.playerProfile.fullName} ({m.gender === 'MALE' ? 'Nam' : 'Nữ'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 btn btn-primary py-2.5">
                    Lưu cấu hình
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTeam(null)}
                    className="btn btn-secondary py-2.5"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-6 bg-slate-800/20 border border-dashed border-slate-800 rounded-3xl text-center text-xs text-slate-500 italic">
              Chọn một đội tuyển bên trái để thực hiện chỉnh sửa cấu hình.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
