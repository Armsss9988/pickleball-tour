import Link from 'next/link';
import type { Metadata } from 'next';
import { AdminEntryLink } from '@/components/admin-entry-link';
import { 
  Trophy, 
  Users, 
  ClipboardCheck, 
  Activity, 
  BarChart3, 
  GitBranch, 
  ArrowRight, 
  Sparkles, 
  Play,
  Layers,
  Award
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'GOLAB Tournament Platform — Giải đấu Pickleball Đội nhóm',
  description: 'Hệ thống quản lý giải đấu Pickleball đồng đội chuyên nghiệp, bốc thăm đội hình, tính điểm tiếp sức trực tiếp và bảng xếp hạng thời gian thực.',
};

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-amber-500/30 selection:text-amber-200 overflow-x-hidden">
      
      {/* ── BACKGROUND GLOWS ─────────────────────────────────── */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-amber-500/5 blur-[150px] pointer-events-none z-0" />
      <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] rounded-full bg-amber-600/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/3 blur-[120px] pointer-events-none z-0" />

      {/* ── NAVBAR ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-900/80">
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/5">
              <Trophy className="w-4.5 h-4.5 text-amber-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-md font-black text-slate-100 tracking-tight leading-none">
                GOLAB <span className="text-amber-500">CÚP</span>
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                Tournament
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-semibold text-slate-400 hover:text-amber-500 transition-colors">Tính năng</a>
            <a href="#how-it-works" className="text-sm font-semibold text-slate-400 hover:text-amber-500 transition-colors">Quy trình</a>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              href="/login" 
              className="text-sm font-bold text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl transition-all"
            >
              Đăng nhập
            </Link>
            <AdminEntryLink 
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-sm rounded-xl cursor-pointer shadow-md shadow-amber-500/5 transition-all"
            >
              Vào quản trị
              <ArrowRight className="w-4 h-4" />
            </AdminEntryLink>
          </div>
        </nav>
      </header>

      {/* ── HERO SECTION ──────────────────────────────────────── */}
      <section className="relative pt-12 pb-24 md:py-32 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10 w-full">
        {/* Dot pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(245,158,11,0.012)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(245,158,11,0.012)_1.5px,transparent_1.5px)] bg-[size:40px_40px] opacity-80 pointer-events-none -z-10" />

        {/* Hero Left Content */}
        <div className="lg:col-span-7 flex flex-col items-start gap-6 stagger text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/5 border border-amber-500/20 text-xs font-bold text-amber-500 uppercase tracking-widest animate-pulse-slow">
            <Sparkles className="w-3.5 h-3.5" />
            Cúp GOLAB Lần 2 — Đường đua Tiếp sức Đoàn kết
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-white">
            Nền tảng Quản lý
            <br />
            <span className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 bg-clip-text text-transparent font-black drop-shadow-sm">
              Giải đấu Pickleball
            </span>
          </h1>

          <p className="text-slate-400 text-lg leading-relaxed max-w-xl">
            Giải pháp chuyên nghiệp dành cho Ban tổ chức giải Pickleball đồng đội: tự động bốc thăm lực lượng, thiết lập chặng đấu tiếp sức, chấm điểm WebSocket trực tiếp và tổng hợp bảng xếp hạng tức thì.
          </p>

          <div className="flex flex-wrap gap-4 mt-2">
            <AdminEntryLink 
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/10 cursor-pointer transition-all hover:scale-[1.02]"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              Bắt đầu quản lý ngay
            </AdminEntryLink>
            <AdminEntryLink 
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900/60 hover:bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700 font-bold rounded-xl cursor-pointer transition-all"
            >
              <Activity className="w-4 h-4 text-amber-500" />
              Xem Live Scores
            </AdminEntryLink>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 border-t border-slate-900 pt-8 mt-6 w-full max-w-2xl">
            {[
              { value: '40', label: 'Vận động viên' },
              { value: '8', label: 'Đội tuyển' },
              { value: '24đ', label: 'Mốc tiếp sức' },
              { value: '3', label: 'Chặng thi đấu' },
            ].map((s, idx) => (
              <div key={idx} className="flex flex-col gap-1">
                <span className="text-3xl font-black text-white tracking-tight">{s.value}</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero Right Visuals */}
        <div className="lg:col-span-5 flex flex-col gap-6 relative z-20">
          
          {/* Neon score card */}
          <div className="bg-slate-900/65 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-2xl animate-[float_7s_ease-in-out_infinite]">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 tracking-wider uppercase mb-4 border-b border-slate-800/60 pb-2.5">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Đang trực tiếp · Chặng 3
              </span>
              <span className="text-amber-500">Đôi Nữ</span>
            </div>
            
            <div className="flex items-center justify-between gap-4 my-5">
              <div className="flex flex-col items-center gap-2">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 text-white font-black flex items-center justify-center text-md shadow-md shadow-sky-500/10">A</div>
                <span className="font-bold text-slate-200 text-xs">Đội Xanh</span>
              </div>
              
              <div className="flex items-center gap-3.5 bg-slate-950/90 px-5 py-2.5 rounded-2xl border border-slate-800 font-mono tracking-wider shadow-inner">
                <span className="text-3xl font-black text-sky-400">18</span>
                <span className="text-slate-600 text-xl font-black">:</span>
                <span className="text-3xl font-black text-rose-400 animate-pulse">14</span>
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 text-white font-black flex items-center justify-center text-md shadow-md shadow-rose-500/10">B</div>
                <span className="font-bold text-slate-200 text-xs">Đội Hồng</span>
              </div>
            </div>
            
            <div className="text-[11px] text-slate-500 font-semibold mb-2.5 flex justify-between">
              <span>Tiến trình giải đấu</span>
              <span className="text-slate-400 font-bold">18 / 24 điểm</span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
              <div className="h-full bg-gradient-to-r from-sky-500 via-amber-500 to-rose-500 rounded-full transition-all duration-300" style={{ width: '75%' }} />
            </div>
          </div>

          {/* Standings list preview */}
          <div className="bg-slate-900/60 backdrop-blur-lg border border-slate-800/80 rounded-2xl p-5 shadow-2xl ml-0 lg:ml-12 animate-[float_8s_ease-in-out_infinite_reverse]">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-800/60 pb-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Bảng xếp hạng tạm thời
            </div>
            <div className="flex flex-col gap-3">
              {[
                { rank: 1, name: 'Đội Xanh Lam', pts: 9, diff: '+12' },
                { rank: 2, name: 'Đội Vàng Amber', pts: 6, diff: '+4' },
                { rank: 3, name: 'Đội Hồng Rose', pts: 3, diff: '-2' },
              ].map((r, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-lg flex items-center justify-center font-black ${
                      r.rank === 1 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-950 text-slate-400'
                    }`}>{r.rank}</span>
                    <span className="font-bold text-slate-200">{r.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 font-semibold">{r.diff} chặng</span>
                    <span className="font-bold text-amber-500 font-mono">{r.pts} điểm</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ───────────────────────────────────── */}
      <section id="features" className="bg-slate-900/30 py-24 border-t border-slate-900 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 stagger">
            <span className="inline-block text-xs font-bold text-amber-500 bg-amber-500/5 border border-amber-500/20 px-3 py-1 rounded-full uppercase tracking-widest mb-4">
              Tính năng nổi bật
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Giải pháp toàn diện cho Ban tổ chức
            </h2>
            <p className="text-slate-400 mt-3 text-sm sm:text-base">
              Hệ thống khép kín phục vụ trọn vẹn từ lúc chuẩn bị giải đấu đến khi bế mạc trao giải.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
            {[
              {
                icon: <Users className="w-6 h-6 text-amber-500" />,
                title: 'Quản lý Đấu thủ',
                desc: 'Hỗ trợ import danh sách 40 VĐV mẫu chuẩn, phân loại giới tính, ghi chú trình độ và số điện thoại rõ ràng.',
                bg: 'bg-amber-500/5 border-amber-500/10'
              },
              {
                icon: <Layers className="w-6 h-6 text-amber-500" />,
                title: 'Bốc thăm Đội hình',
                desc: 'Chia 40 VĐV ngẫu nhiên có seed vào 8 đội chuẩn chỉ, đảm bảo cấu trúc giới tính cân bằng lực lượng.',
                bg: 'bg-amber-500/5 border-amber-500/10'
              },
              {
                icon: <ClipboardCheck className="w-6 h-6 text-amber-500" />,
                title: 'Đội hình Lineup thông minh',
                desc: 'Validate cấu hình ra sân, cấm trùng lặp VĐV chặng đấu và kiểm tra invariants giới tính trực tiếp.',
                bg: 'bg-amber-500/5 border-amber-500/10'
              },
              {
                icon: <Activity className="w-6 h-6 text-amber-500" />,
                title: 'Chấm điểm Tiếp sức 24',
                desc: 'Bàn trọng tài ghi điểm siêu nhạy, đồng bộ client WebSocket, tái tạo điểm số qua event log cực chuẩn.',
                bg: 'bg-amber-500/5 border-amber-500/10'
              },
              {
                icon: <BarChart3 className="w-6 h-6 text-amber-500" />,
                title: 'BXH & Tie-breaker 6 cấp',
                desc: 'Tự động tính toán kết quả bảng đấu và phân định chỉ số phụ tie-breaker khi có bằng điểm đối đầu.',
                bg: 'bg-amber-500/5 border-amber-500/10'
              },
              {
                icon: <GitBranch className="w-6 h-6 text-amber-500" />,
                title: 'Nhánh đấu Knockout Playoffs',
                desc: 'Sinh sơ đồ cây tứ kết, bán kết, chung kết tự động đẩy đội chiến thắng khi trận đấu hoàn thành.',
                bg: 'bg-amber-500/5 border-amber-500/10'
              }
            ].map((f, i) => (
              <div 
                key={i} 
                className="bg-slate-900/40 border border-slate-900 p-8 rounded-2xl transition-all hover:-translate-y-1 hover:border-slate-800 hover:bg-slate-900/60"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-center mb-6">
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS SECTION ────────────────────────────────── */}
      <section id="how-it-works" className="py-24 max-w-7xl mx-auto px-6 w-full">
        <div className="text-center max-w-2xl mx-auto mb-16 stagger">
          <span className="inline-block text-xs font-bold text-amber-500 bg-amber-500/5 border border-amber-500/20 px-3 py-1 rounded-full uppercase tracking-widest mb-4">
            Luồng vận hành
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            5 bước vận hành giải đấu Pickleball
          </h2>
        </div>

        <div className="max-w-3xl mx-auto flex flex-col stagger relative">
          {/* Vertical connecting line */}
          <div className="absolute left-[23px] top-[40px] bottom-[40px] w-[2px] bg-slate-900 hidden sm:block" />

          {[
            { step: '1', title: 'Thiết lập Ruleset', desc: 'BTC định cấu hình bộ quy tắc: số chặng thi đấu, mốc điểm tiếp sức (8/16/24), cấm trùng chặng và giới hạn giới tính.' },
            { step: '2', title: 'Import Vận động viên', desc: 'Tải lên danh sách 40 VĐV (24 Nam + 16 Nữ) nhanh gọn bằng bảng tính CSV hoặc nhập tay.' },
            { step: '3', title: 'Bốc thăm & Chia bảng', desc: 'Bốc thăm ngẫu nhiên phân chia 40 VĐV vào 8 đội, tự động lập lịch thi đấu vòng tròn (Round-Robin).' },
            { step: '4', title: 'Chấm điểm Thực tế', desc: 'Trọng tài ghi điểm tức thời qua Web Console, hệ thống replay điểm từ Event Sourced Log.' },
            { step: '5', title: 'Playoffs & Trao giải', desc: 'Các đội thắng bảng tiến bước vào Playoffs Knockout để tranh cúp vàng danh giá.' }
          ].map((s, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row gap-4 sm:gap-8 pb-10 last:pb-0 relative group">
              <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-slate-800 text-amber-500 font-extrabold flex items-center justify-center text-md shadow-md transition-all group-hover:border-amber-500/30 group-hover:bg-amber-500/5 shrink-0 z-10">
                {s.step}
              </div>
              <div className="pt-2">
                <h3 className="font-extrabold text-slate-100 text-lg">{s.title}</h3>
                <p className="text-slate-400 text-sm mt-1 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CALL TO ACTION ───────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-950 via-slate-900/60 to-slate-950 py-24 border-t border-slate-900 text-center relative overflow-hidden w-full">
        <div className="absolute inset-0 bg-amber-500/2 blur-[120px] pointer-events-none -z-10" />
        <div className="max-w-4xl mx-auto px-6 relative z-10 flex flex-col items-center gap-6">
          <Award className="w-12 h-12 text-amber-500" />
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Sẵn sàng tổ chức giải đấu Pickleball?
          </h2>
          <p className="text-slate-400 text-md sm:text-lg max-w-xl">
            Trải nghiệm giao diện quản trị hiện đại, mượt mà và trực quan bậc nhất. Thiết kế tối ưu cho cả máy tính, máy tính bảng và điện thoại di động.
          </p>
          <Link 
            href="/login" 
            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-2xl shadow-xl shadow-amber-500/10 transition-all hover:scale-[1.03]"
          >
            Bắt đầu trải nghiệm ngay
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="bg-slate-950 border-t border-slate-900 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-amber-500/60" />
            <span className="font-extrabold text-slate-300 text-sm tracking-tight">GOLAB Tournament Platform</span>
          </div>
          <p className="text-slate-500 text-xs">
            © 2026 GOLAB. Cúp GOLAB Lần 2 — "Đường đua Tiếp sức Đoàn kết".
          </p>
        </div>
      </footer>
    </main>
  );
}
