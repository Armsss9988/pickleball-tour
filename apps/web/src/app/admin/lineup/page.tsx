'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading-skeleton';
import { ClipboardList, Lock, Save, Users, CheckCircle2, AlertTriangle } from '@/components/icons';

export default function LineupPage() {
  const { tournament, loading: tLoading } = useActiveTournament();
  const { toast } = useToast();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [matchDetails, setMatchDetails] = useState<any | null>(null);
  const [lineupsData, setLineupsData] = useState<any>({ teamA: {}, teamB: {} });
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadMatches = async () => {
    if (!tournament) return;
    try {
      setLoading(true);
      const data = await apiFetch(`/tournaments/${tournament.id}/matches`);
      setMatches(data.filter((m: any) => m.status === 'SCHEDULED' || m.status === 'LINEUP_PENDING' || m.status === 'LINEUP_READY'));
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

  const handleSelectMatch = async (match: any) => {
    setSelectedMatch(match);
    try {
      setLoading(true);
      const details = await apiFetch(`/matches/${match.id}/lineups`);
      setMatchDetails(details);

      const initial: any = { teamA: {}, teamB: {} };
      details.segments.forEach((seg: any) => {
        initial.teamA[seg.id] = details.lineups.find((l: any) => l.segmentId === seg.id && l.teamId === details.teamAId)?.players.map((p: any) => p.playerProfileId) || [];
        initial.teamB[seg.id] = details.lineups.find((l: any) => l.segmentId === seg.id && l.teamId === details.teamBId)?.players.map((p: any) => p.playerProfileId) || [];
      });
      setLineupsData(initial);
    } catch (e: any) {
      toast(e.message || 'Lỗi tải chi tiết chặng đấu.', 'error');
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
    
    const teamId = teamKey === 'teamA' ? matchDetails.teamAId : matchDetails.teamBId;
    const segmentsPayload = Object.keys(lineupsData[teamKey]).map(segId => ({
      segmentId: segId,
      playerIds: lineupsData[teamKey][segId].filter((id: string) => !!id),
    }));

    setActionLoading(true);
    try {
      await apiFetch(`/matches/${matchDetails.id}/lineup`, {
        method: 'POST',
        body: [{
          teamId,
          segments: segmentsPayload,
        }],
      });

      toast(`Đã lưu đội hình thi đấu cho ${teamKey === 'teamA' ? 'Đội A' : 'Đội B'} thành công!`, 'success');
      handleSelectMatch(selectedMatch);
    } catch (err: any) {
      toast(err.message || 'Đội hình không hợp lệ theo quy chế thi đấu.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLockLineups = async () => {
    if (!matchDetails) return;
    setActionLoading(true);

    try {
      await apiFetch(`/matches/${matchDetails.id}/lineup/lock`, {
        method: 'POST',
      });

      toast('Đã khóa đội hình thành công! Trận đấu đã sẵn sàng để thi đấu.', 'success');
      setSelectedMatch(null);
      setMatchDetails(null);
      setLockModalOpen(false);
      loadMatches();
    } catch (err: any) {
      toast(err.message || 'Lỗi khóa đội hình.', 'error');
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
        title="Khai Báo Đội Hình Thi Đấu"
        description="Đăng ký thành viên thi đấu cho từng chặng tiếp sức (Đôi Nam, Đôi Nữ, Đôi Nam Nữ) trước giờ bóng lăn."
        icon={ClipboardList}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pending Matches list */}
        <div className="card p-6 space-y-4 shadow-xl h-fit">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
            <ClipboardList className="w-5 h-5 text-amber-500" />
            Trận đấu chờ lineup
          </h3>
          
          {matches.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {matches.map(m => (
                <div
                  key={m.id}
                  onClick={() => handleSelectMatch(m)}
                  className={`p-3.5 bg-slate-900/40 border border-slate-800 rounded-xl cursor-pointer hover:border-amber-500 hover:bg-slate-800/25 transition-all shadow ${selectedMatch?.id === m.id ? 'border-amber-500 bg-amber-500/5' : ''}`}
                >
                  <div className="text-[10px] text-amber-500 font-bold mb-1 uppercase tracking-wider">
                    {m.group ? `Bảng {m.group.code} · Lượt {m.roundNo}` : m.label || 'Playoff'}
                  </div>
                  <div className="text-sm font-semibold text-slate-200">
                    {m.teamA?.name || 'Chờ xác định'} vs {m.teamB?.name || 'Chờ xác định'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1.5 flex justify-between items-center">
                    <span>Mã: #{m.id.substring(0, 8)}</span>
                    <span className="font-mono text-amber-500/80 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 text-[9px] uppercase">{m.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted italic text-center py-10 text-xs text-slate-500">
              Không có trận đấu nào chờ khai báo lineup.
            </p>
          )}
        </div>

        {/* Right: Lineup Form */}
        <div className="lg:col-span-2 space-y-6">
          {matchDetails ? (
            <div className="card p-6 space-y-6 shadow-xl animate-scale-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="font-bold text-base text-slate-100 flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-500" />
                  Khai báo Lineup trận đấu
                </div>
                {matchDetails.status !== 'READY' && (
                  <button
                    onClick={() => setLockModalOpen(true)}
                    className="btn btn-secondary bg-emerald-500/10 text-emerald-450 hover:bg-emerald-500/20 border-emerald-500/30 text-xs py-1.5 px-3 flex items-center gap-1.5 font-semibold"
                    disabled={actionLoading}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Khóa Đội Hình
                  </button>
                )}
              </div>

              {/* Grid 2 teams */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Team A */}
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-sky-400 border-b border-slate-800 pb-2 flex items-center justify-between">
                    <span>{matchDetails.teamA?.name}</span>
                    <span className="text-[10px] text-slate-500 font-normal">Đội A</span>
                  </h4>
                  
                  {matchDetails.segments.map((seg: any) => (
                    <div key={seg.id} className="space-y-2 p-3 bg-slate-900/60 border border-slate-850 rounded-xl hover:border-slate-800 transition-colors">
                      <div className="text-xs font-bold text-slate-300">{seg.name} ({seg.segmentKey})</div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: 2 }).map((_, slotIdx) => (
                          <select
                            key={slotIdx}
                            value={lineupsData.teamA[seg.id]?.[slotIdx] || ''}
                            onChange={e => handlePlayerChange('teamA', seg.id, slotIdx, e.target.value)}
                            className="premium-input text-xs"
                            disabled={actionLoading}
                          >
                            <option value="">-- Chọn VĐV --</option>
                            {matchDetails.teamA?.members?.map((m: any) => (
                              <option key={m.playerProfile.id} value={m.playerProfile.id}>
                                {m.playerProfile.fullName} ({m.gender === 'MALE' ? '♂ Nam' : '♀ Nữ'})
                              </option>
                            ))}
                          </select>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => handleSubmitLineup('teamA')}
                    className="w-full btn btn-secondary text-xs py-2.5 flex items-center justify-center gap-2 border-slate-700 hover:bg-slate-800"
                    disabled={actionLoading}
                  >
                    <Save className="w-4 h-4" />
                    Lưu Lineup Đội A
                  </button>
                </div>

                {/* Team B */}
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-rose-450 border-b border-slate-800 pb-2 flex items-center justify-between">
                    <span>{matchDetails.teamB?.name}</span>
                    <span className="text-[10px] text-slate-500 font-normal">Đội B</span>
                  </h4>
                  
                  {matchDetails.segments.map((seg: any) => (
                    <div key={seg.id} className="space-y-2 p-3 bg-slate-900/60 border border-slate-850 rounded-xl hover:border-slate-800 transition-colors">
                      <div className="text-xs font-bold text-slate-300">{seg.name} ({seg.segmentKey})</div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: 2 }).map((_, slotIdx) => (
                          <select
                            key={slotIdx}
                            value={lineupsData.teamB[seg.id]?.[slotIdx] || ''}
                            onChange={e => handlePlayerChange('teamB', seg.id, slotIdx, e.target.value)}
                            className="premium-input text-xs"
                            disabled={actionLoading}
                          >
                            <option value="">-- Chọn VĐV --</option>
                            {matchDetails.teamB?.members?.map((m: any) => (
                              <option key={m.playerProfile.id} value={m.playerProfile.id}>
                                {m.playerProfile.fullName} ({m.gender === 'MALE' ? '♂ Nam' : '♀ Nữ'})
                              </option>
                            ))}
                          </select>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => handleSubmitLineup('teamB')}
                    className="w-full btn btn-secondary text-xs py-2.5 flex items-center justify-center gap-2 border-slate-700 hover:bg-slate-800"
                    disabled={actionLoading}
                  >
                    <Save className="w-4 h-4" />
                    Lưu Lineup Đội B
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-10 bg-slate-800/10 border border-dashed border-slate-800 rounded-3xl text-center text-xs text-slate-500 italic py-20 shadow-inner space-y-2">
              <AlertTriangle className="w-8 h-8 text-slate-650 mx-auto mb-2" />
              <p>Vui lòng chọn một trận đấu bên trái để bắt đầu khai báo danh sách thi đấu.</p>
            </div>
          )}
        </div>
      </div>

      {/* Lock Lineup Confirmation Modal */}
      <ConfirmModal
        open={lockModalOpen}
        title="Khóa danh sách thi đấu?"
        description="Thao tác này sẽ chính thức KHÓA lineup thi đấu của cả 2 đội cho trận này và chuyển trận đấu sang trạng thái SẴN SÀNG thi đấu. Bạn sẽ không thể sửa đổi sau khi khóa!"
        confirmLabel="Khóa ngay"
        cancelLabel="Hủy"
        variant="warning"
        loading={actionLoading}
        onConfirm={handleLockLineups}
        onCancel={() => setLockModalOpen(false)}
      />
    </div>
  );
}

