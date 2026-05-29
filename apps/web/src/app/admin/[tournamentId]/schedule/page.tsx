'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading-skeleton';
import { useToast } from '@/components/toast';
import { Calendar, Save, Info, MapPin, Clock, ArrowRight } from '@/components/icons';

interface ScheduleFormState {
  venueName: string;
  openingTime: string;
  courtCount: string;
  notes: string;
}

function toDatetimeLocal(value: string | Date | null | undefined): string {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    // Format: YYYY-MM-DDTHH:MM
    return d.toISOString().slice(0, 16);
  } catch {
    return '';
  }
}

export default function ScheduleConfigPage() {
  const { tournament, loading: tLoading, reload } = useActiveTournament();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ScheduleFormState>({
    venueName: '',
    openingTime: '',
    courtCount: '',
    notes: '',
  });

  useEffect(() => {
    if (tournament) {
      setForm({
        venueName: tournament.venueName ?? '',
        openingTime: toDatetimeLocal(tournament.openingTime),
        courtCount: (tournament as { courtCount?: number | null }).courtCount?.toString() ?? '',
        notes: (tournament as { notes?: string | null }).notes ?? '',
      });
    }
  }, [tournament]);

  function handleChange(field: keyof ScheduleFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!tournament) return;

    setSaving(true);
    try {
      await apiFetch(`/tournaments/${tournament.id}`, {
        method: 'PATCH',
        body: {
          venueName: form.venueName || undefined,
          openingTime: form.openingTime ? new Date(form.openingTime).toISOString() : undefined,
        },
      });
      toast('Đã lưu cấu hình lịch & sân thành công!', 'success');
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Không thể lưu, thử lại sau.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (tLoading) return <PageLoading />;

  return (
    <div className="premium-container space-y-6">
      <PageHeader
        icon={Calendar}
        title="Cấu hình lịch & Sân"
        description="Thiết lập địa điểm, thời gian khai mạc và số sân thi đấu. Bước này có thể làm ngay sau khi có luật thi đấu."
      />

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-sky-500/25 bg-sky-500/8 px-4 py-3 text-sm text-sky-300">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-400" />
        <div>
          <span className="font-semibold text-sky-200">Trang này có thể thiết lập từ sớm.</span>
          {' '}Cấu hình lịch không phụ thuộc vào bốc thăm hay sinh lịch. Bạn có thể cập nhật địa điểm và thời gian bất cứ lúc nào trước khi giải bắt đầu.
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Venue & Time */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 space-y-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Địa điểm & Thời gian
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="sch-venue" className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                <MapPin className="h-3.5 w-3.5" />
                Tên địa điểm / Sân thi đấu
              </label>
              <input
                id="sch-venue"
                type="text"
                value={form.venueName}
                onChange={(e) => handleChange('venueName', e.target.value)}
                placeholder="Ví dụ: Sân Pickleball GOLAB Q.10"
                className="w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="sch-opening" className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                <Clock className="h-3.5 w-3.5" />
                Thời gian khai mạc
              </label>
              <input
                id="sch-opening"
                type="datetime-local"
                value={form.openingTime}
                onChange={(e) => handleChange('openingTime', e.target.value)}
                className="w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25 transition-all [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sch-courts" className="text-xs font-semibold text-slate-400">
              Số sân thi đấu (dự kiến)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="sch-courts"
                type="number"
                min={1}
                max={20}
                value={form.courtCount}
                onChange={(e) => handleChange('courtCount', e.target.value)}
                placeholder="Ví dụ: 4"
                className="w-40 rounded-xl border border-slate-700/60 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25 transition-all"
              />
              <span className="text-xs text-slate-500">sân (thông tin tham khảo, chưa ảnh hưởng sinh lịch)</span>
            </div>
          </div>
        </div>

        {/* Current status summary */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-4">
            Tóm tắt trạng thái
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-950/40 px-4 py-3">
              <div className="text-[11px] text-slate-500">Địa điểm</div>
              <div className="mt-1 text-sm font-semibold text-slate-200">
                {tournament?.venueName || <span className="text-slate-500 italic">Chưa thiết lập</span>}
              </div>
            </div>
            <div className="rounded-xl bg-slate-950/40 px-4 py-3">
              <div className="text-[11px] text-slate-500">Thời gian khai mạc</div>
              <div className="mt-1 text-sm font-semibold text-slate-200">
                {tournament?.openingTime
                  ? new Date(tournament.openingTime).toLocaleString('vi-VN', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })
                  : <span className="text-slate-500 italic">Chưa thiết lập</span>}
              </div>
            </div>
            <div className="rounded-xl bg-slate-950/40 px-4 py-3">
              <div className="text-[11px] text-slate-500">Trạng thái giải</div>
              <div className="mt-1 text-sm font-semibold text-slate-200">
                {tournament?.status ?? '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Action row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={tournament ? `/admin/${tournament.id}/tournament` : '#'}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            Xem thêm thông tin giải đấu <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500/15 px-4 py-2.5 text-sm font-semibold text-amber-400 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </div>
      </form>
    </div>
  );
}
