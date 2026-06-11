'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { getCurrentUser } from '@/lib/current-user';
import { buildTournamentUxContext } from '@/lib/tournament-ux-context';
import { getActionAccess } from '@/lib/tournament-ux-policy';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading-skeleton';
import { Target, ExternalLink, CheckCircle2, AlertTriangle, AlertCircle, Loader2 } from '@/components/icons';

interface MatchListItem {
  id: string;
  status: string;
  label?: string | null;
  roundNo?: number | null;
  courtName?: string | null;
  teamAId?: string | null;
  teamBId?: string | null;
  group?: { code: string } | null;
  teamA?: { id: string; name?: string | null } | null;
  teamB?: { id: string; name?: string | null } | null;
  result?: {
    teamAScore: number;
    teamBScore: number;
    winnerTeamId?: string | null;
  } | null;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
}

function filterScoringMatches(data: MatchListItem[]): MatchListItem[] {
  const filterStates = ['READY', 'RUNNING', 'SEGMENT_BREAK', 'COMPLETED', 'RESULT_CONFIRMED'];
  return data.filter((match) => filterStates.includes(match.status));
}

function getMatchStatusLabel(status: string): string {
  const map: Record<string, string> = {
    SCHEDULED: 'Chưa bắt đầu',
    LINEUP_PENDING: 'Chờ lineup',
    LINEUP_READY: 'Đã nộp lineup',
    READY: 'Sẵn sàng',
    RUNNING: 'Đang đấu',
    SEGMENT_BREAK: 'Nghỉ chặng',
    COMPLETED: 'Chờ xác nhận',
    RESULT_CONFIRMED: 'Đã kết thúc',
    CANCELLED: 'Đã hủy',
    WALKOVER: 'Bỏ cuộc',
  };
  return map[status] ?? status;
}


