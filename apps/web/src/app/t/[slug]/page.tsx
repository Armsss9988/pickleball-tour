'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

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
      // We will listen globally or join the tournament room when tournament is loaded
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
    if (tournament && socketRef.current) {
      socketRef.current.emit('joinTournament', { tournamentId: tournament.id });
    }
    return () => {
      if (tournament && socketRef.current) {
        socketRef.current.emit('leaveTournament', { tournamentId: tournament.id });
      }
    };
  }, [tournament]);

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
  const liveMatches = matches.filter(m => m.status === 'RUNNING' || m.status === 'SEGMENT_BREAK' || m.status === 'COMPLETED');
  const scheduledMatches = matches.filter(m => m.status === 'SCHEDULED' || m.status === 'LINEUP_PENDING' || m.status === 'LINEUP_READY' || m.status === 'READY');
  const finishedMatches = matches.filter(m => m.status === 'RESULT_CONFIRMED');

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
          <div className="space-y-8">
            
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
                            {m.status === 'RUNNING' ? 'LIVE SCORING' : m.status}
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
                        <span className="text-slate-400">{m.status}</span>
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
            {groups.map(group => {
              const groupStds = standings.filter(s => s.groupId === group.id).sort((a, b) => a.rank - b.rank);
              
              return (
                <div key={group.id} className="card p-6 space-y-4">
                  <div className="font-black text-base text-brand-400 border-b border-slate-850 pb-2 uppercase tracking-wide">
                    {group.name} (Group {group.code} Standings)
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
                            <th className="text-right">Điểm số</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 text-sm">
                          {groupStds.map(s => (
                            <tr key={s.id} className="hover:bg-slate-800/40">
                              <td className="py-3.5 text-center font-black text-brand-400">{s.rank}</td>
                              <td className="font-bold text-slate-200">
                                {s.team?.name || '—'}
                              </td>
                              <td className="text-center text-slate-350 font-semibold">{s.matchesPlayed}</td>
                              <td className="text-center text-emerald-400 font-semibold">{s.wins}</td>
                              <td className="text-center text-rose-400 font-semibold">{s.losses}</td>
                              <td className="text-center text-slate-400 font-mono">
                                {s.pointsFor - s.pointsAgainst > 0 ? `+${s.pointsFor - s.pointsAgainst}` : s.pointsFor - s.pointsAgainst}
                              </td>
                              <td className="text-right font-mono font-black text-slate-200">{s.points}đ</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic py-4">Bảng xếp hạng chưa được khởi chạy.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* BRACKET VIEW */}
        {activeTab === 'bracket' && (
          <div className="card p-6 space-y-6">
            <h2 className="text-base font-black text-brand-400 border-b border-slate-850 pb-2 uppercase tracking-wide">🔱 Nhánh Đấu Vòng Loại Trực Tiếp (Playoffs Knockout)</h2>
            
            {bracket.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch pt-4">
                
                {/* Round 1: Q1 and Q2 */}
                <div className="space-y-8 flex flex-col justify-center">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 text-center block mb-2">Tứ Kết (Play-In)</span>
                  
                  {bracket.filter(n => n.nodeKey === 'Q1' || n.nodeKey === 'Q2').map(node => (
                    <div key={node.id} className="card p-4 border-slate-850 bg-slate-900/20 relative space-y-3 shadow-md">
                      <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-bold">{node.roundName}</span>
                      
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center text-slate-300 font-medium">
                          <span>🔵 {node.teamA?.name || 'Chờ xác định'}</span>
                          <span className="font-mono font-bold">{node.match?.result ? node.match.result.teamAScore : ''}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300 font-medium">
                          <span>🔴 {node.teamB?.name || 'Chờ xác định'}</span>
                          <span className="font-mono font-bold">{node.match?.result ? node.match.result.teamBScore : ''}</span>
                        </div>
                      </div>
                      
                      {node.match && (
                        <div className="text-[9px] text-slate-500 text-right pt-1 border-t border-slate-850 font-mono">
                          Trạng thái: {node.match.status}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Round 2: S1 and S2 */}
                <div className="space-y-8 flex flex-col justify-center">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-purple-400 text-center block mb-2">Bán Kết</span>
                  
                  {bracket.filter(n => n.nodeKey === 'S1' || n.nodeKey === 'S2').map(node => (
                    <div key={node.id} className="card p-4 border-purple-500/20 bg-purple-500/5 relative space-y-3 shadow-lg">
                      <span className="text-[9px] bg-purple-500/10 text-purple-400 px-1.5 py-0.2 rounded font-bold">{node.roundName}</span>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center text-slate-200 font-medium">
                          <span>🔵 {node.teamA?.name || `Winner ${node.sourceA}`}</span>
                          <span className="font-mono font-bold">{node.match?.result ? node.match.result.teamAScore : ''}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-200 font-medium">
                          <span>🔴 {node.teamB?.name || `Winner ${node.sourceB}`}</span>
                          <span className="font-mono font-bold">{node.match?.result ? node.match.result.teamBScore : ''}</span>
                        </div>
                      </div>

                      {node.match && (
                        <div className="text-[9px] text-purple-500/60 text-right pt-1 border-t border-slate-850 font-mono">
                          Trạng thái: {node.match.status}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Round 3: Final F */}
                <div className="space-y-8 flex flex-col justify-center">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 text-center block mb-2">Chung Kết</span>

                  {bracket.filter(n => n.nodeKey === 'F').map(node => (
                    <div key={node.id} className="card p-6 border-amber-500/30 bg-amber-500/5 relative space-y-4 shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-all duration-700" />

                      <span className="text-[9px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-black uppercase tracking-wider">{node.roundName}</span>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center text-slate-100 font-bold">
                          <span>🏆 {node.teamA?.name || 'Winner Bán Kết 1'}</span>
                          <span className="font-mono">{node.match?.result ? node.match.result.teamAScore : ''}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-100 font-bold">
                          <span>🏆 {node.teamB?.name || 'Winner Bán Kết 2'}</span>
                          <span className="font-mono">{node.match?.result ? node.match.result.teamBScore : ''}</span>
                        </div>
                      </div>

                      {node.match?.status === 'RESULT_CONFIRMED' && (
                        <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-xl text-center font-bold text-xs">
                          🥇 VÔ ĐỊCH: {node.match.result.winnerTeamId === node.teamAId ? node.teamA?.name : node.teamB?.name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

              </div>
            ) : (
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
