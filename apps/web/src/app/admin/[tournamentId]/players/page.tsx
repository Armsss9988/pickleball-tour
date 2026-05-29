'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';
import { EmptyState } from '@/components/empty-state';
import { PageLoading, SkeletonTable } from '@/components/loading-skeleton';
import { Users, Plus, Trash2, Upload, AlertCircle } from '@/components/icons';

export default function PlayersPage() {
  const { tournament, loading: tLoading } = useActiveTournament();
  const { toast } = useToast();
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('MALE');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadPlayers = async () => {
    if (!tournament) return;
    try {
      setLoading(true);
      const data = await apiFetch(`/tournaments/${tournament.id}/players`);
      setPlayers(data.items || []);
    } catch (e: any) {
      console.error(e);
      toast(e.message || 'Lỗi tải danh sách vận động viên.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();
  }, [tournament]);

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast('Vui lòng nhập họ và tên.', 'warning');
      return;
    }

    try {
      setActionLoading(true);
      await apiFetch(`/tournaments/${tournament!.id}/players`, {
        method: 'POST',
        body: {
          fullName: fullName.trim(),
          gender,
          phone: phone.trim() || undefined,
          note: note.trim() || undefined,
        },
      });

      toast('Thêm vận động viên thành công!', 'success');
      setFullName('');
      setPhone('');
      setNote('');
      loadPlayers();
    } catch (err: any) {
      toast(err.message || 'Lỗi thêm vận động viên.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();

    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      toast('Nhập danh sách trước khi import.', 'warning');
      return;
    }

    const payloadPlayers: any[] = [];
    for (const line of lines) {
      const parts = line.split(/[\t,;]/);
      const name = parts[0]?.trim();
      const rawGender = parts[1]?.trim()?.toUpperCase() || '';
      
      if (!name) continue;

      const inferredGender = rawGender.includes('FEMALE') || rawGender.includes('NỮ') || rawGender.includes('NU') || rawGender.includes('F')
        ? 'FEMALE'
        : 'MALE';

      payloadPlayers.push({
        fullName: name,
        gender: inferredGender,
        phone: parts[2]?.trim() || undefined,
        note: parts[3]?.trim() || undefined,
      });
    }

    try {
      setActionLoading(true);
      await apiFetch(`/tournaments/${tournament!.id}/players/bulk`, {
        method: 'POST',
        body: { players: payloadPlayers },
      });

      toast(`Import thành công ${payloadPlayers.length} vận động viên!`, 'success');
      setBulkText('');
      loadPlayers();
    } catch (err: any) {
      toast(err.message || 'Lỗi import hàng loạt.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = (player: any) => {
    setPlayerToDelete(player);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!playerToDelete) return;
    try {
      setActionLoading(true);
      await apiFetch(`/tournaments/${tournament!.id}/players/${playerToDelete.id}`, {
        method: 'DELETE',
      });
      toast('Xóa vận động viên thành công.', 'success');
      setDeleteModalOpen(false);
      setPlayerToDelete(null);
      loadPlayers();
    } catch (err: any) {
      toast(err.message || 'Lỗi xóa vận động viên.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (tLoading || (loading && players.length === 0)) {
    return <PageLoading />;
  }

  const males = players.filter(p => p.gender === 'MALE').length;
  const females = players.filter(p => p.gender === 'FEMALE').length;

  return (
    <div className="premium-container space-y-6">
      <PageHeader
        title="Quản lý Vận Động Viên"
        description={`Tổng cộng: ${players.length} VĐV (${males} Nam + ${females} Nữ) — Quy mô giải yêu cầu tối thiểu 40 VĐV (24 Nam + 16 Nữ).`}
        icon={Users}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Player List */}
        <div className="lg:col-span-2 card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              Danh sách đăng ký ({players.length})
            </h3>
          </div>
          
          {loading ? (
            <SkeletonTable rows={5} cols={5} />
          ) : players.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400">
                    <th className="py-4 px-4">Tên VĐV</th>
                    <th className="px-4">Giới tính</th>
                    <th className="px-4">Số điện thoại</th>
                    <th className="px-4">Ghi chú</th>
                    <th className="text-right py-4 px-4">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {players.map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-4 font-semibold text-slate-200">{p.fullName}</td>
                      <td className="px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.gender === 'MALE' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                          {p.gender === 'MALE' ? '♂ Nam' : '♀ Nữ'}
                        </span>
                      </td>
                      <td className="px-4 text-slate-400 font-mono text-xs">{p.phone || '—'}</td>
                      <td className="px-4 text-slate-400 text-xs max-w-[200px] truncate">{p.note || '—'}</td>
                      <td className="text-right py-4 px-4">
                        <button
                          onClick={() => confirmDelete(p)}
                          className="text-rose-400 hover:text-rose-300 p-1 hover:bg-rose-500/10 rounded transition-colors"
                          title="Xóa"
                          disabled={actionLoading}
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="Chưa có vận động viên"
              description="Hãy bắt đầu bằng việc thêm vận động viên lẻ hoặc import hàng loạt từ Excel."
            />
          )}
        </div>

        {/* Right: Forms */}
        <div className="space-y-6">
          {/* Manual Add Form */}
          <div className="card p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-500" />
              Thêm vận động viên lẻ
            </h3>
            <form onSubmit={handleManualAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn An"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full premium-input"
                  disabled={actionLoading}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Giới tính</label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                  className="w-full premium-input"
                  disabled={actionLoading}
                >
                  <option value="MALE">♂ Nam</option>
                  <option value="FEMALE">♀ Nữ</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Số điện thoại</label>
                <input
                  type="text"
                  placeholder="0901234567"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full premium-input"
                  disabled={actionLoading}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Ghi chú</label>
                <input
                  type="text"
                  placeholder="Đội trưởng tiềm năng"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full premium-input"
                  disabled={actionLoading}
                />
              </div>
              <button
                type="submit"
                className="w-full btn btn-primary py-2.5 flex items-center justify-center gap-2"
                disabled={actionLoading}
              >
                <Plus className="w-4 h-4" />
                Thêm VĐV
              </button>
            </form>
          </div>

          {/* Bulk Import Form */}
          <div className="card p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
              <Upload className="w-4 h-4 text-amber-500" />
              Dán danh sách nhanh
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dán dữ liệu từ Excel. Mỗi dòng là một VĐV, phân tách bằng tab/phẩy theo thứ tự: <br />
              <strong className="text-slate-300">Họ tên, Giới tính (Nam/Nữ), Số ĐT, Ghi chú</strong>
            </p>
            <form onSubmit={handleBulkImport} className="space-y-3">
              <textarea
                rows={6}
                placeholder="Nguyễn Văn An&#9;Nam&#9;0901234567&#9;Đội trưởng&#10;Trần Thị Diệu&#9;Nữ&#9;0907654321"
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                className="w-full premium-input text-xs font-mono"
                disabled={actionLoading}
              />
              <button
                type="submit"
                className="w-full btn btn-secondary py-2.5 flex items-center justify-center gap-2"
                disabled={actionLoading}
              >
                <Upload className="w-4 h-4" />
                Import danh sách
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteModalOpen}
        title="Xóa vận động viên"
        description={`Bạn có chắc chắn muốn xóa vận động viên "${playerToDelete?.fullName}" khỏi giải đấu?`}
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setPlayerToDelete(null);
        }}
      />
    </div>
  );
}
