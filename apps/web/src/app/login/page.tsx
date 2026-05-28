'use client';

import Link from 'next/link';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@golab.vn');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Đăng nhập thất bại.');
      }

      const data = await res.json();
      localStorage.setItem('golab_access_token', data.accessToken);
      localStorage.setItem('golab_refresh_token', data.refreshToken);
      localStorage.setItem('golab_user', JSON.stringify(data.user));

      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-root">
      {/* Left panel — branding */}
      <div className="login-left">
        <div className="login-bg-orb login-bg-orb-1" />
        <div className="login-bg-orb login-bg-orb-2" />
        <div className="login-bg-grid" />

        <div className="login-left-content">
          <Link href="/" className="login-logo">
            <span className="login-logo-icon">🏓</span>
            <span className="login-logo-text">GOLAB</span>
          </Link>

          <div className="login-promo stagger">
            <h1 className="login-promo-title">
              Quản lý giải đấu<br />
              <span className="text-gradient-hero">chuyên nghiệp</span>
            </h1>
            <p className="login-promo-desc">
              Hệ thống toàn diện cho BTC: từ bốc thăm đội hình đến chấm điểm realtime.
            </p>

            <div className="login-features stagger">
              {[
                { icon: '🎲', text: 'Bốc thăm đội hình tự động' },
                { icon: '📋', text: 'Validate lineup theo ruleset' },
                { icon: '📺', text: 'Live scoring WebSocket' },
                { icon: '🏆', text: 'Bracket & bảng xếp hạng' },
              ].map(f => (
                <div key={f.text} className="login-feature-item">
                  <span className="login-feature-icon">{f.icon}</span>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Floating score card */}
          <div className="login-score-card animate-float">
            <div className="lsc-header">
              <span className="dot dot-green animate-pulse-soft" />
              <span>Đang thi đấu · Chặng 2</span>
            </div>
            <div className="lsc-body">
              <div className="lsc-team">
                <div className="lsc-avatar" style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}>A</div>
                <span>Đội Xanh</span>
              </div>
              <div className="lsc-score">
                <span className="lsc-score-a">16</span>
                <span className="lsc-score-sep">:</span>
                <span className="lsc-score-b">12</span>
              </div>
              <div className="lsc-team lsc-team-right">
                <span>Đội Đỏ</span>
                <div className="lsc-avatar" style={{ background: 'linear-gradient(135deg,#ef4444,#f97316)' }}>B</div>
              </div>
            </div>
            <div className="lsc-bar"><div className="lsc-bar-fill" style={{ width: '67%' }} /></div>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="login-right">
        <div className="login-form-wrap animate-fade-in">
          <div className="login-form-header">
            <h2 className="login-form-title">Đăng nhập</h2>
            <p className="login-form-desc">Chào mừng quay lại! Nhập thông tin để tiếp tục.</p>
          </div>

          {/* Quick fill buttons */}
          <div className="login-quick-btns">
            <button
              type="button"
              className="login-quick-btn"
              onClick={() => { setEmail('admin@golab.vn'); setPassword('admin123'); }}
            >
              👤 Admin
            </button>
            <button
              type="button"
              className="login-quick-btn"
              onClick={() => { setEmail('scorer@golab.vn'); setPassword('scorer123'); }}
            >
              🏓 Scorer
            </button>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="admin@golab.vn"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="label" htmlFor="password">Mật khẩu</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="login-error">
                <span>⚠️</span> {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
              style={{ padding: '13px', fontSize: '15px', marginTop: '8px' }}
            >
              {loading ? (
                <span className="login-spinner" />
              ) : (
                'Đăng nhập →'
              )}
            </button>
          </form>

          <div className="login-divider">
            <hr className="divider" />
            <span>Tài khoản demo</span>
            <hr className="divider" />
          </div>

          <div className="login-demo-accounts">
            <div className="login-demo-card">
              <div className="login-demo-role">👤 Admin</div>
              <div className="login-demo-cred">admin@golab.vn · admin123</div>
            </div>
            <div className="login-demo-card">
              <div className="login-demo-role">🏓 Scorer</div>
              <div className="login-demo-cred">scorer@golab.vn · scorer123</div>
            </div>
          </div>

          <p className="login-back">
            <Link href="/" className="login-back-link">← Về trang chủ</Link>
          </p>
        </div>
      </div>

      <style>{loginStyles}</style>
    </div>
  );
}

