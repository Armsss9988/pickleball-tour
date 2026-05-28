import React, { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import { calculateStandings } from '../utils/tournamentLogic';
import { Award, Layers, HelpCircle, Trophy, Sparkles, AlertTriangle, ArrowDown, ArrowUp, Save, Check } from 'lucide-react';

export default function StandingsScreen() {
  const { state, resolveTieManually } = useTournament();

  const tourney = state.tournaments.find(t => t.id === state.activeTournamentId);
  const groupsList = state.groups;

  // Active Selected Group Tab state
  const [activeGroupId, setActiveGroupId] = useState(() => (groupsList[0]?.id || ''));
  const [manualOrder, setManualOrder] = useState<string[]>([]);
  const [tieBreakReason, setTieBreakReason] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  // Calculate standings for currently chosen group
  const activeGroupObj = groupsList.find(g => g.id === activeGroupId);
  const activeGroupTeams = state.teams.filter(t => t.groupId === activeGroupId);
  const activeGroupMatches = state.matches.filter(m => m.groupId === activeGroupId && m.stage === 'group');

  const scoringConfig = tourney?.scoringConfig || {
    pointsForWin: 1,
    pointsForLoss: 0,
    pointsForDraw: 0,
    tieBreakers: ['wins', 'diff', 'headToHead', 'name']
  };

  const standingRows = calculateStandings(
    activeGroupTeams, 
    activeGroupMatches, 
    scoringConfig, 
    activeGroupObj?.manualRanking
  );

  const hasTies = standingRows.some(row => row.requiresAdminDecision);
  const userRole = state.currentUser?.role || 'viewer';
  const isAdmin = userRole === 'super_admin' || userRole === 'organizer';

  // Initialize manual order helper
  const handleStartResolution = () => {
    setManualOrder(standingRows.map(r => r.teamId));
    setTieBreakReason(activeGroupObj?.manualRankingReason || 'Bốc thăm ngẫu nhiên phân định.');
    setIsResolving(true);
  };

  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    const nextOrder = [...manualOrder];
    const temp = nextOrder[idx];
    nextOrder[idx] = nextOrder[idx - 1];
    nextOrder[idx - 1] = temp;
    setManualOrder(nextOrder);
  };

  const handleMoveDown = (idx: number) => {
    if (idx === manualOrder.length - 1) return;
    const nextOrder = [...manualOrder];
    const temp = nextOrder[idx];
    nextOrder[idx] = nextOrder[idx + 1];
    nextOrder[idx + 1] = temp;
    setManualOrder(nextOrder);
  };

  const handleSaveResolution = () => {
    if (!tieBreakReason.trim()) {
      alert('Vui lòng nhập lý do phân định thứ hạng!');
      return;
    }
    resolveTieManually(activeGroupId, manualOrder, tieBreakReason.trim());
    setIsResolving(false);
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/25 ring-1 ring-amber-500/20 font-extrabold shadow-[0_0_10px_rgba(245,158,11,0.15)]';
      case 2:
        return 'bg-slate-800 text-slate-350 border-slate-700/80 font-bold';
      case 3:
        return 'bg-amber-700/10 text-amber-500/90 border-amber-700/20 font-bold';
      default:
        return 'bg-slate-900 text-slate-500 border-slate-850 font-medium';
    }
  };

  return (
    <div id="standings-screen-container" className="space-y-6 animate-fade-in text-slate-100">
      {/* Header card block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Award className="w-6 h-6 text-brand-primary" />
            <span>Bảng Xếp Hạng Trực Tiếp</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Điểm số và chỉ số phụ tiếp sức được tính toán tự động realtime sau mỗi trận đấu.
          </p>
        </div>

        {hasTies && isAdmin && !isResolving && (
          <button
            onClick={handleStartResolution}
            className="btn-primary !py-2 !px-4 text-xs flex items-center gap-1.5 select-none shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-current" />
            <span>Phân định hạng thủ công</span>
          </button>
        )}
      </div>

      {groupsList.length === 0 ? (
        <div className="premium-card rounded-2xl p-10 text-center flex flex-col items-center justify-center">
          <Layers className="w-12 h-12 text-slate-650 mb-3" />
          <h3 className="text-slate-350 font-display font-semibold text-base">Chưa tạo bảng đấu nào</h3>
          <p className="text-slate-500 text-xs mt-1.5 max-w-sm font-light">
            Vui lòng phân phối bảng đấu tại tab "Bảng Đấu" trước khi xem bảng xếp hạng.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Tabs header list of Groups */}
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-0 max-w-full overflow-x-auto">
            {groupsList.map(group => {
              const isActive = activeGroupId === group.id;
              return (
                <button
                  key={group.id}
                  id={`tab-group-standing-${group.id}`}
                  onClick={() => {
                    setActiveGroupId(group.id);
                    setIsResolving(false);
                  }}
                  className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer select-none ${
                    isActive
                      ? 'border-brand-primary text-brand-primary font-extrabold bg-slate-950/40'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {group.name}
                </button>
              );
            })}
          </div>

          {/* Warning banner about tie breaks */}
          {hasTies && (
            <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl flex gap-3 text-xs text-amber-250 leading-relaxed font-semibold">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-display font-bold text-amber-400 text-sm">⚠️ Phát hiện Hòa chỉ số tiếp sức!</p>
                <p className="mt-1 font-light text-[11px] text-slate-400">
                  Các đội có cùng số trận thắng và hiệu số phụ. Vui lòng Ban Tổ Chức tiến hành phân định thứ hạng thủ công bằng bốc thăm hoặc quy định đối đầu bổ sung ngoài sân.
                </p>
              </div>
            </div>
          )}

          {/* Tie Resolution Manual Sorter Panel */}
          {isResolving && isAdmin && (
            <div className="premium-card p-5 rounded-2xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <h3 className="font-display font-bold text-sm text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Điều chỉnh Phân hạng Thủ công - {activeGroupObj?.name}</span>
                </h3>
                <button
                  onClick={() => setIsResolving(false)}
                  className="text-slate-400 hover:text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Đóng
                </button>
              </div>

              <p className="text-xs text-slate-400 font-light">
                Sử dụng các phím điều hướng để thiết lập lại vị trí chính thức của các đội trong bảng đấu này.
              </p>

              <div className="space-y-2 max-w-md">
                {manualOrder.map((teamId, idx) => {
                  const team = state.teams.find(t => t.id === teamId);
                  return (
                    <div key={teamId} className="bg-slate-950 border border-slate-850 p-3 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-slate-400">
                          Hạng {idx + 1}
                        </span>
                        <span className="font-bold text-slate-200">{team?.name}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0}
                          className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded transition-colors cursor-pointer"
                        >
                          <ArrowUp className="w-4 h-4 text-slate-400" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === manualOrder.length - 1}
                          className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded transition-colors cursor-pointer"
                        >
                          <ArrowDown className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Lý do phân định & Nhật ký lưu trữ
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: BTC bốc thăm may mắn quyết định đội A hạt giống cao hơn."
                  value={tieBreakReason}
                  onChange={e => setTieBreakReason(e.target.value)}
                  className="w-full max-w-md premium-input"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSaveResolution}
                  className="btn-primary !py-2.5 !px-5 text-xs shadow-md"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>XÁC NHẬN CHỐT THỨ HẠNG</span>
                </button>
                <button
                  onClick={() => setIsResolving(false)}
                  className="text-xs text-slate-400 hover:text-slate-200 font-semibold cursor-pointer"
                >
                  Hủy quay lại
                </button>
              </div>
            </div>
          )}

          {/* Standings table */}
          {activeGroupTeams.length === 0 ? (
            <div className="premium-card p-6 text-center text-slate-400 text-xs font-light rounded-2xl">
              Bảng đấu này hiện chưa được chỉ định câu lạc bộ/đội thi đấu nào.
            </div>
          ) : (
            <div className="premium-card rounded-2xl overflow-hidden border border-slate-850">
              <div className="overflow-x-auto">
                <table id="standings-leaderboard-table" className="w-full text-xs text-left border-collapse min-w-[750px]">
                  <thead>
                    <tr className="bg-slate-950/80 text-[10px] text-slate-450 font-bold uppercase tracking-wider border-b border-slate-850">
                      <th className="py-3 px-4 text-center w-16">Hạng</th>
                      <th className="py-3 px-3">Đội thi đấu</th>
                      <th className="py-3 px-3 text-center">Đã đấu</th>
                      <th className="py-3 px-3 text-center">Thắng (Wins)</th>
                      <th className="py-3 px-3 text-center">Thua (Losts)</th>
                      <th className="py-3 px-3 text-center font-bold bg-indigo-500/5 border-r border-slate-850 text-indigo-300">Điểm trận</th>
                      <th className="py-3 px-3 text-center">Ghi chặng (+)</th>
                      <th className="py-3 px-3 text-center">Thua chặng (-)</th>
                      <th className="py-3 px-3 text-center bg-slate-900/40 font-bold">Hiệu số</th>
                      <th className="py-3 px-3 text-left max-w-xs">Ghi chú phân định</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-[12px] text-slate-200">
                    {standingRows.map(row => {
                      const isTopRank = row.rank === 1;

                      return (
                        <tr
                          key={row.teamId}
                          id={`standing-row-${row.teamId}`}
                          className={`hover:bg-slate-900/20 transition-colors ${
                            isTopRank ? 'bg-brand-primary/2' : ''
                          }`}
                        >
                          {/* Rank column */}
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center justify-center w-5.5 h-5.5 rounded-full text-[10px] font-bold border ${getRankStyle(row.rank)}`}>
                              {row.rank}
                            </span>
                          </td>

                          {/* Team info */}
                          <td className="py-3.5 px-3">
                            <div className="min-w-0">
                              <span className="font-bold text-slate-100 block leading-tight truncate">
                                {row.teamName} {isTopRank && '👑'}
                              </span>
                              <span className="font-mono text-[9px] text-slate-500 font-semibold tracking-wider uppercase block mt-0.5">({row.teamCode})</span>
                            </div>
                          </td>

                          {/* Stats totals */}
                          <td className="py-3.5 px-3 text-center font-bold font-mono text-slate-300">{row.played}</td>
                          <td className="py-3.5 px-3 text-center font-bold font-mono text-emerald-400">{row.won}</td>
                          <td className="py-3.5 px-3 text-center font-bold font-mono text-red-400">{row.lost}</td>

                          {/* Points highlight column */}
                          <td className="py-3.5 px-3 text-center font-mono font-extrabold bg-indigo-500/10 border-r border-slate-850 text-indigo-300 text-xs">
                            {row.points}
                          </td>

                          <td className="py-3.5 px-3 text-center font-mono text-slate-400">{row.scoreFor}</td>
                          <td className="py-3.5 px-3 text-center font-mono text-slate-400">{row.scoreAgainst}</td>
                          
                          {/* Score Difference */}
                          <td className={`py-3.5 px-3 text-center font-mono font-bold bg-slate-900/30 ${
                            row.scoreDifference > 0 
                              ? 'text-emerald-400' 
                              : row.scoreDifference < 0 
                                ? 'text-red-400' 
                                : 'text-slate-500'
                          }`}>
                            {row.scoreDifference > 0 ? `+${row.scoreDifference}` : row.scoreDifference}
                          </td>

                          {/* Tiebreak details or reasons */}
                          <td className="py-3.5 px-3 text-left text-[11px] text-slate-450 max-w-xs truncate">
                            {row.requiresAdminDecision && (
                              <span className="text-amber-400 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span>Cần phân định</span>
                              </span>
                            )}
                            {activeGroupObj?.manualRanking && activeGroupObj.manualRanking.includes(row.teamId) && (
                              <span className="text-indigo-400 font-bold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                <span className="truncate" title={activeGroupObj.manualRankingReason}>
                                  Quyết định BTC: {activeGroupObj.manualRankingReason}
                                </span>
                              </span>
                            )}
                            {!row.requiresAdminDecision && (!activeGroupObj?.manualRanking) && row.tieBreakReason && (
                              <span className="truncate" title={row.tieBreakReason}>{row.tieBreakReason}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tie breaker explainer card */}
          <div className="bg-brand-secondary/5 border border-brand-secondary/20 rounded-2xl p-4 flex gap-3 text-xs text-slate-300 leading-relaxed font-light">
            <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-display font-bold text-slate-100 mb-1">ℹ️ Quy tắc xếp hạng vòng bảng Golab Đường đua Tiếp sức:</p>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-400">
                <li>Ưu tiên số 1: <strong>Số trận thắng (Wins)</strong> tích lũy toàn giải đấu.</li>
                <li>Ưu tiên số 2: <strong>Hiệu số điểm ghi chặng tiếp sức (Point Diff)</strong>.</li>
                <li>Ưu tiên số 3: <strong>Kết quả đối đầu trực tiếp (Head-to-head)</strong>.</li>
                <li>Ưu tiên số 4: Trường hợp hòa 3 bên vòng lặp, <strong>Ban Tổ Chức</strong> sẽ tiến hành bốc thăm công khai và phân định thứ hạng thủ công bằng bảng cập nhật trên hệ thống.</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
