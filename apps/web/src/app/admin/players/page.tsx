'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';

export default function PlayersPage() {
  const { tournament, loading: tLoading, error: tError } = useActiveTournament();
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('MALE');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadPlayers = async () => {
    if (!tournament) return;
    try {
      setLoading(true);
      const data = await apiFetch(`/tournaments/${tournament.id}/players`);
      setPlayers(data);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Lỗi tải danh sách vận động viên.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();
  }, [tournament]);

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!fullName.trim()) {
      setError('Vui lòng nhập họ và tên.');
      return;
    }

    try {
      await apiFetch(`/tournaments/${tournament!.id}/players`, {
        method: 'POST',
        body: {
          fullName: fullName.trim(),
          gender,
          phone: phone.trim() || undefined,
          note: note.trim() || undefined,
        },
      });

      setSuccess('Thêm vận động viên thành công!');
      setFullName('');
      setPhone('');
      setNote('');
      loadPlayers();
    } catch (err: any) {
      setError(err.message || 'Lỗi thêm vận động viên.');
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      setError('Nhập danh sách trước khi import.');
      return;
    }

    const payloadPlayers: any[] = [];
    for (const line of lines) {
      // Split by tab or comma
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
      await apiFetch(`/tournaments/${tournament!.id}/players/bulk`, {
        method: 'POST',
        body: { players: payloadPlayers },
      });

      setSuccess(`Import thành công ${payloadPlayers.length} vận động viên!`);
      setBulkText('');
      loadPlayers();
    } catch (err: any) {
      setError(err.message || 'Lỗi import hàng loạt.');
    }
  };

  const handleDelete = async (playerId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa vận động viên này?')) return;
    try {
      setError('');
      setSuccess('');
      await apiFetch(`/tournaments/${tournament!.id}/players/${playerId}`, {
        method: 'DELETE',
      });
      setSuccess('Xóa vận động viên thành công.');
      loadPlayers();
    } catch (err: any) {
      setError(err.message || 'Lỗi xóa vận động viên.');
    }
  };

  if (tLoading || loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <span className="login-spinner" style={{ width: '40px', height: '40px', borderTopColor: 'var(--brand-500)' }} />
      </div>
    );
  }

  const males = players.filter(p => p.gender === 'MALE').length;
  const females = players.filter(p => p.gender === 'FEMALE').length;

  return (
    <div className="premium-container p-6 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">👥 Quản lý Vận Động Viên</h1>
          <p className="text-xs text-slate-400 mt-1">
            Tổng cộng: {players.length} VĐV ({males} Nam + {females} Nữ) — Quy mô giải yêu cầu tối thiểu 40 VĐV (24 Nam + 16 Nữ).
          </p>
        </div>
      </div>

      {error && <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">⚠️ {error}</div>}
      {success && <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">✓ {success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Player List */}
        <div className="lg:col-span-2 card p-6 space-y-4">
          <h3 className="font-bold text-sm">Danh sách đăng ký ({players.length})</h3>
          
          {players.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400">
                    <th className="py-2.5">Tên VĐV</th>
                    <th>Giới tính</th>
                    <th>Số điện thoại</th>
                    <th>Ghi chú</th>
                    <th className="text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-sm">
                  {players.map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="py-3 font-semibold">{p.fullName}</td>
                      <td>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs ${p.gender === 'MALE' ? 'bg-sky-500/10 text-sky-400' : 'bg-pink-500/10 text-pink-400'}`}>
                          {p.gender === 'MALE' ? '♂ Nam' : '♀ Nữ'}
                        </span>
                      </td>
                      <td className="text-slate-400 font-mono text-xs">{p.phone || '—'}</td>
                      <td className="text-slate-400 text-xs">{p.note || '—'}</td>
                      <td className="text-right">
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="text-red-400 hover:text-red-300 text-xs font-semibold"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted text-center py-10 italic">Chưa có vận động viên nào được đăng ký.</p>
          )}
        </div>

        {/* Right: Forms */}
        <div className="space-y-6">
          {/* Manual Add Form */}
          <div className="card p-6 space-y-4">
            <h3 className="font-bold text-sm">👤 Thêm vận động viên lẻ</h3>
            <form onSubmit={handleManualAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn An"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full premium-input"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Giới tính</label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                  className="w-full premium-input"
                >
                  <option value="MALE">♂ Nam</option>
                  <option value="FEMALE">♀ Nữ</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Số điện thoại</label>
                <input
                  type="text"
                  placeholder="0901234567"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full premium-input"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Ghi chú</label>
                <input
                  type="text"
                  placeholder="Đội trưởng tiềm năng"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full premium-input"
                />
              </div>
              <button type="submit" className="w-full btn btn-primary py-2.5">
                + Thêm VĐV
              </button>
            </form>
          </div>

          {/* Bulk Import Form */}
          <div className="card p-6 space-y-4">
            <h3 className="font-bold text-sm">📥 Dán danh sách nhanh</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dán dữ liệu VĐV từ Excel hoặc text. Mỗi dòng là một VĐV, phân tách bằng tab/phẩy theo thứ tự: <strong>Họ tên, Giới tính (Nam/Nữ), Số ĐT, Ghi chú</strong>
            </p>
            <form onSubmit={handleBulkImport} className="space-y-3">
              <textarea
                rows={6}
                placeholder="Nguyễn Văn An&#9;Nam&#9;0901234567&#9;Đội trưởng&#10;Trần Thị Diệu&#9;Nữ&#9;0907654321&#9;—"
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                className="w-full premium-input text-xs font-mono"
              />
              <button type="submit" className="w-full btn btn-secondary py-2.5">
                ⚡ Import danh sách
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
