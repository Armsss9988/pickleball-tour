'use client';

import Link from 'next/link';
import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/components/toast';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading-skeleton';
import { Calendar, Shuffle, AlertTriangle, Users, GitBranch, Save, X } from '@/components/icons';
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

function buildGroupAssignments(groups: GroupLike[]) {
  const assignments: Record<string, string> = {};
  for (const group of groups) {
    for (const groupTeam of group.groupTeams) {
      assignments[groupTeam.team.id] = group.code;
    }
  }
  return assignments;
}

export default function GroupsPage() {
  const { tournament, loading: tLoading, reload: reloadTournament } = useActiveTournament();
  const { toast } = useToast();
  const [groups, setGroups] = useState<GroupLike[]>([]);
  const [teams, setTeams] = useState<TeamLike[]>([]);
  const [matchesCount, setMatchesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [groupAssignments, setGroupAssignments] = useState<Record<string, string>>({});
  const [draggedTeamId, setDraggedTeamId] = useState<string | null>(null);
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
      setGroupAssignments(buildGroupAssignments(groupData));
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

  const isAssigned = groups.length > 0 && groups.some(g => g.groupTeams.length > 0);
  const uxContext = buildTournamentUxContext({
    tournament,
    stats: {
      teamsCount: teams.length,
      matchesCount,
      groupsAssigned: isAssigned,
    },
  });
  const assignAccess = getActionAccess('assignGroups', currentUser.role, uxContext);
  const manualGroupCodes = useMemo(() => ['A', 'B'], []);
  const manualGroups = useMemo(() => manualGroupCodes.map((code) => ({
    code,
    name: `Bảng ${code}`,
    teams: teams.filter((team) => groupAssignments[team.id] === code),
  })), [groupAssignments, manualGroupCodes, teams]);
  const unassignedTeams = useMemo(
    () => teams.filter((team) => !groupAssignments[team.id]),
    [groupAssignments, teams],
  );
  const groupAssignmentValidation = useMemo(() => {
    const assignedCount = Object.values(groupAssignments).filter(Boolean).length;
    const errors: string[] = [];

    if (teams.length !== 8) {
      errors.push(`Cần đúng 8 đội để phân bảng, hiện có ${teams.length}.`);
    }

    if (assignedCount !== teams.length) {
      errors.push(`Cần xếp đủ ${teams.length} đội, hiện đã xếp ${assignedCount}.`);
    }

    for (const group of manualGroups) {
      if (group.teams.length !== 4) {
        errors.push(`${group.name} cần đúng 4 đội, hiện có ${group.teams.length}.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }, [groupAssignments, manualGroups, teams.length]);

  const handleGroupDragStart = useCallback((event: React.DragEvent, teamId: string) => {
    setDraggedTeamId(teamId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', teamId);
  }, []);

  const handleGroupDragEnd = useCallback(() => {
    setDraggedTeamId(null);
  }, []);

  const handleGroupDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleGroupDrop = useCallback((event: React.DragEvent, code: string) => {
    event.preventDefault();
    const teamId = event.dataTransfer.getData('text/plain') || draggedTeamId;
    if (!teamId) return;

    setGroupAssignments((current) => ({
      ...current,
      [teamId]: code,
    }));
    setDraggedTeamId(null);
  }, [draggedTeamId]);

  const handleRemoveGroupAssignment = useCallback((teamId: string) => {
    setGroupAssignments((current) => {
      const next = { ...current };
      delete next[teamId];
      return next;
    });
  }, []);

  const handleClearGroupAssignments = useCallback(() => {
    setGroupAssignments({});
  }, []);

  const handleSaveGroupAssignment = useCallback(async () => {
    if (!assignAccess.allowed) {
      toast(assignAccess.reason || 'Chưa thể phân bảng.', 'error');
      return;
    }

    if (!groupAssignmentValidation.valid) {
      toast(groupAssignmentValidation.errors[0] || 'Phân bảng chưa hợp lệ.', 'error');
      return;
    }

    if (!tournament) return;

    setActionLoading(true);
    try {
      await apiFetch(`/tournaments/${tournament.id}/groups/assignment`, {
        method: 'PUT',
        body: {
          groups: manualGroups.map((group) => ({
            code: group.code,
            teamIds: group.teams.map((team) => team.id),
          })),
        },
      });

      toast('Đã lưu phân bảng thành công!', 'success');
      await loadGroupsAndTeams();
      await reloadTournament();
    } catch (error: unknown) {
      toast(getErrorMessage(error, 'Lỗi lưu phân bảng.'), 'error');
    } finally {
      setActionLoading(false);
    }
  }, [
    assignAccess.allowed,
    assignAccess.reason,
    groupAssignmentValidation.errors,
    groupAssignmentValidation.valid,
    loadGroupsAndTeams,
    manualGroups,
    reloadTournament,
    toast,
    tournament,
  ]);

  if (tLoading || (loading && groups.length === 0 && teams.length === 0)) {
    return <PageLoading />;
  }

  const handleRandomAssignClick = () => {
    if (!assignAccess.allowed) {
      toast(assignAccess.reason || 'Chưa thể phân bảng.', 'error');
      return;
    }
    handleRandomAssign();
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
            {tournament && (
              <Link
                href={`/admin/${tournament.id}/schedule`}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-amber-500/30 hover:text-amber-300"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                Mở cấu hình lịch & sân
              </Link>
            )}
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
            <button
              type="button"
              onClick={handleSaveGroupAssignment}
              disabled={!assignAccess.allowed || !groupAssignmentValidation.valid || actionLoading}
              className="w-full btn btn-secondary py-2.5 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {actionLoading ? 'Đang lưu...' : 'Lưu phân bảng'}
            </button>
          </div>

          {!assignAccess.allowed && (
            <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl text-[11px] text-rose-450 leading-relaxed flex items-start gap-1.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>{assignAccess.reason || 'Cần hoàn tất dữ liệu bắt buộc trước khi phân bảng.'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Groups allocations Display */}
        <div className="lg:col-span-2 card p-6 space-y-5 shadow-xl">
          <div className="flex flex-col gap-3 border-b border-slate-800 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              Xếp đội vào bảng
            </h3>
            <button
              type="button"
              onClick={handleClearGroupAssignments}
              disabled={actionLoading}
              className="btn btn-secondary px-3 py-1.5 text-xs"
            >
              Xóa chọn
            </button>
          </div>

          {teams.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-xl border border-slate-800 bg-slate-950/35 p-4">
                <div className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Chưa phân bảng ({unassignedTeams.length})
                </div>
                <div className="space-y-2">
                  {unassignedTeams.length > 0 ? unassignedTeams.map((team) => (
                    <div
                      key={team.id}
                      draggable={assignAccess.allowed && !actionLoading}
                      onDragStart={(event) => handleGroupDragStart(event, team.id)}
                      onDragEnd={handleGroupDragEnd}
                      className={`cursor-grab rounded-xl border border-slate-850 bg-slate-900/55 px-3 py-2 text-sm font-semibold text-slate-200 transition-all hover:border-amber-500/30 active:cursor-grabbing ${
                        draggedTeamId === team.id ? 'opacity-50 ring-1 ring-amber-500/40' : ''
                      }`}
                      title="Kéo đội này sang Bảng A hoặc Bảng B"
                    >
                      {team.name}
                    </div>
                  )) : (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-6 text-center text-xs font-semibold text-emerald-300">
                      Tất cả đội đã được xếp bảng.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {manualGroups.map((group) => (
                  <div
                    key={group.code}
                    onDragOver={handleGroupDragOver}
                    onDrop={(event) => handleGroupDrop(event, group.code)}
                    className={`min-h-[280px] rounded-2xl border p-4 transition-all ${
                      group.teams.length === 4
                        ? 'border-emerald-500/25 bg-emerald-500/5'
                        : draggedTeamId
                        ? 'border-amber-500/35 bg-amber-500/5'
                        : 'border-slate-800 bg-slate-900/50'
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="font-bold text-sm text-amber-500">{group.name}</div>
                      <span className={`text-[10px] font-bold ${group.teams.length === 4 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {group.teams.length}/4 đội
                      </span>
                    </div>

                    <div className="space-y-2">
                      {group.teams.length > 0 ? group.teams.map((team, index) => (
                        <div
                          key={team.id}
                          draggable={assignAccess.allowed && !actionLoading}
                          onDragStart={(event) => handleGroupDragStart(event, team.id)}
                          onDragEnd={handleGroupDragEnd}
                          className={`grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border border-slate-850 bg-slate-950/45 px-3 py-2 text-xs transition-all hover:bg-slate-900 ${
                            draggedTeamId === team.id ? 'opacity-50 ring-1 ring-amber-500/40' : ''
                          }`}
                          title="Kéo sang bảng khác hoặc bấm gỡ"
                        >
                          <span className="truncate font-semibold text-slate-200">
                            #{index + 1} {team.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveGroupAssignment(team.id)}
                            disabled={actionLoading}
                            className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-amber-400"
                            title="Gỡ khỏi bảng"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )) : (
                        <div className="rounded-xl border border-dashed border-slate-800 px-3 py-12 text-center text-xs italic text-slate-600">
                          Thả đội vào đây
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={GitBranch}
              title="Chưa có đội tuyển để phân bảng"
              description="Cần hoàn tất bước đội tuyển trước khi phân bảng A và B."
            />
          )}

          {!groupAssignmentValidation.valid && teams.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
              <div className="font-bold text-amber-300">Chưa thể lưu phân bảng</div>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {groupAssignmentValidation.errors.slice(0, 4).map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {isAssigned && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/35 p-4">
              <div className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                Phân bảng đã lưu
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.map((group) => (
                  <div key={group.id} className="rounded-xl border border-slate-800 bg-slate-900/45 p-3">
                    <div className="mb-2 text-xs font-bold text-amber-500">
                      {group.name} (Bảng {group.code})
                    </div>
                    <div className="space-y-1.5">
                      {group.groupTeams.map((groupTeam) => (
                        <div key={groupTeam.id} className="flex justify-between items-center rounded-lg bg-slate-950/40 px-2.5 py-2 text-xs">
                          <span className="font-semibold text-slate-200">{groupTeam.team.name}</span>
                          <span className="text-[10px] text-slate-500">#{groupTeam.seedOrder}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
