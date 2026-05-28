'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading-skeleton';
import { BarChart3, AlertTriangle, CheckCircle2, ChevronUp, ChevronDown, RefreshCw, Trophy } from '@/components/icons';

export default function StandingsPage() {
  const { tournament, loading: tLoading } = useActiveTournament();
  const { toast } = useToast();
  const [standings, setStandings] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingGroupId, setResolvingGroupId] = useState<string | null>(null);
  const [tieBreakOrder, setTieBreakOrder] = useState<string[]>([]);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadStandings = async () => {
    if (!tournament) return;
    try {
      setLoading(true);
      const groupData = await apiFetch(`/tournaments/${tournament.id}/groups`);
      setGroups(groupData);

      const standingsData = await apiFetch(`/tournaments/${tournament.id}/standings`);
      setStandings(standingsData);
    } catch (e: any) {
      console.error(e);
      toast(e.message || 'Lỗi tải bảng xếp hạng.', 'error');
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
      
      const temp = nextList[idx]!;
      nextList[idx] = nextList[targetIdx]!;
      nextList[targetIdx] = temp;
      return nextList;
    });
  };

  const handleConfirmResolveTie = async () => {
    if (!resolvingGroupId) return;
    setActionLoading(true);

    try {
      await apiFetch(`/tournaments/${tournament!.id}/groups/${resolvingGroupId}/resolve-tie`, {
        method: 'POST',
        body: { teamOrder: tieBreakOrder },
      });

      toast('Đã giải quyết phân hạng thủ công thành công!', 'success');
      setResolvingGroupId(null);
      setConfirmModalOpen(false);
      loadStandings();
    } catch (err: any) {
      toast(err.message || 'Lỗi phân hạng thủ công.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (tLoading || (loading && standings.length === 0)) {
    return <PageLoading />;
  }

  return (
    <div className="premium-container space-y-6 animate-scale-in">
      <PageHeader
        title="Bảng Xếp Hạng Vòng Bảng"
        description="Bảng xếp hạng tự động tính toán dựa trên các trận đấu đã xác nhận, hỗ trợ tie-breaker và can thiệp phân hạng thủ công."
        icon={BarChart3}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Standings list (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {groups.map(group => {
            const groupStds = standings.filter(s => s.groupId === group.id).sort((a, b) => a.rank - b.rank);
            const hasTie = groupStds.some(s => (s.tieBreakDetail as any)?.requiresAdminDecision);

            return (
              <div key={group.id} className="card p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="font-bold text-base text-amber-500">{group.name}</div>
                  
                  {hasTie && (
                    <button
                      onClick={() => handleOpenResolveTie(group)}
                      className="btn btn-secondary bg-amber-500/10 text-amber-450 border-amber-500/30 hover:bg-amber-500/20 text-xs py-1.5 px-3 flex items-center gap-1.5 font-semibold"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Giải quyết hòa chỉ số
                    </button>
                  )}
                </div>

                {groupStds.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400">
                          <th className="py-4 w-12 text-center">Hạng</th>
                          <th className="px-4">Đội tuyển</th>
                          <th className="text-center px-4">Trận</th>
                          <th className="text-center px-4">Thắng</th>
                          <th className="text-center px-4">Thua</th>
                          <th className="text-center px-4">Hiệu số</th>
                          <th className="text-right py-4 px-4">Điểm</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-sm">
                        {groupStds.map((s, index) => (
                          <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-4 text-center">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                index === 0 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                                index === 1 ? 'bg-slate-300/10 text-slate-300 border border-slate-300/20' :
                                'bg-slate-800 text-slate-450'
                              }`}>
                                {s.rank}
                              </span>
                            </td>
                            <td className="font-semibold text-slate-200 px-4">
                              {s.team?.name || '—'}
                              {(s.tieBreakDetail as any)?.requiresAdminDecision && (
                                <span className="inline-flex items-center ml-2 text-[9px] font-bold text-amber-450 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                  Hòa
                                </span>
                              )}
                            </td>
                            <td className="text-center text-slate-350 font-semibold px-4">{s.matchesPlayed}</td>
                            <td className="text-center text-emerald-400 font-semibold px-4">{s.wins}</td>
                            <td className="text-center text-rose-450 font-semibold px-4">{s.losses}</td>
                            <td className="text-center text-slate-400 font-mono px-4">
                              {s.pointsFor - s.pointsAgainst > 0 ? `+${s.pointsFor - s.pointsAgainst}` : s.pointsFor - s.pointsAgainst}
                            </td>
                            <td className="text-right font-mono font-bold text-slate-200 py-4 px-4">{s.points}đ</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    icon={Trophy}
                    title="Chưa có bảng xếp hạng"
                    description="Hãy phân chia bảng và tạo lịch thi đấu để theo dõi thứ hạng thi đấu."
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Resolve Tie Side panel (1 col) */}
        <div>
          {resolvingGroupId ? (
            <div className="card p-6 space-y-5 sticky top-6 shadow-xl border-amber-500/30 animate-scale-in">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Giải quyết phân hạng thủ công
              </h3>
              <p className="text-xs text-slate-450 leading-relaxed">
                Di chuyển vị trí các đội tuyển để quyết định thứ tự xếp hạng chính xác cho vòng Playoff (Tie-breaker manual override).
              </p>

              <div className="space-y-2 py-2">
                {tieBreakOrder.map((teamId, idx) => {
                  const team = standings.find(s => s.teamId === teamId)?.team;
                  return (
                    <div key={teamId} className="flex justify-between items-center p-3 bg-slate-900/60 border border-slate-850 rounded-xl hover:border-slate-800 transition-colors">
                      <div className="text-xs font-semibold text-slate-200">{team?.name || '—'}</div>
                      <div className="flex gap-2">
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMoveOrder(idx, 'up')}
                          className="p-1 text-slate-400 hover:text-amber-500 disabled:opacity-20 transition-colors"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          disabled={idx === tieBreakOrder.length - 1}
                          onClick={() => handleMoveOrder(idx, 'down')}
                          className="p-1 text-slate-400 hover:text-amber-500 disabled:opacity-20 transition-colors"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setConfirmModalOpen(true)}
                  className="flex-1 btn btn-primary py-2.5 flex items-center justify-center gap-2"
                  disabled={actionLoading}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Xác nhận
                </button>
                <button
                  onClick={() => setResolvingGroupId(null)}
                  className="btn btn-secondary py-2.5 flex items-center justify-center gap-2 border-slate-700 text-slate-300"
                  disabled={actionLoading}
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-slate-800/10 border border-dashed border-slate-800 rounded-3xl text-center text-xs text-slate-500 italic space-y-2 py-10 shadow-inner">
              <AlertTriangle className="w-8 h-8 text-slate-650 mx-auto mb-2" />
              <p>Nếu bảng xếp hạng xảy ra trường hợp hòa chỉ số sau vòng đấu, nút can thiệp tie-breaker thủ công của BTC sẽ xuất hiện ở đây.</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Manual Resolution Modal */}
      <ConfirmModal
        open={confirmModalOpen}
        title="Xác nhận thứ tự phân hạng?"
        description="Thao tác này sẽ áp dụng thứ hạng thủ công đã thiết lập cho bảng đấu này. Thứ tự xếp hạng sẽ ảnh hưởng trực tiếp đến việc ghép cặp thi đấu Playoff!"
        confirmLabel="Lưu phân hạng"
        cancelLabel="Hủy"
        variant="warning"
        loading={actionLoading}
        onConfirm={handleConfirmResolveTie}
        onCancel={() => setConfirmModalOpen(false)}
      />
    </div>
  );
}

