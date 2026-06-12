'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Trophy, ChevronRight, ChevronLeft } from '@/components/icons';

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

export default function PublicSpectatorPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [tournament, setTournament] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [bracket, setBracket] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'matches' | 'standings' | 'bracket' | 'teams'>('matches');
  const [selectedMatchGroup, setSelectedMatchGroup] = useState<string>('all');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const socketRef = useRef<Socket | null>(null);

  const loadAllData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError('');
      const res = await fetch(`/api/public/tournaments/${encodeURIComponent(slug)}`);
      if (!res.ok) {
        throw new Error(`Lỗi tải dữ liệu giải đấu công khai (Mã: ${res.status})`);
      }

      const data = await res.json();
      setTournament(data.tournament);
      setMatches(data.matches || []);
      setGroups(data.groups || []);
      setStandings(data.standings || []);
      setTeams(data.teams || []);
      setBracket(data.bracket || []);

    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Lỗi đồng bộ dữ liệu giải đấu.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      void loadAllData();
    }, 0);

    // Establish WebSocket listener for live point updates!
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    const socket = io(`${wsUrl}/ws`, {
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Public page connected to live scoring websocket');
    });

    socket.on('score.updated', (payload: any) => {
      console.log('Realtime public score update:', payload);
      // Soft-reload data to show updated live scores immediately!
      loadAllData(false);
    });

    return () => {
      window.clearTimeout(initialLoadTimer);
      if (socket) socket.disconnect();
    };
  }, [loadAllData]);

  // When tournament ID is determined, join the socket room
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !tournament?.id) return;

    const joinRoom = () => {
      socket.emit('joinTournament', { tournamentId: tournament.id });
      console.log('Emitted joinTournament for room:', `tournament:${tournament.id}`);
    };

    if (socket.connected) {
      joinRoom();
    }

    socket.on('connect', joinRoom);

    return () => {
      socket.off('connect', joinRoom);
      if (socket.connected) {
        socket.emit('leaveTournament', { tournamentId: tournament.id });
      }
    };
  }, [tournament?.id]);

  // Group list dynamically from matches
  const groupsInMatches = useMemo(() => {
    return Array.from(new Set(matches.map(m => m.group?.code).filter(Boolean))).sort() as string[];
  }, [matches]);

  // Filter matches based on selected tab
  const filteredMatchesForTab = useMemo(() => {
    return matches.filter(m => {
      if (selectedMatchGroup === 'playoff') {
        return !m.group;
      } else {
        if (!m.group) return false;
        if (selectedMatchGroup !== 'all') {
          return m.group.code === selectedMatchGroup;
        }
        return true;
      }
    });
  }, [matches, selectedMatchGroup]);

  const getTeamDisplayName = (team: any, source: string | null) => {
    if (team) return team.name;
    if (!source) return 'Chưa xác định';
    if (source.startsWith('SF')) {
      return `Chưa xác định (Thắng Bán Kết ${source.replace('SF', '')})`;
    }
    if (source.startsWith('QF') || source.startsWith('P')) {
      return `Chưa xác định (Thắng Vòng Nhánh ${source.replace('QF', '').replace('P', '')})`;
    }
    return `Chưa xác định (${source})`;
  };

  const renderBracketCard = (node: any) => {
    const isWinnerA = node.match?.result?.winnerTeamId === node.teamAId && node.teamAId;
    const isWinnerB = node.match?.result?.winnerTeamId === node.teamBId && node.teamBId;
    const isTeamATbd = !node.teamAId;
    const isTeamBTbd = !node.teamBId;
    
    const teamALabel = getTeamDisplayName(node.teamA, node.sourceA);
    const teamBLabel = getTeamDisplayName(node.teamB, node.sourceB);

    return (
      <div key={node.id} className="card p-4 space-y-3 bg-slate-905/70 border-slate-850 hover:border-slate-800 transition-colors shadow-md text-slate-200">
        <div className="text-[9px] text-slate-500 font-mono tracking-wider flex justify-between items-center">
          <span>CODE: #{node.nodeKey}</span>
          {node.match && (
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 font-mono">
              {getMatchStatusLabel(node.match.status)}
            </span>
          )}
        </div>
        
        <div className="space-y-2">
          <div className={`p-2 rounded-xl text-xs flex justify-between items-center ${
            isWinnerA 
              ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20' 
              : isTeamATbd 
                ? 'bg-slate-950/50 text-slate-600 italic border border-dashed border-slate-900' 
                : 'bg-slate-900/40 text-slate-300 border border-transparent'
          }`}>
            <span className="truncate max-w-[170px]" title={teamALabel}>{teamALabel}</span>
            {node.match?.result && <span className="font-mono text-[13px]">{node.match.result.teamAScore}</span>}
          </div>
          <div className={`p-2 rounded-xl text-xs flex justify-between items-center ${
            isWinnerB 
              ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20' 
              : isTeamBTbd 
                ? 'bg-slate-950/50 text-slate-600 italic border border-dashed border-slate-900' 
                : 'bg-slate-900/40 text-slate-300 border border-transparent'
          }`}>
            <span className="truncate max-w-[170px]" title={teamBLabel}>{teamBLabel}</span>
            {node.match?.result && <span className="font-mono text-[13px]">{node.match.result.teamBScore}</span>}
          </div>
        </div>
      </div>
    );
  };

  const finalNode = bracket.find((n: any) => n.nodeKey === 'F');

  const leftNodes = bracket.filter((n: any) => ['SF1', 'P1', 'QF1', 'QF2'].includes(n.nodeKey));
  const rightNodes = bracket.filter((n: any) => ['SF2', 'P2', 'QF3', 'QF4'].includes(n.nodeKey));

  const leftRound2 = leftNodes.filter((n: any) => n.roundName === 'Bán Kết');
  const leftRound1 = leftNodes.filter((n: any) => n.roundName === 'Vòng Nhánh' || n.roundName === 'Tứ Kết');

  const rightRound2 = rightNodes.filter((n: any) => n.roundName === 'Bán Kết');
  const rightRound1 = rightNodes.filter((n: any) => n.roundName === 'Vòng Nhánh' || n.roundName === 'Tứ Kết');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
        <span className="login-spinner" style={{ width: '50px', height: '50px', borderTopColor: 'var(--brand-500)' }} />
        <p className="mt-4 text-xs font-semibold tracking-widest text-slate-500">ĐANG ĐỒNG BỘ DỮ LIỆU LIVE...</p>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="card max-w-md p-8 text-center space-y-4 border border-rose-500/20 bg-rose-500/5">
          <span className="text-4xl text-rose-500">⚠️</span>
          <h2 className="text-lg font-bold text-slate-100">Không tìm thấy giải đấu</h2>
          <p className="text-xs text-slate-400">{error || 'Giải đấu chưa được xuất bản hoặc đường link không chính xác.'}</p>
          <Link href="/" className="btn btn-secondary text-xs w-full py-2">Quay lại trang chủ</Link>
        </div>
      </div>
    );
  }

  // Filter live active matches vs completed/scheduled matches
  const liveMatches = filteredMatchesForTab.filter(m => m.status === 'RUNNING' || m.status === 'SEGMENT_BREAK' || m.status === 'COMPLETED');
  const scheduledMatches = filteredMatchesForTab.filter(m => m.status === 'SCHEDULED' || m.status === 'LINEUP_PENDING' || m.status === 'LINEUP_READY' || m.status === 'READY');
  const finishedMatches = filteredMatchesForTab.filter(m => m.status === 'RESULT_CONFIRMED');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-brand-500/35 selection:text-white">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Public Header */}
      <header className="bg-slate-900/30 backdrop-blur-xl border-b border-slate-900 sticky top-0 z-50 px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand-400 uppercase tracking-widest">
            <span className="animate-ping w-2 h-2 rounded-full bg-emerald-500 inline-block mr-1" />
            Live Tournament Center
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight mt-0.5">{tournament.name}</h1>
          <p className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-2 mt-1">
            <span>🏟️ {tournament.venueName || 'Sân vận động GOLAB'}</span>
            <span>·</span>
            <span>📅 {tournament.openingTime ? new Date(tournament.openingTime).toLocaleDateString('vi-VN') : 'Sắp diễn ra'}</span>
          </p>
        </div>

        {/* Tab Selection */}
        <nav className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 self-stretch sm:self-auto overflow-x-auto gap-0.5">
          <button
            onClick={() => setActiveTab('matches')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'matches' ? 'bg-brand-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            🏓 Lịch Thi Đấu & Live
          </button>
          <button
            onClick={() => setActiveTab('standings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'standings' ? 'bg-brand-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            📈 Bảng Xếp Hạng
          </button>
          <button
            onClick={() => setActiveTab('bracket')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'bracket' ? 'bg-brand-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            🔱 Vòng Knockout
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'teams' ? 'bg-brand-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            🎽 Các Đội Tuyển
          </button>
        </nav>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 relative z-10">
        
        {/* MATCHES AND LIVE SCORE VIEW */}
        {activeTab === 'matches' && (
          <div className="space-y-8 animate-scale-in">
            {/* Group Filter Tabs */}
            {groupsInMatches.length > 0 && (
              <div className="space-y-3">
                {/* Level 1: Primary Stage Tabs */}
                <div className="flex flex-wrap items-center gap-1 bg-slate-900/40 p-1 rounded-xl border border-slate-900/60 max-w-max">
                  <button
                    onClick={() => setSelectedMatchGroup('all')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${selectedMatchGroup !== 'playoff' ? 'bg-brand-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Vòng Bảng
                  </button>
                  <button
                    onClick={() => setSelectedMatchGroup('playoff')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${selectedMatchGroup === 'playoff' ? 'bg-brand-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Playoffs
                  </button>
                </div>

                {/* Level 2: Sub-tabs (only if Vòng Bảng is selected) */}
                {selectedMatchGroup !== 'playoff' && (
                  <div className="flex flex-wrap items-center gap-1 bg-slate-900/20 p-1 rounded-xl border border-slate-800/40 max-w-max animate-scale-in">
                    <button
                      onClick={() => setSelectedMatchGroup('all')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${selectedMatchGroup === 'all' ? 'bg-slate-800 text-brand-400 border border-slate-700/50 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Tất cả
                    </button>
                    {groupsInMatches.map(groupCode => (
                      <button
                        key={groupCode}
                        onClick={() => setSelectedMatchGroup(groupCode)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${selectedMatchGroup === groupCode ? 'bg-slate-800 text-brand-400 border border-slate-700/50 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        Bảng {groupCode}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* LIVE MATCHES BLOCK */}
            {liveMatches.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <h2 className="text-base font-black text-slate-200 uppercase tracking-wider">ĐANG THI ĐẤU TRỰC TIẾP (LIVE SCORES)</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {liveMatches.map(m => {
                    const latestEvent = m.scoreEvents?.[m.scoreEvents.length - 1];
                    const scoreA = latestEvent ? latestEvent.scoreAAfter : 0;
                    const scoreB = latestEvent ? latestEvent.scoreBAfter : 0;
                    const activeSeg = m.segments?.find((s: any) => s.status === 'RUNNING') || m.segments?.[0];

                    return (
                      <div key={m.id} className="card p-6 border-brand-500/35 bg-brand-500/5 relative overflow-hidden flex flex-col justify-between space-y-6">
                        {/* Status bar */}
                        <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                          <span className="text-[10px] bg-slate-900/60 px-2 py-0.5 rounded text-slate-400 font-bold uppercase tracking-wider font-mono">
                            {m.group ? `BẢNG ${m.group.code} · VÒNG ${m.roundNo}` : m.label || 'Playoff'}
                          </span>
                          <span className="text-[10px] bg-emerald-500/25 px-2 py-0.5 rounded text-emerald-400 font-bold tracking-wider animate-pulse-soft">
                            {m.status === 'RUNNING' ? 'TRỰC TIẾP' : getMatchStatusLabel(m.status)}
                          </span>
                        </div>

                        {/* Score Board row */}
                        <div className="flex items-center justify-between py-2">
                          {/* Team A */}
                          <div className="flex-1 text-left space-y-1">
                            <div className="text-base sm:text-lg font-black text-slate-100 truncate">{m.teamA?.name || '—'}</div>
                            <span className="text-[10px] text-slate-500">Đội tuyển A</span>
                          </div>

                          {/* Live digits */}
                          <div className="flex items-center gap-4 bg-slate-950/80 px-4 py-2.5 rounded-2xl border border-slate-900 font-mono shadow-inner select-none mx-4">
                            <span className="text-3xl font-black text-sky-400">{scoreA}</span>
                            <span className="text-slate-600 text-sm font-semibold">:</span>
                            <span className="text-3xl font-black text-pink-400">{scoreB}</span>
                          </div>

                          {/* Team B */}
                          <div className="flex-1 text-right space-y-1">
                            <div className="text-base sm:text-lg font-black text-slate-100 truncate">{m.teamB?.name || '—'}</div>
                            <span className="text-[10px] text-slate-500">Đội tuyển B</span>
                          </div>
                        </div>

                        {/* Current segment detailed indicator */}
                        {activeSeg && (
                          <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-900 text-xs flex justify-between items-center text-slate-400">
                            <div>Chặng active: <strong className="text-brand-400">{activeSeg.name}</strong></div>
                            <div className="font-mono text-[10px] bg-slate-900 px-2 py-0.5 rounded">Mốc chặng: {activeSeg.targetScore}đ</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SCHEDULED UPCOMING MATCHES */}
            <div className="space-y-4">
              <h2 className="text-base font-black text-slate-200 border-b border-slate-900 pb-2 uppercase tracking-wider">LỊCH THI ĐẤU TIẾP THEO (UPCOMING MATCHES)</h2>
              
              {scheduledMatches.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scheduledMatches.map(m => (
                    <div key={m.id} className="card p-4 space-y-3 flex flex-col justify-between">
                      <div className="flex items-center justify-between border-b border-slate-850 pb-2 text-[10px] text-slate-500 font-mono font-bold uppercase">
                        <span>{m.group ? `Bảng ${m.group.code} · Vòng ${m.roundNo}` : m.label || 'Playoff'}</span>
                        <span className="text-slate-400">{getMatchStatusLabel(m.status)}</span>
                      </div>
                      
                      <div className="py-2 text-center text-sm font-semibold text-slate-200">
                        {m.teamA?.name || 'Chờ xác định'} vs {m.teamB?.name || 'Chờ xác định'}
                      </div>

                      <div className="text-[10px] text-slate-500 flex justify-between border-t border-slate-850 pt-2 font-mono">
                        <span>🏛️ {m.courtName || 'Sân 1'}</span>
                        <span>📅 {m.scheduledTime ? new Date(m.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Sắp đấu'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-4">Không có trận đấu nào sắp diễn ra.</p>
              )}
            </div>

            {/* COMPLETED MATCHES ARCHIVE */}
            <div className="space-y-4">
              <h2 className="text-base font-black text-slate-200 border-b border-slate-900 pb-2 uppercase tracking-wider">KẾT QUẢ ĐÃ THI ĐẤU (COMPLETED MATCHES)</h2>
              
              {finishedMatches.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {finishedMatches.map(m => (
                    <div key={m.id} className="card p-4 space-y-3 flex flex-col justify-between bg-slate-900/10 border-slate-850/50">
                      <div className="flex items-center justify-between border-b border-slate-850 pb-2 text-[10px] text-slate-500 font-mono font-bold uppercase">
                        <span>{m.group ? `Bảng ${m.group.code} · Vòng ${m.roundNo}` : m.label || 'Playoff'}</span>
                        <span className="text-emerald-500 font-bold">CONFIRMED</span>
                      </div>

                      <div className="py-1 space-y-1 text-sm font-semibold">
                        <div className="flex justify-between items-center text-slate-200">
                          <span>{m.teamA?.name || '—'}</span>
                          <span className="font-mono font-bold">{m.result ? m.result.teamAScore : '—'}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-200">
                          <span>{m.teamB?.name || '—'}</span>
                          <span className="font-mono font-bold">{m.result ? m.result.teamBScore : '—'}</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-500 border-t border-slate-850 pt-2 text-center">
                        Nhà vô địch chặng: <strong className="text-slate-350">{m.result?.winnerTeamId === m.teamAId ? m.teamA?.name : m.teamB?.name}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-4">Chưa có trận đấu nào hoàn thành.</p>
              )}
            </div>

          </div>
        )}

        {/* STANDINGS VIEW */}
        {activeTab === 'standings' && (
          <div className="space-y-6">
            {groups.length === 0 ? (
              <div className="card p-10 text-center text-slate-500 italic text-xs border border-dashed border-slate-800 rounded-3xl">
                Chưa có dữ liệu bảng xếp hạng.
              </div>
            ) : (
              groups.map(group => {
                // Group flat standings array by group.id on the frontend
                const groupStds = standings
                  .filter((s: any) => s.groupId === group.id)
                  .sort((a: any, b: any) => (a.rank ?? 999) - (b.rank ?? 999));

                return (
                  <div key={group.id} className="card p-6 space-y-4">
                    <div className="font-black text-base text-brand-400 border-b border-slate-850 pb-2 uppercase tracking-wide">
                      {group.name} (Bảng {group.code})
                    </div>

                    {groupStds.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400">
                              <th className="py-2.5 w-12 text-center">Hạng</th>
                              <th>Đội tuyển</th>
                              <th className="text-center">Số trận</th>
                              <th className="text-center">Thắng</th>
                              <th className="text-center">Thua</th>
                              <th className="text-center">Hiệu số</th>
                              <th className="text-right">Điểm</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850 text-sm">
                            {groupStds.map((s: any) => (
                              <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="py-3.5 text-center font-black text-brand-400">
                                  {s.rank <= 1 ? '🥇' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉' : s.rank}
                                </td>
                                <td className="font-bold text-slate-200">{s.team?.name || '—'}</td>
                                <td className="text-center text-slate-350 font-semibold">{s.matchesPlayed}</td>
                                <td className="text-center text-emerald-400 font-bold">{s.wins}</td>
                                <td className="text-center text-rose-400 font-bold">{s.losses}</td>
                                <td className="text-center text-slate-400 font-mono text-xs">
                                  {(s.pointsFor - s.pointsAgainst) > 0
                                    ? `+${s.pointsFor - s.pointsAgainst}`
                                    : s.pointsFor - s.pointsAgainst}
                                </td>
                                <td className="text-right font-mono font-black text-slate-200">{s.points}đ</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic py-4">Chưa có dữ liệu xếp hạng cho bảng này.</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* BRACKET VIEW */}
        {activeTab === 'bracket' && (
          <div className="card p-6 space-y-6">
            <h2 className="text-base font-black text-brand-400 border-b border-slate-850 pb-2 uppercase tracking-wide">🔱 Nhánh Đấu Vòng Loại Trực Tiếp (Playoffs Knockout)</h2>

            {bracket.length > 0 ? (() => {
              const cleanSource = (src: string | null | undefined) => {
                if (!src) return '?';
                const s = src.replace(/^W:/, '');
                if (s.startsWith('SF')) return `Thắng BK ${s.replace('SF', '')}`;
                if (s.startsWith('QF')) return `Thắng TK ${s.replace('QF', '')}`;
                if (s.startsWith('P')) return `Thắng VN ${s.replace('P', '')}`;
                return s;
              };

              const isWin = (node: any, side: 'A' | 'B') =>
                node.match?.result?.winnerTeamId && node.match.result.winnerTeamId === (side === 'A' ? node.teamAId : node.teamBId);
              const isTbd = (node: any, side: 'A' | 'B') => !(side === 'A' ? node.teamAId : node.teamBId);
              const teamLabel = (node: any, side: 'A' | 'B') => {
                const team = side === 'A' ? node.teamA : node.teamB;
                const src  = side === 'A' ? node.sourceA : node.sourceB;
                return team?.name ?? cleanSource(src);
              };

              const renderCard = (node: any, isFinal = false) => (
                <div key={node.id} style={{ width: 200 }}
                  className={`rounded-xl border overflow-hidden shadow-lg ${isFinal
                    ? 'border-amber-500/40 bg-gradient-to-br from-slate-900 to-amber-950/20'
                    : 'border-slate-700/60 bg-slate-900/70'}`}
                >
                  <div className={`px-3 py-1.5 flex items-center justify-between border-b text-[9px] font-mono ${
                    isFinal ? 'border-amber-500/20 bg-amber-500/5 text-amber-400/60' : 'border-slate-800 bg-slate-950/40 text-slate-500'
                  }`}>
                    <span>#{node.nodeKey}</span>
                    {node.match && <span>{getMatchStatusLabel(node.match.status)}</span>}
                  </div>
                  <div className="p-2.5 space-y-1.5">
                    {(['A', 'B'] as const).map(side => (
                      <div key={side} className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs gap-2 ${
                        isWin(node, side) ? 'bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20'
                          : isTbd(node, side) ? 'bg-slate-800/20 text-slate-600 italic border border-dashed border-slate-800'
                          : 'bg-slate-800/40 text-slate-300 border border-transparent'
                      }`}>
                        <span className="truncate" style={{ maxWidth: 130 }}>{isWin(node, side) && '🏆 '}{teamLabel(node, side)}</span>
                        {node.match?.result != null && (
                          <span className={`font-mono shrink-0 ${isFinal ? 'text-sm font-bold' : ''}`}>
                            {side === 'A' ? node.match.result.teamAScore : node.match.result.teamBScore}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {node.match?.result?.winnerTeamId && node.match?.status === 'RESULT_CONFIRMED' && (
                    <div className="px-2.5 pb-2.5">
                      <div className="text-center py-1 bg-amber-500/10 border border-amber-500/25 rounded-lg text-[9px] font-bold text-amber-400">
                        🏆 {node.match.result.winnerTeamId === node.teamAId ? node.teamA?.name : node.teamB?.name}
                      </div>
                    </div>
                  )}
                </div>
              );

              const leftR1  = (bracket as any[]).filter(n => ['QF1','QF2','P1'].includes(n.nodeKey));
              const leftSF  = (bracket as any[]).find(n => n.nodeKey === 'SF1');
              const finalN  = (bracket as any[]).find(n => n.nodeKey === 'F');
              const rightSF = (bracket as any[]).find(n => n.nodeKey === 'SF2');
              const rightR1 = (bracket as any[]).filter(n => ['QF3','QF4','P2'].includes(n.nodeKey));

              const Arrow = ({ dir }: { dir: 'right' | 'left' }) => (
                <div className="flex items-center self-center shrink-0" style={{ width: 44 }}>
                  {dir === 'right' ? (
                    <div className="w-full flex items-center">
                      <div className="flex-1 h-px bg-gradient-to-r from-slate-700/40 to-amber-500/60" />
                      <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
                    </div>
                  ) : (
                    <div className="w-full flex items-center">
                      <ChevronLeft className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="flex-1 h-px bg-gradient-to-l from-slate-700/40 to-amber-500/60" />
                    </div>
                  )}
                </div>
              );

              const renderBranch = (r1: any[], sf: any, dir: 'left' | 'right') => {
                const tbd = <div style={{ width: 200, height: 88 }} className="rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-xs text-slate-600 italic">Chưa có dữ liệu</div>;
                if (dir === 'left') return (
                  <div className="flex items-center gap-0">
                    {r1.length > 0 && (
                      <div className="flex flex-col gap-3">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 mb-1">Vòng Nhánh <ChevronRight className="w-2.5 h-2.5 text-amber-500/50" /></div>
                        {r1.map(n => renderCard(n))}
                      </div>
                    )}
                    {r1.length > 0 && (
                      <svg width={38} height={r1.length > 1 ? 210 : 90} style={{ overflow: 'visible', flexShrink: 0 }}>
                        {r1.length > 1 && (<><line x1={2} y1={55} x2={2} y2={155} stroke="#334155" strokeWidth={1.5}/><line x1={2} y1={55} x2={30} y2={55} stroke="#334155" strokeWidth={1.5}/><line x1={2} y1={155} x2={30} y2={155} stroke="#334155" strokeWidth={1.5}/></>)}
                        <line x1={2} y1={105} x2={36} y2={105} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 2"/>
                        <polyline points="31,100 36,105 31,110" stroke="#f59e0b" strokeWidth={1.5} fill="none"/>
                      </svg>
                    )}
                    <div className="flex flex-col">
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 mb-1">Bán Kết 1 <ChevronRight className="w-2.5 h-2.5 text-amber-500/50" /></div>
                      {sf ? renderCard(sf) : tbd}
                    </div>
                    <Arrow dir="right" />
                  </div>
                );
                return (
                  <div className="flex items-center gap-0">
                    <Arrow dir="left" />
                    <div className="flex flex-col">
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 mb-1"><ChevronLeft className="w-2.5 h-2.5 text-amber-500/50" /> Bán Kết 2</div>
                      {sf ? renderCard(sf) : tbd}
                    </div>
                    {r1.length > 0 && (
                      <svg width={38} height={r1.length > 1 ? 210 : 90} style={{ overflow: 'visible', flexShrink: 0 }}>
                        {r1.length > 1 && (<><line x1={36} y1={55} x2={36} y2={155} stroke="#334155" strokeWidth={1.5}/><line x1={36} y1={55} x2={8} y2={55} stroke="#334155" strokeWidth={1.5}/><line x1={36} y1={155} x2={8} y2={155} stroke="#334155" strokeWidth={1.5}/></>)}
                        <line x1={36} y1={105} x2={2} y2={105} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 2"/>
                        <polyline points="7,100 2,105 7,110" stroke="#f59e0b" strokeWidth={1.5} fill="none"/>
                      </svg>
                    )}
                    {r1.length > 0 && (
                      <div className="flex flex-col gap-3">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 mb-1"><ChevronLeft className="w-2.5 h-2.5 text-amber-500/50" /> Vòng Nhánh</div>
                        {r1.map(n => renderCard(n))}
                      </div>
                    )}
                  </div>
                );
              };

              return (
                <div className="overflow-x-auto pt-4 pb-2">
                  <div className="flex items-center gap-4 mb-5 justify-center flex-wrap">
                    {[{c:'bg-slate-600',l:'Chưa bắt đầu'},{c:'bg-blue-500',l:'Đang đấu'},{c:'bg-amber-500',l:'Chờ xác nhận'},{c:'bg-emerald-500',l:'Đã kết thúc'}].map(i => (
                      <div key={i.l} className="flex items-center gap-1.5 text-[10px] text-slate-400"><div className={`w-2 h-2 rounded-full ${i.c}`}/>{i.l}</div>
                    ))}
                  </div>
                  <div className="flex items-center justify-start lg:justify-center" style={{ minWidth: 860 }}>
                    {renderBranch(leftR1, leftSF, 'left')}
                    <div className="flex flex-col items-center gap-2 px-3">
                      <Trophy className="w-5 h-5 text-amber-400" />
                      <div className="text-[9px] font-bold text-amber-400 uppercase tracking-widest mb-1">Chung Kết</div>
                      {finalN ? renderCard(finalN, true) : (
                        <div style={{ width: 200, height: 100 }} className="rounded-2xl border border-dashed border-amber-500/30 bg-slate-900/40 flex items-center justify-center text-xs text-slate-600 italic">Chờ kết quả BK</div>
                      )}
                    </div>
                    {renderBranch(rightR1, rightSF, 'right')}
                  </div>
                </div>
              );
            })() : (
              <div className="p-10 text-center text-slate-500 italic text-xs border border-dashed border-slate-800 rounded-3xl">
                Nhánh đấu Playoff Vòng Loại Trực Tiếp sẽ được tự động kích hoạt sau khi Vòng Bảng hoàn tất.
              </div>
            )}
          </div>
        )}



        {/* TEAMS LIST VIEW */}
        {activeTab === 'teams' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map(t => {
              const captain = t.members.find((m: any) => m.role === 'CAPTAIN')?.playerProfile?.fullName || 'Chưa chỉ định';
              const males = t.members.filter((m: any) => m.gender === 'MALE').length;
              const females = t.members.filter((m: any) => m.gender === 'FEMALE').length;

              return (
                <div key={t.id} className="card p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                    <span className="font-black text-base text-slate-200">{t.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-400 font-bold">{t.code}</span>
                  </div>

                  <div className="text-xs text-slate-400 space-y-1">
                    <div>🎖️ Đội trưởng: <strong className="text-slate-200">{captain}</strong></div>
                    <div>👥 Quy mô: {t.members.length} VĐV ({males} Nam, {females} Nữ)</div>
                  </div>

                  <div className="pt-2 border-t border-slate-850 space-y-1">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 block">Thành viên đội hình</span>
                    {t.members.map((m: any) => (
                      <div key={m.id} className="flex justify-between text-xs text-slate-350 py-0.5">
                        <span>🎾 {m.playerProfile?.fullName}</span>
                        <span className="text-[9px] font-mono text-slate-500">{m.gender === 'MALE' ? 'Nam' : 'Nữ'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* Public Footer */}
      <footer className="bg-slate-900/40 backdrop-blur-md border-t border-slate-900/60 py-6 text-center text-xs text-slate-500 space-y-2">
        <div>GOLAB Pickleball Tournaments Live Center © {new Date().getFullYear()}</div>
        <div className="text-[10px] text-slate-650">Phát triển bởi GOLAB Advanced Agentic Technology group</div>
      </footer>
    </div>
  );
}
