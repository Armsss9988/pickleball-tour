'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading-skeleton';
import { useToast } from '@/components/toast';
import { Calendar, Save, Info, MapPin, Clock, ArrowRight, Plus, Trash2, AlertTriangle, Loader2 } from '@/components/icons';

interface ScheduleFormState {
  venueName: string;
  openingTime: string;
}

interface Court {
  id: string;
  venueName: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
}

interface Conflict {
  courtId: string | null;
  courtName: string;
  venueName?: string | null;
  scheduledTime: string;
  matchIds: string[];
  matches: {
    id: string;
    label: string;
    teamAName: string;
    teamBName: string;
  }[];
}

function formatCourtLabel(court: Pick<Court, 'name' | 'venueName'>) {
  return court.venueName?.trim() ? `${court.venueName.trim()} - ${court.name}` : court.name;
}

function toDatetimeLocal(value: string | Date | null | undefined): string {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
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
  });

  // Court states
  const [courts, setCourts] = useState<Court[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [newCourtName, setNewCourtName] = useState('');
  const [newCourtVenueName, setNewCourtVenueName] = useState('');
  const [newCourtDescription, setNewCourtDescription] = useState('');
  const [addingCourt, setAddingCourt] = useState(false);
  const [deletingCourtId, setDeletingCourtId] = useState<string | null>(null);

  // Conflict states
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loadingConflicts, setLoadingConflicts] = useState(false);

  useEffect(() => {
    if (tournament) {
      setForm({
        venueName: tournament.venueName ?? '',
        openingTime: toDatetimeLocal(tournament.openingTime),
      });
      fetchCourts();
      fetchConflicts();
    }
  }, [tournament]);

  async function fetchCourts() {
    if (!tournament) return;
    setLoadingCourts(true);
    try {
      const data = await apiFetch(`/tournaments/${tournament.id}/courts`);
      setCourts(data);
    } catch (err) {
      console.error('Failed to load courts:', err);
    } finally {
      setLoadingCourts(false);
    }
  }

  async function fetchConflicts() {
    if (!tournament) return;
    setLoadingConflicts(true);
    try {
      const data = await apiFetch(`/tournaments/${tournament.id}/courts/conflicts`);
      setConflicts(data);
    } catch (err) {
      console.error('Failed to load conflicts:', err);
    } finally {
      setLoadingConflicts(false);
    }
  }

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
          openingTime: form.openingTime ? new Date(form.openingTime).toISOString() : null,
        },
      });
      toast('Đã lưu cấu hình lịch đấu thành công!', 'success');
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Không thể lưu, thử lại sau.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateCourt(e: React.FormEvent) {
    e.preventDefault();
    if (!tournament || !newCourtName.trim()) return;

    setAddingCourt(true);
    try {
      await apiFetch(`/tournaments/${tournament.id}/courts`, {
        method: 'POST',
        body: {
          name: newCourtName,
          venueName: newCourtVenueName || form.venueName || undefined,
          description: newCourtDescription || undefined,
        },
      });
      setNewCourtName('');
      setNewCourtVenueName('');
      setNewCourtDescription('');
      toast('Đã thêm sân đấu thành công!', 'success');
      fetchCourts();
      fetchConflicts();
      reload(); // reload tournament for readiness indicator
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Không thể thêm sân.', 'error');
    } finally {
      setAddingCourt(false);
    }
  }

  async function handleDeleteCourt(courtId: string) {
    if (!tournament || !window.confirm('Bạn có chắc chắn muốn xóa sân đấu này?')) return;

    setDeletingCourtId(courtId);
    try {
      await apiFetch(`/tournaments/${tournament.id}/courts/${courtId}`, {
        method: 'DELETE',
      });
      toast('Đã xóa sân đấu thành công!', 'success');
      fetchCourts();
      fetchConflicts();
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Không thể xóa sân đấu này.', 'error');
    } finally {
      setDeletingCourtId(null);
    }
  }

  if (tLoading) return <PageLoading />;

  return (
    <div className="premium-container space-y-6">
      <PageHeader
        icon={Calendar}
        title="Cấu hình lịch & Sân"
        description="Thiết lập địa điểm, thời gian khai mạc và số sân thi đấu phục vụ vận hành giải."
      />

      {/* Dependency readiness info banner */}
      {(tournament.ruleset?.requireCourtConfig !== false || tournament.ruleset?.requireScheduleConfig !== false) && (
        <div className="flex items-start gap-3 rounded-xl border border-sky-500/25 bg-sky-500/8 px-4 py-3 text-sm text-sky-300">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-400" />
          <div>
            <span className="font-semibold text-sky-200">Trạng thái cấu hình lịch & sân:</span>
            {' '}Cần cập nhật tên địa điểm
            {tournament.ruleset?.requireScheduleConfig !== false && ', thời gian khai mạc'}
            {tournament.ruleset?.requireCourtConfig !== false && ' và thêm ít nhất 1 sân đấu'} để đạt trạng thái hợp lệ (VALID).
          </div>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className={`grid grid-cols-1 gap-6 ${tournament.ruleset?.requireCourtConfig !== false ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
        {/* Left Column: Venue & Time */}
        <div className={tournament.ruleset?.requireCourtConfig !== false ? 'lg:col-span-2 space-y-6' : 'space-y-6'}>
          <form onSubmit={handleSave} className="space-y-5 rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Địa điểm & Thời gian
            </div>

            <div className={`grid grid-cols-1 gap-4 ${tournament.ruleset?.requireScheduleConfig !== false ? 'sm:grid-cols-2' : ''}`}>
              <div className="space-y-1.5">
                <label htmlFor="sch-venue" className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                  <MapPin className="h-3.5 w-3.5 text-amber-500" />
                  Địa điểm giải đấu
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

              {tournament.ruleset?.requireScheduleConfig !== false && (
                <div className="space-y-1.5">
                  <label htmlFor="sch-opening" className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    Thời gian bắt đầu giải đấu
                  </label>
                  <input
                    id="sch-opening"
                    type="datetime-local"
                    value={form.openingTime}
                    onChange={(e) => handleChange('openingTime', e.target.value)}
                    className="w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25 transition-all [color-scheme:dark]"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500/15 px-4 py-2.5 text-sm font-semibold text-amber-400 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50 transition-all border border-amber-500/10"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
              </button>
            </div>
          </form>

          {/* Schedule Conflicts Section */}
          {tournament.ruleset?.requireCourtConfig !== false && (
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Phát hiện trùng lịch & Sân đấu
                </div>
                <button
                  onClick={fetchConflicts}
                  disabled={loadingConflicts}
                  className="text-xs text-slate-400 hover:text-amber-400 transition-colors"
                >
                  {loadingConflicts ? 'Đang kiểm tra...' : 'Tải lại'}
                </button>
              </div>

              {conflicts.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4 text-sm text-emerald-400">
                  <Info className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <span>Không phát hiện xung đột lịch thi đấu nào.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-sm text-rose-300">
                    <AlertTriangle className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-rose-200">Xung đột lịch thi đấu!</span>
                      {' '}Phát hiện {conflicts.length} khung giờ có nhiều hơn 1 trận cùng xếp trên một sân.
                    </div>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {conflicts.map((conflict, idx) => (
                      <div key={idx} className="rounded-xl bg-slate-950/40 border border-slate-800/60 p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="font-semibold text-slate-200">{conflict.courtName}</span>
                          <span>
                            {new Date(conflict.scheduledTime).toLocaleString('vi-VN', {
                              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="space-y-1 pl-2 border-l border-rose-500/50">
                          {conflict.matches.map((m) => (
                            <div key={m.id} className="text-xs text-rose-300 flex items-center justify-between">
                              <span>{m.label} ({m.teamAName} vs {m.teamBName})</span>
                              <Link
                                href={`/admin/${tournament?.id}/groups`}
                                className="text-[10px] text-slate-500 hover:text-amber-400 underline"
                              >
                                Đổi lịch
                              </Link>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Court Management */}
        {tournament.ruleset?.requireCourtConfig !== false && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 space-y-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Quản lý sân đấu
              </div>

              {/* Add Court Form */}
              <form onSubmit={handleCreateCourt} className="space-y-3">
                <div className="space-y-1">
                  <input
                    type="text"
                    required
                    placeholder="Tên sân (ví dụ: Sân số 1)"
                    value={newCourtName}
                    onChange={(e) => setNewCourtName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-3.5 py-2 text-sm text-slate-200 outline-none focus:border-amber-500/50 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="Địa điểm/cụm sân (ví dụ: GOLAB Q.10)"
                    value={newCourtVenueName}
                    onChange={(e) => setNewCourtVenueName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-3.5 py-2 text-sm text-slate-200 outline-none focus:border-amber-500/50 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="Ghi chú sân (tùy chọn)"
                    value={newCourtDescription}
                    onChange={(e) => setNewCourtDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-3.5 py-2 text-sm text-slate-200 outline-none focus:border-amber-500/50 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={addingCourt || !newCourtName.trim()}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-xs font-bold py-2.5 transition-all"
                >
                  {addingCourt ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Thêm Sân Đấu
                </button>
              </form>

              <hr className="border-slate-800" />

              {/* Court list */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400">
                  Sân đấu hiện có ({courts.length})
                </div>

                {loadingCourts ? (
                  <div className="py-8 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
                  </div>
                ) : courts.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-550 italic">
                    Chưa có sân đấu nào được thêm.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {courts.map((court) => (
                      <div
                        key={court.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-850 hover:border-slate-800 transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-bold text-slate-200 truncate">{formatCourtLabel(court)}</div>
                          {court.venueName && (
                            <div className="text-[10px] text-amber-500/80 truncate mt-0.5">{court.venueName}</div>
                          )}
                          {court.description && (
                            <div className="text-[10px] text-slate-550 truncate mt-0.5">{court.description}</div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteCourt(court.id)}
                          disabled={deletingCourtId === court.id}
                          className="text-slate-500 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-500/10 transition-all flex-shrink-0"
                          title="Xóa sân"
                        >
                          {deletingCourtId === court.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action footer */}
      <div className="flex justify-between items-center bg-slate-900/30 border border-slate-850 rounded-2xl p-4">
        <Link
          href={`/admin/${tournament?.id}/tournament`}
          className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
        >
          <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Quay lại thông tin giải
        </Link>
        <Link
          href={`/admin/${tournament?.id}/draw`}
          className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
        >
          Mở đội tuyển <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
