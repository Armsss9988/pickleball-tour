'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { StepperProgress, type Step } from '@/components/stepper-progress';
import { StatusBadge } from '@/components/status-badge';
import { PageLoading } from '@/components/loading-skeleton';
import { EmptyState } from '@/components/empty-state';
import {
  Trophy, Users, Shield, Target, Dices, ClipboardList, Zap,
  BarChart3, ArrowRight, Settings, RefreshCw,
} from '@/components/icons';

interface DashboardStats {
  playersCount: number;
  malesCount: number;
  femalesCount: number;
  teamsCount: number;
  matchesCount: number;
  completedMatches: number;
  recentPlayers: Array<{ id: string; fullName: string; gender: string }>;
}

export default function AdminDashboardPage() {
  const { tournament, loading: tLoading, error: tError, reload } = useActiveTournament();
  const [stats, setStats] = useState<DashboardStats>({
    playersCount: 0, malesCount: 0, femalesCount: 0,
    teamsCount: 0, matchesCount: 0, completedMatches: 0, recentPlayers: [],
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!tournament) return;
    async function loadStats() {
      try {
        setLoadingStats(true);
        const playersData = await apiFetch(`/tournaments/${tournament!.id}/players`);
        const players = playersData.items || [];
        const teams = await apiFetch(`/tournaments/${tournament!.id}/teams`);
        let matches: Array<{ status: string }> = [];
        try { matches = await apiFetch(`/tournaments/${tournament!.id}/matches`); } catch { /* */ }

        setStats({
          playersCount: players.length,
          malesCount: players.filter((p: { gender: string }) => p.gender === 'MALE').length,
          femalesCount: players.filter((p: { gender: string }) => p.gender === 'FEMALE').length,
          teamsCount: teams.length,
          matchesCount: matches.length,
          completedMatches: matches.filter((m) => m.status === 'RESULT_CONFIRMED' || m.status === 'COMPLETED').length,
          recentPlayers: players.slice(0, 5),
        });
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally { setLoadingStats(false); }
    }
    loadStats();
  }, [tournament]);

  if (tLoading || loadingStats) return <PageLoading />;

  if (tError || !tournament) {
    return (
      <div className="premium-container">
        <EmptyState
          icon={Trophy}
          title="Lỗi tải dữ liệu"
          description={tError || 'Không thể thiết lập giải đấu.'}
          actionLabel="Tải lại trang"
          onAction={reload}
        />
      </div>
    );
  }

  /* ── Stepper steps derived from status ── */
  const statusPhase = getStatusPhase(tournament.status);
  const steps: Step[] = [
    { key: 'ruleset',  label: 'Cấu hình',     status: statusPhase > 0 ? 'completed' : statusPhase === 0 ? 'active' : 'locked' },
    { key: 'players',  label: 'Import VĐV',    status: statusPhase > 1 ? 'completed' : statusPhase === 1 ? 'active' : 'locked' },
    { key: 'draw',     label: 'Bốc thăm',      status: statusPhase > 2 ? 'completed' : statusPhase === 2 ? 'active' : 'locked' },
    { key: 'schedule', label: 'Xếp lịch',      status: statusPhase > 3 ? 'completed' : statusPhase === 3 ? 'active' : 'locked' },
    { key: 'compete',  label: 'Thi đấu',       status: statusPhase > 4 ? 'completed' : statusPhase === 4 ? 'active' : 'locked' },
    { key: 'knockout', label: 'Playoffs',       status: statusPhase > 5 ? 'completed' : statusPhase === 5 ? 'active' : 'locked' },
    { key: 'done',     label: 'Hoàn thành',     status: statusPhase >= 6 ? 'completed' : 'locked' },
  ];

  /* ── Quick Actions ── */
  const quickActions = [
    { icon: Dices,         label: 'Bốc thăm đội hình',    desc: 'Bốc thăm cân bằng 8 đội',     href: '/admin/draw' },
    { icon: ClipboardList, label: 'Đăng ký chặng',         desc: 'HLV đăng ký lineup chặng',     href: '/admin/lineup' },
    { icon: Zap,           label: 'Trọng tài chấm điểm',   desc: 'Chấm điểm từng chặng đấu',    href: '/admin/scoring' },
    { icon: BarChart3,     label: 'Bảng xếp hạng',         desc: 'Auto standings, tie-breakers', href: '/admin/standings' },
  ];

  return (
    <div className="premium-container space-y-6">
      {/* Header */}
      <PageHeader
        icon={Trophy}
        title={tournament.name}
        description={tournament.venueName || 'Chưa thiết lập địa điểm'}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={tournament.status} size="md" />
            <Link href="/admin/tournament" className="btn btn-secondary btn-sm">
              <Settings className="w-4 h-4" /> Thiết lập
            </Link>
          </div>
        }
      />

      {/* Stepper Progress */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Tiến trình tổ chức giải đấu</h3>
        <StepperProgress steps={steps} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        <StatCard icon={Users}   label="Vận động viên" value={stats.playersCount} color="sky"
          trend={stats.playersCount >= 40 ? { value: 'Đủ 40', positive: true } : { value: `Thiếu ${40 - stats.playersCount}`, positive: false }} />
        <StatCard icon={Shield}  label="Đội hình"      value={stats.teamsCount}   color="violet"
          trend={stats.teamsCount === 8 ? { value: 'Đã bốc thăm', positive: true } : undefined} />
        <StatCard icon={Target}  label="Trận đấu"      value={stats.matchesCount} color="amber" />
        <StatCard icon={Trophy}  label="Hoàn thành"     value={stats.completedMatches} color="emerald"
          trend={stats.matchesCount > 0 ? { value: `${Math.round(stats.completedMatches / stats.matchesCount * 100)}%`, positive: stats.completedMatches > 0 } : undefined} />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Quick Actions */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Thao tác nhanh</h3>
          <div className="flex flex-col gap-2">
            {quickActions.map(a => {
              const Icon = a.icon;
              return (
                <Link key={a.label} href={a.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700/30 hover:border-amber-500/30 hover:bg-slate-800/80 transition-all group">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/20 transition-colors">
                    <Icon className="w-[18px] h-[18px] text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-200">{a.label}</div>
                    <div className="text-xs text-slate-500">{a.desc}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Player Preview */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-300">Vận động viên ({stats.playersCount})</h3>
            <Link href="/admin/players" className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors">
              Quản lý →
            </Link>
          </div>

          {/* Gender bars */}
          <div className="flex flex-col gap-2.5 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400 w-7">Nam</span>
              <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-sky-500 to-violet-500 rounded-full transition-all duration-500"
                  style={{ width: stats.playersCount > 0 ? `${(stats.malesCount / stats.playersCount) * 100}%` : '0%' }} />
              </div>
              <span className="text-xs font-bold text-slate-300 w-6 text-right">{stats.malesCount}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400 w-7">Nữ</span>
              <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-500"
                  style={{ width: stats.playersCount > 0 ? `${(stats.femalesCount / stats.playersCount) * 100}%` : '0%' }} />
              </div>
              <span className="text-xs font-bold text-slate-300 w-6 text-right">{stats.femalesCount}</span>
            </div>
          </div>

          <hr className="border-slate-700/50 my-3" />

          {/* Player list */}
          <div className="flex flex-col gap-2">
            {stats.recentPlayers.length > 0 ? (
              stats.recentPlayers.map(p => (
                <div key={p.id} className="flex items-center gap-3 py-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 ${
                    p.gender === 'MALE' ? 'bg-gradient-to-br from-sky-500 to-violet-500' : 'bg-gradient-to-br from-pink-500 to-rose-500'
                  }`}>
                    {p.fullName.split(' ').pop()?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-200 truncate">{p.fullName}</div>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {p.gender === 'MALE' ? '♂ Nam' : '♀ Nữ'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 text-center py-4 italic">Chưa có vận động viên.</p>
            )}
            {stats.playersCount > 5 && (
              <Link href="/admin/players" className="text-xs text-slate-500 text-center py-1 hover:text-amber-400 transition-colors">
                + {stats.playersCount - 5} vận động viên khác
              </Link>
            )}
          </div>
        </div>

        {/* Ruleset Preview */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-300">Cấu hình bộ luật giải đấu</h3>
            <Link href="/admin/ruleset" className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors">
              Chỉnh sửa →
            </Link>
          </div>

          <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-800/50 rounded-lg mb-4">
            <Settings className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-slate-200">
              {tournament.ruleset?.name || 'Ruleset Standard (Chờ đồng bộ)'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Điểm thắng', value: `${tournament.ruleset?.scoringConfig?.winScore || 24} điểm` },
              { label: 'Luật Deuce', value: 'Không (first to win)' },
              { label: 'Thành viên/Đội', value: `${tournament.ruleset?.teamComposition?.teamSize || 5} người` },
              { label: 'Bắt buộc ra sân', value: 'Tất cả 5 người' },
            ].map(r => (
              <div key={r.label} className="px-3 py-2.5 bg-slate-900/50 rounded-lg">
                <div className="text-[11px] text-slate-500 font-medium mb-1">{r.label}</div>
                <div className="text-sm font-semibold text-slate-200">{r.value}</div>
              </div>
            ))}
          </div>

          {/* Segments */}
          {tournament.ruleset?.segmentDefinitions && tournament.ruleset.segmentDefinitions.length > 0 ? (
            <>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">
                {tournament.ruleset.segmentDefinitions.length} Chặng tiếp sức
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {tournament.ruleset.segmentDefinitions.map((s: { id: string; name: string; genderRule: string; playerCount: number; targetScore: number }, idx: number) => (
                  <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 bg-slate-900/50 rounded-lg border border-slate-800/50 hover:bg-slate-900/80 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-[11px] font-bold text-slate-900 flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-200 truncate">{s.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {s.genderRule === 'mixed' ? 'Mixed' : s.genderRule === 'male_only' ? 'Nam' : 'Nữ'} · {s.playerCount} VĐV
                      </div>
                    </div>
                    <div className="text-sm font-bold text-amber-400 flex-shrink-0">→ {s.targetScore}đ</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 px-4 rounded-xl bg-slate-900/30 border border-dashed border-slate-800 text-center">
              <span className="text-slate-500 text-xs font-semibold">Chưa đồng bộ chặng thi đấu cho Ruleset này.</span>
              <Link href="/admin/ruleset" className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors mt-1">
                Chỉnh sửa cấu hình →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ── */
function getStatusPhase(status: string): number {
  switch (status) {
    case 'DRAFT': return 0;
    case 'PLAYER_IMPORT': case 'PLAYERS_READY': return 1;
    case 'TEAM_DRAW_COMPLETED': return 2;
    case 'GROUP_ASSIGNED': case 'SCHEDULE_GENERATED': return 3;
    case 'RUNNING': return 4;
    case 'GROUP_COMPLETED': case 'KNOCKOUT_GENERATED': case 'KNOCKOUT_RUNNING': return 5;
    case 'COMPLETED': case 'PUBLISHED': return 6;
    default: return 0;
  }
}
