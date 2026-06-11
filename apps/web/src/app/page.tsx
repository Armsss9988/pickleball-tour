'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trophy, Calendar, MapPin, Loader2, ArrowRight, Settings, AlertCircle } from 'lucide-react';

interface PublicTournament {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  venueName: string | null;
  openingTime: string | null;
  status: string;
}

export default function HomePage() {
  const [tournaments, setTournaments] = useState<PublicTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // If the user is already logged in, redirect them to /admin automatically!
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('golab_access_token');
      if (token) {
        router.push('/admin');
        return; // Keep loading as true to prevent flash of content
      }
    }

    async function fetchTournaments() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/public/tournaments');
        if (!res.ok) {
          throw new Error(`Không thể tải danh sách giải đấu (Mã lỗi: ${res.status})`);
        }
        const data: PublicTournament[] = await res.json();
        
        setTournaments(data);
      } catch (err: unknown) {
        console.error('Lỗi khi tải danh sách giải đấu:', err);
        setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.');
      } finally {
        setLoading(false);
      }
    }

    void fetchTournaments();
  }, [router]);

  // Helper to format tournament status
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'RUNNING':
      case 'GROUP_COMPLETED':
      case 'KNOCKOUT_GENERATED':
      case 'KNOCKOUT_RUNNING':
        return {
          text: 'Đang diễn ra',
          badgeClass: 'badge-green',
          showDot: true,
        };
      case 'COMPLETED':
        return {
          text: 'Hoàn thành',
          badgeClass: 'badge-blue',
          showDot: false,
        };
      case 'PUBLISHED':
        return {
          text: 'Đã công bố',
          badgeClass: 'badge-purple',
          showDot: false,
        };
      default:
        return {
          text: 'Sắp khởi tranh',
          badgeClass: 'badge-gray',
          showDot: false,
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
        <Loader2 className="animate-spin text-amber-500 mb-4" size={48} />
        <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase">
          Đang kết nối trung tâm giải đấu...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500/25 selection:text-white relative overflow-hidden">
      {/* Background Decorative Blur Orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Navigation */}
      <header className="bg-slate-950/40 backdrop-blur-md border-b border-slate-900/60 sticky top-0 z-50 px-6 py-4 flex justify-between items-center w-full max-w-7xl mx-auto rounded-b-2xl">
        <Link href="/" className="flex items-center gap-2 text-decoration-none">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-base font-bold text-slate-100 tracking-tight">
            GOLAB CÚP
          </span>
        </Link>
        <Link
          href="/login"
          className="btn btn-secondary btn-sm flex items-center gap-1.5 font-bold border border-slate-850 hover:border-amber-500/30 bg-slate-900/40 hover:bg-slate-900/60 text-slate-300 hover:text-white transition-all rounded-xl"
        >
          🔑 Đăng nhập BTC / Trọng tài
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col justify-center items-center z-10">
        <div className="w-full text-center space-y-6 mb-12">
          {/* Logo container */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/20">
              🏓
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-gradient-hero">
              GOLAB PICKLEBALL
            </h1>
            <p className="text-sm sm:text-base text-slate-400 font-medium max-w-xl mx-auto">
              Hệ thống theo dõi và điều hành giải đấu trực tiếp chuyên nghiệp. Xem lịch thi đấu, bảng điểm trực tuyến và kết quả vòng đấu chéo.
            </p>
          </div>
        </div>

        {error ? (
          <div className="card w-full max-w-md p-6 border-rose-500/20 bg-rose-500/5 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-200">Không thể kết nối đến máy chủ</h3>
            <p className="text-xs text-slate-400">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-secondary btn-sm w-full"
            >
              Thử lại
            </button>
          </div>
        ) : tournaments.length > 0 ? (
          <div className="w-full space-y-6">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">
                Chọn giải đấu đang diễn ra
              </span>
              <span className="text-xs text-slate-500">
                Tìm thấy {tournaments.length} giải đấu
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 stagger">
              {tournaments.map((t) => {
                const statusInfo = getStatusDisplay(t.status);
                return (
                  <div
                    key={t.id}
                    className="card p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 hover:border-amber-500/30 hover:bg-slate-900/40 hover:-translate-y-0.5 transition-all duration-300 group"
                  >
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className={`badge ${statusInfo.badgeClass} text-xs font-semibold py-0.5`}>
                          {statusInfo.showDot && (
                            <span className="animate-ping w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1.5" />
                          )}
                          {statusInfo.text}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                          SLUG: {t.slug}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h2 className="text-lg font-bold text-slate-100 group-hover:text-amber-400 transition-colors truncate">
                          {t.name}
                        </h2>
                        {t.description && (
                          <p className="text-xs text-slate-400 line-clamp-2">
                            {t.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-400 pt-1">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{t.venueName || 'Địa điểm chưa xác định'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>
                            {t.openingTime
                              ? new Date(t.openingTime).toLocaleDateString('vi-VN', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })
                              : 'Chưa xếp lịch'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/t/${t.slug}`}
                      className="btn btn-primary btn-sm sm:btn-md flex items-center gap-2 w-full sm:w-auto font-bold"
                    >
                      Vào Xem Live <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="card w-full max-w-lg p-8 text-center space-y-6 border border-slate-900 bg-slate-900/10">
            <Trophy className="w-16 h-16 text-slate-600 mx-auto" />
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-200">Không có giải đấu công khai</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Hiện tại không có giải đấu Pickleball nào đang được cấu hình hiển thị công khai trên hệ thống.
              </p>
            </div>
            
            <div className="border-t border-slate-900/60 pt-6 flex flex-col sm:flex-row justify-center gap-3">
              <Link href="/admin" className="btn btn-secondary btn-sm flex items-center justify-center gap-2">
                <Settings className="w-4 h-4" /> Bảng điều hành BTC
              </Link>
              <Link href="/login" className="btn btn-primary btn-sm flex items-center justify-center gap-2">
                Đăng nhập hệ thống
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900/30 border-t border-slate-900/80 py-6 text-center text-xs text-slate-500 space-y-1 z-10">
        <div>Hệ thống Quản lý Giải đấu Pickleball GOLAB © {new Date().getFullYear()}</div>
        <div className="text-[10px] text-slate-600">Phát triển bởi GOLAB Advanced Agentic Technology</div>
      </footer>
    </div>
  );
}