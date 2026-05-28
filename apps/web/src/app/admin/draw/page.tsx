'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';
import { PageLoading } from '@/components/loading-skeleton';
import { Dices, History, Shuffle, Users, CheckCircle2, ChevronRight, AlertTriangle } from '@/components/icons';

export default function DrawPage() {
  const { tournament, loading: tLoading, reload: reloadTournament } = useActiveTournament();
  const { toast } = useToast();
  const [draws, setDraws] = useState<any[]>([]);
  const [previewDraw, setPreviewDraw] = useState<any | null>(null);
  const [seed, setSeed] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadDraws = async () => {
    if (!tournament) return;
    try {
      setLoading(true);
      const data = await apiFetch(`/tournaments/${tournament.id}/team-draws`);
      setDraws(data);
      
      const activePreview = data.find((d: any) => d.status === 'PREVIEW');
      if (activePreview) {
        setPreviewDraw(activePreview);
      } else {
        setPreviewDraw(null);
      }
    } catch (e: any) {
      console.error(e);
      toast(e.message || 'Lỗi tải lịch sử bốc thăm.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDraws();
  }, [tournament]);

  const handleCreatePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const draw = await apiFetch(`/tournaments/${tournament!.id}/team-draws/preview`, {
        method: 'POST',
        body: { seed: seed.trim() || undefined },
      });

      setPreviewDraw(draw);
      toast('Đã lập bản bốc thăm thử nghiệm! Vui lòng kiểm tra đội hình bên dưới.', 'success');
      loadDraws();
    } catch (err: any) {
      toast(err.message || 'Lỗi bốc thăm thử nghiệm.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDraw = async () => {
    if (!previewDraw) return;
    try {
      setActionLoading(true);
      await apiFetch(`/tournaments/${tournament!.id}/team-draws/${previewDraw.id}/confirm`, {
        method: 'POST',
      });

      toast('Đã xác nhận bốc thăm thành công! 8 đội tuyển đã được lập chính thức.', 'success');
      setPreviewDraw(null);
      setConfirmModalOpen(false);
      loadDraws();
      reloadTournament();
    } catch (err: any) {
      toast(err.message || 'Lỗi xác nhận kết quả bốc thăm.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (tLoading || (loading && draws.length === 0)) {
    return <PageLoading />;
  }

  const activeTeamsOutput = previewDraw?.outputSnapshot?.teams || [];

  return (
    <div className="premium-container space-y-6 animate-scale-in">
      <PageHeader
        title="Bốc Thăm Chia Đội"
        description="Thuật toán phân chia 40 vận động viên cân bằng thành 8 đội tuyển (mỗi đội gồm 3 Nam + 2 Nữ)."
        icon={Dices}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Draw Trigger form */}
        <div className="card p-6 space-y-5 shadow-xl">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Shuffle className="w-5 h-5 text-amber-500" />
            Tham số bốc thăm
          </h3>
          
          <form onSubmit={handleCreatePreview} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Mã hạt seeds (Random Seed - Tùy chọn)</label>
              <input
                type="text"
                placeholder="Ví dụ: GOLAB-CUP-2026"
                value={seed}
                onChange={e => setSeed(e.target.value)}
                className="w-full premium-input"
              />
              <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                Để trống để hệ thống tự phát sinh mã ngẫu nhiên. Mã giống nhau sẽ cho ra kết quả bốc thăm giống nhau.
              </p>
            </div>
            
            <button
              type="submit"
              className="w-full btn btn-primary py-2.5 flex items-center justify-center gap-2"
              disabled={loading}
            >
              <Shuffle className="w-4 h-4" />
              Tạo bản bốc thăm thử nghiệm
            </button>
          </form>

          {previewDraw && (
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Bạn đang xem bản bốc thăm thử nghiệm (Seed: <strong className="text-slate-200">{previewDraw.randomSeed}</strong>). Bạn cần xác nhận để lưu chính thức kết quả này.
                </span>
              </div>
              <button
                onClick={() => setConfirmModalOpen(true)}
                className="w-full btn btn-secondary py-2.5 bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Xác nhận kết quả bốc thăm
              </button>
            </div>
          )}
        </div>

        {/* History of Draws */}
        <div className="lg:col-span-2 card p-6 space-y-4 shadow-xl">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
            <History className="w-5 h-5 text-amber-500" />
            Lịch sử các phiên bốc thăm
          </h3>
          
          {draws.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {draws.map(d => (
                <div key={d.id} className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl flex items-center justify-between hover:bg-slate-900/60 transition-colors">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <span className="text-slate-200">Phiên bốc thăm</span>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${d.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : d.status === 'PREVIEW' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-700 text-slate-400'}`}>
                        {d.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Seed: <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">{d.randomSeed}</span> · Thuật toán: v{d.algorithmVersion}
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
        <div className="space-y-4 pt-4">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            Kết quả chia đội xem trước (8 Đội)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-scale-in">
            {activeTeamsOutput.map((t: any) => (
              <div key={t.code} className="card p-4 space-y-4 hover:border-amber-500/40 hover:bg-slate-800/20 transition-all shadow-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="font-bold text-sm text-amber-400">{t.name}</div>
                  <div className="text-xs font-mono bg-slate-900 px-2 py-0.5 rounded text-slate-400 border border-slate-800">{t.code}</div>
                </div>
                
                <div className="space-y-2">
                  {t.players.map((p: any, idx: number) => (
                    <div key={p.id} className="flex items-center justify-between text-xs py-0.5 hover:bg-slate-800/45 px-1 rounded transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">#{idx + 1}</span>
                        <span className="font-semibold text-slate-350">{p.fullName}</span>
                      </div>
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${p.gender === 'MALE' ? 'bg-sky-500/10 text-sky-400' : 'bg-rose-500/10 text-rose-400'}`}>
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

      {/* Confirm Team Draw Modal */}
      <ConfirmModal
        open={confirmModalOpen}
        title="Xác nhận kết quả bốc thăm?"
        description="Thao tác này sẽ ghi đè mọi đội hình hiện tại và chuyển giải đấu sang trạng thái mới! Bạn có chắc chắn muốn tiến hành?"
        confirmLabel="Bốc thăm"
        cancelLabel="Hủy"
        variant="warning"
        loading={actionLoading}
        onConfirm={handleConfirmDraw}
        onCancel={() => setConfirmModalOpen(false)}
      />
    </div>
  );
}

