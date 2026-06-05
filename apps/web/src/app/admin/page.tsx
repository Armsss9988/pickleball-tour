'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';
import { getCurrentUser, hasUsableAccessToken } from '@/lib/current-user';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { PageLoading } from '@/components/loading-skeleton';
import { EmptyState } from '@/components/empty-state';
import { useToast } from '@/components/toast';
import {
  Trophy, Plus, Calendar, Target, LogOut, X, Settings, ArrowRight, MapPin
} from '@/components/icons';

interface Tournament {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  venueName: string | null;
  status: string;
  openingTime: string | null;
  registrationDeadline: string | null;
  publicEnabled: boolean;
}

export default function TournamentListPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [venueName, setVenueName] = useState('');
  const [openingTime, setOpeningTime] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [publicEnabled, setPublicEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/tournaments');
      setTournaments(data || []);
    } catch (e: any) {
      console.error(e);
      toast(e.message || 'Lỗi tải danh sách giải đấu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const hasSession = hasUsableAccessToken() && getCurrentUser().authenticated;
    setAuthorized(hasSession);
    setAuthChecked(true);

    if (!hasSession) {
      setLoading(false);
      router.replace('/login');
      return;
    }

    loadTournaments();
  }, [router]);

  // Slug generator from tournament name
  const handleNameChange = (val: string) => {
    setName(val);
    const generatedSlug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/([^a-z0-9\s-]|_)+/g, '')
      .trim()
      .replace(/\s+/g, '-');
    setSlug(generatedSlug);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast('Vui lòng điền đầy đủ tên giải đấu và slug.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name,
        slug,
        description: description || undefined,
        venueName: venueName || undefined,
        openingTime: openingTime ? new Date(openingTime).toISOString() : undefined,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline).toISOString() : undefined,
        publicEnabled,
      };

      const created = await apiFetch('/tournaments', {
        method: 'POST',
        body: payload,
      });

      toast('Tạo giải đấu mới thành công!', 'success');
      setModalOpen(false);
      // Reset form
      setName('');
      setSlug('');
      setDescription('');
      setVenueName('');
      setOpeningTime('');
      setRegistrationDeadline('');
      setPublicEnabled(false);
      
      // Redirect to the newly created tournament dashboard
      router.push(`/admin/${created.id}`);
    } catch (err: any) {
      toast(err.message || 'Lỗi tạo giải đấu.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!authChecked || !authorized || loading) return <PageLoading />;

  return (
    <div className="premium-container max-w-7xl mx-auto px-4 py-8 space-y-8 animate-scale-in">
      {/* Top Navbar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-xl shadow-lg shadow-amber-550/10">
            🏓
          </div>
          <div>
            <h1 className="text-xl font-black text-white font-[family-name:var(--font-space-grotesk)] tracking-tight">
              GOLAB TOURNAMENT
            </h1>
            <p className="text-[10px] text-slate-550 uppercase tracking-widest font-semibold">
              Hệ thống Quản lý Giải đấu Pickleball
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 bg-slate-900/60 border border-slate-850 px-4 py-2 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-xs font-bold text-slate-950">
              A
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-200">GOLAB Admin</div>
              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Super Admin</div>
            </div>
          </div>
          <Link
            href="/login"
            className="p-2.5 text-slate-500 hover:text-rose-400 bg-slate-900 border border-slate-850 hover:border-rose-500/20 hover:bg-rose-500/5 transition-all rounded-xl shadow-sm"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Header */}
      <PageHeader
        title="Danh sách giải đấu"
        description="Quản lý và điều hành các giải đấu Pickleball đồng đội của tổ chức GOLAB."
        icon={Trophy}
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Tạo giải đấu mới
          </button>
        }
      />

      {/* Grid List */}
      {tournaments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
          {tournaments.map((t) => (
            <div
              key={t.id}
              className="card flex flex-col justify-between hover:border-amber-500/30 hover:bg-slate-900/40 hover:-translate-y-0.5 transition-all duration-300 shadow-xl border border-slate-850 p-5 group relative overflow-hidden"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      ID: {t.slug}
                    </span>
                  </div>
                  <StatusBadge status={t.status} size="sm" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-bold text-slate-100 group-hover:text-amber-400 transition-colors line-clamp-1">
                    {t.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {t.description || 'Chưa có mô tả chi tiết cho giải đấu này.'}
                  </p>
                </div>

                <div className="space-y-2.5 pt-1 text-slate-400">
                  <div className="flex items-center gap-2 text-xs">
                    <MapPin className="w-4 h-4 text-slate-550 flex-shrink-0" />
                    <span className="truncate">{t.venueName || 'Chưa thiết lập địa điểm'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="w-4 h-4 text-slate-550 flex-shrink-0" />
                    <span>
                      Khai mạc: {t.openingTime ? new Date(t.openingTime).toLocaleDateString('vi-VN') : 'Chưa định ngày'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 mt-6 flex items-center justify-between">
                <span className="text-[10px] text-slate-550 font-semibold uppercase">
                  {t.publicEnabled ? '🟢 Đang hiển thị Public' : '🔴 Nội bộ Admin'}
                </span>
                <Link
                  href={`/admin/${t.id}`}
                  className="btn btn-secondary btn-sm flex items-center gap-1.5 font-bold hover:bg-amber-500 hover:text-slate-900 hover:border-amber-500 transition-all"
                >
                  Vào quản lý <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Trophy}
          title="Chưa có giải đấu nào"
          description="Hiện tại hệ thống chưa khởi tạo giải đấu nào. Nhấp vào nút bên dưới để tạo giải Pickleball đầu tiên."
          actionLabel="Tạo giải đấu ngay"
          onAction={() => setModalOpen(true)}
        />
      )}

      {/* Creation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !submitting && setModalOpen(false)}
          />
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl relative z-10 overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Tạo giải đấu Pickleball mới
              </h2>
              <button
                disabled={submitting}
                onClick={() => setModalOpen(false)}
                className="text-slate-550 hover:text-white transition-colors disabled:opacity-30"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Tên giải đấu *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Giải Pickleball Cúp GOLAB Lần 3"
                  className="input w-full"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Đường dẫn định danh (Slug) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: cup-golab-lan-3"
                  className="input w-full font-mono text-slate-355"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  disabled={submitting}
                />
                <span className="text-[10px] text-slate-550 block">Dùng làm định danh URL, tự sinh theo tên.</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Địa điểm tổ chức</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Sân Hùng Hà, TP. Hồ Chí Minh"
                  className="input w-full"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Thời gian khai mạc</label>
                  <input
                    type="datetime-local"
                    className="input w-full text-slate-355"
                    value={openingTime}
                    onChange={(e) => setOpeningTime(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Hạn chót đăng ký</label>
                  <input
                    type="datetime-local"
                    className="input w-full text-slate-355"
                    value={registrationDeadline}
                    onChange={(e) => setRegistrationDeadline(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Mô tả giải đấu</label>
                <textarea
                  placeholder="Mô tả thông tin chi tiết giải đấu..."
                  rows={3}
                  className="input w-full py-2 resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={submitting}
                />
              </div>



              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Đang tạo...' : 'Xác nhận tạo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
