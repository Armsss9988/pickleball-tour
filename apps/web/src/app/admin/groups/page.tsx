'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';

export default function GroupsPage() {
  const { tournament, loading: tLoading, error: tError, reload: reloadTournament } = useActiveTournament();
  const [groups, setGroups] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadGroupsAndTeams = async () => {
    if (!tournament) return;
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Fetch group allocations
      const groupData = await apiFetch(`/tournaments/${tournament.id}/groups`);
      setGroups(groupData);

      // Fetch all teams
      const teamData = await apiFetch(`/tournaments/${tournament.id}/teams`);
      setTeams(teamData);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Lỗi tải thông tin bảng đấu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroupsAndTeams();
  }, [tournament]);

  const handleRandomAssign = async () => {
    if (!tournament) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await apiFetch(`/tournaments/${tournament.id}/groups/random`, {
        method: 'POST',
      });

      setSuccess('Phân bảng ngẫu nhiên thành công! Bảng A và Bảng B đã được lập.');
      loadGroupsAndTeams();
      reloadTournament(); // Reload status to sync DRAFT -> GROUP_ASSIGNED
    } catch (err: any) {
      setError(err.message || 'Lỗi phân chia bảng đấu.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSchedule = async () => {
    if (!tournament) return;
    if (!confirm('Tạo lịch thi đấu tự động vòng bảng theo thể thức vòng tròn?')) return;
    
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await apiFetch(`/tournaments/${tournament.id}/schedule/generate`, {
        method: 'POST',
      });

      setSuccess('Đã khởi tạo lịch thi đấu tự động vòng bảng thành công!');
      loadGroupsAndTeams();
      reloadTournament(); // Reload to sync to SCHEDULE_GENERATED
    } catch (err: any) {
      setError(err.message || 'Lỗi tạo lịch thi đấu.');
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

  const isAssigned = groups.length > 0 && groups.some(g => g.groupTeams.length > 0);

  return (
    <div className="premium-container p-6 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">📅 Phân Bảng & Lịch Thi Đấu</h1>
          <p className="text-xs text-slate-400 mt-1">
            Thiết lập 2 bảng đấu (Bảng A & B bảng B) và phát sinh lịch thi đấu vòng tròn 3 lượt trận.
          </p>
        </div>
      </div>

      {error && <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">⚠️ {error}</div>}
      {success && <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">✓ {success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actions panel */}
        <div className="card p-6 space-y-4 h-fit">
          <h3 className="font-bold text-sm">Điều khiển vòng bảng</h3>
          
          <div className="space-y-3">
            <button
              onClick={handleRandomAssign}
              disabled={teams.length < 8}
              className="w-full btn btn-primary py-2.5"
            >
              🎲 Phân bảng ngẫu nhiên (8 đội)
            </button>
            
            <button
              onClick={handleGenerateSchedule}
              disabled={!isAssigned}
              className="w-full btn btn-secondary py-2.5"
            >
              🗓️ Tạo lịch thi đấu tự động
            </button>
          </div>
          
          {teams.length < 8 && (
            <p className="text-[11px] text-amber-400">
              ⚠️ Yêu cầu tối thiểu có đủ 8 đội đã xác nhận bốc thăm trước khi thực hiện phân bảng.
            </p>
          )}
        </div>

        {/* Groups allocations Display */}
        <div className="lg:col-span-2 card p-6 space-y-6">
          <h3 className="font-bold text-sm">Cơ cấu bảng đấu</h3>
          
          {isAssigned ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {groups.map(g => (
                <div key={g.id} className="p-4 bg-slate-800/40 border border-slate-800 rounded-2xl space-y-3">
                  <div className="font-bold text-base text-brand-400 border-b border-slate-850 pb-2">
                    {g.name} (Bảng {g.code})
                  </div>
                  
                  <div className="space-y-2">
                    {g.groupTeams.map((gt: any) => (
                      <div key={gt.id} className="flex justify-between items-center text-xs p-2 bg-slate-900/50 rounded-lg">
                        <span className="font-semibold text-slate-200">{gt.team.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">Hạt giống #{gt.seedOrder}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center text-muted italic text-sm">
              Chưa có đội nào được phân chia vào các bảng đấu. Bấm "Phân bảng ngẫu nhiên" bên trái để tiếp tục.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
