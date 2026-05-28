'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';
import { PageLoading } from '@/components/loading-skeleton';
import { Target, ExternalLink, CheckCircle2, AlertTriangle } from '@/components/icons';

export default function AdminScoringPage() {
  const { tournament, loading: tLoading } = useActiveTournament();
  const { toast } = useToast();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [matchToConfirm, setMatchToConfirm] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadMatches = async () => {
    if (!tournament) return;
    try {
      setLoading(true);
      const data = await apiFetch(`/tournaments/${tournament.id}/matches`);
      const filterStates = ['READY', 'RUNNING', 'SEGMENT_BREAK', 'COMPLETED', 'RESULT_CONFIRMED'];
      setMatches(data.filter((m: any) => filterStates.includes(m.status)));
    } catch (e: any) {
      console.error(e);
      toast(e.message || 'Lỗi tải danh sách trận đấu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [tournament]);

  const openConfirmModal = (match: any) => {
    setMatchToConfirm(match);
    setConfirmModalOpen(true);
  };

  const handleConfirmResult = async () => {
    if (!matchToConfirm) return;
    setActionLoading(true);

    try {
      await apiFetch(`/matches/${matchToConfirm.id}/confirm-result`, {
        method: 'POST',
      });
      toast('Đã xác nhận kết quả thành công! Bảng xếp hạng đã cập nhật.', 'success');
      setConfirmModalOpen(false);
      setMatchToConfirm(null);
      loadMatches();
    } catch (err: any) {
      toast(err.message || 'Lỗi xác nhận kết quả.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (tLoading || (loading && matches.length === 0)) {
    return <PageLoading />;
  }

  return (
    <div className="premium-container space-y-6 animate-scale-in">
      <PageHeader
        title="Chấm Điểm & Trọng Tài"
        description="Danh sách các trận đấu đang diễn ra hoặc đã hoàn thành cần xác nhận kết quả."
        icon={Target}
      />

      <div className="card p-6 space-y-4 shadow-xl">
        <h3 className="font-bold text-base text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
          <Target className="w-5 h-5 text-amber-500" />
          Trận đấu ghi nhận điểm số
        </h3>

        {matches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400">
                  <th className="py-4 px-4">Trận đấu</th>
                  <th className="px-4">Địa điểm</th>
                  <th className="px-4">Trạng thái</th>
                  <th className="px-4">Điểm số</th>
                  <th className="text-right py-4 px-4">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {matches.map(m => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-200">
                        {m.teamA?.name || '—'} vs {m.teamB?.name || '—'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-wider">
                        {m.group ? `Bảng ${m.group.code} · Lượt ${m.roundNo}` : m.label || 'Playoff'}
                      </div>
                    </td>
                    <td className="px-4 text-slate-400 text-xs">{m.courtName || 'Sân 1'}</td>
                    <td className="px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        m.status === 'RESULT_CONFIRMED' ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' :
                        m.status === 'COMPLETED' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                        m.status === 'RUNNING' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20 animate-pulse' : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 font-mono font-bold text-base text-slate-200">
                      {m.result ? `${m.result.teamAScore} - ${m.result.teamBScore}` : '—'}
                    </td>
                    <td className="text-right py-4 px-4 space-x-3">
                      {(m.status === 'RUNNING' || m.status === 'SEGMENT_BREAK' || m.status === 'READY') && (
                        <Link
                          href={`/score/${m.id}`}
                          target="_blank"
                          className="text-sky-400 hover:text-sky-305 font-bold text-xs inline-flex items-center gap-1 bg-sky-500/10 px-2.5 py-1 rounded border border-sky-500/20 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Bàn Trọng Tài
                        </Link>
                      )}
                      
                      {m.status === 'COMPLETED' && (
                        <button
                          onClick={() => openConfirmModal(m)}
                          className="text-emerald-400 hover:text-emerald-355 font-bold text-xs inline-flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 transition-colors"
                          disabled={actionLoading}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
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
          <p className="text-muted text-center py-10 italic text-slate-500 text-xs">
            Không có trận đấu nào đang chạy hoặc chờ xác nhận kết quả.
          </p>
        )}
      </div>

      {/* Confirm Result Modal */}
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

