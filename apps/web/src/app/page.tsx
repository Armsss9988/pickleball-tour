import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GOLAB Tournament Platform — Giải đấu Pickleball Đội nhóm',
};

export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="hero-section">
        {/* Background decorations */}
        <div className="hero-bg-orb hero-bg-orb-1" />
        <div className="hero-bg-orb hero-bg-orb-2" />
        <div className="hero-bg-grid" />

        {/* Nav */}
        <nav className="hero-nav">
          <div className="hero-nav-inner">
            <div className="hero-logo">
              <span className="hero-logo-icon">🏓</span>
              <span className="hero-logo-text">GOLAB</span>
              <span className="hero-logo-badge">Tournament</span>
            </div>
            <div className="hero-nav-links">
              <a href="#features" className="hero-nav-link">Tính năng</a>
              <a href="#how-it-works" className="hero-nav-link">Cách dùng</a>
            </div>
            <div className="hero-nav-actions">
              <Link href="/login" className="btn btn-ghost" style={{ color: 'rgba(255,255,255,.8)' }}>
                Đăng nhập
              </Link>
              <Link href="/admin" className="btn btn-primary btn-lg" style={{ padding: '10px 22px', fontSize: '14px' }}>
                Vào quản lý →
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="hero-content stagger">
          <div className="hero-eyebrow">
            <span className="dot dot-green animate-pulse-soft" />
            Cúp GOLAB Lần 2 — Đường đua Tiếp sức Đoàn kết
          </div>

          <h1 className="hero-title">
            Nền tảng Quản lý
            <br />
            <span className="hero-accent">Giải đấu Pickleball</span>
          </h1>

          <p className="hero-desc">
            Hệ thống toàn diện cho BTC: bốc thăm đội hình, đăng ký đấu thủ,
            xếp lịch thi đấu, chấm điểm trực tiếp và bảng xếp hạng realtime.
          </p>

          <div className="hero-cta">
            <Link href="/admin" className="btn btn-primary btn-lg">
              🚀 &nbsp;Quản lý giải đấu
            </Link>
            <Link href="/public" className="btn btn-ghost" style={{ color: 'rgba(255,255,255,.75)', border: '1.5px solid rgba(255,255,255,.2)', borderRadius: 'var(--radius-lg)', padding: '14px 28px', fontSize: '16px' }}>
              📺 &nbsp;Xem live scores
            </Link>
          </div>

          {/* Stats */}
          <div className="hero-stats stagger">
            {[
              { value: '40', label: 'Vận động viên' },
              { value: '8', label: 'Đội thi đấu' },
              { value: '24', label: 'Điểm chiến thắng' },
              { value: '3', label: 'Chặng tiếp sức' },
            ].map((s) => (
              <div key={s.label} className="hero-stat">
                <div className="hero-stat-value">{s.value}</div>
                <div className="hero-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating cards */}
        <div className="hero-cards">
          <div className="hero-card-float animate-float" style={{ animationDelay: '0s' }}>
            <div className="hcard">
              <div className="hcard-header">
                <span className="hcard-dot" style={{ background: '#22c55e' }} />
                <span>Đang thi đấu</span>
              </div>
              <div className="hcard-match">
                <div className="hcard-team">
                  <div className="hcard-avatar" style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}>A</div>
                  <span>Đội Xanh</span>
                </div>
                <div className="hcard-score">
                  <span className="hcard-score-a">18</span>
                  <span className="hcard-score-sep">:</span>
                  <span className="hcard-score-b">14</span>
                </div>
                <div className="hcard-team" style={{ justifyContent: 'flex-end' }}>
                  <span>Đội Đỏ</span>
                  <div className="hcard-avatar" style={{ background: 'linear-gradient(135deg,#ef4444,#f97316)' }}>B</div>
                </div>
              </div>
              <div className="hcard-seg">Chặng 3 · Đôi Nữ · 18 / 24</div>
              <div className="hcard-bar">
                <div className="hcard-bar-fill" style={{ width: '75%' }} />
              </div>
            </div>
          </div>

          <div className="hero-card-float animate-float" style={{ animationDelay: '1s', top: '60px', right: '-20px' }}>
            <div className="hcard" style={{ minWidth: '200px' }}>
              <div className="hcard-header">
                <span>🏆</span>
                <span>Bảng xếp hạng</span>
              </div>
              {[
                { rank: 1, name: 'Đội Xanh', pts: 9 },
                { rank: 2, name: 'Đội Vàng', pts: 6 },
                { rank: 3, name: 'Đội Đỏ', pts: 3 },
              ].map(r => (
                <div key={r.rank} className="hcard-rank-row">
                  <span className="hcard-rank-no">{r.rank}</span>
                  <span className="hcard-rank-name">{r.name}</span>
                  <span className="hcard-rank-pts">{r.pts}đ</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section id="features" className="features-section">
        <div className="section-inner">
          <div className="section-header stagger">
            <div className="section-eyebrow">Tính năng</div>
            <h2 className="section-title">Mọi thứ BTC cần</h2>
            <p className="section-desc">
              Từ quản lý vận động viên đến chấm điểm trực tiếp — tất cả trong một hệ thống
            </p>
          </div>

          <div className="features-grid stagger">
            {features.map((f) => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon" style={{ background: f.bg }}>
                  {f.icon}
                </div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" className="steps-section">
        <div className="section-inner">
          <div className="section-header stagger">
            <div className="section-eyebrow">Quy trình</div>
            <h2 className="section-title">5 bước tổ chức giải</h2>
          </div>
          <div className="steps-list stagger">
            {steps.map((s, i) => (
              <div key={s.title} className="step-item">
                <div className="step-no">{i + 1}</div>
                <div className="step-content">
                  <h3 className="step-title">{s.icon} {s.title}</h3>
                  <p className="step-desc">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2 className="cta-title">Sẵn sàng tổ chức giải đấu?</h2>
          <p className="cta-desc">Đăng nhập và bắt đầu ngay hôm nay</p>
          <Link href="/login" className="btn btn-primary btn-lg">
            Bắt đầu ngay →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-logo">
            <span>🏓</span>
            <span style={{ fontWeight: 700 }}>GOLAB Tournament Platform</span>
          </div>
          <p className="footer-copy">© 2026 GOLAB. Cúp GOLAB Lần 2 — Đường đua Tiếp sức Đoàn kết</p>
        </div>
      </footer>

      <style>{pageStyles}</style>
    </main>
  );
}

const features = [
  {
    icon: '👥',
    title: 'Quản lý đấu thủ',
    desc: 'Import danh sách 40 VĐV từ CSV, tự động phân loại nam/nữ, quản lý thông tin hồ sơ.',
    bg: 'linear-gradient(135deg,#dbeafe,#bfdbfe)',
  },
  {
    icon: '🎲',
    title: 'Bốc thăm đội hình',
    desc: 'Thuật toán bốc thăm ngẫu nhiên có seed, đảm bảo cân bằng giới tính và tỷ lệ theo quy định.',
    bg: 'linear-gradient(135deg,#f3e8ff,#e9d5ff)',
  },
  {
    icon: '📋',
    title: 'Đăng ký lineup',
    desc: 'HLV đội đăng ký đội hình từng chặng, hệ thống validate ngay lập tức theo ruleset đã cấu hình.',
    bg: 'linear-gradient(135deg,#d1fae5,#a7f3d0)',
  },
  {
    icon: '🏓',
    title: 'Chấm điểm realtime',
    desc: 'Scorer bấm điểm từng rally, điểm tích lũy qua 3 chặng, hỗ trợ undo, cập nhật WebSocket.',
    bg: 'linear-gradient(135deg,#fef3c7,#fde68a)',
  },
  {
    icon: '📊',
    title: 'BXH & Tie-breaker',
    desc: 'Bảng xếp hạng vòng bảng tự động tính điểm, xử lý tie-breaker 6 cấp độ theo quy định.',
    bg: 'linear-gradient(135deg,#fee2e2,#fecaca)',
  },
  {
    icon: '🏆',
    title: 'Bracket Knockout',
    desc: 'Tự động sinh bracket vòng loại trực tiếp, bán kết, chung kết và tranh hạng 3.',
    bg: 'linear-gradient(135deg,#fce7f3,#fbcfe8)',
  },
];

const steps = [
  { icon: '⚙️', title: 'Cấu hình ruleset', desc: 'Tạo bộ luật giải: số chặng, điểm thắng, giới hạn VĐV, quy tắc chồng chéo.' },
  { icon: '📥', title: 'Import vận động viên', desc: 'Upload CSV hoặc nhập tay danh sách 40 VĐV, xác nhận danh sách tham dự.' },
  { icon: '🎲', title: 'Bốc thăm đội hình', desc: 'Hệ thống bốc thăm tự động tạo 8 đội từ 40 VĐV theo tỷ lệ 3 nam + 2 nữ.' },
  { icon: '📅', title: 'Xếp lịch & lineup', desc: 'Tạo lịch vòng bảng, mỗi đội đăng ký đội hình cho từng chặng trước trận.' },
  { icon: '📺', title: 'Thi đấu & trao giải', desc: 'Chấm điểm trực tiếp, cập nhật bảng xếp hạng và công bố kết quả trao giải.' },
];

const pageStyles = `
  /* Hero */
  .hero-section {
    position: relative;
    min-height: 100vh;
    background: var(--gradient-hero);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding-bottom: 80px;
  }

  .hero-bg-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    pointer-events: none;
  }
  .hero-bg-orb-1 {
    width: 600px; height: 600px;
    background: rgba(99,102,241,.3);
    top: -200px; right: -100px;
    animation: float 8s ease-in-out infinite;
  }
  .hero-bg-orb-2 {
    width: 400px; height: 400px;
    background: rgba(217,70,239,.2);
    bottom: 0; left: -100px;
    animation: float 10s ease-in-out infinite reverse;
  }
  .hero-bg-grid {
    position: absolute; inset: 0;
    background-image: linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
    background-size: 60px 60px;
    pointer-events: none;
  }

  .hero-nav {
    position: relative; z-index: 10;
    padding: 20px 0;
  }
  .hero-nav-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
    display: flex;
    align-items: center;
    gap: 32px;
  }
  .hero-logo {
    display: flex; align-items: center; gap: 10px;
    flex-shrink: 0;
  }
  .hero-logo-icon { font-size: 28px; }
  .hero-logo-text {
    font-size: 22px; font-weight: 900;
    color: white; letter-spacing: -.5px;
    font-family: var(--font-space-grotesk), 'Space Grotesk', sans-serif;
  }
  .hero-logo-badge {
    font-size: 11px; font-weight: 700;
    background: rgba(255,255,255,.15);
    color: rgba(255,255,255,.8);
    padding: 3px 8px;
    border-radius: 100px;
    letter-spacing: .05em;
    text-transform: uppercase;
  }
  .hero-nav-links {
    display: flex; gap: 8px;
    flex: 1;
    margin-left: 16px;
  }
  .hero-nav-link {
    color: rgba(255,255,255,.7);
    text-decoration: none;
    font-size: 14px; font-weight: 500;
    padding: 6px 12px;
    border-radius: var(--radius-md);
    transition: all var(--trans-fast);
  }
  .hero-nav-link:hover { color: white; background: rgba(255,255,255,.1); }
  .hero-nav-actions { display: flex; align-items: center; gap: 10px; }

  .hero-content {
    position: relative; z-index: 2;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 80px 24px 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 24px;
  }
  .hero-content > * {
    max-width: 600px;
  }
  .hero-eyebrow {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; font-weight: 600;
    color: rgba(255,255,255,.7);
    letter-spacing: .05em;
    text-transform: uppercase;
  }
  .hero-title {
    font-size: clamp(40px, 6vw, 72px);
    font-weight: 900;
    line-height: 1.05;
    color: white;
    letter-spacing: -.03em;
    font-family: var(--font-space-grotesk), 'Space Grotesk', sans-serif;
  }
  .hero-title .hero-accent {
    background: linear-gradient(135deg, #7dd3fc 0%, #e879f9 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .hero-desc {
    font-size: 18px; font-weight: 400;
    color: rgba(255,255,255,.65);
    max-width: 520px;
    line-height: 1.65;
  }
  .hero-cta { display: flex; gap: 14px; flex-wrap: wrap; }
  .hero-stats {
    display: flex; gap: 40px;
    margin-top: 16px;
    flex-wrap: wrap;
  }
  .hero-stat {}
  .hero-stat-value {
    font-size: 36px; font-weight: 900;
    color: white;
    font-family: var(--font-space-grotesk), 'Space Grotesk', sans-serif;
    line-height: 1;
    letter-spacing: -.02em;
  }
  .hero-stat-label {
    font-size: 13px;
    color: rgba(255,255,255,.55);
    margin-top: 4px;
  }

  /* Floating cards */
  .hero-cards {
    position: absolute;
    right: max(24px, calc(50% - 600px + 24px));
    top: 50%;
    transform: translateY(-30%);
    display: none;
    gap: 16px;
  }
  @media (min-width: 1024px) { .hero-cards { display: flex; flex-direction: column; } }

  .hero-card-float { position: relative; }

  .hcard {
    background: rgba(15,23,42,.8);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: var(--radius-lg);
    padding: 16px;
    min-width: 260px;
    box-shadow: 0 24px 48px rgba(0,0,0,.4);
  }
  .hcard-header {
    display: flex; align-items: center; gap: 8px;
    font-size: 12px; font-weight: 600;
    color: rgba(255,255,255,.6);
    margin-bottom: 14px;
    text-transform: uppercase; letter-spacing: .06em;
  }
  .hcard-dot { width: 8px; height: 8px; border-radius: 50%; }
  .hcard-match {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; margin-bottom: 12px;
  }
  .hcard-team {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; font-weight: 600; color: white;
  }
  .hcard-avatar {
    width: 32px; height: 32px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 800; color: white;
    flex-shrink: 0;
  }
  .hcard-score {
    display: flex; align-items: center; gap: 6px;
    font-family: var(--font-space-grotesk), 'Space Grotesk', sans-serif;
  }
  .hcard-score-a { font-size: 28px; font-weight: 900; color: #38bdf8; }
  .hcard-score-b { font-size: 28px; font-weight: 900; color: rgba(255,255,255,.5); }
  .hcard-score-sep { font-size: 20px; color: rgba(255,255,255,.3); }
  .hcard-seg {
    font-size: 11px; color: rgba(255,255,255,.45);
    margin-bottom: 8px;
  }
  .hcard-bar {
    height: 4px;
    background: rgba(255,255,255,.1);
    border-radius: 100px;
    overflow: hidden;
  }
  .hcard-bar-fill {
    height: 100%;
    background: var(--gradient-brand);
    border-radius: 100px;
    transition: width .3s;
  }
  .hcard-rank-row {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255,255,255,.05);
    font-size: 13px;
  }
  .hcard-rank-row:last-child { border: none; }
  .hcard-rank-no { width: 20px; font-weight: 800; color: rgba(255,255,255,.4); font-size: 12px; }
  .hcard-rank-name { flex: 1; color: white; font-weight: 500; }
  .hcard-rank-pts { font-weight: 800; color: #38bdf8; font-size: 13px; }

  /* Features */
  .features-section {
    background: var(--bg-subtle);
    padding: 100px 0;
  }
  .section-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
  }
  .section-header {
    text-align: center;
    margin-bottom: 64px;
  }
  .section-eyebrow {
    display: inline-block;
    font-size: 12px; font-weight: 700;
    text-transform: uppercase; letter-spacing: .1em;
    color: var(--brand-600);
    background: var(--brand-100);
    padding: 4px 14px;
    border-radius: 100px;
    margin-bottom: 16px;
  }
  .section-title {
    font-size: clamp(28px, 4vw, 44px);
    font-weight: 800; letter-spacing: -.02em;
    color: var(--text-primary);
    font-family: var(--font-space-grotesk), 'Space Grotesk', sans-serif;
    margin-bottom: 16px;
  }
  .section-desc {
    font-size: 17px;
    color: var(--text-secondary);
    max-width: 520px;
    margin: 0 auto;
    line-height: 1.65;
  }
  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
  }
  .feature-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 28px;
    transition: all var(--trans-normal);
  }
  .feature-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-xl);
    border-color: var(--border-strong);
  }
  .feature-icon {
    width: 52px; height: 52px;
    border-radius: var(--radius-md);
    display: flex; align-items: center; justify-content: center;
    font-size: 26px;
    margin-bottom: 18px;
  }
  .feature-title {
    font-size: 17px; font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 10px;
  }
  .feature-desc {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.65;
  }

  /* Steps */
  .steps-section { padding: 100px 0; }
  .steps-list {
    display: flex;
    flex-direction: column;
    gap: 0;
    max-width: 680px;
    margin: 0 auto;
  }
  .step-item {
    display: flex; gap: 20px;
    position: relative;
    padding-bottom: 40px;
  }
  .step-item:last-child { padding-bottom: 0; }
  .step-item:not(:last-child) .step-no::after {
    content: '';
    position: absolute;
    left: 18px; top: 44px;
    width: 2px; height: calc(100% - 44px);
    background: linear-gradient(180deg, var(--brand-200), transparent);
  }
  .step-no {
    position: relative;
    width: 38px; height: 38px;
    border-radius: 50%;
    background: var(--gradient-brand);
    color: white;
    font-size: 15px; font-weight: 800;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    box-shadow: var(--shadow-brand);
  }
  .step-content { padding-top: 6px; }
  .step-title {
    font-size: 17px; font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 6px;
  }
  .step-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.65; }

  /* CTA */
  .cta-section {
    background: var(--gradient-hero);
    padding: 100px 24px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .cta-inner { position: relative; z-index: 1; }
  .cta-title {
    font-size: clamp(28px, 4vw, 44px);
    font-weight: 900;
    color: white;
    font-family: var(--font-space-grotesk), 'Space Grotesk', sans-serif;
    margin-bottom: 12px;
  }
  .cta-desc {
    font-size: 17px;
    color: rgba(255,255,255,.65);
    margin-bottom: 32px;
  }

  /* Footer */
  .footer {
    background: var(--gray-950);
    padding: 32px 24px;
  }
  .footer-inner {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    text-align: center;
  }
  .footer-logo {
    display: flex; align-items: center; gap: 8px;
    font-size: 15px; color: rgba(255,255,255,.8);
  }
  .footer-copy { font-size: 13px; color: rgba(255,255,255,.35); }
`;
