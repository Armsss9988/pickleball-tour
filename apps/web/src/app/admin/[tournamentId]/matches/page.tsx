'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';
import { PageLoading } from '@/components/loading-skeleton';
import { Trophy, Play, Calendar, AlertTriangle, Target, Zap, ChevronRight, Edit3, Trash2, Save, X, Loader2 } from '@/components/icons';
import { getCurrentUser } from '@/lib/current-user';

interface Court {
  id: string;
  venueName: string | null;
  name: string;
}

interface Conflict {
  courtId: string | null;
  courtName: string;
  scheduledTime: string;
  matchIds: string[];
}

function formatCourtLabel(court: Pick<Court, 'name' | 'venueName'> | null | undefined) {
  if (!court) return '';
  return court.venueName?.trim() ? `${court.venueName.trim()} - ${court.name}` : court.name;
}

interface EditFormState {
  scheduledTime: string;
  courtId: string;
  courtName: string;
  matchNo: string;
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

export default function MatchesPage() {
  const { tournament, loading: tLoading } = useActiveTournament();
  const { toast } = useToast();
  const [matches, setMatches] = useState<any[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal actions
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [matchToStart, setMatchToStart] = useState<any | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Inline edits
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    scheduledTime: '',
    courtId: '',
    courtName: '',
    matchNo: '',
  });

  const currentUser = getCurrentUser();
  const isBtcAdmin = currentUser.role === 'btc_admin' || currentUser.role === 'super_admin';

