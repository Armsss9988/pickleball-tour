'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';
import { EmptyState } from '@/components/empty-state';
import { PageLoading, SkeletonTable } from '@/components/loading-skeleton';
import { Users, Plus, Trash2, Upload, AlertCircle, Download, FileSpreadsheet, FileDown, X } from '@/components/icons';
import { buildPlayerExportRows, buildPlayerTemplateRows, parsePlayerImportRows } from '@/lib/player-excel';
import * as XLSX from 'xlsx';

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

  const [activeTab, setActiveTab] = useState<'excel' | 'paste'>('excel');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewPlayers, setPreviewPlayers] = useState<any[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace_all'>('append');

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
      await apiFetch(`/tournaments/${tournament!.id}/players/import`, {
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

  const downloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet(buildPlayerTemplateRows());
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mẫu Nhập VĐV');

    worksheet['!cols'] = [
      { wch: 25 }, // Họ và tên
      { wch: 12 }, // Giới tính
      { wch: 15 }, // Số điện thoại
      { wch: 30 }, // Ghi chú
    ];

    XLSX.writeFile(workbook, 'Template_Import_VDV.xlsx');
    toast('Đã tải xuống file Excel mẫu thành công!', 'success');
  };

  const exportToExcel = () => {
    if (players.length === 0) {
      toast('Không có vận động viên nào để xuất dữ liệu.', 'warning');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(buildPlayerExportRows(players));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách VĐV');

    worksheet['!cols'] = [
      { wch: 8 },  // STT
      { wch: 25 }, // Họ và tên
      { wch: 12 }, // Giới tính
      { wch: 15 }, // Số điện thoại
      { wch: 30 }, // Ghi chú
    ];

    const filename = `Danh_sach_VDV_${tournament?.slug || 'giai_dau'}.xlsx`;
    XLSX.writeFile(workbook, filename);
    toast('Đã xuất danh sách vận động viên ra file Excel!', 'success');
  };

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
      toast('Vui lòng chọn tệp Excel (.xlsx hoặc .xls)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

        if (rawRows.length <= 1) {
          toast('Tệp Excel trống hoặc chỉ chứa tiêu đề.', 'warning');
          return;
        }

        const parsed = parsePlayerImportRows(rawRows);

        if (parsed.length === 0) {
          toast('Không tìm thấy vận động viên hợp lệ nào trong tệp.', 'warning');
          return;
        }

        setPreviewPlayers(parsed);
        setPreviewModalOpen(true);
        e.target.value = '';
      } catch (err: any) {
        console.error(err);
        toast('Lỗi đọc tệp Excel. Vui lòng kiểm tra lại định dạng.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async () => {
    if (previewPlayers.length === 0) return;

    try {
      setActionLoading(true);
      await apiFetch(`/tournaments/${tournament!.id}/players/import?mode=${importMode}`, {
        method: 'POST',
        body: { players: previewPlayers },
      });

      toast(`Import thành công ${previewPlayers.length} vận động viên!`, 'success');
      setPreviewModalOpen(false);
      setPreviewPlayers([]);
      loadPlayers();
    } catch (err: any) {
      toast(err.message || 'Lỗi import vận động viên.', 'error');
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

  const males = players.filter(p => p.gender?.toUpperCase() === 'MALE').length;
  const females = players.filter(p => p.gender?.toUpperCase() === 'FEMALE').length;

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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              Danh sách đăng ký ({players.length})
            </h3>
            {players.length > 0 && (
              <button
                type="button"
                onClick={exportToExcel}
                className="btn btn-secondary py-1.5 px-3 flex items-center gap-1.5 text-xs"
                title="Xuất danh sách VĐV ra file Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                Xuất Excel
              </button>
            )}
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
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.gender?.toUpperCase() === 'MALE' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                          {p.gender?.toUpperCase() === 'MALE' ? '♂ Nam' : '♀ Nữ'}
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

          {/* Tab Selector & Import Container */}
          <div className="card overflow-hidden">
            {/* Tab Selection Headers */}
            <div className="flex border-b border-slate-800 bg-slate-900/10">
              <button
                type="button"
                onClick={() => setActiveTab('excel')}
                className={`flex-1 py-3 text-xs font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'excel'
                    ? 'border-amber-500 text-amber-400 bg-slate-900/30'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                File Excel (XLSX)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`flex-1 py-3 text-xs font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'paste'
                    ? 'border-amber-500 text-amber-400 bg-slate-900/30'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Dán nhanh
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-6">
              {activeTab === 'excel' ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-slate-200">Import từ file Excel</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Tải lên file Excel (.xlsx, .xls) chứa danh sách VĐV. Định dạng cột theo mẫu chuẩn.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="w-full btn btn-secondary py-2 flex items-center justify-center gap-1.5 text-xs"
                    >
                      <FileDown className="w-4 h-4 text-amber-400" />
                      Tải file Excel mẫu
                    </button>

                    <label className="flex flex-col items-center justify-center border border-dashed border-slate-700 hover:border-amber-500/50 bg-slate-950/20 hover:bg-slate-900/20 rounded-xl p-6 cursor-pointer transition-all">
                      <Upload className="w-6 h-6 text-slate-400 mb-2" />
                      <span className="text-xs font-semibold text-slate-200">Chọn tệp Excel</span>
                      <span className="text-[10px] text-slate-500 mt-1">Chấp nhận .xlsx, .xls</span>
                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleExcelFileChange}
                        className="hidden"
                        disabled={actionLoading}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-slate-200">Dán danh sách nhanh</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Mỗi dòng là một VĐV, phân tách bằng tab/phẩy theo thứ tự: <br />
                      <strong className="text-slate-350">Họ tên, Giới tính (Nam/Nữ), Số ĐT, Ghi chú</strong>
                    </p>
                  </div>

                  <form onSubmit={handleBulkImport} className="space-y-3">
                    <textarea
                      rows={5}
                      placeholder="Nguyễn Văn An&#9;Nam&#9;0901234567&#9;Đội trưởng&#10;Trần Thị Diệu&#9;Nữ&#9;0907654321"
                      value={bulkText}
                      onChange={e => setBulkText(e.target.value)}
                      className="w-full premium-input text-xs font-mono"
                      disabled={actionLoading}
                    />
                    <button
                      type="submit"
                      className="w-full btn btn-secondary py-2.5 flex items-center justify-center gap-2 text-xs"
                      disabled={actionLoading}
                    >
                      <Upload className="w-4 h-4" />
                      Import danh sách
                    </button>
                  </form>
                </div>
              )}
            </div>
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

      {/* Preview Import Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-3xl card bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-amber-500" />
                  Xem trước danh sách Import ({previewPlayers.length} VĐV)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Vui lòng kiểm tra lại thông tin trước khi xác nhận lưu vào hệ thống.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewModalOpen(false);
                  setPreviewPlayers([]);
                }}
                className="text-slate-400 hover:text-slate-200 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content (Table list) */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-xs font-semibold text-slate-400">
                      <th className="py-3 px-4">STT</th>
                      <th className="py-3 px-4">Họ và tên</th>
                      <th className="py-3 px-4">Giới tính</th>
                      <th className="py-3 px-4">Số điện thoại</th>
                      <th className="py-3 px-4">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-xs text-slate-300">
                    {previewPlayers.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-3 px-4 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="py-3 px-4 font-semibold text-slate-200">{p.fullName}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            p.gender?.toUpperCase() === 'MALE'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {p.gender?.toUpperCase() === 'MALE' ? '♂ Nam' : '♀ Nữ'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">{p.phone || '—'}</td>
                        <td className="py-3 px-4 max-w-[150px] truncate">{p.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Import Mode Options */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-3">
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Chế độ nhập danh sách
                </span>
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="mt-1 accent-amber-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">
                        Thêm vào cuối danh sách (Append)
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Giữ nguyên các VĐV đã đăng ký và thêm mới các VĐV từ file Excel.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace_all"
                      checked={importMode === 'replace_all'}
                      onChange={() => setImportMode('replace_all')}
                      className="mt-1 accent-amber-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">
                        Thay thế toàn bộ (Replace all)
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Xóa sạch danh sách VĐV hiện tại của giải và thay bằng danh sách từ file.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPreviewModalOpen(false);
                  setPreviewPlayers([]);
                }}
                className="btn btn-secondary px-4 py-2"
                disabled={actionLoading}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="btn btn-primary px-5 py-2 flex items-center gap-1.5"
                disabled={actionLoading}
              >
                {actionLoading ? 'Đang import...' : 'Xác nhận Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
