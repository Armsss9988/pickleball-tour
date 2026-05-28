'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';
import { PageLoading } from '@/components/loading-skeleton';
import { Trophy, Play, Calendar, AlertTriangle, Target, Zap, ChevronRight } from '@/components/icons';

export default function MatchesPage() {
  const { tournament, loading: tLoading } = useActiveTournament();
  const { toast } = useToast();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [matchToStart, setMatchToStart] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadMatches = async () => {
    if (!tournament) return;
    try {
      setLoading(true);
      const data = await apiFetch(`/tournaments/${tournament.id}/matches`);
      setMatches(data);
    } catch (e: any) {
      console.error(e);
      toast(e.message || 'Lỗi tải lịch thi đấu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [tournament]);

  const confirmStartMatch = (match: any) => {
    setMatchToStart(match);
    setStartModalOpen(true);
  };

  const handleStartMatch = async () => {
    if (!matchToStart) return;
    setActionLoading(true);

    try {
      await apiFetch(`/matches/${matchToStart.id}/start`, {
        method: 'POST',
      });
      toast('Trận đấu đã bắt đầu! Đội hình thi đấu đã được khóa chính thức.', 'success');
      setStartModalOpen(false);
      setMatchToStart(null);
      loadMatches();
    } catch (err: any) {
      toast(err.message || 'Lỗi bắt đầu trận đấu.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (tLoading || (loading && matches.length === 0)) {
    return <PageLoading />;
  }

  const groupMatches = matches.filter(m => m.groupId !== null);
  const playoffMatches = matches.filter(m => m.groupId === null);

  return (
    <div className="premium-container space-y-6 animate-scale-in">
      <PageHeader
        title="Lịch Thi Đấu & Trận Đấu"
        description="Theo dõi danh sách các trận đấu vòng bảng và các lượt trận trực tiếp knockout playoff."
        icon={Trophy}
      />

      <div className="space-y-8">
        {/* Vòng bảng section */}
        <div className="space-y-4">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Calendar className="w-5 h-5 text-amber-500" />
            Vòng Bảng (Group Stage Matches)
          </h3>
          
          {groupMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupMatches.map(m => (
                <div key={m.id} className="card p-4 space-y-4 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-slate-350 font-bold">
                      Bảng {m.group?.code || '—'} · Lượt {m.roundNo || '—'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      m.status === 'COMPLETED' || m.status === 'RESULT_CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      m.status === 'RUNNING' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20 animate-pulse' : 
                      m.status === 'LINEUP_READY' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {m.status}
                    </span>
                  </div>

                  <div className="space-y-2 py-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-slate-200">{m.teamA?.name || '—'}</span>
                      <span className="font-mono text-base font-bold text-slate-300">
                        {m.result ? m.result.teamAScore : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-slate-200">{m.teamB?.name || '—'}</span>
                      <span className="font-mono text-base font-bold text-slate-300">
                        {m.result ? m.result.teamBScore : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 flex justify-between items-center border-t border-slate-800 pt-2">
                    <span>Sân: {m.courtName || '—'} · {m.scheduledTime ? new Date(m.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                    <div className="flex items-center gap-2">
                      {m.status === 'LINEUP_READY' && (
                        <button
                          onClick={() => confirmStartMatch(m)}
                          className="text-emerald-400 hover:text-emerald-355 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-xs"
                          disabled={actionLoading}
                        >
                          <Play className="w-3.5 h-3.5" />
                          Bắt đầu
                        </button>
                      )}
                      {(m.status === 'RUNNING' || m.status === 'SEGMENT_BREAK') && (
                        <Link
                          href={`/admin/scoring`}
                          className="text-sky-400 hover:text-sky-300 font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 text-xs flex items-center gap-1"
                        >
                          <Target className="w-3.5 h-3.5" />
                          Chấm điểm
                        </Link>
                      )}
                      {m.status === 'COMPLETED' && (
                        <Link
                          href={`/admin/scoring`}
                          className="text-amber-400 hover:text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-xs flex items-center gap-1"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          Xác nhận KQ
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 bg-slate-800/10 border border-dashed border-slate-800 rounded-3xl text-center text-xs text-slate-500 italic py-10">
              Chưa có lịch thi đấu vòng bảng. Hãy phân bảng và tạo lịch trước.
            </div>
          )}
        </div>

        {/* Vòng Playoff section */}
        <div className="space-y-4">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Vòng Loại Trực Tiếp (Playoffs Knockout)
          </h3>
          
          {playoffMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playoffMatches.map(m => (
                <div key={m.id} className="card p-4 space-y-4 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs bg-purple-500/15 border border-purple-500/20 px-2 py-0.5 rounded text-purple-400 font-bold">
                      {m.label || 'Vòng Nhánh'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      m.status === 'COMPLETED' || m.status === 'RESULT_CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      m.status === 'RUNNING' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20 animate-pulse' : 
                      m.status === 'LINEUP_READY' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {m.status}
                    </span>
                  </div>

                  <div className="space-y-2 py-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-slate-200">{m.teamA?.name || 'Chờ xác định'}</span>
                      <span className="font-mono text-base font-bold text-slate-300">
                        {m.result ? m.result.teamAScore : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-slate-200">{m.teamB?.name || 'Chờ xác định'}</span>
                      <span className="font-mono text-base font-bold text-slate-300">
                        {m.result ? m.result.teamBScore : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 flex justify-between items-center border-t border-slate-800 pt-2">
                    <span>Sân: {m.courtName || '—'}</span>
                    <div className="flex items-center gap-2">
                      {m.status === 'LINEUP_READY' && (
                        <button
                          onClick={() => confirmStartMatch(m)}
                          className="text-emerald-400 hover:text-emerald-355 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-xs"
                          disabled={actionLoading}
                        >
                          <Play className="w-3.5 h-3.5" />
                          Bắt đầu
                        </button>
                      )}
                      {(m.status === 'RUNNING' || m.status === 'SEGMENT_BREAK') && (
                        <Link
                          href={`/admin/scoring`}
                          className="text-sky-400 hover:text-sky-300 font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 text-xs flex items-center gap-1"
                        >
                          <Target className="w-3.5 h-3.5" />
                          Chấm điểm
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 bg-slate-800/10 border border-dashed border-slate-800 rounded-3xl text-center text-xs text-slate-500 italic py-10">
              Chưa sinh lịch đấu Playoff. Hãy hoàn thành vòng bảng để sinh bracket Playoff.
            </div>
          )}
        </div>
      </div>

      {/* Confirm Start Match Modal */}
      <ConfirmModal
        open={startModalOpen}
        title="Bắt đầu trận đấu?"
        description={`Bạn có chắc chắn muốn bắt đầu trận đấu giữa "${matchToStart?.teamA?.name}" và "${matchToStart?.teamB?.name}"? Trạng thái trận đấu sẽ chuyển sang ĐANG CHẠY và đội hình thi đấu chặng hiện tại sẽ bị KHÓA.`}
        confirmLabel="Bắt đầu"
        cancelLabel="Hủy"
        variant="warning"
        loading={actionLoading}
        onConfirm={handleStartMatch}
        onCancel={() => {
          setStartModalOpen(false);
          setMatchToStart(null);
        }}
      />
    </div>
  );
}

