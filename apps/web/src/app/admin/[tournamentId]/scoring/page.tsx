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
import { Target, ExternalLink, CheckCircle2, AlertTriangle } from '@/components/icons';

interface MatchListItem {
  id: string;
  status: string;
  label?: string | null;
  roundNo?: number | null;
  courtName?: string | null;
  group?: { code: string } | null;
  teamA?: { name?: string | null } | null;
  teamB?: { name?: string | null } | null;
  result?: {
    teamAScore: number;
    teamBScore: number;
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

export default function AdminScoringPage() {
  const { tournament, loading: tLoading } = useActiveTournament();
  const { toast } = useToast();
  const { role } = getCurrentUser();
  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [matchToConfirm, setMatchToConfirm] = useState<MatchListItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      if (!tournament) return;

      void (async () => {
        try {
          setLoading(true);
          const data = (await apiFetch(`/tournaments/${tournament.id}/matches`)) as MatchListItem[];
          setMatches(filterScoringMatches(data));
        } catch (error: unknown) {
          console.error(error);
          toast(getErrorMessage(error, 'Lỗi tải danh sách trận đấu.'), 'error');
        } finally {
          setLoading(false);
        }
      })();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [toast, tournament]);

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
      if (tournament) {
        const data = (await apiFetch(`/tournaments/${tournament.id}/matches`)) as MatchListItem[];
        setMatches(filterScoringMatches(data));
      }
    } catch (error: unknown) {
      toast(getErrorMessage(error, 'Lỗi xác nhận kết quả.'), 'error');
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
                        {match.status}
                      </span>
                    </td>
                    <td className="px-4 font-mono text-base font-bold text-slate-200">
                      {match.result ? `${match.result.teamAScore} - ${match.result.teamBScore}` : '—'}
                    </td>
                    <td className="space-x-3 px-4 py-4 text-right">
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
                          className="inline-flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400 transition-colors hover:text-emerald-300"
                          disabled={actionLoading}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Xác Nhận KQ
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
    </div>
  );
}
