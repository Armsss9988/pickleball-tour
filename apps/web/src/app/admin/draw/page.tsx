'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';

export default function DrawPage() {
  const { tournament, loading: tLoading, error: tError, reload: reloadTournament } = useActiveTournament();
  const [draws, setDraws] = useState<any[]>([]);
  const [previewDraw, setPreviewDraw] = useState<any | null>(null);
  const [seed, setSeed] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadDraws = async () => {
    if (!tournament) return;
    try {
      setLoading(true);
      const data = await apiFetch(`/tournaments/${tournament.id}/team-draws`);
      setDraws(data);
      
      // If there is a PREVIEW draw, set it
      const activePreview = data.find((d: any) => d.status === 'PREVIEW');
      if (activePreview) {
        setPreviewDraw(activePreview);
      } else {
        setPreviewDraw(null);
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Lỗi tải lịch sử bốc thăm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDraws();
  }, [tournament]);

  const handleCreatePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const draw = await apiFetch(`/tournaments/${tournament!.id}/team-draws/preview`, {
        method: 'POST',
        body: { seed: seed.trim() || undefined },
      });

      setPreviewDraw(draw);
      setSuccess('Đã lập bản bốc thăm thử nghiệm! Vui lòng kiểm tra đội hình bên dưới.');
      loadDraws();
    } catch (err: any) {
      setError(err.message || 'Lỗi bốc thăm thử nghiệm.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDraw = async () => {
    if (!previewDraw) return;
    if (!confirm('Xác nhận kết quả bốc thăm? Thao tác này sẽ ghi đè mọi đội hình hiện tại và chuyển giải đấu sang trạng thái mới!')) return;
    
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await apiFetch(`/tournaments/${tournament!.id}/team-draws/${previewDraw.id}/confirm`, {
        method: 'POST',
      });

      setSuccess('Đã xác nhận bốc thăm thành công! 8 đội tuyển đã được lập chính thức.');
      setPreviewDraw(null);
      loadDraws();
      reloadTournament(); // Reload tournament to sync status transition
    } catch (err: any) {
      setError(err.message || 'Lỗi xác nhận kết quả bốc thăm.');
    } finally {
      setLoading(false);
    }
  };

  if (tLoading || loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <span className="login-spinner" style={{ width: '40px', height: '40px', borderTopColor: 'var(--brand-500)' }} />
      </div>
    );
  }

  const activeTeamsOutput = previewDraw?.outputSnapshot?.teams || [];

  return (
    <div className="premium-container p-6 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">🎲 Bốc Thăm Chia Đội</h1>
          <p className="text-xs text-slate-400 mt-1">
            Thuật toán phân chia 40 vận động viên cân bằng thành 8 đội tuyển (mỗi đội gồm 3 Nam + 2 Nữ).
          </p>
        </div>
      </div>

      {error && <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">⚠️ {error}</div>}
      {success && <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">✓ {success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Draw Trigger form */}
        <div className="card p-6 space-y-4">
          <h3 className="font-bold text-sm">Thiết lập tham số bốc thăm</h3>
          
          <form onSubmit={handleCreatePreview} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Mã hạt giống (Random Seed - Tùy chọn)</label>
              <input
                type="text"
                placeholder="Ví dụ: GOLAB-CUP-2026"
                value={seed}
                onChange={e => setSeed(e.target.value)}
                className="w-full premium-input"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Để trống để hệ thống tự phát sinh mã ngẫu nhiên. Mã giống nhau sẽ cho ra kết quả bốc thăm giống nhau.
              </p>
            </div>
            
            <button type="submit" className="w-full btn btn-primary py-2.5">
              🎲 Tạo bản bốc thăm thử nghiệm
            </button>
          </form>

          {previewDraw && (
            <div className="pt-4 border-t border-slate-850 space-y-3">
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-300">
                ⚠️ Bạn đang xem bản xem trước bốc thăm với seed: <strong>{previewDraw.randomSeed}</strong>. Bạn cần bấm xác nhận để lưu chính thức kết quả này.
              </div>
              <button
                onClick={handleConfirmDraw}
                className="w-full btn btn-secondary py-2.5 bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
              >
                ✓ Xác nhận kết quả bốc thăm
              </button>
            </div>
          )}
        </div>

        {/* History of Draws */}
        <div className="lg:col-span-2 card p-6 space-y-4">
          <h3 className="font-bold text-sm">Lịch sử các phiên bốc thăm</h3>
          
          {draws.length > 0 ? (
            <div className="space-y-3">
              {draws.map(d => (
                <div key={d.id} className="p-4 bg-slate-800/40 border border-slate-850 rounded-xl flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <span>Phiên bốc thăm</span>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${d.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400' : d.status === 'PREVIEW' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>
                        {d.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Seed: <span className="font-mono">{d.randomSeed}</span> · Thuật toán: {d.algorithmVersion}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Thời gian: {new Date(d.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-center py-10 italic">Chưa thực hiện phiên bốc thăm nào.</p>
          )}
        </div>
      </div>

      {/* Stout Preview Grid */}
      {activeTeamsOutput.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-sm">🔍 Kết quả chia đội xem trước (8 Đội)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeTeamsOutput.map((t: any) => (
              <div key={t.code} className="card p-4 space-y-3 hover:border-brand-500 transition-all">
                <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                  <div className="font-bold text-sm text-brand-400">{t.name}</div>
                  <div className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded">{t.code}</div>
                </div>
                
                <div className="space-y-2">
                  {t.players.map((p: any, idx: number) => (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">#{idx + 1}</span>
                        <span className="font-semibold text-slate-200">{p.fullName}</span>
                      </div>
                      <span className={`text-[10px] ${p.gender === 'MALE' ? 'text-sky-400' : 'text-pink-400'}`}>
                        {p.gender === 'MALE' ? '♂' : '♀'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