const loginStyles = `
  .login-root {
    min-height: 100vh;
    display: flex;
  }

  /* Left */
  .login-left {
    position: relative;
    flex: 0 0 52%;
    background: var(--gradient-hero);
    display: none;
    overflow: hidden;
  }
  @media (min-width: 960px) { .login-left { display: flex; } }

  .login-bg-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    pointer-events: none;
  }
  .login-bg-orb-1 {
    width: 500px; height: 500px;
    background: rgba(99,102,241,.35);
    top: -150px; right: -80px;
    animation: float 9s ease-in-out infinite;
  }
  .login-bg-orb-2 {
    width: 350px; height: 350px;
    background: rgba(217,70,239,.2);
    bottom: -100px; left: -60px;
    animation: float 11s ease-in-out infinite reverse;
  }
  .login-bg-grid {
    position: absolute; inset: 0;
    background-image: linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
    background-size: 50px 50px;
  }

  .login-left-content {
    position: relative; z-index: 2;
    padding: 48px;
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 48px;
  }

  .login-logo {
    display: flex; align-items: center; gap: 10px;
    text-decoration: none;
  }
  .login-logo-icon { font-size: 32px; }
  .login-logo-text {
    font-size: 26px; font-weight: 900;
    color: white; letter-spacing: -.5px;
    font-family: var(--font-space-grotesk), 'Space Grotesk', sans-serif;
  }

  .login-promo {}
  .login-promo-title {
    font-size: clamp(28px, 3vw, 42px);
    font-weight: 900;
    color: white;
    letter-spacing: -.02em;
    font-family: var(--font-space-grotesk), 'Space Grotesk', sans-serif;
    line-height: 1.1;
    margin-bottom: 16px;
  }
  .login-promo-desc {
    font-size: 16px;
    color: rgba(255,255,255,.6);
    line-height: 1.65;
    margin-bottom: 32px;
    max-width: 400px;
  }
  .login-features { display: flex; flex-direction: column; gap: 14px; }
  .login-feature-item {
    display: flex; align-items: center; gap: 12px;
    font-size: 14px; font-weight: 500;
    color: rgba(255,255,255,.8);
  }
  .login-feature-icon {
    width: 36px; height: 36px;
    background: rgba(255,255,255,.1);
    border-radius: var(--radius-md);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  }

  /* Floating score card on left */
  .login-score-card {
    background: rgba(15,23,42,.75);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: var(--radius-lg);
    padding: 18px;
    box-shadow: 0 24px 48px rgba(0,0,0,.4);
    max-width: 300px;
    margin-top: auto;
  }
  .lsc-header {
    display: flex; align-items: center; gap: 8px;
    font-size: 11px; font-weight: 600;
    color: rgba(255,255,255,.5);
    text-transform: uppercase; letter-spacing: .07em;
    margin-bottom: 14px;
  }
  .lsc-body {
    display: flex; align-items: center; justify-content: space-between;
    gap: 10px; margin-bottom: 12px;
  }
  .lsc-team, .lsc-team-right {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; font-weight: 600; color: white;
  }
  .lsc-team-right { justify-content: flex-end; }
  .lsc-avatar {
    width: 30px; height: 30px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 800; color: white;
  }
  .lsc-score {
    display: flex; align-items: center; gap: 4px;
    font-family: var(--font-space-grotesk), 'Space Grotesk', sans-serif;
  }
  .lsc-score-a { font-size: 26px; font-weight: 900; color: #38bdf8; }
  .lsc-score-b { font-size: 26px; font-weight: 900; color: rgba(255,255,255,.45); }
  .lsc-score-sep { font-size: 18px; color: rgba(255,255,255,.25); }
  .lsc-bar {
    height: 3px; background: rgba(255,255,255,.1);
    border-radius: 100px; overflow: hidden;
  }
  .lsc-bar-fill {
    height: 100%; background: var(--gradient-brand); border-radius: 100px;
  }

  /* Right */
  .login-right {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    background: var(--bg-base);
  }

  .login-form-wrap {
    width: 100%;
    max-width: 400px;
  }

  .login-form-header { margin-bottom: 28px; }
  .login-form-title {
    font-size: 26px; font-weight: 800;
    color: var(--text-primary);
    font-family: var(--font-space-grotesk), 'Space Grotesk', sans-serif;
    letter-spacing: -.02em;
    margin-bottom: 6px;
  }
  .login-form-desc { font-size: 14px; color: var(--text-secondary); }

  .login-quick-btns {
    display: flex; gap: 8px; margin-bottom: 24px;
  }
  .login-quick-btn {
    flex: 1;
    padding: 9px;
    font-size: 13px; font-weight: 600;
    color: var(--text-secondary);
    background: var(--bg-subtle);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--trans-fast);
    font-family: inherit;
  }
  .login-quick-btn:hover {
    background: var(--bg-muted);
    border-color: var(--brand-400);
    color: var(--brand-600);
  }

  .login-form { display: flex; flex-direction: column; gap: 16px; }
  .form-group { display: flex; flex-direction: column; }

  .login-error {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 14px;
    background: #fee2e2;
    border: 1px solid #fecaca;
    border-radius: var(--radius-md);
    font-size: 13px; font-weight: 500;
    color: #b91c1c;
  }

  .login-spinner {
    display: inline-block;
    width: 18px; height: 18px;
    border: 2.5px solid rgba(255,255,255,.3);
    border-top-color: white;
    border-radius: 50%;
    animation: login-spin .6s linear infinite;
  }
  @keyframes login-spin {
    to { transform: rotate(360deg); }
  }

  .login-divider {
    display: flex; align-items: center; gap: 12px;
    margin: 24px 0 16px;
    font-size: 12px; font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase; letter-spacing: .05em;
  }
  .login-divider .divider { flex: 1; }

  .login-demo-accounts {
    display: flex; flex-direction: column; gap: 8px;
    margin-bottom: 20px;
  }
  .login-demo-card {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
  }
  .login-demo-role { font-size: 13px; font-weight: 600; color: var(--text-primary); }
  .login-demo-cred { font-size: 12px; color: var(--text-muted); font-family: monospace; }

  .login-back { text-align: center; }
  .login-back-link {
    font-size: 13px; font-weight: 500;
    color: var(--text-muted);
    text-decoration: none;
    transition: color var(--trans-fast);
  }
  .login-back-link:hover { color: var(--brand-600); }
`;
