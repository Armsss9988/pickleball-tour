'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading-skeleton';
import { Calendar, Shuffle, CalendarDays, AlertTriangle, Users, GitBranch } from '@/components/icons';
import { getCurrentUser } from '@/lib/current-user';
import { buildTournamentUxContext } from '@/lib/tournament-ux-context';
import { getActionAccess } from '@/lib/tournament-ux-policy';

interface TeamLike {
  id: string;
  name: string;
}

interface GroupTeamLike {
  id: string;
  seedOrder: number;
  team: TeamLike;
}

interface GroupLike {
  id: string;
  name: string;
  code: string;
  groupTeams: GroupTeamLike[];
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export default function GroupsPage() {
  const { tournament, loading: tLoading, reload: reloadTournament } = useActiveTournament();
  const { toast } = useToast();
  const [groups, setGroups] = useState<GroupLike[]>([]);
  const [teams, setTeams] = useState<TeamLike[]>([]);
  const [matchesCount, setMatchesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const currentUser = useMemo(() => getCurrentUser(), []);

  const loadGroupsAndTeams = useCallback(async () => {
    if (!tournament) return;
    try {
      setLoading(true);
      const [groupData, teamData, matchData] = await Promise.all([
        apiFetch<GroupLike[]>(`/tournaments/${tournament.id}/groups`),
        apiFetch<TeamLike[]>(`/tournaments/${tournament.id}/teams`),
        apiFetch(`/tournaments/${tournament.id}/matches`).catch(() => []),
      ]);

      setGroups(groupData);
      setTeams(teamData);
      setMatchesCount(Array.isArray(matchData) ? matchData.length : 0);
    } catch (error: unknown) {
      console.error(error);
      toast(getErrorMessage(error, 'Lỗi tải thông tin bảng đấu.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, tournament]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadGroupsAndTeams();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadGroupsAndTeams]);

  const handleRandomAssign = useCallback(async () => {
    if (!tournament) return;
    setActionLoading(true);

    try {
      await apiFetch(`/tournaments/${tournament.id}/groups/random-assignment`, {
        method: 'POST',
      });

      toast('Phân bảng ngẫu nhiên thành công! Bảng A và Bảng B đã được lập.', 'success');
      await loadGroupsAndTeams();
      await reloadTournament();
    } catch (error: unknown) {
      toast(getErrorMessage(error, 'Lỗi phân chia bảng đấu.'), 'error');
    } finally {
      setActionLoading(false);
    }
  }, [loadGroupsAndTeams, reloadTournament, toast, tournament]);

  const handleGenerateSchedule = useCallback(async () => {
    if (!tournament) return;
    setActionLoading(true);

    try {
      await apiFetch(`/tournaments/${tournament.id}/schedule/generate-group-stage`, {
        method: 'POST',
      });

      toast('Đã khởi tạo lịch thi đấu tự động vòng bảng thành công!', 'success');
      setConfirmModalOpen(false);
      await loadGroupsAndTeams();
      await reloadTournament();
    } catch (error: unknown) {
      toast(getErrorMessage(error, 'Lỗi tạo lịch thi đấu.'), 'error');
    } finally {
      setActionLoading(false);
    }
  }, [loadGroupsAndTeams, reloadTournament, toast, tournament]);

  if (tLoading || (loading && groups.length === 0)) {
    return <PageLoading />;
  }

  const isAssigned = groups.length > 0 && groups.some(g => g.groupTeams.length > 0);
  const uxContext = buildTournamentUxContext({
    tournament,
    stats: {
      teamsCount: teams.length,
      matchesCount,
    },
  });
  const assignAccess = getActionAccess('assignGroups', currentUser.role, uxContext);
  const generateAccess = getActionAccess('generateMatches', currentUser.role, uxContext);

  const handleRandomAssignClick = () => {
    if (!assignAccess.allowed) {
      toast(assignAccess.reason || 'Chưa thể phân bảng.', 'error');
      return;
    }
    handleRandomAssign();
  };

  const handleOpenGenerateModal = () => {
    if (!generateAccess.allowed) {
      toast(generateAccess.reason || 'Chưa thể sinh lịch thi đấu.', 'error');
      return;
    }
    setConfirmModalOpen(true);
  };

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

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
            <h4 className="text-sm font-semibold text-slate-200">Cấu hình lịch</h4>
            <p className="text-xs leading-relaxed text-slate-400">
              Bạn có thể chuẩn bị sân, khung giờ và thời lượng thi đấu ngay từ đầu. Phần sinh trận sẽ chỉ mở khi đã có bảng đấu.
            </p>
            <div className="text-[11px] text-slate-500">
              {tournament?.openingTime
                ? 'Giờ khai mạc đã có, có thể dùng làm mốc lên lịch.'
                : 'Nên bổ sung giờ khai mạc ở thông tin giải để việc sinh lịch sát thực tế hơn.'}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-200">Phân bảng</h4>
              {!assignAccess.allowed && (
                <p className="mt-2 text-xs leading-relaxed text-amber-300">{assignAccess.reason}</p>
              )}
            </div>
            <button
              onClick={handleRandomAssignClick}
              disabled={!assignAccess.allowed || actionLoading}
              className="w-full btn btn-primary py-2.5 flex items-center justify-center gap-2"
            >
              <Shuffle className="w-4 h-4" />
              Phân bảng ngẫu nhiên (8 đội)
            </button>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-200">Sinh lịch thi đấu</h4>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Hệ thống sẽ tạo lịch vòng tròn cho các bảng hiện tại. Chỉ mở khi 8 đội đã được xếp vào bảng.
              </p>
              {!generateAccess.allowed && (
                <p className="mt-2 text-xs leading-relaxed text-amber-300">{generateAccess.reason}</p>
              )}
            </div>
            <button
              onClick={handleOpenGenerateModal}
              disabled={!generateAccess.allowed || actionLoading}
              className="w-full btn btn-secondary py-2.5 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
            >
              <CalendarDays className="w-4 h-4 text-amber-500" />
              Tạo lịch thi đấu tự động
            </button>
          </div>
          
          {(!assignAccess.allowed || !generateAccess.allowed) && (
            <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl text-[11px] text-rose-450 leading-relaxed flex items-start gap-1.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                {assignAccess.reason || generateAccess.reason || 'Cần hoàn tất dữ liệu bắt buộc trước khi thao tác vòng bảng.'}
              </span>
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
              {groups.map((group) => (
                <div key={group.id} className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-3 shadow-inner hover:border-slate-700 transition-colors">
                  <div className="font-bold text-sm text-amber-500 border-b border-slate-800 pb-2">
                    {group.name} (Bảng {group.code})
                  </div>
                  
                  <div className="space-y-2">
                    {group.groupTeams.map((groupTeam) => (
                      <div key={groupTeam.id} className="flex justify-between items-center text-xs p-2.5 bg-slate-800/40 rounded-xl hover:bg-slate-800 transition-colors border border-slate-850">
                        <span className="font-semibold text-slate-200">{groupTeam.team.name}</span>
                        <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded font-mono border border-slate-850">
                          Hạt giống #{groupTeam.seedOrder}
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
