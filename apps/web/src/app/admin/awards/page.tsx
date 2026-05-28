'use client';

import { useActiveTournament } from '@/lib/use-tournament';

export default function AwardsPage() {
  const { tournament, loading: tLoading } = useActiveTournament();

  if (tLoading || !tournament) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <span className="login-spinner" style={{ width: '40px', height: '40px', borderTopColor: 'var(--brand-500)' }} />
      </div>
    );
  }

  return (
    <div className="premium-container p-6 space-y-6 max-w-3xl">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight">🥇 Bảng Vàng Giải Thưởng & Vinh Danh</h1>

      <div className="card p-6 space-y-6">
        <div>
          <h3 className="font-bold text-base text-brand-400">PodiumPlacements</h3>
          <p className="text-xs text-slate-400 mt-1">Danh sách vinh danh các đội tuyển đạt thứ hạng cao nhất tại giải.</p>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🥇</span>
              <div>
                <div className="text-sm font-bold text-slate-200">Giải Nhất (Vô Địch)</div>
                <div className="text-xs text-slate-400">Cup GOLAB và huy chương vàng</div>
              </div>
            </div>
            <div className="text-sm font-bold text-amber-400">Chờ xác định chung kết</div>
          </div>
          
          <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🥈</span>
              <div>
                <div className="text-sm font-bold text-slate-200">Giải Nhì (Á Quân)</div>
                <div className="text-xs text-slate-400">Huy chương bạc</div>
              </div>
            </div>
            <div className="text-sm font-bold text-slate-400">Chờ xác định chung kết</div>
          </div>
          
          <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🥉</span>
              <div>
                <div className="text-sm font-bold text-slate-200">Giải Ba (Đồng hạng Ba)</div>
                <div className="text-xs text-slate-400">Huy chương đồng</div>
              </div>
            </div>
            <div className="text-sm font-bold text-amber-600">Chờ kết quả bán kết</div>
          </div>
        </div>
      </div>
    </div>
  );
}
