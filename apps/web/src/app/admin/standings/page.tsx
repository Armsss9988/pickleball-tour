'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';

export default function StandingsPage() {
  const { tournament, loading: tLoading, error: tError } = useActiveTournament();
  const [standings, setStandings] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingGroupId, setResolvingGroupId] = useState<string | null>(null);
  const [tieBreakOrder, setTieBreakOrder] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadStandings = async () => {
    if (!tournament) return;
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const groupData = await apiFetch(`/tournaments/${tournament.id}/groups`);
      setGroups(groupData);

      const standingsData = await apiFetch(`/tournaments/${tournament.id}/standings`);
      setStandings(standingsData);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Lỗi tải bảng xếp hạng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStandings();
  }, [tournament]);

  const handleOpenResolveTie = (group: any) => {
    setResolvingGroupId(group.id);
    const groupStds = standings.filter(s => s.groupId === group.id);
    setTieBreakOrder(groupStds.map(s => s.teamId));
  };

  const handleMoveOrder = (idx: number, dir: 'up' | 'down') => {
    setTieBreakOrder(prev => {
      const nextList = [...prev];
      const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= nextList.length) return prev;
      
      // Swap elements
      const temp = nextList[idx]!;
      nextList[idx] = nextList[targetIdx]!;
      nextList[targetIdx] = temp;
      return nextList;
    });
  };

  const handleConfirmResolveTie = async () => {
    if (!resolvingGroupId) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await apiFetch(`/tournaments/${tournament!.id}/groups/${resolvingGroupId}/resolve-tie`, {
        method: 'POST',
        body: { teamOrder: tieBreakOrder },
      });

      setSuccess('Đã giải quyết phân hạng thủ công thành công!');
      setResolvingGroupId(null);
      loadStandings();
    } catch (err: any) {
      setError(err.message || 'Lỗi phân hạng thủ công.');
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">📈 Bảng Xếp Hạng Vòng Bảng</h1>
          <p className="text-xs text-slate-400 mt-1">
            Bảng xếp hạng tự động tính toán dựa trên các trận đấu đã xác nhận, hỗ trợ tie-breaker và can thiệp phân hạng thủ công của BTC.
          </p>
        </div>
      </div>

      {error && <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">⚠️ {error}</div>}
      {success && <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">✓ {success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Standings list (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {groups.map(group => {
            const groupStds = standings.filter(s => s.groupId === group.id).sort((a, b) => a.rank - b.rank);
            const hasTie = groupStds.some(s => (s.tieBreakDetail as any)?.requiresAdminDecision);

            return (
              <div key={group.id} className="card p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                  <div className="font-bold text-base text-brand-400">{group.name}</div>
                  
                  {hasTie && (
                    <button
                      onClick={() => handleOpenResolveTie(group)}
                      className="btn btn-secondary bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 text-xs py-1 px-2.5"
                    >
                      ⚖️ Giải quyết hòa chỉ số
                    </button>
                  )}
                </div>

                {groupStds.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400">
                          <th className="py-2.5 w-12 text-center">Hạng</th>
                          <th>Đội tuyển</th>
                          <th className="text-center">Trận đã đấu</th>
                          <th className="text-center">Thắng</th>
                          <th className="text-center">Thua</th>
                          <th className="text-center">Hiệu số</th>
                          <th className="text-right">Điểm số</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-sm">
                        {groupStds.map(s => (
                          <tr key={s.id} className="hover:bg-slate-800/40">
                            <td className="py-3 text-center font-bold text-slate-400">{s.rank}</td>
                            <td className="font-semibold text-slate-200">
                              {s.team?.name || '—'}
                              {(s.tieBreakDetail as any)?.requiresAdminDecision && (
                                <span className="inline-block ml-2 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-normal">
                                  Hòa
                                </span>
                              )}
                            </td>
                            <td className="text-center text-slate-350 font-semibold">{s.matchesPlayed}</td>
                            <td className="text-center text-emerald-400 font-semibold">{s.wins}</td>
                            <td className="text-center text-rose-400 font-semibold">{s.losses}</td>
                            <td className="text-center text-slate-400 font-mono">{s.pointsFor - s.pointsAgainst > 0 ? `+${s.pointsFor - s.pointsAgainst}` : s.pointsFor - s.pointsAgainst}</td>
                            <td className="text-right font-mono font-bold text-slate-200">{s.points}đ</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted text-center py-6 text-xs italic">Chưa có bảng xếp hạng. Hãy phân chia bảng và tạo lịch thi đấu.</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Resolve Tie Side panel (1 col) */}
        <div>
          {resolvingGroupId ? (
            <div className="card p-6 space-y-4 sticky top-6">
              <h3 className="font-bold text-sm">⚖️ Giải quyết phân hạng thủ công</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Di chuyển vị trí các đội tuyển để quyết định thứ tự xếp hạng chính xác cho vòng Playoff.
              </p>

              <div className="space-y-2">
                {tieBreakOrder.map((teamId, idx) => {
                  const team = standings.find(s => s.teamId === teamId)?.team;
                  return (
                    <div key={teamId} className="flex justify-between items-center p-3 bg-slate-900/60 rounded-xl">
                      <div className="text-xs font-semibold text-slate-200">{team?.name || '—'}</div>
                      <div className="flex gap-1.5">
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMoveOrder(idx, 'up')}
                          className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                        >
                          ▲
                        </button>
                        <button
                          disabled={idx === tieBreakOrder.length - 1}
                          onClick={() => handleMoveOrder(idx, 'down')}
                          className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleConfirmResolveTie}
                  className="flex-1 btn btn-primary py-2.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                >
                  ✓ Xác nhận phân hạng
                </button>
                <button
                  onClick={() => setResolvingGroupId(null)}
                  className="btn btn-secondary py-2.5"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-slate-800/20 border border-dashed border-slate-800 rounded-3xl text-center text-xs text-slate-500 italic">
              Nếu bảng đấu xảy ra trường hợp hòa chỉ số sau lượt đấu vòng bảng, bảng xếp hạng sẽ hiển thị nút can thiệp ở đây.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
