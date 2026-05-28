/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import { calculateStandings } from '../utils/tournamentLogic';
import {
  Trophy,
  Award,
  CalendarDays,
  Info,
  Layers,
  MapPin,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function PublicScreen() {
  const { state } = useTournament();

  const tourney = state.tournaments.find(t => t.id === state.activeTournamentId);
  const groupsList = state.groups;

  // Public portal secondary tab state for mobile navigation
  // Options: 'all' | 'info' | 'standings' | 'schedule' | 'teams'
  const [activePortalTab, setActivePortalTab] = useState<'info' | 'standings' | 'schedule' | 'teams'>('schedule');

  // Helpers
  const getTeamNameAndCode = (teamId: string) => {
    const team = state.teams.find(t => t.id === teamId);
    return team ? { name: team.name, code: team.code } : { name: 'Đội trống', code: '???' };
  };

  const getGroupName = (groupId: string | null) => {
    if (!groupId) return 'Hạng mục khác';
    return state.groups.find(g => g.id === groupId)?.name || 'Chung';
  };

  const getTeamMembers = (teamId: string) => {
    const refs = state.teamMembers.filter(m => m.teamId === teamId);
    return refs
      .map(ref => state.athletes.find(a => a.id === ref.athleteId)?.fullName)
      .filter(Boolean) as string[];
  };

  // Sorting matches: newest completed first + upcoming soonest
  const sortedMatches = [...state.matches].sort((a, b) => {
    // Completed matches go after scheduled matches, or sorted by schedule
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    
    if (!a.scheduledAt) return 1;
    if (!b.scheduledAt) return -1;
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
  });

  return (
    <div id="public-screen-viewport" className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-10 text-slate-100">
      
      {/* Visual Header card decoration */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 rounded-2xl p-6 text-white text-center relative overflow-hidden shadow-2xl border border-slate-850">
        <div className="absolute top-0 left-0 w-24 h-24 bg-indigo-500/10 rounded-full opacity-35 blur-2xl"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-lime-400/5 rounded-full opacity-20 blur-3xl"></div>

        <div className="relative z-10 space-y-1.5">
          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20 px-3 py-0.8 rounded-full uppercase tracking-wider font-bold">
            🟢 Đang phát sóng trực tiếp (Live Portal)
          </span>
          <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight text-slate-100 leading-tight uppercase mt-2">
            CỔNG THÔNG TIN GIẢI ĐẤU GOLAB PICKLEBALL
          </h1>
          <p className="text-xs font-bold text-lime-400 uppercase tracking-wider font-display">
            {tourney?.name}
          </p>
          <div className="text-[10px] text-slate-400 flex flex-wrap items-center justify-center gap-2 mt-2">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>Sân Pickleball Hùng Hà, TP. HCM</span>
            </span>
          </div>
        </div>
      </div>

      {/* Mobile-oriented secondary portal tabs (Touch-Friendly controls) */}
      <div className="grid grid-cols-4 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-850 sticky top-16 z-30 select-none backdrop-blur-md">
        <button
          id="portal-tab-schedule"
          onClick={() => setActivePortalTab('schedule')}
          className={`py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
            activePortalTab === 'schedule'
              ? 'bg-lime-400 text-slate-950 shadow-[0_0_10px_rgba(190,242,100,0.3)]'
              : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
          }`}
        >
          <CalendarDays className="w-4 h-4 mb-1 shrink-0" />
          <span>Lịch & Tỉ số</span>
        </button>

        <button
          id="portal-tab-standings"
          onClick={() => setActivePortalTab('standings')}
          className={`py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
            activePortalTab === 'standings'
              ? 'bg-lime-400 text-slate-950 shadow-[0_0_10px_rgba(190,242,100,0.3)]'
              : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4 mb-1 shrink-0" />
          <span>Bảng điểm</span>
        </button>

        <button
          id="portal-tab-teams"
          onClick={() => setActivePortalTab('teams')}
          className={`py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
            activePortalTab === 'teams'
              ? 'bg-lime-400 text-slate-950 shadow-[0_0_10px_rgba(190,242,100,0.3)]'
              : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4 mb-1 shrink-0" />
          <span>Đội bóng</span>
        </button>

        <button
          id="portal-tab-info"
          onClick={() => setActivePortalTab('info')}
          className={`py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
            activePortalTab === 'info'
              ? 'bg-lime-400 text-slate-950 shadow-[0_0_10px_rgba(190,242,100,0.3)]'
              : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
          }`}
        >
          <Info className="w-4 h-4 mb-1 shrink-0" />
          <span>Điều lệ giải</span>
        </button>
      </div>

      {/* Conditionally render segments based on chosen tab */}
      
      {/* 1. SCHEDULE & RESULTS TAB */}
      {activePortalTab === 'schedule' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-slate-250 text-xs flex items-center gap-1.5 uppercase tracking-wider">
              <CalendarDays className="w-4 h-4 text-lime-400" />
              <span>Tiến độ và kết quả các trận đấu</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-bold bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full">Tổng: {state.matches.length} trận</span>
          </div>

          {sortedMatches.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-10 text-center">
              <p className="text-slate-400 text-xs font-light">Chưa có trận đấu nào được ban tổ chức công bố.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {sortedMatches.map(match => {
                const teamA = getTeamNameAndCode(match.teamAId);
                const teamB = getTeamNameAndCode(match.teamBId);
                const gName = getGroupName(match.groupId);
                return (
                  <div
                    key={match.id}
                    className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between sm:flex-row sm:items-center gap-4 hover:border-lime-500/30 transition-all"
                  >
                    {/* Header bar within tile */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-2 mb-2 text-[9px] font-bold">
                        <StatusBadge type="match_status" value={match.status} />
                        <span className="text-slate-550 uppercase tracking-wider">{gName}</span>
                        {match.court && (
                          <span className="text-lime-400 font-bold bg-slate-950 border border-slate-850 px-2 py-0.5 rounded-md">
                            📍 Sân: {match.court}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className={`truncate tracking-wide ${match.winnerTeamId === match.teamAId ? 'text-lime-400 font-black' : 'text-slate-205 font-bold'}`}>
                            {teamA.name} {match.winnerTeamId === match.teamAId && '🥇'}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono tracking-wider uppercase ml-2">({teamA.code})</span>
                        </div>
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className={`truncate tracking-wide ${match.winnerTeamId === match.teamBId ? 'text-lime-400 font-black' : 'text-slate-205 font-bold'}`}>
                            {teamB.name} {match.winnerTeamId === match.teamBId && '🥇'}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono tracking-wider uppercase ml-2">({teamB.code})</span>
                        </div>
                      </div>
                    </div>

                    {/* Score panel read only */}
                    <div className="shrink-0 flex items-center sm:flex-col justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-slate-850/80 pt-2 sm:pt-0 sm:pl-4 min-w-[110px] h-9 sm:h-auto">
                      <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-600" />
                        <span>{match.scheduledAt ? match.scheduledAt.split('T')[1]?.substring(0, 5) || '08:00' : 'scheduled'}</span>
                      </div>

                      {(match.status === 'completed' || match.status === 'ongoing') ? (
                        <div className="text-right sm:text-center mt-1.5">
                          <span className="font-mono text-xs font-black text-lime-400 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md inline-block shadow-inner">
                            {match.scoreA} : {match.scoreB}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block mt-1.5 font-bold">Sắp diễn ra</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. STANDINGS TAB */}
      {activePortalTab === 'standings' && (
        <div className="space-y-6 animate-fade-in">
          {groupsList.map(group => {
            const groupTeams = state.teams.filter(t => t.groupId === group.id);
            const groupMatches = state.matches.filter(m => m.groupId === group.id && m.stage === 'group');
            const standRows = calculateStandings(groupTeams, groupMatches, tourney?.scoringConfig || {
              pointsForWin: 1,
              pointsForLoss: 0,
              pointsForDraw: 0,
              tieBreakers: ['wins', 'diff', 'headToHead', 'name']
            }, group.manualRanking);

            return (
              <div key={group.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800/80">
                  <div className="w-1.5 h-5 bg-lime-400 rounded-xs shadow-[0_0_10px_rgba(190,242,100,0.5)]"></div>
                  <h4 className="font-display font-bold text-slate-200 text-sm">Xếp hạng: {group.name}</h4>
                </div>

                {groupTeams.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4 font-light">Bảng đấu chưa gán danh sách đội tuyển.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[500px]">
                      <thead>
                        <tr className="border-b border-slate-850 bg-slate-950/40 text-slate-500 font-bold uppercase tracking-wider text-[10px] h-9">
                          <th className="px-3 text-center w-12">Hạng</th>
                          <th className="px-2">Đội tuyển</th>
                          <th className="px-2 text-center w-14">Trận</th>
                          <th className="px-2 text-center w-14">Thắng</th>
                          <th className="px-2 text-center w-14">Thua</th>
                          <th className="px-2 text-center bg-indigo-500/10 text-indigo-300 font-bold w-14">Điểm</th>
                          <th className="px-2 text-center w-14">H.Số</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-slate-350">
                        {standRows.map(row => (
                          <tr key={row.teamId} className="h-11 hover:bg-slate-900/10">
                            <td className="px-3 text-center">
                              <span className={`inline-flex items-center justify-center w-5.5 h-5.5 rounded-full font-bold text-[10px] border ${
                                row.rank === 1
                                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-400 font-extrabold shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                                  : 'bg-slate-800 border-slate-700 text-slate-300'
                              }`}>
                                {row.rank}
                              </span>
                            </td>
                            <td className="px-2">
                              <span className="font-bold text-slate-205 block">{row.teamName}</span>
                            </td>
                            <td className="px-2 text-center font-mono font-medium text-slate-400">{row.played}</td>
                            <td className="px-2 text-center font-mono font-bold text-emerald-400">{row.won}</td>
                            <td className="px-2 text-center font-mono text-red-400">{row.lost}</td>
                            <td className="px-2 text-center font-mono font-black text-indigo-300 bg-indigo-500/5">{row.points}</td>
                            <td className={`px-2 text-center font-mono font-semibold ${
                              row.scoreDifference > 0 ? 'text-emerald-400' : row.scoreDifference < 0 ? 'text-red-400' : 'text-slate-500'
                            }`}>
                              {row.scoreDifference > 0 ? `+${row.scoreDifference}` : row.scoreDifference}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 3. TEAMS DIRECTORY TAB */}
      {activePortalTab === 'teams' && (
        <div className="space-y-4 animate-fade-in">
          <h3 className="font-display font-bold text-slate-100 text-sm flex items-center gap-2 uppercase tracking-wider">
            <Trophy className="w-4 h-4 text-lime-400" />
            <span>Danh sách các đội bóng tranh tài ({state.teams.length})</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {state.teams.map(team => {
              const roster = getTeamMembers(team.id);

              return (
                <div key={team.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <div>
                      <h4 className="font-display font-bold text-slate-200 text-sm truncate">{team.name}</h4>
                      <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block mt-0.5">{team.code}</span>
                    </div>
                    <span className="text-[10px] text-lime-400 font-bold bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-full">
                      {getGroupName(team.groupId)}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Roster Đăng ký:</p>
                    {roster.length === 0 ? (
                      <p className="text-xs text-slate-500 italic font-light">Chưa cập nhật nhân sự roster.</p>
                    ) : (
                      <p className="text-xs text-slate-350 leading-relaxed font-light">
                        {roster.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. GENERAL INFO & RULES TAB */}
      {activePortalTab === 'info' && (
        <div className="space-y-5 animate-fade-in">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-display font-bold text-slate-100 text-base border-b border-slate-800 pb-3">
              Giới thiệu chung về giải đấu
            </h3>
            <p className="text-xs sm:text-sm text-slate-350 leading-relaxed whitespace-pre-line font-light">
              {tourney?.description || 'Bản mô tả chi tiết giải đấu.'}
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-display font-bold text-slate-100 text-base border-b border-slate-800 pb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-lime-400" />
              <span>Điều lệ, luật bóng & Cách thức phân định</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-350 leading-relaxed whitespace-pre-line font-light">
              {tourney?.rules || 'Quy chế và luật thi đấu giải phong trào.'}
            </p>
          </div>
        </div>
      )}

      {/* Mobile view helper badge */}
      <div className="bg-slate-950/40 text-slate-400 rounded-2xl p-4 border border-slate-850 text-center text-xs flex items-center justify-center gap-2 font-medium">
        <Smartphone className="w-4 h-4 text-slate-500" />
        <span>Trang hiển thị hỗ trợ kích thước chạm cảm ứng tuyệt đối tương thích với nền di động!</span>
      </div>
    </div>
  );
}
