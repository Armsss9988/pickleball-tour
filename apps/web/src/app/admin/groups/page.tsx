'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading-skeleton';
import { Calendar, Shuffle, CalendarDays, AlertTriangle, Users, GitBranch } from '@/components/icons';

export default function GroupsPage() {
  const { tournament, loading: tLoading, reload: reloadTournament } = useActiveTournament();
  const { toast } = useToast();
  const [groups, setGroups] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadGroupsAndTeams = async () => {
    if (!tournament) return;
    try {
      setLoading(true);
      const groupData = await apiFetch(`/tournaments/${tournament.id}/groups`);
      setGroups(groupData);

      const teamData = await apiFetch(`/tournaments/${tournament.id}/teams`);
      setTeams(teamData);
    } catch (e: any) {
      console.error(e);
      toast(e.message || 'Lỗi tải thông tin bảng đấu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroupsAndTeams();
  }, [tournament]);

  const handleRandomAssign = async () => {
    if (!tournament) return;
    setActionLoading(true);

    try {
      await apiFetch(`/tournaments/${tournament.id}/groups/random`, {
        method: 'POST',
      });

      toast('Phân bảng ngẫu nhiên thành công! Bảng A và Bảng B đã được lập.', 'success');
      loadGroupsAndTeams();
      reloadTournament();
    } catch (err: any) {
      toast(err.message || 'Lỗi phân chia bảng đấu.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateSchedule = async () => {
    if (!tournament) return;
    setActionLoading(true);

    try {
      await apiFetch(`/tournaments/${tournament.id}/schedule/generate`, {
        method: 'POST',
      });

      toast('Đã khởi tạo lịch thi đấu tự động vòng bảng thành công!', 'success');
      setConfirmModalOpen(false);
      loadGroupsAndTeams();
      reloadTournament();
    } catch (err: any) {
      toast(err.message || 'Lỗi tạo lịch thi đấu.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (tLoading || (loading && groups.length === 0)) {
    return <PageLoading />;
  }

  const isAssigned = groups.length > 0 && groups.some(g => g.groupTeams.length > 0);

  return (
    <div className="premium-container space-y-6 animate-scale-in">
      <PageHeader
        title="Phân Bảng & Lịch Đấu"
        description="Phát sinh bảng đấu và lên lịch thi đấu vòng tròn 3 lượt trận cho 8 đội tuyển."
        icon={Calendar}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actions panel */}
        <div className="card p-6 space-y-5 h-fit shadow-xl">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
            <GitBranch className="w-5 h-5 text-amber-500" />
            Điều khiển vòng bảng
          </h3>
          
          <div className="space-y-3">
            <button
              onClick={handleRandomAssign}
              disabled={teams.length < 8 || actionLoading}
              className="w-full btn btn-primary py-2.5 flex items-center justify-center gap-2"
            >
              <Shuffle className="w-4 h-4" />
              Phân bảng ngẫu nhiên (8 đội)
            </button>
            
            <button
              onClick={() => setConfirmModalOpen(true)}
              disabled={!isAssigned || actionLoading}
              className="w-full btn btn-secondary py-2.5 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
            >
              <CalendarDays className="w-4 h-4 text-amber-500" />
              Tạo lịch thi đấu tự động
            </button>
          </div>
          
          {teams.length < 8 && (
            <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl text-[11px] text-rose-450 leading-relaxed flex items-start gap-1.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Yêu cầu có đủ 8 đội tuyển chính thức được thiết lập sau bước bốc thăm trước khi thực hiện phân bảng.</span>
            </div>
          )}
        </div>

        {/* Groups allocations Display */}
        <div className="lg:col-span-2 card p-6 space-y-5 shadow-xl">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Users className="w-5 h-5 text-amber-500" />
            Cơ cấu bảng đấu
          </h3>
          
          {isAssigned ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {groups.map(g => (
                <div key={g.id} className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-3 shadow-inner hover:border-slate-700 transition-colors">
                  <div className="font-bold text-sm text-amber-500 border-b border-slate-800 pb-2">
                    {g.name} (Bảng {g.code})
                  </div>
                  
                  <div className="space-y-2">
                    {g.groupTeams.map((gt: any) => (
                      <div key={gt.id} className="flex justify-between items-center text-xs p-2.5 bg-slate-800/40 rounded-xl hover:bg-slate-800 transition-colors border border-slate-850">
                        <span className="font-semibold text-slate-200">{gt.team.name}</span>
                        <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded font-mono border border-slate-850">
                          Hạt giống #{gt.seedOrder}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={GitBranch}
              title="Chưa có thông tin phân bảng"
              description="Bấm nút 'Phân bảng ngẫu nhiên' bên trái để tự động lập bảng A và bảng B (mỗi bảng 4 đội tuyển)."
            />
          )}
        </div>
      </div>

      {/* Confirm Generate Schedule Modal */}
      <ConfirmModal
        open={confirmModalOpen}
        title="Tạo lịch thi đấu tự động?"
        description="Thao tác này sẽ phát sinh lịch đấu vòng tròn cho các bảng đấu hiện tại. Bản lịch đấu cũ (nếu có) sẽ bị ghi đè! Bạn có chắc chắn muốn tiến hành?"
        confirmLabel="Tạo lịch đấu"
        cancelLabel="Hủy"
        variant="warning"
        loading={actionLoading}
        onConfirm={handleGenerateSchedule}
        onCancel={() => setConfirmModalOpen(false)}
      />
    </div>
  );
}