  const loadData = async () => {
    if (!tournament) return;
    try {
      setLoading(true);
      const [matchData, courtData, conflictData] = await Promise.all([
        apiFetch(`/tournaments/${tournament.id}/matches`),
        apiFetch<Court[]>(`/tournaments/${tournament.id}/courts`),
        apiFetch<Conflict[]>(`/tournaments/${tournament.id}/courts/conflicts`).catch(() => []),
      ]);
      setMatches(matchData);
      setCourts(courtData);
      setConflicts(conflictData);
    } catch (e: any) {
      console.error(e);
      toast(e.message || 'Lỗi tải danh sách trận đấu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tournament]);

  const confirmStartMatch = (match: any) => {
    setMatchToStart(match);
    setStartModalOpen(true);
  };

  const handleStartMatch = async () => {
    if (!matchToStart) return;
    setActionLoading(true);

    try {
      await apiFetch(`/matches/${matchToStart.id}/start`, {
        method: 'POST',
      });
      toast('Trận đấu đã bắt đầu! Đội hình thi đấu đã được khóa chính thức.', 'success');
      setStartModalOpen(false);
      setMatchToStart(null);
      loadData();
    } catch (err: any) {
      toast(err.message || 'Lỗi bắt đầu trận đấu.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDeleteMatch = (match: any) => {
    setMatchToDelete(match);
    setDeleteModalOpen(true);
  };

  const handleDeleteMatch = async () => {
    if (!matchToDelete) return;
    setActionLoading(true);

    try {
      await apiFetch(`/matches/${matchToDelete.id}`, {
        method: 'DELETE',
      });
      toast('Đã xóa trận đấu thành công (Log đã ghi nhật ký BTC).', 'success');
      setDeleteModalOpen(false);
      setMatchToDelete(null);
      loadData();
    } catch (err: any) {
      toast(err.message || 'Lỗi xóa trận đấu.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const startInlineEdit = (match: any) => {
    setEditingMatchId(match.id);
    setEditForm({
      scheduledTime: toDatetimeLocal(match.scheduledTime),
      courtId: match.courtId || '',
      courtName: match.courtName || '',
      matchNo: match.matchNo?.toString() || '',
    });
  };

  const handleSaveInlineSchedule = async (matchId: string) => {
    setActionLoading(true);
    try {
      const selectedCourt = courts.find(c => c.id === editForm.courtId);
      const courtNameVal = selectedCourt ? formatCourtLabel(selectedCourt) : (editForm.courtId === 'custom' ? editForm.courtName : '');

      await apiFetch(`/matches/${matchId}/schedule`, {
        method: 'PATCH',
        body: {
          scheduledTime: editForm.scheduledTime ? new Date(editForm.scheduledTime).toISOString() : null,
          courtId: editForm.courtId && editForm.courtId !== 'custom' ? editForm.courtId : null,
          courtName: courtNameVal || null,
          matchNo: editForm.matchNo ? parseInt(editForm.matchNo, 10) : null,
        },
      });

      toast('Đã cập nhật lịch đấu thành công!', 'success');
      setEditingMatchId(null);
      loadData();
    } catch (err: any) {
      toast(err.message || 'Lỗi lưu lịch thi đấu.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const isConflictMatch = (matchId: string) => {
    return conflicts.some(c => c.matchIds.includes(matchId));
  };

  if (tLoading || (loading && matches.length === 0)) {
    return <PageLoading />;
  }

  const groupMatches = matches.filter(m => m.groupId !== null);
  const playoffMatches = matches.filter(m => m.groupId === null);

  const renderMatchCard = (m: any) => {
    const isEditing = editingMatchId === m.id;
    const hasConflict = isConflictMatch(m.id);

    return (
      <div
        key={m.id}
        className={`card p-4 space-y-4 flex flex-col justify-between transition-all shadow-md relative ${
          hasConflict ? 'border-rose-500 bg-rose-500/5 hover:border-rose-400' : 'hover:border-slate-700'
        }`}
      >
        {hasConflict && (
          <span className="absolute top-2 right-2 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
        )}

        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-slate-350 font-bold">
            {m.groupId ? `Bảng ${m.group?.code || '—'} · Lượt ${m.roundNo || '—'}` : (m.label || 'Vòng Nhánh')}
            {m.matchNo && ` · Trận ${m.matchNo}`}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            m.status === 'COMPLETED' || m.status === 'RESULT_CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
            m.status === 'RUNNING' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20 animate-pulse' : 
            m.status === 'LINEUP_READY' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            {m.status}
          </span>
        </div>

        <div className="space-y-2 py-1">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-slate-200">{m.teamA?.name || '—'}</span>
            <span className="font-mono text-base font-bold text-slate-350">
              {m.result ? m.result.teamAScore : '—'}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-slate-200">{m.teamB?.name || '—'}</span>
            <span className="font-mono text-base font-bold text-slate-350">
              {m.result ? m.result.teamBScore : '—'}
            </span>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-2 border-t border-slate-800 pt-3 text-xs bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
            <div className="space-y-1">
              <label className="text-slate-400 block font-semibold">Khung giờ</label>
              <input
                type="datetime-local"
                value={editForm.scheduledTime}
                onChange={(e) => setEditForm(prev => ({ ...prev, scheduledTime: e.target.value }))}
                className="w-full rounded bg-slate-900 border border-slate-700 text-slate-200 px-2 py-1 text-xs outline-none [color-scheme:dark]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 block font-semibold">Chọn Sân</label>
              <select
                value={editForm.courtId}
                onChange={(e) => setEditForm(prev => ({ ...prev, courtId: e.target.value }))}
                className="w-full rounded bg-slate-900 border border-slate-700 text-slate-200 px-2 py-1 text-xs outline-none"
              >
                <option value="">-- Chưa gán --</option>
                {courts.map(c => (
                  <option key={c.id} value={c.id}>{formatCourtLabel(c)}</option>
                ))}
                <option value="custom">Gõ tay tên sân</option>
              </select>
            </div>

            {editForm.courtId === 'custom' && (
              <div className="space-y-1">
                <label className="text-slate-400 block font-semibold">Tên sân tùy chỉnh</label>
                <input
                  type="text"
                  value={editForm.courtName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, courtName: e.target.value }))}
                  placeholder="Gõ tên sân"
                  className="w-full rounded bg-slate-900 border border-slate-700 text-slate-200 px-2 py-1 text-xs outline-none"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-slate-400 block font-semibold">Số thứ tự trận</label>
              <input
                type="number"
                value={editForm.matchNo}
                onChange={(e) => setEditForm(prev => ({ ...prev, matchNo: e.target.value }))}
                placeholder="1"
                className="w-20 rounded bg-slate-900 border border-slate-700 text-slate-200 px-2 py-1 text-xs outline-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setEditingMatchId(null)}
                className="btn btn-secondary px-2.5 py-1 text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-350"
              >
                <X className="w-3 h-3" /> Hủy
              </button>
              <button
                onClick={() => handleSaveInlineSchedule(m.id)}
                disabled={actionLoading}
                className="btn btn-primary px-2.5 py-1 text-xs flex items-center gap-1 text-slate-950 font-bold bg-amber-500 hover:bg-amber-600"
              >
                <Save className="w-3 h-3" /> Lưu
              </button>
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-slate-500 flex justify-between items-center border-t border-slate-800 pt-2">
            <div className="flex flex-col">
              <span className="font-semibold text-slate-400">Sân: {formatCourtLabel(m.court) || m.courtName || '—'}</span>
              <span>
                {m.scheduledTime
                  ? new Date(m.scheduledTime).toLocaleString('vi-VN', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                    })
                  : 'Chưa xếp lịch'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {isBtcAdmin && m.status === 'SCHEDULED' && (
                <>
                  <button
                    onClick={() => startInlineEdit(m)}
                    className="p-1 text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded transition-all"
                    title="Xếp lịch thi đấu"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => confirmDeleteMatch(m)}
                    className="p-1 text-slate-550 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-all"
                    title="Xóa trận đấu"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {m.status === 'LINEUP_READY' && (
                <button
                  onClick={() => confirmStartMatch(m)}
                  className="text-emerald-400 hover:text-emerald-355 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-xs"
                  disabled={actionLoading}
                >
                  <Play className="w-3.5 h-3.5" />
                  Bắt đầu
                </button>
              )}
              {(m.status === 'RUNNING' || m.status === 'SEGMENT_BREAK') && (
                <Link
                  href={`/admin/${tournament?.id}/scoring`}
                  className="text-sky-400 hover:text-sky-300 font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 text-xs flex items-center gap-1"
                >
                  <Target className="w-3.5 h-3.5" />
                  Chấm điểm
                </Link>
              )}
              {m.status === 'COMPLETED' && (
                <Link
                  href={`/admin/${tournament?.id}/scoring`}
                  className="text-amber-400 hover:text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-xs flex items-center gap-1"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Xác nhận KQ
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="premium-container space-y-6 animate-scale-in">
      <PageHeader
        title="Lịch Thi Đấu & Trận Đấu"
        description="Theo dõi danh sách các trận đấu vòng bảng và các lượt trận trực tiếp knockout playoff."
        icon={Trophy}
      />

      {conflicts.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-sm text-rose-350">
          <AlertTriangle className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold text-rose-200">Xung đột lịch & sân thi đấu:</span>
            {' '}Phát hiện sân thi đấu bị xếp trùng trận vào cùng một khung giờ. Hãy bấm nút sửa (bút chì) trên các trận màu đỏ để gán lại sân/giờ hợp lệ.
          </div>
        </div>
      )}

      <div className="space-y-8">
        {/* Vòng bảng section */}
        <div className="space-y-4">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Calendar className="w-5 h-5 text-amber-500" />
            Vòng Bảng (Group Stage Matches)
          </h3>
          
          {groupMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupMatches.map(renderMatchCard)}
            </div>
          ) : (
            <div className="p-8 bg-slate-800/10 border border-dashed border-slate-800 rounded-3xl text-center text-xs text-slate-500 italic py-10">
              Chưa có lịch thi đấu vòng bảng. Hãy phân bảng và tạo lịch trước.
            </div>
          )}
        </div>

        {/* Vòng Playoff section */}
        <div className="space-y-4">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Vòng Loại Trực Tiếp (Playoffs Knockout)
          </h3>
          
          {playoffMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playoffMatches.map(renderMatchCard)}
            </div>
          ) : (
            <div className="p-8 bg-slate-800/10 border border-dashed border-slate-800 rounded-3xl text-center text-xs text-slate-500 italic py-10">
              Chưa sinh lịch đấu Playoff. Hãy hoàn thành vòng bảng để sinh giải đấu Playoff.
            </div>
          )}
        </div>
      </div>

      {/* Confirm Start Match Modal */}
      <ConfirmModal
        open={startModalOpen}
        title="Bắt đầu trận đấu?"
        description={`Bạn có chắc chắn muốn bắt đầu trận đấu giữa "${matchToStart?.teamA?.name}" và "${matchToStart?.teamB?.name}"? Trạng thái trận đấu sẽ chuyển sang ĐANG CHẠY và đội hình thi đấu chặng hiện tại sẽ bị KHÓA.`}
        confirmLabel="Bắt đầu"
        cancelLabel="Hủy"
        variant="warning"
        loading={actionLoading}
        onConfirm={handleStartMatch}
        onCancel={() => {
          setStartModalOpen(false);
          setMatchToStart(null);
        }}
      />

      {/* Confirm Delete Match Modal */}
      <ConfirmModal
        open={deleteModalOpen}
        title="Xóa trận đấu này?"
        description={`Bạn có chắc chắn muốn xóa trận đấu giữa "${matchToDelete?.teamA?.name}" và "${matchToDelete?.teamB?.name}"? Thao tác này KHÔNG THỂ HOÀN TÁC và sẽ xóa vĩnh viễn trận đấu khỏi hệ thống.`}
        confirmLabel="Xóa trận đấu"
        cancelLabel="Hủy"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDeleteMatch}
        onCancel={() => {
          setDeleteModalOpen(false);
          setMatchToDelete(null);
        }}
      />
    </div>
  );
}
