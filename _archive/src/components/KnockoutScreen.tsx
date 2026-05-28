import React from 'react';
import { useTournament } from '../context/TournamentContext';
import { Match, Team } from '../types';
import { Award, Trophy, ChevronRight, Activity, ClipboardPen, Sparkles, PlusCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function KnockoutScreen({ setCurrentTab }: { setCurrentTab: (tab: string) => void }) {
  const { state, addMatch } = useTournament();

  const getTeamObj = (teamId: string): Team | null => {
    return state.teams.find(t => t.id === teamId) || null;
  };

  // Filter matches
  const playoffMatches = state.matches.filter(m => m.stage === 'playoff');
  const knockoutMatches = state.matches.filter(m => m.stage === 'knockout');
  const finalMatches = state.matches.filter(m => m.stage === 'final');

  // Match objects for rendering
  const playoff1 = playoffMatches.find(m => m.id === 'match_playoff_1') || playoffMatches[0] || null;
  const playoff2 = playoffMatches.find(m => m.id === 'match_playoff_2') || playoffMatches[1] || null;
  
  const semi1 = knockoutMatches.find(m => m.id === 'match_semi_1') || knockoutMatches[0] || null;
  const semi2 = knockoutMatches.find(m => m.id === 'match_semi_2') || knockoutMatches[1] || null;
  
  const finalMatch = finalMatches[0] || null;

  // Semi-finals promotion checks (Auto progression placeholders)
  // If playoff matches complete, we can promote winners to semi-finals
  const canPromoteToSemis = (playoff1?.status === 'completed' || playoff2?.status === 'completed') && 
    (semi1?.status === 'scheduled' || semi2?.status === 'scheduled');

  // Promotion helpers to Grand Finals
  const canGenerateFinal = semi1?.status === 'completed' && semi2?.status === 'completed' && finalMatches.length === 0;

  const handleCreateFinalMatch = () => {
    if (!semi1?.winnerTeamId || !semi2?.winnerTeamId) return;

    addMatch({
      tournamentId: state.activeTournamentId,
      groupId: null,
      stage: 'final',
      teamAId: semi1.winnerTeamId,
      teamBId: semi2.winnerTeamId,
      court: 'Sân Trung Tâm',
      scheduledAt: '2026-06-24T15:00',
      status: 'scheduled',
      scoreA: null,
      scoreB: null,
      winnerTeamId: null,
      note: 'Trận CHUNG KẾT tranh Cúp vô địch Đồng đội Golab!'
    });
  };

  // Co-third place teams (losers of semifinals)
  const getCoThirdTeams = (): Team[] => {
    const teams: Team[] = [];
    if (semi1?.status === 'completed') {
      const loserId = semi1.winnerTeamId === semi1.teamAId ? semi1.teamBId : semi1.teamAId;
      const t = getTeamObj(loserId);
      if (t) teams.push(t);
    }
    if (semi2?.status === 'completed') {
      const loserId = semi2.winnerTeamId === semi2.teamAId ? semi2.teamBId : semi2.teamAId;
      const t = getTeamObj(loserId);
      if (t) teams.push(t);
    }
    return teams;
  };

  const coThirdTeams = getCoThirdTeams();

  // Roles
  const currentRole = state.currentUser?.role || 'viewer';
  const canEdit = currentRole === 'super_admin' || currentRole === 'organizer';

  return (
    <div id="knockout-screen-container" className="space-y-6 animate-fade-in text-slate-100">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-display font-bold text-slate-100 tracking-tight flex items-center gap-2">
          <Trophy className="w-6 h-6 text-brand-primary" />
          <span>Vòng Loại Trực Tiếp (Playoffs 6 Đội)</span>
        </h1>
        <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">
          Sơ đồ nhánh đấu 6 đội. Đội nhất bảng (A1, B1) đặc cách vào thẳng Bán kết. Đội nhì, ba mỗi bảng tranh vé Tứ kết.
        </p>
      </div>

      {/* Promotion banner controls */}
      {canGenerateFinal && canEdit && (
        <div className="bg-gradient-to-r from-brand-primary to-lime-500 rounded-2xl p-4 text-slate-950 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_20px_rgba(190,242,100,0.25)]">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 shrink-0 text-slate-950 animate-bounce" />
            <div>
              <h4 className="font-display font-bold text-sm text-slate-950">Hai trận Bán Kết đã hoàn tất!</h4>
              <p className="text-[10px] font-bold text-slate-800 uppercase tracking-wider mt-0.5">Bấm để tự động khởi tạo nhánh đấu Chung kết cúp vàng Golab.</p>
            </div>
          </div>
          <button
            onClick={handleCreateFinalMatch}
            className="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-brand-primary font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0 shadow-lg"
          >
            🚀 Khởi tạo trận Chung Kết
          </button>
        </div>
      )}

      {/* Bracket Tree Layout Board */}
      <div className="premium-card rounded-2xl p-5 md:p-8 border border-slate-850/80 overflow-x-auto">
        <div className="flex flex-col md:flex-row items-stretch justify-between gap-8 min-w-[850px] relative">
          
          {/* Column 1: Playoff (Tứ kết) */}
          <div className="flex-1 flex flex-col justify-around gap-6 relative z-10">
            <div className="text-center border-b border-slate-800 pb-2 mb-2">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-display">
                Vòng Tứ Kết (Playoffs)
              </h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                Nhì Bảng A/B vs Ba Bảng B/A
              </p>
            </div>

            {/* Playoff 1 Card */}
            {playoff1 ? (
              <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-4 space-y-3 hover:border-slate-800 transition-all shadow-xl">
                <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Tứ kết 1 (A2 vs B3)
                </span>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold truncate ${playoff1.winnerTeamId === playoff1.teamAId ? 'text-brand-primary' : 'text-slate-300'}`}>
                      {getTeamObj(playoff1.teamAId)?.name || 'Nhì Bảng A'}
                    </span>
                    <span className="font-mono font-black text-slate-200">{playoff1.scoreA ?? '-'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold truncate ${playoff1.winnerTeamId === playoff1.teamBId ? 'text-brand-primary' : 'text-slate-300'}`}>
                      {getTeamObj(playoff1.teamBId)?.name || 'Ba Bảng B'}
                    </span>
                    <span className="font-mono font-black text-slate-200">{playoff1.scoreB ?? '-'}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-800 text-[10px] text-slate-500 font-semibold">
                  <span>Sân: {playoff1.court || 'Chưa xếp'}</span>
                  <button
                    onClick={() => setCurrentTab('matches')}
                    className="text-brand-primary hover:text-lime-300 transition-colors font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Chi tiết</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center border border-dashed border-slate-850 rounded-2xl text-xs text-slate-500 bg-slate-950/45 font-light">
                Chưa xếp cặp TK 1.
              </div>
            )}

            {/* Playoff 2 Card */}
            {playoff2 ? (
              <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-4 space-y-3 hover:border-slate-800 transition-all shadow-xl">
                <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Tứ kết 2 (B2 vs A3)
                </span>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold truncate ${playoff2.winnerTeamId === playoff2.teamAId ? 'text-brand-primary' : 'text-slate-300'}`}>
                      {getTeamObj(playoff2.teamAId)?.name || 'Nhì Bảng B'}
                    </span>
                    <span className="font-mono font-black text-slate-200">{playoff2.scoreA ?? '-'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold truncate ${playoff2.winnerTeamId === playoff2.teamBId ? 'text-brand-primary' : 'text-slate-300'}`}>
                      {getTeamObj(playoff2.teamBId)?.name || 'Ba Bảng A'}
                    </span>
                    <span className="font-mono font-black text-slate-200">{playoff2.scoreB ?? '-'}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-800 text-[10px] text-slate-500 font-semibold">
                  <span>Sân: {playoff2.court || 'Chưa xếp'}</span>
                  <button
                    onClick={() => setCurrentTab('matches')}
                    className="text-brand-primary hover:text-lime-300 transition-colors font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Chi tiết</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center border border-dashed border-slate-855 rounded-2xl text-xs text-slate-500 bg-slate-950/45 font-light">
                Chưa xếp cặp TK 2.
              </div>
            )}
          </div>

          {/* Column 2: Semifinals */}
          <div className="flex-1 flex flex-col justify-around gap-6 relative z-10">
            <div className="text-center border-b border-slate-800 pb-2 mb-2">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-display">
                Bán Kết (Semi-Finals)
              </h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                Hạt giống bảng A1/B1 đặc cách chờ sẵn
              </p>
            </div>

            {/* Semi-final 1 Card */}
            {semi1 ? (
              <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-4 space-y-3 hover:border-slate-800 transition-all shadow-xl">
                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Bán kết 1
                  </span>
                  <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    A1 Đặc cách
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold truncate ${semi1.winnerTeamId === semi1.teamAId ? 'text-brand-primary' : 'text-slate-300'}`}>
                      {getTeamObj(semi1.teamAId)?.name || 'Hạt giống A1'}
                    </span>
                    <span className="font-mono font-black text-slate-200">{semi1.scoreA ?? '-'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold truncate ${semi1.winnerTeamId === semi1.teamBId ? 'text-brand-primary' : 'text-slate-300'}`}>
                      {getTeamObj(semi1.teamBId)?.name || 'Thắng Tứ kết 2'}
                    </span>
                    <span className="font-mono font-black text-slate-200">{semi1.scoreB ?? '-'}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-800 text-[10px] text-slate-500 font-semibold">
                  <span>Sân: {semi1.court || 'Chưa xếp'}</span>
                  <button
                    onClick={() => setCurrentTab('matches')}
                    className="text-brand-primary hover:text-lime-300 transition-colors font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Chi tiết</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center border border-dashed border-slate-850 rounded-2xl text-xs text-slate-500 bg-slate-950/45 font-light">
                Chưa xếp cặp BK 1.
              </div>
            )}

            {/* Semi-final 2 Card */}
            {semi2 ? (
              <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-4 space-y-3 hover:border-slate-800 transition-all shadow-xl">
                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Bán kết 2
                  </span>
                  <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    B1 Đặc cách
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold truncate ${semi2.winnerTeamId === semi2.teamAId ? 'text-brand-primary' : 'text-slate-300'}`}>
                      {getTeamObj(semi2.teamAId)?.name || 'Hạt giống B1'}
                    </span>
                    <span className="font-mono font-black text-slate-200">{semi2.scoreA ?? '-'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold truncate ${semi2.winnerTeamId === semi2.teamBId ? 'text-brand-primary' : 'text-slate-300'}`}>
                      {getTeamObj(semi2.teamBId)?.name || 'Thắng Tứ kết 1'}
                    </span>
                    <span className="font-mono font-black text-slate-200">{semi2.scoreB ?? '-'}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-800 text-[10px] text-slate-500 font-semibold">
                  <span>Sân: {semi2.court || 'Chưa xếp'}</span>
                  <button
                    onClick={() => setCurrentTab('matches')}
                    className="text-brand-primary hover:text-lime-300 transition-colors font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Chi tiết</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center border border-dashed border-slate-850 rounded-2xl text-xs text-slate-500 bg-slate-950/45 font-light">
                Chưa xếp cặp BK 2.
              </div>
            )}
          </div>

          {/* Column 3: Grand Finals */}
          <div className="flex-1 flex flex-col justify-center min-w-[260px] relative z-10 select-none">
            <div className="text-center border-b border-slate-800 pb-2 mb-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-display">
                Chung Kết (Grand Finals)
              </h3>
            </div>

            {finalMatch ? (
              <div className="bg-gradient-to-br from-slate-900 to-amber-950/20 border border-amber-500/25 rounded-2xl p-5 space-y-4 relative shadow-[0_0_30px_rgba(245,158,11,0.06)]">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] bg-brand-primary text-slate-950 font-bold px-2.5 py-0.8 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-md font-display">
                    <Trophy className="w-3 h-3 shrink-0 fill-current" />
                    <span>CHUNG KẾT CÚP GOLAB</span>
                  </span>
                  
                  <StatusBadge type="match_status" value={finalMatch.status} />
                </div>

                <div className="space-y-2.5 border-y border-slate-800/80 py-3.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${finalMatch.winnerTeamId === finalMatch.teamAId ? 'font-black text-brand-primary pl-2 border-l-2 border-brand-primary' : 'font-bold text-slate-300'}`}>
                      {getTeamObj(finalMatch.teamAId)?.name || 'Thắng Bán Kết 1'}
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-200">{finalMatch.scoreA ?? '-'}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${finalMatch.winnerTeamId === finalMatch.teamBId ? 'font-black text-brand-primary pl-2 border-l-2 border-brand-primary' : 'font-bold text-slate-300'}`}>
                      {getTeamObj(finalMatch.teamBId)?.name || 'Thắng Bán Kết 2'}
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-200">{finalMatch.scoreB ?? '-'}</span>
                  </div>
                </div>

                {finalMatch.winnerTeamId && (
                  <div className="text-center bg-brand-primary/10 border border-brand-primary/20 p-3 rounded-xl animate-fade-in">
                    <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">🥇 Nhà Vô Địch Cúp Golab Lần 2 🥇</p>
                    <p className="font-display font-bold text-brand-primary text-xs sm:text-sm mt-1">{getTeamObj(finalMatch.winnerTeamId)?.name}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 font-semibold">
                  <span>📍 {finalMatch.court || 'Chưa xếp'}</span>
                  <button
                    onClick={() => setCurrentTab('matches')}
                    className="text-brand-primary hover:text-lime-300 transition-colors font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Console</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/40 border border-dashed border-slate-850 rounded-2xl py-12 text-center p-4">
                <Trophy className="w-8 h-8 text-slate-650 mx-auto mb-2" />
                <h4 className="font-bold text-xs text-slate-400">Chung Kết Chờ Thiết Lập</h4>
                <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed max-w-[200px] mx-auto font-light">
                  Chờ xác nhận danh tính hai đội chiến thắng tại vòng Bán Kết ở cột bên trái.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rewards Highlight Box */}
      <div className="premium-card rounded-2xl p-5 border border-slate-850/80 space-y-4 select-none">
        <h3 className="font-display font-bold text-sm text-brand-primary flex items-center gap-1.5">
          <Award className="w-4 h-4 text-brand-primary" />
          <span>Danh sách Phần Thưởng Giải Đấu</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-850 flex items-start gap-2.5">
            <span className="text-xl">🥇</span>
            <div>
              <h4 className="font-bold text-xs text-slate-200">Giải Nhất (Vô Địch)</h4>
              <p className="text-[10px] text-slate-400 font-light mt-1">
                05 Cúp Vàng, 05 Huy chương Vàng & 1.000.000 VNĐ tiền thưởng.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-850 flex items-start gap-2.5">
            <span className="text-xl">🥈</span>
            <div>
              <h4 className="font-bold text-xs text-slate-200">Giải Nhì</h4>
              <p className="text-[10px] text-slate-400 font-light mt-1">
                05 Cúp Bạc, 05 Huy chương Bạc & 500.000 VNĐ tiền thưởng.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-850 flex items-start gap-2.5">
            <span className="text-xl">🥉</span>
            <div>
              <h4 className="font-bold text-xs text-slate-200">Đồng Giải Ba</h4>
              <p className="text-[10px] text-slate-400 font-light mt-1">
                05 Huy chương Đồng cho mỗi đội + Phần quà hiện vật của Thương hiệu thể thao ZOCKER.
              </p>
            </div>
          </div>
        </div>

        {coThirdTeams.length > 0 && (
          <div className="bg-brand-secondary/10 border border-brand-secondary/20 p-3.5 rounded-xl flex items-center justify-between text-xs font-bold text-indigo-300">
            <span>🎗️ Xác định Đồng Giải Ba chính thức:</span>
            <span className="text-white uppercase font-black">{coThirdTeams.map(t => t.name).join(' & ')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
