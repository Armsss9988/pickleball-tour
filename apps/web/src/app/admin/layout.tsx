import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Console | GOLAB',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-root">
      {/* Sidebar */}
      <aside className="admin-sidebar" id="admin-sidebar">
        <div className="sidebar-header">
          <span className="sidebar-logo-icon">🏓</span>
          <div>
            <div className="sidebar-logo-text">GOLAB</div>
            <div className="sidebar-logo-sub">Admin Console</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Tổng quan</div>
          {navItems.slice(0, 2).map(item => (
            <a key={item.href} href={item.href} className="sidebar-link">
              <span className="sidebar-link-icon">{item.icon}</span>
              {item.label}
            </a>
          ))}

          <div className="sidebar-section-label">Giải đấu</div>
          {navItems.slice(2, 8).map(item => (
            <a key={item.href} href={item.href} className="sidebar-link">
              <span className="sidebar-link-icon">{item.icon}</span>
              {item.label}
            </a>
          ))}

          <div className="sidebar-section-label">Thi đấu</div>
          {navItems.slice(8).map(item => (
            <a key={item.href} href={item.href} className="sidebar-link">
              <span className="sidebar-link-icon">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">A</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">GOLAB Admin</div>
              <div className="sidebar-user-role">Super Admin</div>
            </div>
          </div>
          <a href="/login" className="sidebar-logout" title="Đăng xuất">⏻</a>
        </div>
      </aside>

      {/* Main */}
      <div className="admin-main">
        {children}
      </div>

      <style>{adminLayoutStyles}</style>
    </div>
  );
}

const navItems = [
  { href: '/admin', icon: '📊', label: 'Dashboard' },
  { href: '/admin/audit', icon: '📋', label: 'Nhật ký hoạt động' },
  { href: '/admin/tournament', icon: '🏆', label: 'Giải đấu' },
  { href: '/admin/ruleset', icon: '⚙️', label: 'Cấu hình Ruleset' },
  { href: '/admin/players', icon: '👥', label: 'Vận động viên' },
  { href: '/admin/teams', icon: '🎽', label: 'Đội hình' },
  { href: '/admin/draw', icon: '🎲', label: 'Bốc thăm' },
  { href: '/admin/groups', icon: '📅', label: 'Lịch thi đấu' },
  { href: '/admin/matches', icon: '🏓', label: 'Trận đấu' },
  { href: '/admin/lineup', icon: '📋', label: 'Đội hình thi đấu' },
  { href: '/admin/scoring', icon: '🎯', label: 'Chấm điểm' },
  { href: '/admin/standings', icon: '📈', label: 'Bảng xếp hạng' },
  { href: '/admin/bracket', icon: '🔱', label: 'Bracket Knockout' },
  { href: '/admin/awards', icon: '🥇', label: 'Giải thưởng' },
];

const adminLayoutStyles = `
  .admin-root {
    display: flex;
    min-height: 100vh;
    background: var(--bg-subtle);
  }

  /* Sidebar */
  .admin-sidebar {
    width: var(--sidebar-w);
    background: var(--gray-950);
    display: flex;
    flex-direction: column;
    height: 100vh;
    position: sticky;
    top: 0;
    flex-shrink: 0;
    overflow-y: auto;
    border-right: 1px solid rgba(255,255,255,.06);
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 20px 18px 18px;
    border-bottom: 1px solid rgba(255,255,255,.06);
  }
  .sidebar-logo-icon { font-size: 28px; }
  .sidebar-logo-text {
    font-size: 17px; font-weight: 900;
    color: white;
    font-family: var(--font-space-grotesk), 'Space Grotesk', sans-serif;
    letter-spacing: -.3px;
    line-height: 1;
  }
  .sidebar-logo-sub {
    font-size: 11px; font-weight: 500;
    color: rgba(255,255,255,.35);
    margin-top: 2px;
    text-transform: uppercase;
    letter-spacing: .06em;
  }

  .sidebar-nav {
    flex: 1;
    padding: 12px 10px;
    display: flex;
    flex-direction: column;
    gap: 1px;
    overflow-y: auto;
  }

  .sidebar-section-label {
    font-size: 10px; font-weight: 700;
    color: rgba(255,255,255,.3);
    text-transform: uppercase;
    letter-spacing: .1em;
    padding: 14px 8px 6px;
  }

  .sidebar-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 10px;
    font-size: 13.5px; font-weight: 500;
    color: rgba(255,255,255,.55);
    text-decoration: none;
    border-radius: var(--radius-md);
    transition: all var(--trans-fast);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sidebar-link:hover {
    color: white;
    background: rgba(255,255,255,.07);
  }
  .sidebar-link.active {
    color: white;
    background: rgba(14,165,233,.2);
    font-weight: 600;
  }
  .sidebar-link-icon { font-size: 16px; flex-shrink: 0; }

  .sidebar-footer {
    padding: 12px 14px;
    border-top: 1px solid rgba(255,255,255,.06);
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .sidebar-user { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
  .sidebar-user-avatar {
    width: 32px; height: 32px;
    border-radius: 50%;
    background: var(--gradient-brand);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 800; color: white;
    flex-shrink: 0;
  }
  .sidebar-user-info { min-width: 0; }
  .sidebar-user-name {
    font-size: 13px; font-weight: 600;
    color: rgba(255,255,255,.85);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sidebar-user-role {
    font-size: 11px; color: rgba(255,255,255,.35);
    text-transform: uppercase; letter-spacing: .05em;
  }
  .sidebar-logout {
    padding: 6px;
    color: rgba(255,255,255,.3);
    text-decoration: none;
    border-radius: var(--radius-sm);
    font-size: 16px;
    transition: all var(--trans-fast);
    flex-shrink: 0;
  }
  .sidebar-logout:hover {
    color: var(--danger-500);
    background: rgba(239,68,68,.1);
  }

  /* Main content */
  .admin-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
`;
