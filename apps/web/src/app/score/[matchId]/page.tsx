'use client';

import { apiFetch } from '@/lib/api-client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

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

  // Override result modal state
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    teamAScore: 0,
    teamBScore: 0,
    winnerTeamId: '',
    reason: '',
  });

  // Segment edit modal state
  const [showSegmentEditModal, setShowSegmentEditModal] = useState(false);
  const [editingSegment, setEditingSegment] = useState<any>(null);
  const [segmentEditForm, setSegmentEditForm] = useState({
    teamASegmentScore: 0,
    teamBSegmentScore: 0,
    reason: '',
  });
  const [quickResultForm, setQuickResultForm] = useState({
    teamAScore: 0,
    teamBScore: 0,
  });

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
      setQuickResultForm({
        teamAScore: data.result?.teamAScore ?? 0,
        teamBScore: data.result?.teamBScore ?? 0,
      });
      
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

  // Undo the latest point of a specific team (decrease score)
  const handleUndoTeamPoint = async (teamId: string) => {
    if (!match || isSubmitting) return;
    if (match.status === 'RESULT_CONFIRMED') {
      setError('Trận đấu đã được xác nhận kết quả, không thể giảm điểm!');
      playSound('error');
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn GIẢM 1 ĐIỂM của đội này?')) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await apiFetch(`/matches/${matchId}/score-events/undo-team`, {
        method: 'POST',
        body: { teamId, reason: 'Trọng tài giảm điểm trực tiếp' },
      });
      playSound('undo');
      loadMatchDetails(false);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Lỗi giảm điểm số.');
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

  // Start the match from READY or LINEUP_READY status
  const handleStartMatch = async () => {
    if (!match || isSubmitting) return;
    
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await apiFetch(`/matches/${matchId}/start`, {
        method: 'POST',
      });
      playSound('complete');
      setSuccess('Trận đấu đã bắt đầu thành công!');
      loadMatchDetails(true);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Lỗi bắt đầu trận đấu.');
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

  // Helper: compute per-segment scores from scoreEvents
  const getSegmentScores = (seg: any) => {
    if (!match) return { scoreA: 0, scoreB: 0, pointsA: 0, pointsB: 0 };
    const allActive = (match.scoreEvents || []).filter((e: any) => !e.isUndone);
    const segEvents = allActive.filter((e: any) => e.segmentId === seg.id);
    if (segEvents.length === 0) return { scoreA: 0, scoreB: 0, pointsA: 0, pointsB: 0 };
    const last = segEvents[segEvents.length - 1];
    // Points A in this segment = count of events where scoringTeamId === teamAId
    const pointsA = segEvents.filter((e: any) => e.scoringTeamId === match.teamAId).length;
    const pointsB = segEvents.filter((e: any) => e.scoringTeamId === match.teamBId).length;
    return { scoreA: last.scoreAAfter, scoreB: last.scoreBAfter, pointsA, pointsB };
  };

  // Open segment edit modal
  const handleOpenSegmentEdit = (seg: any) => {
    const scores = getSegmentScores(seg);
    setEditingSegment(seg);
    setSegmentEditForm({
      teamASegmentScore: scores.pointsA,
      teamBSegmentScore: scores.pointsB,
      reason: '',
    });
    setError('');
    setShowSegmentEditModal(true);
  };

  // Submit segment override
  const handleOverrideSegmentScore = async () => {
    if (!match || !editingSegment || isSubmitting) return;
    if (!segmentEditForm.reason.trim()) {
      setError('Vui lòng nhập lý do chỉnh sửa.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/matches/${matchId}/segments/${editingSegment.id}/override-score`, {
        method: 'POST',
        body: {
          teamASegmentScore: Number(segmentEditForm.teamASegmentScore),
          teamBSegmentScore: Number(segmentEditForm.teamBSegmentScore),
          reason: segmentEditForm.reason,
        },
      });
      playSound('complete');
      setSuccess(`Đã chỉnh sửa kết quả chặng "${editingSegment.name}" thành công!`);
      setShowSegmentEditModal(false);
      setEditingSegment(null);
      loadMatchDetails(false);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Lỗi chỉnh sửa điểm chặng.');
      playSound('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open override modal - pre-fill with current scores
  const handleOpenOverrideModal = () => {
    if (!match) return;
    const scoreEventsFiltered = match.scoreEvents || [];
    const latestEv = scoreEventsFiltered[scoreEventsFiltered.length - 1];
    const curScoreA = latestEv ? latestEv.scoreAAfter : (match.result?.teamAScore ?? 0);
    const curScoreB = latestEv ? latestEv.scoreBAfter : (match.result?.teamBScore ?? 0);
    setOverrideForm({
      teamAScore: curScoreA,
      teamBScore: curScoreB,
      winnerTeamId: match.result?.winnerTeamId || match.winnerTeamId || '',
      reason: '',
    });
    setShowOverrideModal(true);
  };

  // Submit override result
  const handleOverrideResult = async () => {
    if (!match || isSubmitting) return;
    if (!overrideForm.winnerTeamId) {
      setError('Vui lòng chọn đội thắng.');
      return;
    }
    if (!overrideForm.reason.trim()) {
      setError('Vui lòng nhập lý do chỉnh sửa kết quả.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await apiFetch(`/matches/${matchId}/override-result`, {
        method: 'POST',
        body: {
          teamAScore: Number(overrideForm.teamAScore),
          teamBScore: Number(overrideForm.teamBScore),
          winnerTeamId: overrideForm.winnerTeamId,
          reason: overrideForm.reason,
        },
      });
      playSound('complete');
      setSuccess('Đã chỉnh sửa kết quả trận đấu thành công!');
      setShowOverrideModal(false);
      loadMatchDetails(true);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Lỗi chỉnh sửa kết quả.');
      playSound('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickResult = async () => {
    if (!match || isSubmitting) return;
    const teamAScore = Number(quickResultForm.teamAScore);
    const teamBScore = Number(quickResultForm.teamBScore);

    if (!Number.isInteger(teamAScore) || !Number.isInteger(teamBScore) || teamAScore < 0 || teamBScore < 0) {
      setError('Tỷ số phải là số nguyên không âm.');
      playSound('error');
      return;
    }

    if (teamAScore === teamBScore) {
      setError('Tỷ số chung cuộc không được hòa.');
      playSound('error');
      return;
    }

    const winnerName = teamAScore > teamBScore ? match.teamA?.name : match.teamB?.name;
    if (!confirm(`Lưu tỷ số chung cuộc ${teamAScore}-${teamBScore} cho ${winnerName || 'đội thắng'}?`)) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await apiFetch(`/matches/${matchId}/quick-result`, {
        method: 'POST',
        body: { teamAScore, teamBScore },
      });
      playSound('complete');
      setSuccess('Đã nhập nhanh tỷ số chung cuộc. Vui lòng xác nhận kết quả nếu chính xác.');
      loadMatchDetails(true);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Lỗi nhập nhanh tỷ số.');
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
          <button onClick={() => router.push(match?.tournamentId ? `/admin/${match.tournamentId}/scoring` : '/admin')} className="btn btn-secondary text-xs py-2 w-full">Quay lại danh sách</button>
        </div>
      </div>
    );
  }

  // Active scores derived from database fields
  // In the real-time scoring engine, we replay score events or use matches current values.
  const scoreEventsFiltered = match.scoreEvents || [];
  const latestEvent = scoreEventsFiltered[scoreEventsFiltered.length - 1];
  const scoreA = latestEvent ? latestEvent.scoreAAfter : (match.result?.teamAScore ?? 0);
  const scoreB = latestEvent ? latestEvent.scoreBAfter : (match.result?.teamBScore ?? 0);
  const quickScoreEnabled = match.tournament?.ruleset?.quickScoreEntryEnabled === true;
  const requireLineup = match.tournament?.ruleset?.requireLineup !== false;

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
            {getMatchStatusLabel(match.status)}
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
        {(match.status === 'READY' || match.status === 'LINEUP_READY' || (!requireLineup && (match.status === 'SCHEDULED' || match.status === 'LINEUP_PENDING'))) && (
          <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl text-center space-y-4 max-w-xl mx-auto backdrop-blur-md shadow-2xl">
            <span className="text-3xl text-emerald-400 animate-pulse-soft block">🏁 TRẬN ĐẤU SẴN SÀNG</span>
            <h3 className="text-base font-bold text-slate-200">
              {!requireLineup ? 'Trận đấu đã sẵn sàng bắt đầu (không yêu cầu đội hình).' : 'Đội hình thi đấu đã sẵn sàng để bắt đầu trận đấu.'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Vui lòng kiểm tra lại sân đấu và hai đội bóng. Khi mọi thứ đã sẵn sàng, hãy nhấn nút bên dưới để bắt đầu tính điểm.
            </p>
            <button
              onClick={handleStartMatch}
              disabled={isSubmitting}
              className="w-full btn btn-primary bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold border-none py-3 shadow-lg shadow-emerald-500/10 text-sm transition-all cursor-pointer"
            >
              🚀 BẮT ĐẦU TRẬN ĐẤU
            </button>
          </div>
        )}

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

        {match.status === 'RESULT_CONFIRMED' && (
          <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl text-center space-y-4 max-w-xl mx-auto backdrop-blur-md shadow-2xl">
            <span className="text-3xl text-emerald-400 block">✅ KẾT QUẢ ĐÃ XÁC NHẬN</span>
            <h3 className="text-base font-bold text-slate-200">Trận đấu đã hoàn tất — tỷ số chính thức: <span className="text-emerald-400 font-mono">{scoreA} – {scoreB}</span></h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bảng xếp hạng đã được cập nhật. Nếu phát hiện sai sót, trọng tài có thể chỉnh sửa và ghi đè kết quả bên dưới.
            </p>
            <button
              onClick={handleOpenOverrideModal}
              disabled={isSubmitting}
              className="w-full py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:border-amber-500/50 font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-2"
            >
              ✏️ CHỈNH SỬA KẾT QUẢ
            </button>
          </div>
        )}

        {quickScoreEnabled ? (
          <div className="max-w-3xl w-full mx-auto rounded-3xl border border-slate-800 bg-slate-900/50 p-6 shadow-2xl space-y-6">
            <div className="flex flex-col gap-2 border-b border-slate-800 pb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Nhập điểm nhanh</span>
              <h2 className="text-xl font-black text-slate-100">Tỷ số chung cuộc</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end">
              <div className="space-y-2">
                <label className="text-xs font-bold text-sky-400 block">{match.teamA?.name || 'Đội A'}</label>
                <input
                  type="number"
                  min={0}
                  value={quickResultForm.teamAScore}
                  onChange={(e) => setQuickResultForm((prev) => ({ ...prev, teamAScore: Number(e.target.value) }))}
                  disabled={isSubmitting || match.status === 'RESULT_CONFIRMED' || match.status === 'CANCELLED'}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-5 text-center text-5xl font-black font-mono text-sky-400 outline-none focus:border-sky-500"
                />
              </div>

              <div className="hidden md:flex h-[76px] items-center justify-center text-slate-600 font-black text-2xl">-</div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-pink-400 block">{match.teamB?.name || 'Đội B'}</label>
                <input
                  type="number"
                  min={0}
                  value={quickResultForm.teamBScore}
                  onChange={(e) => setQuickResultForm((prev) => ({ ...prev, teamBScore: Number(e.target.value) }))}
                  disabled={isSubmitting || match.status === 'RESULT_CONFIRMED' || match.status === 'CANCELLED'}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-5 text-center text-5xl font-black font-mono text-pink-400 outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={handleQuickResult}
                disabled={
                  isSubmitting ||
                  match.status === 'RESULT_CONFIRMED' ||
                  match.status === 'CANCELLED' ||
                  quickResultForm.teamAScore === quickResultForm.teamBScore
                }
                className="btn btn-primary py-3 font-black disabled:opacity-40"
              >
                ✓ Lưu tỷ số
              </button>
              <button
                onClick={() => {
                  if(confirm('Bạn muốn đóng bàn trọng tài này?')) {
                    router.push(match?.tournamentId ? `/admin/${match.tournamentId}/scoring` : '/admin');
                  }
                }}
                className="rounded-xl border border-slate-800 bg-slate-850 py-3 text-xs font-bold text-slate-300 hover:bg-slate-800"
              >
                Đóng Scorer Panel
              </button>
            </div>
          </div>
        ) : (
        <>
        {/* Large Score panels */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6 items-stretch">
          
          {/* Team A (SKY BLUE ACCENT) */}
          <div className="flex flex-col justify-between p-3 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900/40 relative overflow-hidden group">
            {/* Ambient Background glow */}
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-sky-500/5 rounded-full blur-3xl group-hover:bg-sky-500/10 transition-all duration-700" />
            
            <div className="relative space-y-2.5 sm:space-y-4">
              <span className="text-[8px] sm:text-[10px] tracking-widest text-sky-400 font-bold uppercase block">ĐỘI A</span>
              <h2 className="text-base sm:text-2xl font-black text-slate-100 truncate" title={match.teamA?.name || ''}>
                {match.teamA?.name || '—'}
              </h2>
              
              {/* Active lineup profile */}
              <div className="py-1.5 px-2 sm:py-2.5 sm:px-3 bg-slate-950/50 rounded-lg sm:rounded-xl border border-slate-900">
                <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-slate-500 font-bold block">VĐV Ra Sân</span>
                <div className="mt-1 space-y-0.5 sm:space-y-1">
                  {activePlayers.teamA.length > 0 ? (
                    activePlayers.teamA.map((p: any) => (
                      <div key={p.id} className="text-[10px] sm:text-xs font-semibold text-slate-350 flex items-center justify-between gap-1">
                        <span className="truncate">🎾 {p.playerProfile?.fullName}</span>
                        <span className="hidden xs:inline text-[8px] px-1 bg-slate-850 rounded text-slate-400 font-mono">
                          {p.playerProfile?.gender === 'MALE' ? 'Nam' : 'Nữ'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[10px] sm:text-xs text-slate-500 italic">Chưa khai báo</div>
                  )}
                </div>
              </div>
            </div>

            {/* Score digit */}
            <div className="my-4 sm:my-8 text-center relative select-none">
              <div className="text-6xl xs:text-7xl sm:text-[120px] md:text-[150px] font-black tracking-tighter leading-none text-sky-400 font-mono drop-shadow-[0_10px_25px_rgba(56,189,248,0.25)]">
                {scoreA}
              </div>
            </div>

            {/* Big Tap to score button */}
            <div>
              <button
                onClick={() => handleScorePoint(match.teamAId)}
                disabled={match.status !== 'RUNNING' || isSubmitting}
                className="relative w-full py-3 sm:py-5 bg-sky-500 text-slate-950 font-black rounded-xl sm:rounded-2xl hover:bg-sky-400 active:scale-98 transition-all shadow-lg shadow-sky-500/10 text-xs sm:text-sm tracking-wide disabled:opacity-30 disabled:pointer-events-none uppercase flex items-center justify-center gap-1"
              >
                ➕ <span className="hidden sm:inline">Ghi Điểm Đội A</span><span className="sm:hidden">ĐIỂM A</span>
              </button>
              <button
                onClick={() => handleUndoTeamPoint(match.teamAId)}
                disabled={match.status !== 'RUNNING' || isSubmitting || scoreA === 0}
                className="w-full mt-1.5 sm:mt-2.5 py-2 sm:py-3 bg-slate-800 text-sky-400 border border-sky-500/20 rounded-lg sm:rounded-xl hover:bg-slate-750 active:scale-98 transition-all text-[10px] sm:text-xs font-bold disabled:opacity-20 disabled:pointer-events-none uppercase flex items-center justify-center gap-1"
              >
                ➖ <span className="hidden sm:inline">Giảm Điểm Đội A</span><span className="sm:hidden">GIẢM A</span>
              </button>
            </div>
          </div>

          {/* Team B (ROSE/PINK ACCENT) */}
          <div className="flex flex-col justify-between p-3 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900/40 relative overflow-hidden group">
            {/* Ambient Background glow */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-pink-500/5 rounded-full blur-3xl group-hover:bg-pink-500/10 transition-all duration-700" />
            
            <div className="relative space-y-2.5 sm:space-y-4">
              <span className="text-[8px] sm:text-[10px] tracking-widest text-pink-400 font-bold uppercase block">ĐỘI B</span>
              <h2 className="text-base sm:text-2xl font-black text-slate-100 truncate" title={match.teamB?.name || ''}>
                {match.teamB?.name || '—'}
              </h2>
              
              {/* Active lineup profile */}
              <div className="py-1.5 px-2 sm:py-2.5 sm:px-3 bg-slate-950/50 rounded-lg sm:rounded-xl border border-slate-900">
                <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-slate-500 font-bold block">VĐV Ra Sân</span>
                <div className="mt-1 space-y-0.5 sm:space-y-1">
                  {activePlayers.teamB.length > 0 ? (
                    activePlayers.teamB.map((p: any) => (
                      <div key={p.id} className="text-[10px] sm:text-xs font-semibold text-slate-350 flex items-center justify-between gap-1">
                        <span className="truncate">🎾 {p.playerProfile?.fullName}</span>
                        <span className="hidden xs:inline text-[8px] px-1 bg-slate-850 rounded text-slate-400 font-mono">
                          {p.playerProfile?.gender === 'MALE' ? 'Nam' : 'Nữ'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[10px] sm:text-xs text-slate-500 italic">Chưa khai báo</div>
                  )}
                </div>
              </div>
            </div>

            {/* Score digit */}
            <div className="my-4 sm:my-8 text-center relative select-none">
              <div className="text-6xl xs:text-7xl sm:text-[120px] md:text-[150px] font-black tracking-tighter leading-none text-pink-400 font-mono drop-shadow-[0_10px_25px_rgba(244,63,94,0.25)]">
                {scoreB}
              </div>
            </div>

            {/* Big Tap to score button */}
            <div>
              <button
                onClick={() => handleScorePoint(match.teamBId)}
                disabled={match.status !== 'RUNNING' || isSubmitting}
                className="relative w-full py-3 sm:py-5 bg-pink-500 text-slate-950 font-black rounded-xl sm:rounded-2xl hover:bg-pink-400 active:scale-98 transition-all shadow-lg shadow-pink-500/10 text-xs sm:text-sm tracking-wide disabled:opacity-30 disabled:pointer-events-none uppercase flex items-center justify-center gap-1"
              >
                ➕ <span className="hidden sm:inline">Ghi Điểm Đội B</span><span className="sm:hidden">ĐIỂM B</span>
              </button>
              <button
                onClick={() => handleUndoTeamPoint(match.teamBId)}
                disabled={match.status !== 'RUNNING' || isSubmitting || scoreB === 0}
                className="w-full mt-1.5 sm:mt-2.5 py-2 sm:py-3 bg-slate-800 text-pink-400 border border-pink-500/20 rounded-lg sm:rounded-xl hover:bg-slate-750 active:scale-98 transition-all text-[10px] sm:text-xs font-bold disabled:opacity-20 disabled:pointer-events-none uppercase flex items-center justify-center gap-1"
              >
                ➖ <span className="hidden sm:inline">Giảm Điểm Đội B</span><span className="sm:hidden">GIẢM B</span>
              </button>
            </div>
          </div>

        </div>

        {/* Global score controls & details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Active Segment status + All Segments Breakdown */}
          <div className="card p-6 space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 border-b border-slate-850 pb-2">Chặng đấu</h3>

            {/* All segments list with scores + edit button */}
            <div className="space-y-2">
              {(match.segments || []).map((seg: any) => {
                const isActive = seg.id === activeSegment?.id;
                const isDone = seg.status === 'COMPLETED' || seg.status === 'RUNNING';
                const scores = getSegmentScores(seg);
                const canEdit = seg.status !== 'PENDING';
                return (
                  <div
                    key={seg.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-brand-500/10 border-brand-500/30'
                        : seg.status === 'COMPLETED'
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : seg.status === 'PENDING'
                        ? 'bg-slate-900/40 border-slate-800'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            isActive ? 'bg-brand-500/20 text-brand-400' :
                            seg.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-slate-800 text-slate-500'
                          }`}>
                            {seg.status === 'COMPLETED' ? '✓ Xong' : isActive ? '▶ Đang đấu' : 'Chờ'}
                          </span>
                          <span className="text-xs font-semibold text-slate-200 truncate">{seg.name}</span>
                        </div>
                        {isDone ? (
                          <div className="flex items-center gap-2 font-mono text-xs">
                            <span className="text-sky-400 font-bold">{scores.pointsA}<span className="text-slate-500 font-normal"> đA</span></span>
                            <span className="text-slate-600">–</span>
                            <span className="text-pink-400 font-bold">{scores.pointsB}<span className="text-slate-500 font-normal"> đB</span></span>
                            <span className="text-slate-600 text-[10px]">(Ụ: {scores.scoreA}-{scores.scoreB})</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 italic">Mốc đến: {seg.targetScore} điểm</div>
                        )}
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => handleOpenSegmentEdit(seg)}
                          disabled={isSubmitting}
                          className="flex-shrink-0 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 text-amber-400 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40"
                          title={`Chỉnh sửa điểm chặng ${seg.name}`}
                        >
                          ✏️
                        </button>
                      )}
                    </div>
                    {/* Progress bar for active segment */}
                    {isActive && (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>Tiến trình:</span>
                          <span>{Math.max(scoreA, scoreB)} / {seg.targetScore}</span>
                        </div>
                        <div className="w-full bg-slate-850 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-brand-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, (Math.max(scoreA, scoreB) / seg.targetScore) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

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
                onClick={() => {
                  if(confirm('Bạn muốn đóng bàn trọng tài này?')) {
                    router.push(match?.tournamentId ? `/admin/${match.tournamentId}/scoring` : '/admin');
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
        </>
        )}

      </main>

      {/* Scorer footer bar */}
      <footer className="bg-slate-900/10 border-t border-slate-900/50 py-4 px-6 text-center text-[10px] text-slate-600">
        GOLAB Pickleball Relays Platform © {new Date().getFullYear()} · Trọng tài chịu trách nhiệm chính về tính đúng đắn của dữ liệu.
      </footer>

      {/* Override Result Modal */}
      {showOverrideModal && match && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl shadow-amber-500/10 w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">✏️</span>
                <div>
                  <h2 className="text-sm font-bold text-slate-100">Chỉnh Sửa Kết Quả Trận Đấu</h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">Ghi đè kết quả đã xác nhận — cần lý do cụ thể</p>
                </div>
              </div>
              <button
                onClick={() => { setShowOverrideModal(false); setError(''); }}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all text-lg"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <span>⚠️</span> {error}
                </div>
              )}

              {/* Scores */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">
                    Điểm Đội A — {match.teamA?.name}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={overrideForm.teamAScore}
                    onChange={e => setOverrideForm(f => ({ ...f, teamAScore: Number(e.target.value) }))}
                    className="w-full bg-slate-800 border border-slate-700 focus:border-sky-500/50 rounded-xl px-4 py-3 text-slate-100 font-mono text-2xl font-black text-center outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-pink-400 block">
                    Điểm Đội B — {match.teamB?.name}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={overrideForm.teamBScore}
                    onChange={e => setOverrideForm(f => ({ ...f, teamBScore: Number(e.target.value) }))}
                    className="w-full bg-slate-800 border border-slate-700 focus:border-pink-500/50 rounded-xl px-4 py-3 text-slate-100 font-mono text-2xl font-black text-center outline-none transition-all"
                  />
                </div>
              </div>

              {/* Winner selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Đội Thắng</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setOverrideForm(f => ({ ...f, winnerTeamId: match.teamAId }))}
                    className={`py-3 px-4 rounded-xl font-bold text-xs border transition-all ${
                      overrideForm.winnerTeamId === match.teamAId
                        ? 'bg-sky-500/20 border-sky-500/60 text-sky-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    🏆 {match.teamA?.name || 'Đội A'}
                  </button>
                  <button
                    onClick={() => setOverrideForm(f => ({ ...f, winnerTeamId: match.teamBId }))}
                    className={`py-3 px-4 rounded-xl font-bold text-xs border transition-all ${
                      overrideForm.winnerTeamId === match.teamBId
                        ? 'bg-pink-500/20 border-pink-500/60 text-pink-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    🏆 {match.teamB?.name || 'Đội B'}
                  </button>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Lý do chỉnh sửa <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="VD: Điểm số ghi nhận sai do lỗi nhập liệu, kết quả thực tế là..."
                  value={overrideForm.reason}
                  onChange={e => setOverrideForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500/50 rounded-xl px-4 py-3 text-slate-200 text-xs outline-none resize-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 flex gap-3">
              <button
                onClick={() => { setShowOverrideModal(false); setError(''); }}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl font-bold text-xs border border-slate-700 transition-all disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleOverrideResult}
                disabled={isSubmitting || !overrideForm.winnerTeamId || !overrideForm.reason.trim()}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-xs transition-all disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-amber-500/20"
              >
                {isSubmitting ? '⏳ Đang lưu...' : '✓ XÁC NHẬN CHỈNH SỬA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Segment Score Edit Modal */}
      {showSegmentEditModal && editingSegment && match && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-sky-500/20 rounded-3xl shadow-2xl shadow-sky-500/5 w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">🎯</span>
                <div>
                  <h2 className="text-sm font-bold text-slate-100">Chỉnh Sửa Kết Quả Chặng</h2>
                  <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-brand-500/20 text-brand-400 rounded font-bold text-[9px]">{editingSegment.name}</span>
                    <span>— Mốc: {editingSegment.targetScore} điểm</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowSegmentEditModal(false); setEditingSegment(null); setError(''); }}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all text-lg"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <span>⚠️</span> {error}
                </div>
              )}

              <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-800/50 rounded-xl px-4 py-3">
                Nhập số điểm một đội gành được riêng trong chặng này
                (không phải tổng tích luỹ). Hệ thống sẽ tự động cập nhật lại toàn bộ trận đấu.
              </p>

              {/* Per-segment scores */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">
                    Điểm chặng — {match.teamA?.name}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      value={segmentEditForm.teamASegmentScore}
                      onChange={e => setSegmentEditForm(f => ({ ...f, teamASegmentScore: Number(e.target.value) }))}
                      className="w-full bg-slate-800 border border-slate-700 focus:border-sky-500/50 rounded-xl px-4 py-3 text-slate-100 font-mono text-3xl font-black text-center outline-none transition-all"
                    />
                    <div className="absolute inset-x-0 bottom-0 flex justify-between px-1 pb-0.5">
                      <button
                        onClick={() => setSegmentEditForm(f => ({ ...f, teamASegmentScore: Math.max(0, f.teamASegmentScore - 1) }))}
                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-sky-400 text-lg font-bold"
                      >-</button>
                      <button
                        onClick={() => setSegmentEditForm(f => ({ ...f, teamASegmentScore: f.teamASegmentScore + 1 }))}
                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-sky-400 text-lg font-bold"
                      >+</button>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-pink-400 block">
                    Điểm chặng — {match.teamB?.name}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      value={segmentEditForm.teamBSegmentScore}
                      onChange={e => setSegmentEditForm(f => ({ ...f, teamBSegmentScore: Number(e.target.value) }))}
                      className="w-full bg-slate-800 border border-slate-700 focus:border-pink-500/50 rounded-xl px-4 py-3 text-slate-100 font-mono text-3xl font-black text-center outline-none transition-all"
                    />
                    <div className="absolute inset-x-0 bottom-0 flex justify-between px-1 pb-0.5">
                      <button
                        onClick={() => setSegmentEditForm(f => ({ ...f, teamBSegmentScore: Math.max(0, f.teamBSegmentScore - 1) }))}
                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-pink-400 text-lg font-bold"
                      >-</button>
                      <button
                        onClick={() => setSegmentEditForm(f => ({ ...f, teamBSegmentScore: f.teamBSegmentScore + 1 }))}
                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-pink-400 text-lg font-bold"
                      >+</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Lý do chỉnh sửa <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="VD: Trọng tài ghi nhọn nhầm, kết quả chặng thực tế là..."
                  value={segmentEditForm.reason}
                  onChange={e => setSegmentEditForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 focus:border-sky-500/50 rounded-xl px-4 py-3 text-slate-200 text-xs outline-none resize-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 flex gap-3">
              <button
                onClick={() => { setShowSegmentEditModal(false); setEditingSegment(null); setError(''); }}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl font-bold text-xs border border-slate-700 transition-all disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleOverrideSegmentScore}
                disabled={isSubmitting || !segmentEditForm.reason.trim()}
                className="flex-1 py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl font-black text-xs transition-all disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-sky-500/20"
              >
                {isSubmitting ? '⏳ Đang lưu...' : '✓ CẬP NHẬT CHẶNG'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
