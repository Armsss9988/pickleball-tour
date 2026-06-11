'use client';

import Link from 'next/link';
import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Trophy, 
  Users, 
  ClipboardCheck, 
  Activity, 
  ArrowLeft, 
  AlertCircle, 
  Sparkles, 
  Mail, 
  Lock, 
  ShieldCheck, 
  Zap, 
  ChevronRight,
  Loader2
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('golab_access_token');
      if (token) {
        router.replace('/admin');
        return; // Stay in checkingAuth to prevent flash
      }
    }
    setCheckingAuth(false);
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
        <Loader2 className="animate-spin text-amber-500 mb-4" size={48} />
        <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase">
          Đang xác thực thông tin...
        </p>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Đăng nhập thất bại.');
      }

      const data = await res.json();
      localStorage.setItem('golab_access_token', data.accessToken);
      localStorage.setItem('golab_user', JSON.stringify(data.user));

      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/10 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-amber-600/5 blur-[100px] pointer-events-none z-0" />

      {/* Left panel — Branding & Promo (hidden on mobile) */}
      <div className="hidden lg:flex relative w-[50%] flex-col justify-between p-12 border-r border-slate-900 bg-slate-950 z-10">
        {/* Dot grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(245,158,11,0.015)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(245,158,11,0.015)_1.5px,transparent_1.5px)] bg-[size:30px_30px] opacity-70 pointer-events-none" />

        <div className="relative flex flex-col gap-10">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group text-decoration-none w-fit">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/5 transition-all group-hover:scale-105">
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-2xl font-black text-slate-100 tracking-tight">
              GOLAB <span className="text-amber-500">CÚP</span>
            </span>
          </Link>

          {/* Promo Section */}
          <div className="mt-8 flex flex-col gap-6 animate-[slide-right_0.6s_ease-out]">
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight text-white lg:text-5xl">
              Hệ thống quản lý<br />
              giải đấu <span className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 bg-clip-text text-transparent font-black drop-shadow-sm">Pickleball</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-md">
              Công cụ toàn diện chuyên nghiệp cho Ban tổ chức: bốc thăm chia đội, sắp xếp lịch thi đấu, giám sát đội hình và tính điểm trực tiếp chặng tiếp sức.
            </p>

            {/* Features */}
            <div className="grid grid-cols-1 gap-4 mt-4 max-w-lg">
              {[
                { 
                  icon: <Users className="w-5 h-5 text-amber-500" />, 
                  title: "Bốc thăm ngẫu nhiên", 
                  desc: "Thuật toán chia đội cân bằng lực lượng Nam & Nữ tự động." 
                },
                { 
                  icon: <ClipboardCheck className="w-5 h-5 text-amber-500" />, 
                  title: "Kiểm soát Lineup", 
                  desc: "Tự động kiểm tra chặng đấu, giới tính và giới hạn sân." 
                },
                { 
                  icon: <Activity className="w-5 h-5 text-amber-500" />, 
                  title: "Chấm điểm trực tiếp", 
                  desc: "Ghi điểm thời gian thực với kết nối WebSocket siêu nhạy." 
                },
                { 
                  icon: <Trophy className="w-5 h-5 text-amber-500" />, 
                  title: "Nhánh đấu & BXH", 
                  desc: "Tự động xếp hạng vòng tròn tie-breaker và sơ đồ Playoffs chéo." 
                },
              ].map((f, i) => (
                <div 
                  key={i} 
                  className="flex gap-4 p-4 rounded-xl bg-slate-900/30 border border-slate-900/60 backdrop-blur-sm transition-all hover:bg-slate-900/50 hover:border-slate-800/80"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-500/5 border border-amber-500/10 flex items-center justify-center shrink-0">
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-200 text-sm">{f.title}</h3>
                    <p className="text-slate-400 text-xs mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating live score card */}
        <div className="relative mt-8 max-w-sm bg-slate-900/65 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 shadow-2xl animate-[float_6s_ease-in-out_infinite] z-20">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 tracking-wider uppercase mb-3.5 border-b border-slate-800/60 pb-2">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              ĐANG THI ĐẤU · CHẶNG 2
            </span>
            <span className="text-amber-500">24 ĐIỂM TIẾP SỨC</span>
          </div>
          <div className="flex items-center justify-between gap-6 my-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md shadow-sky-500/10">A</div>
              <span className="font-bold text-slate-200 text-sm">Đội Xanh</span>
            </div>
            <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-1.5 rounded-xl border border-slate-800 font-mono tracking-wider">
              <span className="text-2xl font-black text-sky-400">16</span>
              <span className="text-slate-600 text-lg font-black">:</span>
              <span className="text-2xl font-black text-rose-400">12</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-200 text-sm">Đội Hồng</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md shadow-rose-500/10">B</div>
            </div>
          </div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
            <div className="h-full bg-gradient-to-r from-sky-500 to-amber-500 rounded-full transition-all duration-300" style={{ width: '67%' }} />
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 z-10 bg-slate-950/40 backdrop-blur-xs">
        <div className="w-full max-w-[420px] bg-slate-900/40 backdrop-blur-xl border border-slate-900 p-8 rounded-2xl shadow-2xl relative overflow-hidden animate-[scale-in_0.4s_ease-out]">
          
          {/* Subtle line glow */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

          <div className="mb-8">
            <div className="lg:hidden flex items-center gap-2 mb-6 justify-center">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-xl font-bold tracking-tight">GOLAB CÚP</span>
            </div>
            <h2 className="text-2xl font-black text-slate-100 tracking-tight">Đăng nhập Hệ thống</h2>
            <p className="text-slate-400 text-sm mt-1.5">Nhập tài khoản để tiếp tục quyền quản trị hoặc trọng tài.</p>
          </div>



          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider" htmlFor="email">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  id="email"
                  type="email"
                  className="w-full bg-slate-950/80 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 outline-none rounded-xl pl-10 pr-4 py-3 text-sm transition-all"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider" htmlFor="password">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  id="password"
                  type="password"
                  className="w-full bg-slate-950/80 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 outline-none rounded-xl pl-10 pr-4 py-3 text-sm transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-sm rounded-xl cursor-pointer shadow-lg shadow-amber-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                <>
                  Đăng nhập hệ thống
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>



          <div className="mt-8 text-center">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-amber-500 transition-all">
              <ArrowLeft className="w-3.5 h-3.5" />
              Quay lại Trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
