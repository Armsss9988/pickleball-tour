'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function MatchesPage() {
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
      setMatches(data);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Lỗi tải lịch thi đấu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [tournament]);

  const handleStartMatch = async (matchId: string) => {
    if (!confirm('Bắt đầu trận đấu này? Thao tác này sẽ chuyển trạng thái trận đấu sang đang chạy.')) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await apiFetch(`/matches/${matchId}/start`, {
        method: 'POST',
      });
      setSuccess('Trận đấu đã bắt đầu! Đội hình thi đấu đã được khóa chính thức.');
      loadMatches();
    } catch (err: any) {
      setError(err.message || 'Lỗi bắt đầu trận đấu.');
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

  // Filter group matches vs knockout playoff matches
  const groupMatches = matches.filter(m => m.groupId !== null);
  const playoffMatches = matches.filter(m => m.groupId === null);

  return (
    <div className="premium-container p-6 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">🏓 Lịch Thi Đấu & Trận Đấu</h1>
          <p className="text-xs text-slate-400 mt-1">
            Theo dõi danh sách các trận đấu vòng bảng và các lượt trận trực tiếp knockout playoff.
          </p>
        </div>
      </div>

      {error && <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">⚠️ {error}</div>}
      {success && <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">✓ {success}</div>}

      <div className="space-y-6">
        {/* Vòng bảng section */}
        <div className="space-y-4">
          <h3 className="font-bold text-base text-brand-400">📅 Vòng Bảng (Group Stage Matches)</h3>
          
          {groupMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupMatches.map(m => (
                <div key={m.id} className="card p-4 space-y-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-bold">
                      Bảng {m.group?.code || '—'} · Lượt {m.roundNo || '—'}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${
                      m.status === 'COMPLETED' || m.status === 'RESULT_CONFIRMED' ? 'bg-emerald-500/15 text-emerald-400' :
                      m.status === 'RUNNING' ? 'bg-sky-500/15 text-sky-400 animate-pulse-soft' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {m.status}
                    </span>
                  </div>

                  <div className="space-y-2 py-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-slate-200">{m.teamA?.name || '—'}</span>
                      <span className="font-mono text-base font-bold text-slate-350">
                        {m.result ? m.result.teamAScore : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-slate-200">{m.teamB?.name || '—'}</span>
                      <span className="font-mono text-base font-bold text-slate-350">
                        {m.result ? m.result.teamBScore : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 flex justify-between items-center border-t border-slate-850 pt-2">
                    <span>Sân: {m.courtName || '—'} · {m.scheduledTime ? new Date(m.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                    <div className="flex items-center gap-2">
                      {m.status === 'LINEUP_READY' && (
                        <button
                          onClick={() => handleStartMatch(m.id)}
                          className="text-emerald-400 hover:text-emerald-300 font-bold"
                        >
                          Bắt đầu
                        </button>
                      )}
                      {(m.status === 'RUNNING' || m.status === 'SEGMENT_BREAK') && (
                        <Link
                          href={`/admin/scoring`}
                          className="text-sky-400 hover:text-sky-300 font-bold"
                        >
                          Chấm điểm
                        </Link>
                      )}
                      {m.status === 'COMPLETED' && (
                        <Link
                          href={`/admin/scoring`}
                          className="text-amber-400 hover:text-amber-300 font-bold"
                        >
                          Xác nhận KQ
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted italic text-sm">Chưa có lịch thi đấu vòng bảng. Hãy xếp lịch vòng bảng trước.</p>
          )}
        </div>

        {/* Vòng Playoff section */}
        <div className="space-y-4">
          <h3 className="font-bold text-base text-brand-400">🔱 Vòng Loại Trực Tiếp (Playoffs Knockout)</h3>
          
          {playoffMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playoffMatches.map(m => (
                <div key={m.id} className="card p-4 space-y-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-xs bg-purple-500/10 px-2 py-0.5 rounded text-purple-400 font-bold">
                      {m.label || 'Vòng Nhánh'}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${
                      m.status === 'COMPLETED' || m.status === 'RESULT_CONFIRMED' ? 'bg-emerald-500/15 text-emerald-400' :
                      m.status === 'RUNNING' ? 'bg-sky-500/15 text-sky-400 animate-pulse-soft' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {m.status}
                    </span>
                  </div>

                  <div className="space-y-2 py-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-slate-200">{m.teamA?.name || 'Chờ xác định'}</span>
                      <span className="font-mono text-base font-bold text-slate-350">
                        {m.result ? m.result.teamAScore : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-slate-200">{m.teamB?.name || 'Chờ xác định'}</span>
                      <span className="font-mono text-base font-bold text-slate-350">
                        {m.result ? m.result.teamBScore : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 flex justify-between items-center border-t border-slate-850 pt-2">
                    <span>Sân: {m.courtName || '—'}</span>
                    <div className="flex items-center gap-2">
                      {m.status === 'LINEUP_READY' && (
                        <button
                          onClick={() => handleStartMatch(m.id)}
                          className="text-emerald-400 hover:text-emerald-300 font-bold"
                        >
                          Bắt đầu
                        </button>
                      )}
                      {(m.status === 'RUNNING' || m.status === 'SEGMENT_BREAK') && (
                        <Link
                          href={`/admin/scoring`}
                          className="text-sky-400 hover:text-sky-300 font-bold"
                        >
                          Chấm điểm
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted italic text-sm">Chưa sinh lịch đấu Playoff. Hãy hoàn thành vòng bảng để sinh bracket Playoff.</p>
          )}
        </div>
      </div>
    </div>
  );
}
