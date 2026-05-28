/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTournament } from '../context/TournamentContext';
import {
  Users,
  Trophy,
  Layers,
  CalendarCheck,
  RotateCw,
  UserPlus,
  PlusSquare,
  Play,
  ClipboardPen,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Clock,
  Activity
} from 'lucide-react';
import StatusBadge from './StatusBadge';

interface DashboardScreenProps {
  setCurrentTab: (tab: string) => void;
  openAddAthleteModal: () => void;
  openAddTeamModal: () => void;
}

export default function DashboardScreen({ setCurrentTab, openAddAthleteModal, openAddTeamModal }: DashboardScreenProps) {
  const { state } = useTournament();

  const athletesCount = state.athletes.length;
  const teamsCount = state.teams.length;
  const groupsCount = state.groups.length;
  const totalMatches = state.matches.length;
  const completedMatchesCount = state.matches.filter(m => m.status === 'completed').length;
  const pendingMatchesCount = state.matches.filter(m => m.status === 'scheduled').length;
  const ongoingMatchesCount = state.matches.filter(m => m.status === 'ongoing').length;

  // Active tournament details
  const activeTourney = state.tournaments.find(t => t.id === state.activeTournamentId);

  // Recent matches (last 4 completed)
  const recentCompleted = [...state.matches]
    .filter(m => m.status === 'completed')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  // Upcoming matches (next 4 scheduled/ongoing)
  const upcomingMatches = [...state.matches]
    .filter(m => m.status === 'scheduled' || m.status === 'ongoing')
    .sort((a, b) => {
      if (!a.scheduledAt) return 1;
      if (!b.scheduledAt) return -1;
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    })
    .slice(0, 4);

  const getTeamNameAndCode = (teamId: string) => {
    const team = state.teams.find(t => t.id === teamId);
    return team ? { name: team.name, code: team.code } : { name: 'Đội trống', code: '???' };
  };

  const currentRole = state.currentUser?.role || 'viewer';
  const canEdit = currentRole === 'super_admin' || currentRole === 'organizer';
  const canOperate = canEdit || currentRole === 'operator';

  return (
    <div id="dashboard-wrapper" className="space-y-8 animate-fade-in">
      {/* Welcome Hero block */}
      <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-radial from-slate-900 via-slate-950 to-slate-950 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-brand-primary rounded-full opacity-5 blur-3xl -translate-y-24 translate-x-24"></div>
        <div className="absolute bottom-0 left-1/4 w-[350px] h-[350px] bg-brand-secondary rounded-full opacity-[0.03] blur-3xl translate-y-36"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[10px] font-bold uppercase tracking-widest">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>Hệ thống điều hành GOLAB</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-white leading-tight">
              {activeTourney?.name || 'Hệ thống Quản lý Giải đấu Pickleball'}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm font-semibold flex items-center gap-1.5 flex-wrap">
              <span>📍 {activeTourney?.location || 'Chưa cập nhật địa điểm'}</span>
              <span className="text-slate-700">|</span>
              <span className="text-slate-300">📅 {activeTourney?.startDate} đến {activeTourney?.endDate}</span>
            </p>
          </div>
          
          <button
            id="quick-goto-public-page"
            onClick={() => setCurrentTab('public')}
            className="btn-primary shrink-0 text-slate-950 font-black px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-brand-primary/20"
          >
            <ExternalLink className="w-4 h-4 text-slate-950" />
            <span>Xem bảng đấu công cộng</span>
          </button>
        </div>
      </div>

      {/* Stats Cards section */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 font-display">
          Số liệu thống kê giải đấu
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Vận động viên', value: athletesCount, icon: Users, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', note: 'Sẵn sàng' },
            { label: 'Đội thi đấu', value: teamsCount, icon: Trophy, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', note: 'Đã chia bảng' },
            { label: 'Bảng đấu', value: groupsCount, icon: Layers, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', note: 'Vòng tròn' },
            { label: 'Tổng số trận', value: totalMatches, icon: CalendarCheck, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', note: 'Đã lập lịch' },
            { label: 'Đã hoàn thành', value: completedMatchesCount, icon: TrendingUp, color: 'text-brand-primary bg-brand-primary/10 border-brand-primary/20', note: `${totalMatches > 0 ? Math.round((completedMatchesCount / totalMatches) * 100) : 0}% Tiến độ` },
            { label: 'Đang/Chưa đấu', value: pendingMatchesCount + ongoingMatchesCount, icon: Clock, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', note: `${ongoingMatchesCount} trận live` }
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <div key={idx} className="premium-card p-5 rounded-2xl flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">
                    {card.label}
                  </span>
                  <div className={`p-2 rounded-xl border ${card.color.split(' ').slice(1).join(' ')}`}>
                    <Icon className={`w-4 h-4 ${card.color.split(' ')[0]}`} />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-3xl font-display font-black text-white tracking-tight leading-none">
                    {card.value}
                  </span>
                  <span className={`text-[9px] font-bold tracking-wide ${card.color.split(' ')[0]} bg-slate-950/40 px-2 py-0.5 rounded-lg border border-white/5`}>
                    {card.note}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 font-display">
          Thao tác nhanh của Ban tổ chức
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { id: 'athletes', label: 'Thêm VĐV mới', note: 'Nhập Excel hoặc dán lẻ', icon: UserPlus, enabled: canEdit, action: openAddAthleteModal, bg: 'text-indigo-400 bg-indigo-500/10 hover:border-indigo-500/35 border-white/5' },
            { id: 'teams', label: 'Tạo đội bóng', note: 'Ghép VĐV vào đội đấu', icon: PlusSquare, enabled: canEdit, action: openAddTeamModal, bg: 'text-emerald-400 bg-emerald-500/10 hover:border-emerald-500/35 border-white/5' },
            { id: 'groups', label: 'Xếp bảng đấu', note: 'Tự động tạo lịch đấu', icon: RotateCw, enabled: canEdit, action: () => setCurrentTab('groups'), bg: 'text-purple-400 bg-purple-500/10 hover:border-purple-500/35 border-white/5' },
            { id: 'matches', label: 'Trọng tài ghi điểm', note: 'Bảng điểm Relay chạm 24', icon: ClipboardPen, enabled: canOperate, action: () => setCurrentTab('matches'), bg: 'text-brand-primary bg-brand-primary/10 hover:border-brand-primary/35 border-white/5' },
            { id: 'standings', label: 'Bảng xếp hạng', note: 'Tính đối đầu & Hòa 3 bên', icon: Trophy, enabled: true, action: () => setCurrentTab('standings'), bg: 'text-amber-400 bg-amber-500/10 hover:border-amber-500/35 border-white/5' }
          ].map((act, idx) => {
            const Icon = act.icon;
            return (
              <button
                key={idx}
                id={`quick-action-${act.id}`}
                disabled={!act.enabled}
                onClick={act.action}
                className={`premium-card p-4 rounded-2xl text-left flex items-center gap-3.5 ${
                  act.enabled ? 'cursor-pointer group' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <div className={`p-2.5 rounded-xl border ${act.bg.split(' ').slice(1, 3).join(' ')} group-hover:scale-105 transition-transform shrink-0`}>
                  <Icon className={`w-5 h-5 ${act.bg.split(' ')[0]}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-white text-xs block truncate leading-tight group-hover:text-brand-primary transition-colors">
                    {act.label}
                  </span>
                  <span className="text-[9px] text-slate-450 font-medium block truncate mt-0.5">
                    {act.note}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Match Stream Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Upcoming Matches */}
        <div className="premium-card rounded-3xl p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <h3 className="font-display font-bold text-sm text-white flex items-center gap-2 uppercase tracking-wider">
              <Play className="w-4 h-4 text-brand-primary fill-brand-primary animate-pulse" />
              <span>Trận đấu tiếp theo ({upcomingMatches.length})</span>
            </h3>
            <button
              id="view-all-upcoming-trigger"
              onClick={() => setCurrentTab('matches')}
              className="text-[10px] text-brand-primary hover:text-brand-primary/80 font-bold flex items-center gap-0.5 transition-all"
            >
              <span>Xem tất cả</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingMatches.length === 0 ? (
            <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-dashed border-white/5">
              <span className="text-xs text-slate-400 block font-medium">Chưa có lịch đấu nào được khởi tạo.</span>
              {canEdit && (
                <button
                  id="dashboard-init-schedule-trigger"
                  onClick={() => setCurrentTab('groups')}
                  className="mt-3 btn-primary text-slate-950 px-3.5 py-1.5 text-[10px] rounded-lg"
                >
                  Tạo lịch tại Bảng đấu
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingMatches.map(match => {
                const teamA = getTeamNameAndCode(match.teamAId);
                const teamB = getTeamNameAndCode(match.teamBId);
                const groupName = state.groups.find(g => g.id === match.groupId)?.name || 'Chung';

                return (
                  <div
                    key={match.id}
                    id={`dashboard-match-${match.id}`}
                    className="p-4 bg-slate-950/40 hover:bg-slate-950/80 rounded-2xl border border-white/5 transition-all flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <StatusBadge type="match_status" value={match.status} />
                        <span className="text-[8px] text-slate-300 font-bold uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded border border-white/5">{groupName}</span>
                        {match.court && (
                          <span className="text-[8px] text-brand-primary font-bold bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 rounded">
                            {match.court}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200 truncate">{teamA.name}</span>
                          <span className="text-[10px] font-mono text-slate-500 font-bold ml-2">({teamA.code})</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200 truncate">{teamB.name}</span>
                          <span className="text-[10px] font-mono text-slate-500 font-bold ml-2">({teamB.code})</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-center justify-center border-l border-white/5 pl-4 w-20">
                      {match.status === 'ongoing' ? (
                        <div className="text-center">
                          <div className="font-mono text-lg font-black text-orange-450 text-orange-500 leading-none">
                            {match.scoreA ?? 0} : {match.scoreB ?? 0}
                          </div>
                          <span className="text-[8px] uppercase tracking-widest bg-orange-500/10 text-orange-400 font-black px-1.5 py-0.5 rounded border border-orange-500/20 block mt-1.5 animate-pulse">
                            Live
                          </span>
                        </div>
                      ) : (
                        <div className="text-center space-y-1">
                          <span className="text-[8px] font-bold text-slate-400 block uppercase tracking-wider">Giờ đấu</span>
                          <span className="font-mono text-[11px] font-bold text-slate-200 block">
                            {match.scheduledAt ? match.scheduledAt.split('T')[1] || '??:??' : '--:--'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Recent Results */}
        <div className="premium-card rounded-3xl p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <h3 className="font-display font-bold text-sm text-white flex items-center gap-2 uppercase tracking-wider">
              <CalendarCheck className="w-4 h-4 text-emerald-400" />
              <span>Kết quả mới cập nhật ({recentCompleted.length})</span>
            </h3>
            <button
              id="view-all-results-trigger"
              onClick={() => setCurrentTab('matches')}
              className="text-[10px] text-brand-primary hover:text-brand-primary/80 font-bold flex items-center gap-0.5 transition-all"
            >
              <span>Xem tất cả</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentCompleted.length === 0 ? (
            <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-dashed border-white/5">
              <span className="text-xs text-slate-400 block font-medium">Chưa có kết quả thi đấu nào được chốt điểm.</span>
              <p className="text-[9px] text-slate-500 mt-1.5 font-light">Tỉ số sẽ xuất hiện tại đây khi trọng tài chốt kết quả.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCompleted.map(match => {
                const teamA = getTeamNameAndCode(match.teamAId);
                const teamB = getTeamNameAndCode(match.teamBId);
                const groupName = state.groups.find(g => g.id === match.groupId)?.name || 'Chung';

                return (
                  <div
                    key={match.id}
                    id={`recent-match-${match.id}`}
                    className="p-4 bg-slate-950/40 hover:bg-slate-950/80 rounded-2xl border border-white/5 transition-all flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <StatusBadge type="match_status" value="completed" />
                        <span className="text-[8px] text-slate-300 font-bold uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded border border-white/5">{groupName}</span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold truncate ${match.winnerTeamId === match.teamAId ? 'text-brand-primary font-extrabold' : 'text-slate-400'}`}>
                            {teamA.name} {match.winnerTeamId === match.teamAId && '🏆'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold truncate ${match.winnerTeamId === match.teamBId ? 'text-brand-primary font-extrabold' : 'text-slate-400'}`}>
                            {teamB.name} {match.winnerTeamId === match.teamBId && '🏆'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-center justify-center border-l border-white/5 pl-4 w-20">
                      <span className="font-mono text-lg font-black text-slate-100 leading-none">
                        {match.scoreA} : {match.scoreB}
                      </span>
                      <span className="text-[8px] uppercase tracking-widest bg-slate-800 text-slate-400 font-bold px-1.5 py-0.5 rounded border border-white/5 block mt-2">
                        Chung cuộc
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
