'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { tournament, loading: tLoading, error: tError, reload } = useActiveTournament();
  const [stats, setStats] = useState({
    playersCount: 0,
    malesCount: 0,
    femalesCount: 0,
    teamsCount: 0,
    matchesCount: 0,
    recentPlayers: [] as any[],
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!tournament) return;

    async function loadStats() {
      try {
        setLoadingStats(true);
        // Fetch registered players
        const playersData = await apiFetch(`/tournaments/${tournament!.id}/players`);
        const players = playersData.items || [];
        const teams = await apiFetch(`/tournaments/${tournament!.id}/teams`);
        
        let matches = [];
        try {
          // If schedule isn't generated, this might return empty or error
          matches = await apiFetch(`/tournaments/${tournament!.id}/matches`);
        } catch (e) {
          // Ignore
        }

        const males = players.filter((p: any) => p.gender === 'MALE').length;
        const females = players.filter((p: any) => p.gender === 'FEMALE').length;

        setStats({
          playersCount: players.length,
          malesCount: males,
          femalesCount: females,
          teamsCount: teams.length,
          matchesCount: matches.length,
          recentPlayers: players.slice(0, 5),
        });
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setLoadingStats(false);
      }
    }

    loadStats();
  }, [tournament]);

  if (tLoading || loadingStats) {
    return (
      <div className="flex items-center justify-center min-height-screen" style={{ minHeight: '80vh' }}>
        <span className="login-spinner" style={{ width: '40px', height: '40px', borderTopColor: 'var(--brand-500)' }} />
      </div>
    );
  }

  if (tError || !tournament) {
    return (
      <div className="card p-6 m-6 text-center">
        <h2 className="text-red-500 font-bold mb-4">⚠️ Lỗi tải dữ liệu</h2>
        <p className="text-muted mb-4">{tError || 'Không thể thiết lập giải đấu.'}</p>
        <button onClick={reload} className="btn btn-primary">Tải lại trang</button>
      </div>
    );
  }

  // Determine active step based on status
  const getStatusStep = () => {
    switch (tournament.status) {
      case 'DRAFT':
        return 0;
      case 'PLAYER_IMPORT':
      case 'PLAYERS_READY':
        return 1;
      case 'TEAM_DRAW_COMPLETED':
        return 2;
      case 'GROUP_ASSIGNED':
      case 'SCHEDULE_GENERATED':
        return 3;
      case 'RUNNING':
      case 'GROUP_COMPLETED':
      case 'KNOCKOUT_GENERATED':
      case 'KNOCKOUT_RUNNING':
        return 4;
      case 'COMPLETED':
        return 5;
      default:
        return 0;
    }
  };

  const currentStepIndex = getStatusStep();

  const stepsList = [
    { label: 'Cấu hình Ruleset', desc: 'Thể thức Tiếp sức 24 — chặng đấu, target' },
    { label: 'Import vận động viên', desc: `${stats.playersCount}/40 VĐV đã sẵn sàng` },
    { label: 'Bốc thăm đội hình', desc: `${stats.teamsCount}/8 đội tuyển đã xác lập` },
    { label: 'Xếp lịch vòng bảng', desc: `${stats.matchesCount} trận đấu bảng đã tạo` },
    { label: 'Thi đấu & chấm điểm', desc: 'Live scoring realtime, BXH tự động' },
  ];

  const statCards = [
    { icon: '👥', label: 'Vận động viên', value: stats.playersCount.toString(), change: stats.playersCount >= 40 ? '✓ Đủ 40 VĐV' : '⏳ Chờ thêm VĐV', changeColor: stats.playersCount >= 40 ? '#22c55e' : '#f59e0b', bg: 'linear-gradient(135deg,#dbeafe,#bfdbfe)' },
    { icon: '🎽', label: 'Đội hình', value: stats.teamsCount.toString(), change: stats.teamsCount === 8 ? '✓ Đã bốc thăm' : '⏳ Chờ bốc thăm', changeColor: stats.teamsCount === 8 ? '#22c55e' : '#f59e0b', bg: 'linear-gradient(135deg,#f3e8ff,#e9d5ff)' },
    { icon: '🏓', label: 'Trận đấu bảng', value: stats.matchesCount.toString(), change: stats.matchesCount > 0 ? '✓ Đã tạo lịch' : '⏳ Chờ tạo lịch', changeColor: stats.matchesCount > 0 ? '#22c55e' : '#94a3b8', bg: 'linear-gradient(135deg,#d1fae5,#a7f3d0)' },
    { icon: '🏆', label: 'Giải đấu', value: '1', change: `Status: ${tournament.status}`, changeColor: '#0ea5e9', bg: 'linear-gradient(135deg,#fef3c7,#fde68a)' },
  ];

  const quickActions = [
    { icon: '🎲', label: 'Bốc thăm đội hình', desc: 'Bốc thăm cân bằng 8 đội', href: '/admin/draw', bg: 'linear-gradient(135deg,#f3e8ff,#e9d5ff)' },
    { icon: '📋', label: 'Đăng ký chặng', desc: 'HLV đăng ký lineup chặng', href: '/admin/lineup', bg: 'linear-gradient(135deg,#d1fae5,#a7f3d0)' },
    { icon: '🎯', label: 'Trọng tài chấm điểm', desc: 'Chấm điểm từng chặng đấu', href: '/admin/scoring', bg: 'linear-gradient(135deg,#fef3c7,#fde68a)' },
    { icon: '📊', label: 'Bảng xếp hạng', desc: 'Auto standings, tie-breakers', href: '/admin/standings', bg: 'linear-gradient(135deg,#fee2e2,#fecaca)' },
  ];

  return (
    <div className="dash-root">
      <header className="dash-header">
        <div>
          <h1 className="dash-title">{tournament.name}</h1>
          <p className="dash-sub">Địa điểm: {tournament.venueName || 'Chưa thiết lập'}</p>
        </div>
        <div className="dash-header-actions">
          <div className="dash-status">
            <span className={`dot ${tournament.status === 'RUNNING' || tournament.status === 'KNOCKOUT_RUNNING' ? 'dot-green animate-pulse-soft' : 'dot-yellow'}`} />
            <span>Trạng thái: {tournament.status}</span>
          </div>
          <Link href="/admin/tournament" className="btn btn-primary">
            ⚙️ Thiết lập giải
          </Link>
        </div>
      </header>

      <div className="dash-content">
        {/* Stats grid */}
        <div className="stats-grid stagger">
          {statCards.map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-card-top">
                <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
                <div className="stat-change" style={{ color: s.changeColor }}>
                  {s.change}
                </div>
              </div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="dash-grid">
          {/* Progress step */}
          <div className="card dash-card">
            <div className="dash-card-header">
              <h3 className="dash-card-title">Tiến trình tổ chức giải đấu</h3>
            </div>
            <div className="tournament-steps">
              {stepsList.map((step, i) => {
                let status = 'pending';
                if (i < currentStepIndex) status = 'done';
                else if (i === currentStepIndex) status = 'active';

                return (
                  <div key={step.label} className={`tstep ${status}`}>
                    <div className="tstep-icon">
                      {status === 'done' ? '✓' : status === 'active' ? '●' : String(i + 1)}
                    </div>
                    <div className="tstep-content">
                      <div className="tstep-label">{step.label}</div>
                      <div className="tstep-desc">{step.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div className="card dash-card">
            <div className="dash-card-header">
              <h3 className="dash-card-title">Thao tác nhanh BTC</h3>
            </div>
            <div className="quick-actions stagger">
              {quickActions.map(a => (
                <Link key={a.label} href={a.href} className="qa-item">
                  <div className="qa-icon" style={{ background: a.bg }}>{a.icon}</div>
                  <div className="qa-content">
                    <div className="qa-label">{a.label}</div>
                    <div className="qa-desc">{a.desc}</div>
                  </div>
                  <span className="qa-arrow">→</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Player stats preview */}
          <div className="card dash-card">
            <div className="dash-card-header">
              <h3 className="dash-card-title">Hồ sơ vận động viên ({stats.playersCount})</h3>
              <Link href="/admin/players" className="dash-card-link">Quản lý →</Link>
            </div>
            <div className="player-preview">
              <div className="player-gender-bars">
                <div className="pgb-row">
                  <span className="pgb-label">Nam</span>
                  <div className="pgb-bar">
                    <div className="pgb-fill pgb-male" style={{ width: stats.playersCount > 0 ? `${(stats.malesCount / stats.playersCount) * 100}%` : '0%' }} />
                  </div>
                  <span className="pgb-count">{stats.malesCount}</span>
                </div>
                <div className="pgb-row">
                  <span className="pgb-label">Nữ</span>
                  <div className="pgb-bar">
                    <div className="pgb-fill pgb-female" style={{ width: stats.playersCount > 0 ? `${(stats.femalesCount / stats.playersCount) * 100}%` : '0%' }} />
                  </div>
                  <span className="pgb-count">{stats.femalesCount}</span>
                </div>
              </div>
              <hr className="divider" style={{ margin: '16px 0', borderColor: 'var(--border)' }} />
              <div className="player-list">
                {stats.recentPlayers.length > 0 ? (
                  stats.recentPlayers.map(p => (
                    <div key={p.id} className="player-row">
                      <div className="player-avatar" style={{ background: p.gender === 'MALE' ? 'linear-gradient(135deg,#0ea5e9,#6366f1)' : 'linear-gradient(135deg,#ec4899,#f43f5e)' }}>
                        {p.fullName.split(' ').pop()![0]}
                      </div>
                      <div className="player-info">
                        <div className="player-name">{p.fullName}</div>
                        <div className="player-meta">{p.gender === 'MALE' ? '♂ Nam' : '♀ Nữ'}</div>
                      </div>
                      <span className="badge badge-green">✓ Đã duyệt</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted text-center py-4 text-xs italic">Chưa có vận động viên nào được nhập.</p>
                )}
                {stats.playersCount > 5 && (
                  <div className="player-more">+ {stats.playersCount - 5} vận động viên khác</div>
                )}
              </div>
            </div>
          </div>

          {/* Active Ruleset Preview */}
          <div className="card dash-card">
            <div className="dash-card-header">
              <h3 className="dash-card-title">Cấu hình bộ luật giải đấu</h3>
              <Link href="/admin/ruleset" className="dash-card-link">Chỉnh sửa →</Link>
            </div>
            <div className="ruleset-preview stagger" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="ruleset-name" style={{ margin: '0' }}>
                <span className="ruleset-icon">⚙️</span>
                {tournament.ruleset?.name || 'Ruleset Standard (Chờ đồng bộ)'}
              </div>
              <div className="ruleset-items" style={{ margin: '0' }}>
                <div className="ruleset-row">
                  <span className="ruleset-row-label">Điểm thắng chung cuộc</span>
                  <span className="ruleset-row-value">{tournament.ruleset?.scoringConfig?.winScore || 24} điểm</span>
                </div>
                <div className="ruleset-row">
                  <span className="ruleset-row-label">Luật Deuce (Hòa chặng)</span>
                  <span className="ruleset-row-value">Không (first to win)</span>
                </div>
                <div className="ruleset-row">
                  <span className="ruleset-row-label">Thành viên / Đội</span>
                  <span className="ruleset-row-value">
                    {tournament.ruleset?.teamComposition?.teamSize || 5} người ({tournament.ruleset?.teamComposition?.maleCount || 3} Nam, {tournament.ruleset?.teamComposition?.femaleCount || 2} Nữ)
                  </span>
                </div>
                <div className="ruleset-row">
                  <span className="ruleset-row-label">Bắt buộc ra sân</span>
                  <span className="ruleset-row-value">✓ Tất cả 5 người</span>
                </div>
              </div>
              <div className="ruleset-segments">
                <div className="seg-title">3 Chặng tiếp sức</div>
                {(tournament.ruleset?.segmentDefinitions || []).map((s: any, idx: number) => (
                  <div key={s.id} className="seg-item">
                    <div className="seg-no">{idx + 1}</div>
                    <div className="seg-info">
                      <div className="seg-name">{s.name}</div>
                      <div className="seg-meta">
                        {s.genderRule === 'mixed' ? 'Mixed' : s.genderRule === 'male_only' ? 'Nam' : 'Nữ'} · {s.playerCount} người
                      </div>
                    </div>
                    <div className="seg-target">→ {s.targetScore}đ</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .dash-root { display: flex; flex-direction: column; min-height: 100vh; }
        .dash-header { display: flex; align-items: center; justify-content: space-between; padding: 24px 28px; background: var(--surface); border-bottom: 1px solid var(--border); gap: 16px; flex-wrap: wrap; }
        .dash-title { font-size: 22px; font-weight: 800; color: var(--text-primary); font-family: var(--font-space-grotesk), 'Space Grotesk', sans-serif; letter-spacing: -.02em; margin-bottom: 2px; }
        .dash-sub { font-size: 13px; color: var(--text-muted); }
        .dash-header-actions { display: flex; align-items: center; gap: 12px; }
        .dash-status { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 500; color: var(--text-secondary); padding: 6px 12px; background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 100px; }
        .dash-content { padding: 24px 28px; flex: 1; display: flex; flex-direction: column; gap: 24px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        @media (max-width: 1100px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .stats-grid { grid-template-columns: 1fr; } }
        .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px; transition: all var(--trans-normal); }
        .stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
        .stat-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .stat-icon { width: 44px; height: 44px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 22px; }
        .stat-change { font-size: 12px; font-weight: 600; }
        .stat-value { font-size: 32px; font-weight: 800; color: var(--text-primary); font-family: var(--font-space-grotesk), 'Space Grotesk', sans-serif; line-height: 1; letter-spacing: -.02em; margin-bottom: 4px; }
        .stat-label { font-size: 13px; color: var(--text-muted); font-weight: 500; }
        .dash-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        @media (max-width: 900px) { .dash-grid { grid-template-columns: 1fr; } }
        .dash-card { padding: 20px; }
        .dash-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .dash-card-title { font-size: 15px; font-weight: 700; color: var(--text-primary); }
        .dash-card-link { font-size: 13px; font-weight: 600; color: var(--brand-600); text-decoration: none; transition: color var(--trans-fast); }
        .dash-card-link:hover { color: var(--brand-700); }
        .tournament-steps { display: flex; flex-direction: column; gap: 0; }
        .tstep { display: flex; gap: 14px; align-items: flex-start; padding: 12px 0; border-bottom: 1px solid var(--border); position: relative; }
        .tstep:last-child { border: none; }
        .tstep-icon { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; margin-top: 2px; }
        .tstep.done .tstep-icon { background: var(--success-500); color: white; }
        .tstep.active .tstep-icon { background: var(--gradient-brand); color: white; animation: pulse-soft 2s infinite; }
        .tstep.pending .tstep-icon { background: var(--bg-muted); color: var(--text-muted); }
        .tstep-label { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
        .tstep.pending .tstep-label { color: var(--text-muted); }
        .tstep-desc { font-size: 12px; color: var(--text-muted); }
        .quick-actions { display: flex; flex-direction: column; gap: 8px; }
        .qa-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-subtle); border: 1px solid var(--border); border-radius: var(--radius-md); text-decoration: none; transition: all var(--trans-fast); }
        .qa-item:hover { background: var(--surface-hover); border-color: var(--brand-300); transform: translateX(2px); }
        .qa-icon { width: 40px; height: 40px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .qa-content { flex: 1; }
        .qa-label { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
        .qa-desc { font-size: 12px; color: var(--text-muted); }
        .qa-arrow { color: var(--text-muted); font-size: 16px; }
        .player-gender-bars { display: flex; flex-direction: column; gap: 10px; }
        .pgb-row { display: flex; align-items: center; gap: 10px; }
        .pgb-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); width: 28px; }
        .pgb-bar { flex: 1; height: 8px; background: var(--bg-muted); border-radius: 100px; overflow: hidden; }
        .pgb-fill { height: 100%; border-radius: 100px; }
        .pgb-male { background: linear-gradient(90deg,#0ea5e9,#6366f1); }
        .pgb-female { background: linear-gradient(90deg,#ec4899,#f43f5e); }
        .pgb-count { font-size: 13px; font-weight: 700; color: var(--text-primary); width: 24px; text-align: right; }
        .player-list { display: flex; flex-direction: column; gap: 10px; }
        .player-row { display: flex; align-items: center; gap: 10px; }
        .player-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: white; flex-shrink: 0; }
        .player-info { flex: 1; }
        .player-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
        .player-meta { font-size: 11px; color: var(--text-muted); }
        .player-more { font-size: 12px; color: var(--text-muted); text-align: center; padding: 8px 0 4px; font-style: italic; }
        .ruleset-name { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--text-primary); padding: 10px 12px; background: var(--bg-subtle); border-radius: var(--radius-md); margin-bottom: 14px; }
        .ruleset-icon { font-size: 18px; }
        .ruleset-items { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
        .ruleset-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; padding: 6px 0; border-bottom: 1px solid var(--border); }
        .ruleset-row:last-child { border: none; }
        .ruleset-row-label { color: var(--text-secondary); }
        .ruleset-row-value { font-weight: 600; color: var(--text-primary); }
        .ruleset-segments { display: flex; flex-direction: column; gap: 8px; }
        .seg-title { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 4px; }
        .seg-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--bg-subtle); border-radius: var(--radius-md); border: 1px solid var(--border); }
        .seg-no { width: 24px; height: 24px; border-radius: 50%; background: var(--gradient-brand); color: white; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .seg-info { flex: 1; }
        .seg-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
        .seg-meta { font-size: 11px; color: var(--text-muted); }
        .seg-target { font-size: 13px; font-weight: 700; color: var(--brand-600); }
        .dot-green { background-color: var(--success-500); }
        .dot-yellow { background-color: var(--warning-500); }
      `}</style>
    </div>
  );
}
