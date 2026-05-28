'use client';

import { apiFetch } from '@/lib/api-client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

export default function RefereeScorerPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;

  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSegment, setActiveSegment] = useState<any>(null);
  const [activePlayers, setActivePlayers] = useState<{ teamA: any[]; teamB: any[] }>({ teamA: [], teamB: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  // Synthesize sound effects using Web Audio API so no audio files are needed!
  const playSound = (type: 'point' | 'undo' | 'complete' | 'error') => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'point') {
        // High upbeat chirp
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'undo') {
        // Falling slide
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.2); // A3
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'complete') {
        // Success fanfare chord
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        gain2.gain.setValueAtTime(0.1, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        
        osc.start();
        osc2.start();
        osc.stop(ctx.currentTime + 0.4);
        osc2.stop(ctx.currentTime + 0.4);
      } else if (type === 'error') {
        // Low buzzer
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn('Web Audio API not supported or blocked by user gesture:', e);
    }
  };

  const loadMatchDetails = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError('');
      const data = await apiFetch(`/matches/${matchId}`);
      setMatch(data);
      
      // Determine active segment (RUNNING or first PENDING/RUNNING segment)
      const currentSeg = data.segments.find((s: any) => s.status === 'RUNNING') || 
                         data.segments.find((s: any) => s.status === 'PENDING') || 
                         data.segments[data.segments.length - 1];
      setActiveSegment(currentSeg);

      // Find active players for this segment
      if (currentSeg) {
        const teamALineup = data.lineups.find((l: any) => l.segmentId === currentSeg.id && l.teamId === data.teamAId);
        const teamBLineup = data.lineups.find((l: any) => l.segmentId === currentSeg.id && l.teamId === data.teamBId);
        setActivePlayers({
          teamA: teamALineup?.players || [],
          teamB: teamBLineup?.players || [],
        });
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Lỗi tải thông tin trận đấu.');
      playSound('error');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Socket.io integration for real-time score updates
  useEffect(() => {
    loadMatchDetails();

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    // Connect to NestJS namespace 'ws'
    const socket = io(`${wsUrl}/ws`, {
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.io connected to scorer gateway');
      socket.emit('joinMatch', { matchId });
    });

    socket.on('score.updated', (payload: any) => {
      console.log('Realtime score update received:', payload);
      // Soft reload match details to sync
      loadMatchDetails(false);
      playSound('point');
    });

    socket.on('disconnect', () => {
      console.log('Socket.io disconnected');
    });

    return () => {
      if (socket) {
        socket.emit('leaveMatch', { matchId });
        socket.disconnect();
      }
    };
  }, [matchId]);

  // Apply a score point
  const handleScorePoint = async (scoringTeamId: string) => {
    if (!match || isSubmitting) return;
    if (match.status !== 'RUNNING') {
      setError('Trận đấu chưa bắt đầu hoặc đã kết thúc, không thể tính điểm!');
      playSound('error');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      await apiFetch(`/matches/${matchId}/score-events`, {
        method: 'POST',
        body: { scoringTeamId },
      });
      // The socket event will trigger state sync and sounds automatically
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Lỗi ghi nhận điểm số.');
      playSound('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Undo the latest point
  const handleUndoPoint = async () => {
    if (!match || isSubmitting) return;
    if (match.status === 'RESULT_CONFIRMED') {
      setError('Trận đấu đã được xác nhận kết quả, không thể undo!');
      playSound('error');
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn HOÀN TÁC (Undo) điểm số vừa ghi nhận?')) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await apiFetch(`/matches/${matchId}/score-events/undo-latest`, {
        method: 'POST',
        body: { reason: 'Trọng tài điều chỉnh điểm số tại bàn scorer' },
      });
      playSound('undo');
      loadMatchDetails(false);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Lỗi hoàn tác điểm số.');
      playSound('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Transition to next segment
  const handleStartNextSegment = async () => {
    if (!match || !activeSegment || isSubmitting) return;
    
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await apiFetch(`/matches/${matchId}/segments/${activeSegment.id}/start-next`, {
        method: 'POST',
      });
      playSound('complete');
      setSuccess('Đã chuyển chặng thi đấu thành công!');
      loadMatchDetails(true);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Lỗi chuyển chặng thi đấu.');
      playSound('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm final result
  const handleConfirmResult = async () => {
    if (!match || isSubmitting) return;
    
    if (!confirm('Xác nhận kết quả chung cuộc của trận đấu? Bảng xếp hạng sẽ tự động cập nhật ngay.')) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await apiFetch(`/matches/${matchId}/confirm-result`, {
        method: 'POST',
      });
      playSound('complete');
      setSuccess('Đã xác nhận kết quả chung cuộc thành công!');
      loadMatchDetails(true);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Lỗi xác nhận kết quả.');
      playSound('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
        <span className="login-spinner" style={{ width: '50px', height: '50px', borderTopColor: 'var(--brand-500)' }} />
        <p className="mt-4 text-sm font-semibold tracking-wide text-slate-400">ĐANG TẢI BÀN TRỌNG TÀI...</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200 p-4">
        <div className="card max-w-md p-8 text-center space-y-4 border border-rose-500/30 bg-rose-500/5">
          <span className="text-4xl text-rose-500">⚠️</span>
          <h2 className="text-lg font-bold text-slate-100">Lỗi Tải Trận Đấu</h2>
          <p className="text-xs text-slate-400">Không tìm thấy thông tin trận đấu này. Vui lòng kiểm tra lại ID hoặc đường truyền mạng.</p>
          <button onClick={() => router.push('/admin/scoring')} className="btn btn-secondary text-xs py-2 w-full">Quay lại danh sách</button>
        </div>
      </div>
    );
  }

  // Active scores derived from database fields
  // In the real-time scoring engine, we replay score events or use matches current values.
  const scoreEventsFiltered = match.scoreEvents || [];
  const latestEvent = scoreEventsFiltered[scoreEventsFiltered.length - 1];
  const scoreA = latestEvent ? latestEvent.scoreAAfter : 0;
  const scoreB = latestEvent ? latestEvent.scoreBAfter : 0;

  // Next target threshold visual mapping
  const activeTargetScore = activeSegment ? activeSegment.targetScore : 24;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-brand-500/35 selection:text-white">
      {/* Top Header */}
      <header className="bg-slate-900/40 backdrop-blur-md border-b border-slate-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎛️</span>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest text-brand-400">Scorer Console</h1>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {match.id.substring(0, 8)}...</div>
          </div>
        </div>
        
        {/* Match state header */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline-block">Trạng thái:</span>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            match.status === 'RUNNING' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 animate-pulse-soft' :
            match.status === 'SEGMENT_BREAK' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
            match.status === 'COMPLETED' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
            match.status === 'RESULT_CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            {match.status}
          </span>
          <button 
            onClick={() => loadMatchDetails(true)} 
            className="p-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-xs" 
            title="Làm mới dữ liệu"
          >
            🔄
          </button>
        </div>
      </header>

      {/* Main Scoreboard Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-between space-y-6">
        
        {/* Alert & Message system */}
        <div className="space-y-2">
          {error && <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-sm font-semibold flex items-center gap-2"><span>⚠️</span> {error}</div>}
          {success && <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-sm font-semibold flex items-center gap-2"><span>✓</span> {success}</div>}
        </div>

        {/* Dynamic game flow cards */}
        {match.status === 'SEGMENT_BREAK' && activeSegment && (
          <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-3xl text-center space-y-4 max-w-xl mx-auto backdrop-blur-md shadow-2xl">
            <span className="text-3xl text-amber-400 animate-bounce block">⏸️ ĐỔI SÂN & NGHỈ CHẶNG</span>
            <h3 className="text-base font-bold text-slate-200">Đã hoàn thành chặng thi đấu: <span className="text-amber-400">{activeSegment.name}</span></h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Điểm số hiện tại đang là <strong className="text-slate-200 font-mono text-sm">{scoreA} - {scoreB}</strong>. 
              Vui lòng yêu cầu hai đội đổi sân thi đấu. Khi hai đội đã sẵn sàng thi đấu chặng tiếp theo, hãy nhấn nút bên dưới.
            </p>
            <button
              onClick={handleStartNextSegment}
              disabled={isSubmitting}
              className="w-full btn btn-primary bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border-none py-3 shadow-lg shadow-amber-500/10 text-sm transition-all"
            >
              🚀 BẮT ĐẦU CHẶNG TIẾP THEO
            </button>
          </div>
        )}

        {match.status === 'COMPLETED' && (
          <div className="p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-3xl text-center space-y-4 max-w-xl mx-auto backdrop-blur-md shadow-2xl">
            <span className="text-3xl text-indigo-400 animate-pulse-soft block">🏆 TRẬN ĐẤU HOÀN THÀNH</span>
            <h3 className="text-base font-bold text-slate-200">Kịch tính! Một đội đã đạt mốc điểm chiến thắng: <span className="text-indigo-400">{match.winScore}</span></h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Kết quả chung cuộc ghi nhận <strong className="text-slate-200 font-mono text-sm">{scoreA} - {scoreB}</strong>. 
              Vui lòng kiểm tra lại toàn bộ biên bản timeline điểm số dưới đây. Nếu chính xác, hãy xác nhận để cập nhật bảng xếp hạng giải đấu.
            </p>
            <button
              onClick={handleConfirmResult}
              disabled={isSubmitting}
              className="w-full btn btn-primary bg-indigo-500 hover:bg-indigo-600 text-white font-bold border-none py-3 shadow-lg shadow-indigo-500/25 text-sm transition-all"
            >
              ✓ HOÀN THÀNH & XÁC NHẬN KẾT QUẢ
            </button>
          </div>
        )}

        {/* Large Score panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          
          {/* Team A (SKY BLUE ACCENT) */}
          <div className="flex flex-col justify-between p-6 rounded-3xl border border-slate-800 bg-slate-900/40 relative overflow-hidden group">
            {/* Ambient Background glow */}
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-sky-500/5 rounded-full blur-3xl group-hover:bg-sky-500/10 transition-all duration-700" />
            
            <div className="relative space-y-4">
              <span className="text-[10px] tracking-widest text-sky-400 font-bold uppercase block">ĐỘI A</span>
              <h2 className="text-2xl font-black text-slate-100">{match.teamA?.name || '—'}</h2>
              
              {/* Active lineup profile */}
              <div className="py-2.5 px-3 bg-slate-950/50 rounded-xl border border-slate-900">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">VĐV Đang Ra Sân</span>
                <div className="mt-1 space-y-1">
                  {activePlayers.teamA.length > 0 ? (
                    activePlayers.teamA.map((p: any) => (
                      <div key={p.id} className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>🎾 {p.playerProfile?.fullName}</span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-slate-850 rounded text-slate-400 font-mono">
                          {p.playerProfile?.gender === 'MALE' ? 'Nam' : 'Nữ'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 italic">Chưa khai báo đội hình chặng</div>
                  )}
                </div>
              </div>
            </div>

            {/* Score digit */}
            <div className="my-8 text-center relative select-none">
              <div className="text-[120px] sm:text-[150px] font-black tracking-tighter leading-none text-sky-400 font-mono drop-shadow-[0_10px_35px_rgba(56,189,248,0.25)]">
                {scoreA}
              </div>
            </div>

            {/* Big Tap to score button */}
            <button
              onClick={() => handleScorePoint(match.teamAId)}
              disabled={match.status !== 'RUNNING' || isSubmitting}
              className="relative w-full py-5 bg-sky-500 text-slate-950 font-black rounded-2xl hover:bg-sky-400 active:scale-98 transition-all shadow-lg shadow-sky-500/10 text-sm tracking-wide disabled:opacity-30 disabled:pointer-events-none uppercase"
            >
              ➕ Ghi Điểm Đội A
            </button>
          </div>

          {/* Team B (ROSE/PINK ACCENT) */}
          <div className="flex flex-col justify-between p-6 rounded-3xl border border-slate-800 bg-slate-900/40 relative overflow-hidden group">
            {/* Ambient Background glow */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-pink-500/5 rounded-full blur-3xl group-hover:bg-pink-500/10 transition-all duration-700" />
            
            <div className="relative space-y-4">
              <span className="text-[10px] tracking-widest text-pink-400 font-bold uppercase block">ĐỘI B</span>
              <h2 className="text-2xl font-black text-slate-100">{match.teamB?.name || '—'}</h2>
              
              {/* Active lineup profile */}
              <div className="py-2.5 px-3 bg-slate-950/50 rounded-xl border border-slate-900">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">VĐV Đang Ra Sân</span>
                <div className="mt-1 space-y-1">
                  {activePlayers.teamB.length > 0 ? (
                    activePlayers.teamB.map((p: any) => (
                      <div key={p.id} className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>🎾 {p.playerProfile?.fullName}</span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-slate-850 rounded text-slate-400 font-mono">
                          {p.playerProfile?.gender === 'MALE' ? 'Nam' : 'Nữ'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 italic">Chưa khai báo đội hình chặng</div>
                  )}
                </div>
              </div>
            </div>

            {/* Score digit */}
            <div className="my-8 text-center relative select-none">
              <div className="text-[120px] sm:text-[150px] font-black tracking-tighter leading-none text-pink-400 font-mono drop-shadow-[0_10px_35px_rgba(244,63,94,0.25)]">
                {scoreB}
              </div>
            </div>

            {/* Big Tap to score button */}
            <button
              onClick={() => handleScorePoint(match.teamBId)}
              disabled={match.status !== 'RUNNING' || isSubmitting}
              className="relative w-full py-5 bg-pink-500 text-slate-950 font-black rounded-2xl hover:bg-pink-400 active:scale-98 transition-all shadow-lg shadow-pink-500/10 text-sm tracking-wide disabled:opacity-30 disabled:pointer-events-none uppercase"
            >
              ➕ Ghi Điểm Đội B
            </button>
          </div>

        </div>

        {/* Global score controls & details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Active Segment status and target threshold details */}
          <div className="card p-6 space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 border-b border-slate-850 pb-2">Chặng hiện tại</h3>
            
            {activeSegment ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">{activeSegment.name}</span>
                  <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-bold">Chặng {activeSegment.segmentOrder}</span>
                </div>
                <div className="text-xs text-slate-400">
                  Mốc điểm chặng: <strong className="text-brand-400 font-mono text-sm">{activeTargetScore}</strong>
                </div>
                
                {/* Visual game progress bar to active chặng target score */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>Tiến trình chặng {activeSegment.segmentOrder}:</span>
                    <span>{Math.max(scoreA, scoreB)} / {activeTargetScore}</span>
                  </div>
                  <div className="w-full bg-slate-850 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-brand-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (Math.max(scoreA, scoreB) / activeTargetScore) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic">Không có chặng đấu nào active</div>
            )}

            {/* Total match points details */}
            <div className="pt-3 border-t border-slate-850 text-xs text-slate-400 space-y-1.5">
              <div>Tổng điểm tối đa: <strong className="text-slate-200 font-mono">{match.winScore}</strong></div>
              <div>Cơ chế đổi sân: Theo chặng tiếp sức (sau mốc 8 và 16 điểm)</div>
            </div>
          </div>

          {/* Scoring Control Center (Undo / Actions) */}
          <div className="card p-6 space-y-4 flex flex-col justify-between h-full">
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 border-b border-slate-850 pb-2">Bảng Điều Khiển</h3>
              <p className="text-[10px] text-slate-500 mt-1">Mọi thay đổi điểm số sẽ được đồng bộ ngay lập tức lên màn hình công chúng lớn.</p>
            </div>
            
            <div className="space-y-2.5 pt-4">
              <button
                onClick={handleUndoPoint}
                disabled={scoreEventsFiltered.length === 0 || match.status === 'RESULT_CONFIRMED' || isSubmitting}
                className="w-full py-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-20 disabled:pointer-events-none"
              >
                ↩ HOÀN TÁC ĐIỂM (UNDO LATEST)
              </button>

              <button
                onClick={() => {
                  if(confirm('Bạn muốn đóng bàn trọng tài này?')) {
                    router.push('/admin/scoring');
                  }
                }}
                className="w-full py-3 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl font-bold text-xs border border-slate-800 transition-all text-center block"
              >
                🚪 Đóng Scorer Panel
              </button>
            </div>
          </div>

          {/* Score events timeline log */}
          <div className="card p-6 space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 border-b border-slate-850 pb-2">Timeline Điểm Số</h3>
            
            <div className="space-y-2 overflow-y-auto max-h-40 pr-1.5 custom-scrollbar">
              {scoreEventsFiltered.length > 0 ? (
                scoreEventsFiltered.slice().reverse().map((ev: any, idx: number) => {
                  const isTeamAPoint = ev.scoringTeamId === match.teamAId;
                  return (
                    <div 
                      key={ev.id} 
                      className={`p-2 rounded-xl text-xs flex justify-between items-center ${
                        idx === 0 ? 'bg-brand-500/10 border border-brand-500/20 text-slate-200' : 'bg-slate-900/60 border border-slate-900 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-semibold">
                        <span className={isTeamAPoint ? 'text-sky-400' : 'text-pink-400'}>
                          {isTeamAPoint ? 'Đội A' : 'Đội B'}
                        </span>
                        <span>+{idx === 0 ? '1 điểm' : '1'}</span>
                      </div>
                      <div className="font-mono font-bold bg-slate-950 px-2 py-0.5 rounded text-slate-300">
                        {ev.scoreAAfter} - {ev.scoreBAfter}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-[10px] text-slate-500 italic text-center py-6">Chưa ghi nhận điểm số nào. Trận đấu đang ở tỷ số 0-0.</div>
              )}
            </div>
          </div>

        </div>

      </main>

      {/* Scorer footer bar */}
      <footer className="bg-slate-900/10 border-t border-slate-900/50 py-4 px-6 text-center text-[10px] text-slate-600">
        GOLAB Pickleball Relays Platform © {new Date().getFullYear()} · Trọng tài chịu trách nhiệm chính về tính đúng đắn của dữ liệu.
      </footer>
    </div>
  );
}
