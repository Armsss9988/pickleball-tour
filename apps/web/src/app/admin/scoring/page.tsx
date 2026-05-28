'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminScoringPage() {
  const { tournament, loading: tLoading, error: tError } = useActiveTournament();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadMatches = async () => {
    if (!tournament) return;
    try {
      setLoading(true);
      setError('');
      const data = await apiFetch(`/tournaments/${tournament.id}/matches`);
      // Filter matches that are RUNNING, SEGMENT_BREAK, COMPLETED or RESULT_CONFIRMED
      const filterStates = ['READY', 'RUNNING', 'SEGMENT_BREAK', 'COMPLETED', 'RESULT_CONFIRMED'];
      setMatches(data.filter((m: any) => filterStates.includes(m.status)));
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Lỗi tải danh sách trận đấu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [tournament]);

  const handleConfirmResult = async (matchId: string) => {
    if (!confirm('Xác nhận kết quả trận đấu này? Bảng xếp hạng sẽ tự động cập nhật lại.')) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await apiFetch(`/matches/${matchId}/confirm-result`, {
        method: 'POST',
      });
      setSuccess('Đã xác nhận kết quả thành công! Bảng xếp hạng đã cập nhật.');
      loadMatches();
    } catch (err: any) {
      setError(err.message || 'Lỗi xác nhận kết quả.');
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">🎯 Chấm Điểm & Trọng Tài</h1>
          <p className="text-xs text-slate-400 mt-1">
            Danh sách các trận đấu đang diễn ra hoặc đã hoàn thành cần xác nhận kết quả.
          </p>
        </div>
      </div>

      {error && <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">⚠️ {error}</div>}
      {success && <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">✓ {success}</div>}

      <div className="card p-6 space-y-4">
        <h3 className="font-bold text-sm">Trận đấu ghi nhận điểm số</h3>

        {matches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400">
                  <th className="py-2.5">Trận đấu</th>
                  <th>Địa điểm</th>
                  <th>Trạng thái</th>
                  <th>Điểm số</th>
                  <th className="text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-sm">
                {matches.map(m => (
                  <tr key={m.id} className="hover:bg-slate-800/40">
                    <td className="py-3.5">
                      <div className="font-bold text-slate-200">
                        {m.teamA?.name || '—'} vs {m.teamB?.name || '—'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {m.group ? `Bảng ${m.group.code} · Lượt ${m.roundNo}` : m.label || 'Playoff'}
                      </div>
                    </td>
                    <td className="text-slate-400 text-xs">{m.courtName || 'Sân 1'}</td>
                    <td>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${
                        m.status === 'RESULT_CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400' :
                        m.status === 'COMPLETED' ? 'bg-amber-500/10 text-amber-400 font-bold' :
                        m.status === 'RUNNING' ? 'bg-sky-500/10 text-sky-400 animate-pulse-soft' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="font-mono font-bold text-base text-slate-350">
                      {m.result ? `${m.result.teamAScore} - ${m.result.teamBScore}` : '—'}
                    </td>
                    <td className="text-right space-x-3">
                      {(m.status === 'RUNNING' || m.status === 'SEGMENT_BREAK' || m.status === 'READY') && (
                        <Link
                          href={`/score/${m.id}`}
                          target="_blank"
                          className="text-sky-400 hover:text-sky-300 font-bold text-xs"
                        >
                          🎛️ Bàn Trọng Tài
                        </Link>
                      )}
                      
                      {m.status === 'COMPLETED' && (
                        <button
                          onClick={() => handleConfirmResult(m.id)}
                          className="text-emerald-400 hover:text-emerald-300 font-bold text-xs"
                        >
                          ✓ Xác Nhận Kết Quả
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted text-center py-10 italic">Không có trận đấu nào đang chạy hoặc chờ xác nhận kết quả.</p>
        )}
      </div>
    </div>
  );
}
