'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';

export default function LineupPage() {
  const { tournament, loading: tLoading, error: tError } = useActiveTournament();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [matchDetails, setMatchDetails] = useState<any | null>(null);
  const [lineupsData, setLineupsData] = useState<any>({ teamA: {}, teamB: {} });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadMatches = async () => {
    if (!tournament) return;
    try {
      setLoading(true);
      const data = await apiFetch(`/tournaments/${tournament.id}/matches`);
      setMatches(data.filter((m: any) => m.status === 'SCHEDULED' || m.status === 'LINEUP_PENDING' || m.status === 'LINEUP_READY'));
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

  const handleSelectMatch = async (match: any) => {
    setSelectedMatch(match);
    setError('');
    setSuccess('');
    try {
      setLoading(true);
      // Fetch full details of lineups
      const details = await apiFetch(`/matches/${match.id}/lineups`);
      setMatchDetails(details);

      // Pre-fill lineupsData state
      const initial: any = { teamA: {}, teamB: {} };
      details.segments.forEach((seg: any) => {
        initial.teamA[seg.id] = details.lineups.find((l: any) => l.segmentId === seg.id && l.teamId === details.teamAId)?.players.map((p: any) => p.playerProfileId) || [];
        initial.teamB[seg.id] = details.lineups.find((l: any) => l.segmentId === seg.id && l.teamId === details.teamBId)?.players.map((p: any) => p.playerProfileId) || [];
      });
      setLineupsData(initial);
    } catch (e: any) {
      setError(e.message || 'Lỗi tải chi tiết chặng đấu.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerChange = (teamKey: 'teamA' | 'teamB', segmentId: string, playerIdx: number, playerId: string) => {
    setLineupsData((prev: any) => {
      const nextList = [...(prev[teamKey][segmentId] || [])];
      nextList[playerIdx] = playerId;
      return {
        ...prev,
        [teamKey]: {
          ...prev[teamKey],
          [segmentId]: nextList,
        },
      };
    });
  };

  const handleSubmitLineup = async (teamKey: 'teamA' | 'teamB') => {
    if (!matchDetails) return;
    setError('');
    setSuccess('');
    
    const teamId = teamKey === 'teamA' ? matchDetails.teamAId : matchDetails.teamBId;
    const segmentsPayload = Object.keys(lineupsData[teamKey]).map(segId => ({
      segmentId: segId,
      playerIds: lineupsData[teamKey][segId].filter((id: string) => !!id),
    }));

    try {
      setLoading(true);
      const res = await apiFetch(`/matches/${matchDetails.id}/lineup`, {
        method: 'POST',
        body: [{
          teamId,
          segments: segmentsPayload,
        }],
      });

      setSuccess(`Đã lưu đội hình thi đấu cho ${teamKey === 'teamA' ? 'Đội A' : 'Đội B'} thành công!`);
      handleSelectMatch(selectedMatch); // reload details
    } catch (err: any) {
      setError(err.message || 'Đội hình không hợp lệ theo quy chế thi đấu.');
    } finally {
      setLoading(false);
    }
  };

  const handleLockLineups = async () => {
    if (!matchDetails) return;
    if (!confirm('Khóa danh sách thi đấu? Trận đấu sẽ chuyển sang sẵn sàng thi đấu.')) return;
    
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await apiFetch(`/matches/${matchDetails.id}/lineup/lock`, {
        method: 'POST',
      });

      setSuccess('Đã khóa đội hình thành công! Trận đấu đã sẵn sàng để thi đấu.');
      setSelectedMatch(null);
      setMatchDetails(null);
      loadMatches();
    } catch (err: any) {
      setError(err.message || 'Lỗi khóa đội hình.');
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">📋 Khai Báo Đội Hình Thi Đấu</h1>
          <p className="text-xs text-slate-400 mt-1">
            Đăng ký thành viên thi đấu cho từng chặng tiếp sức (Đôi Nam, Đôi Nữ, Đôi Nam Nữ) trước giờ bóng lăn.
          </p>
        </div>
      </div>

      {error && <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">⚠️ {error}</div>}
      {success && <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">✓ {success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pending Matches list */}
        <div className="card p-6 space-y-4">
          <h3 className="font-bold text-sm">Trận đấu chờ khai báo lineup</h3>
          
          {matches.length > 0 ? (
            <div className="space-y-2">
              {matches.map(m => (
                <div
                  key={m.id}
                  onClick={() => handleSelectMatch(m)}
                  className={`p-3 bg-slate-800/40 border border-slate-850 rounded-xl cursor-pointer hover:border-brand-500 transition-all ${selectedMatch?.id === m.id ? 'border-brand-500 bg-brand-500/5' : ''}`}
                >
                  <div className="text-xs text-brand-400 font-bold mb-1">
                    {m.group ? `Bảng ${m.group.code} · Vòng ${m.roundNo}` : m.label || 'Playoff'}
                  </div>
                  <div className="text-sm font-semibold text-slate-200">
                    {m.teamA?.name || 'Chờ xác định'} vs {m.teamB?.name || 'Chờ xác định'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Trạng thái: {m.status}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted italic text-center py-6 text-xs">Không có trận đấu nào ở trạng thái chờ khai báo lineup.</p>
          )}
        </div>

        {/* Right: Lineup Form */}
        <div className="lg:col-span-2 space-y-6">
          {matchDetails ? (
            <div className="card p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                <div className="font-bold text-base text-slate-200">
                  Lineup: {matchDetails.teamA?.name} vs {matchDetails.teamB?.name}
                </div>
                {matchDetails.status !== 'READY' && (
                  <button
                    onClick={handleLockLineups}
                    className="btn btn-secondary bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30 text-xs py-1.5 px-3"
                  >
                    🔒 Khóa Đội Hình
                  </button>
                )}
              </div>

              {/* Grid 2 teams */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Team A */}
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-sky-400 border-b border-slate-850 pb-2">{matchDetails.teamA?.name}</h4>
                  
                  {matchDetails.segments.map((seg: any) => (
                    <div key={seg.id} className="space-y-2 p-3 bg-slate-900/40 rounded-xl">
                      <div className="text-xs font-bold text-slate-350">{seg.name} ({seg.segmentKey})</div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: 2 }).map((_, slotIdx) => (
                          <select
                            key={slotIdx}
                            value={lineupsData.teamA[seg.id]?.[slotIdx] || ''}
                            onChange={e => handlePlayerChange('teamA', seg.id, slotIdx, e.target.value)}
                            className="premium-input text-xs"
                          >
                            <option value="">-- Chọn VĐV --</option>
                            {matchDetails.teamA?.members?.map((m: any) => (
                              <option key={m.playerProfile.id} value={m.playerProfile.id}>
                                {m.playerProfile.fullName} ({m.gender === 'MALE' ? 'Nam' : 'Nữ'})
                              </option>
                            ))}
                          </select>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => handleSubmitLineup('teamA')}
                    className="w-full btn btn-secondary text-xs py-2"
                  >
                    💾 Lưu Lineup Đội A
                  </button>
                </div>

                {/* Team B */}
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-pink-400 border-b border-slate-850 pb-2">{matchDetails.teamB?.name}</h4>
                  
                  {matchDetails.segments.map((seg: any) => (
                    <div key={seg.id} className="space-y-2 p-3 bg-slate-900/40 rounded-xl">
                      <div className="text-xs font-bold text-slate-350">{seg.name} ({seg.segmentKey})</div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: 2 }).map((_, slotIdx) => (
                          <select
                            key={slotIdx}
                            value={lineupsData.teamB[seg.id]?.[slotIdx] || ''}
                            onChange={e => handlePlayerChange('teamB', seg.id, slotIdx, e.target.value)}
                            className="premium-input text-xs"
                          >
                            <option value="">-- Chọn VĐV --</option>
                            {matchDetails.teamB?.members?.map((m: any) => (
                              <option key={m.playerProfile.id} value={m.playerProfile.id}>
                                {m.playerProfile.fullName} ({m.gender === 'MALE' ? 'Nam' : 'Nữ'})
                              </option>
                            ))}
                          </select>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => handleSubmitLineup('teamB')}
                    className="w-full btn btn-secondary text-xs py-2"
                  >
                    💾 Lưu Lineup Đội B
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-10 bg-slate-800/20 border border-dashed border-slate-800 rounded-3xl text-center text-xs text-slate-500 italic">
              Vui lòng chọn một trận đấu bên trái để bắt đầu khai báo danh sách thi đấu.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