export default function AdminScoringPage() {
  const { tournament, loading: tLoading } = useActiveTournament();
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const role = currentUser.role;
  const isAuthorizedToOverride = role === 'super_admin' || role === 'btc_admin';

  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [allMatches, setAllMatches] = useState<MatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [matchToConfirm, setMatchToConfirm] = useState<MatchListItem | null>(null);
  
  // Override result states
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [matchToOverride, setMatchToOverride] = useState<MatchListItem | null>(null);
  const [overrideAScore, setOverrideAScore] = useState(0);
  const [overrideBScore, setOverrideBScore] = useState(0);
  const [overrideWinnerId, setOverrideWinnerId] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  const [actionLoading, setActionLoading] = useState(false);

  const loadMatches = async () => {
    if (!tournament) return;
    try {
      setLoading(true);
      const data = (await apiFetch(`/tournaments/${tournament.id}/matches`)) as MatchListItem[];
      setAllMatches(data);
      setMatches(filterScoringMatches(data));
    } catch (error: unknown) {
      console.error(error);
      toast(getErrorMessage(error, 'Lỗi tải danh sách trận đấu.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [tournament]);

  const getOverrideDisabledReason = (match: MatchListItem): string | null => {
    if (!tournament) return 'Thiếu dữ liệu giải đấu';

    const isGroupMatch = !!match.group || !!match.groupId;
    
    if (isGroupMatch) {
      const lockedStatuses = ['KNOCKOUT_GENERATED', 'KNOCKOUT_RUNNING', 'COMPLETED'];
      if (lockedStatuses.includes(tournament.status)) {
        return 'Giải đấu đã tiến sang vòng Knockout hoặc đã hoàn thành.';
      }
    } else {
      const currentRound = match.roundNo;
      if (currentRound !== undefined && currentRound !== null) {
        const hasNextRoundStarted = allMatches.some(m => {
          const isPlayoff = !m.group && !m.groupId;
          const isLaterRound = m.roundNo !== null && m.roundNo !== undefined && m.roundNo > currentRound;
          const isStartedOrDone = ['RUNNING', 'SEGMENT_BREAK', 'COMPLETED', 'RESULT_CONFIRMED'].includes(m.status);
          return isPlayoff && isLaterRound && isStartedOrDone;
        });

        if (hasNextRoundStarted) {
          return 'Đã có trận đấu ở vòng sau bắt đầu hoặc hoàn thành.';
        }
      }
    }

    return null;
  };

  const uxContext = buildTournamentUxContext({
    tournament,
    stats: {
      matchesCount: matches.length,
      lineupReadyCount: matches.filter((match) => match.status === 'LINEUP_READY' || match.status === 'READY').length,
      scoringReadyCount: matches.filter((match) => ['READY', 'RUNNING', 'SEGMENT_BREAK'].includes(match.status)).length,
      completedMatches: matches.filter((match) => match.status === 'COMPLETED' || match.status === 'RESULT_CONFIRMED').length,
      resultConfirmedMatches: matches.filter((match) => match.status === 'RESULT_CONFIRMED').length,
    },
  });

  const scoreAccess = getActionAccess('scoreMatch', role, uxContext);
  const confirmAccess = getActionAccess('confirmResults', role, uxContext);
  const canOpenScoreDesk = scoreAccess.allowed;
  const canConfirmResults = confirmAccess.allowed;

  const openConfirmModal = (match: MatchListItem) => {
    if (!canConfirmResults) return;
    setMatchToConfirm(match);
    setConfirmModalOpen(true);
  };

  const handleConfirmResult = async () => {
    if (!matchToConfirm || !canConfirmResults) return;
    setActionLoading(true);

    try {
      await apiFetch(`/matches/${matchToConfirm.id}/confirm-result`, {
        method: 'POST',
      });
      toast('Đã xác nhận kết quả thành công! Bảng xếp hạng đã cập nhật.', 'success');
      setConfirmModalOpen(false);
      setMatchToConfirm(null);
      loadMatches();
    } catch (error: unknown) {
      toast(getErrorMessage(error, 'Lỗi xác nhận kết quả.'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openOverrideModal = (match: MatchListItem) => {
    setMatchToOverride(match);
    setOverrideAScore(match.result?.teamAScore ?? 0);
    setOverrideBScore(match.result?.teamBScore ?? 0);
    setOverrideWinnerId(match.result?.winnerTeamId ?? match.teamA?.id ?? '');
    setOverrideReason('');
    setOverrideModalOpen(true);
  };

  const handleOverrideResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchToOverride || !isAuthorizedToOverride) return;
    if (!overrideReason.trim()) {
      toast('Vui lòng nhập lý do ghi đè kết quả.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      await apiFetch(`/matches/${matchToOverride.id}/override-result`, {
        method: 'POST',
        body: {
          teamAScore: overrideAScore,
          teamBScore: overrideBScore,
          winnerTeamId: overrideWinnerId,
          reason: overrideReason.trim(),
        },
      });

      toast('Ghi đè kết quả và cập nhật BXH thành công!', 'success');
      setOverrideModalOpen(false);
      setMatchToOverride(null);
      loadMatches();
    } catch (error: unknown) {
      toast(getErrorMessage(error, 'Lỗi ghi đè kết quả trận đấu.'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (tLoading || (loading && matches.length === 0)) {
    return <PageLoading />;
  }

  if (!canOpenScoreDesk && !canConfirmResults) {
    return (
      <div className="premium-container space-y-6 animate-scale-in">
        <PageHeader
          title="Chấm Điểm & Trọng Tài"
          description="Chỉ mở khi đã có trận sẵn sàng chấm điểm hoặc kết quả cần xác nhận."
          icon={Target}
        />

        <div className="card p-6 shadow-xl">
          <EmptyState
            icon={role === 'captain' || role === 'guest' ? AlertTriangle : Target}
            title={role === 'captain' ? 'Bạn không có quyền chấm điểm' : 'Chưa có trận đấu sẵn sàng'}
            description={scoreAccess.reason ?? confirmAccess.reason ?? 'Hiện chưa có thao tác chấm điểm hoặc xác nhận kết quả nào khả dụng.'}
            actionLabel={scoreAccess.nextLabel ?? confirmAccess.nextLabel}
            actionHref={scoreAccess.nextHref ?? confirmAccess.nextHref}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="premium-container space-y-6 animate-scale-in">
      <PageHeader
        title="Chấm Điểm & Trọng Tài"
        description="Danh sách các trận đấu đang diễn ra hoặc đã hoàn thành cần xác nhận kết quả."
        icon={Target}
      />

      <div className="card space-y-4 p-6 shadow-xl">
        <h3 className="flex items-center gap-2 border-b border-slate-800 pb-3 text-base font-bold text-slate-100">
          <Target className="h-5 w-5 text-amber-500" />
          Trận đấu ghi nhận điểm số
        </h3>

        {matches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400">
                  <th className="px-4 py-4">Trận đấu</th>
                  <th className="px-4">Địa điểm</th>
                  <th className="px-4">Trạng thái</th>
                  <th className="px-4">Điểm số</th>
                  <th className="px-4 py-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {matches.map((match) => (
                  <tr key={match.id} className="transition-colors hover:bg-slate-800/40">
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-200">
                        {match.teamA?.name || '—'} vs {match.teamB?.name || '—'}
                      </div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                        {match.group ? `Bảng ${match.group.code} · Lượt ${match.roundNo}` : match.label || 'Playoff'}
                      </div>
                    </td>
                    <td className="px-4 text-xs text-slate-400">{match.courtName || 'Sân 1'}</td>
                    <td className="px-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                        match.status === 'RESULT_CONFIRMED' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' :
                        match.status === 'COMPLETED' ? 'border-amber-500/20 bg-amber-500/10 text-amber-500' :
                        match.status === 'RUNNING' ? 'animate-pulse border-sky-500/20 bg-sky-500/10 text-sky-400' :
                        'border-slate-700 bg-slate-800 text-slate-400'
                      }`}>
                        {getMatchStatusLabel(match.status)}
                      </span>
                    </td>
                    <td className="px-4 font-mono text-base font-bold text-slate-200">
                      {match.result ? `${match.result.teamAScore} - ${match.result.teamBScore}` : '—'}
                    </td>
                    <td className="space-x-2.5 px-4 py-4 text-right">
                      {canOpenScoreDesk && ['RUNNING', 'SEGMENT_BREAK', 'READY'].includes(match.status) && (
                        <Link
                          href={`/score/${match.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 rounded border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-xs font-bold text-sky-400 transition-colors hover:text-sky-300"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Bàn Trọng Tài
                        </Link>
                      )}

                      {canConfirmResults && match.status === 'COMPLETED' && (
                        <button
                          onClick={() => openConfirmModal(match)}
                          className="inline-flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400 transition-colors hover:text-emerald-350"
                          disabled={actionLoading}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Xác Nhận KQ
                        </button>
                      )}

                      {isAuthorizedToOverride && (
                        <button
                          onClick={() => openOverrideModal(match)}
                          className="inline-flex items-center gap-1 rounded border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-400 transition-colors hover:text-rose-350 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={actionLoading || getOverrideDisabledReason(match) !== null}
                          title={getOverrideDisabledReason(match) ?? undefined}
                        >
                          <AlertCircle className="h-3.5 w-3.5" />
                          Ghi đè KQ
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-10 text-center text-xs italic text-slate-500">
            Không có trận đấu nào đang chạy hoặc chờ xác nhận kết quả.
          </p>
        )}
      </div>

      {/* Confirm Confirmation Modal */}
      <ConfirmModal
        open={confirmModalOpen}
        title="Xác nhận kết quả trận đấu?"
        description={`Bạn có chắc chắn muốn xác nhận kết quả cho trận đấu giữa "${matchToConfirm?.teamA?.name}" và "${matchToConfirm?.teamB?.name}"? Bảng xếp hạng giải đấu sẽ tự động cập nhật lại ngay lập tức.`}
        confirmLabel="Xác nhận"
        cancelLabel="Hủy"
        variant="warning"
        loading={actionLoading}
        onConfirm={handleConfirmResult}
        onCancel={() => {
          setConfirmModalOpen(false);
          setMatchToConfirm(null);
        }}
      />

      {/* Result Override Dialog (Ban Tổ Chức) */}
      {overrideModalOpen && matchToOverride && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleOverrideResult}
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl animate-scale-in"
          >
            <div className="flex items-center gap-2 text-rose-500 border-b border-slate-800 pb-3">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-base font-bold text-slate-100">Ghi Đè Kết Quả Trận Đấu</h3>
            </div>

            <p className="text-xs leading-relaxed text-slate-400">
              Quyền Ban Tổ Chức: Cho phép chỉnh sửa trực tiếp điểm số chung cuộc của trận đấu và điều chỉnh bảng xếp hạng. Hành động này sẽ được ghi nhật ký hệ thống.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-350">{matchToOverride.teamA?.name || 'Đội A'}</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={overrideAScore}
                  onChange={(e) => setOverrideAScore(parseInt(e.target.value, 10))}
                  className="w-full rounded-xl border border-slate-750 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-350">{matchToOverride.teamB?.name || 'Đội B'}</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={overrideBScore}
                  onChange={(e) => setOverrideBScore(parseInt(e.target.value, 10))}
                  className="w-full rounded-xl border border-slate-750 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-350">Chọn Đội Chiến Thắng</label>
              <select
                required
                value={overrideWinnerId}
                onChange={(e) => setOverrideWinnerId(e.target.value)}
                className="w-full rounded-xl border border-slate-750 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500"
              >
                <option value={matchToOverride.teamA?.id}>{matchToOverride.teamA?.name || 'Đội A'}</option>
                <option value={matchToOverride.teamB?.id}>{matchToOverride.teamB?.name || 'Đội B'}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-350">Lý do ghi đè kết quả</label>
              <textarea
                required
                placeholder="Ví dụ: Cập nhật lại điểm do trọng tài nhập sai kết quả chặng 3..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-750 bg-slate-950/50 px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setOverrideModalOpen(false);
                  setMatchToOverride(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-350 text-xs font-bold transition-all"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={actionLoading || !overrideReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-slate-950 text-xs font-bold transition-all flex items-center gap-1"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Xác Nhận Ghi Đè
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
