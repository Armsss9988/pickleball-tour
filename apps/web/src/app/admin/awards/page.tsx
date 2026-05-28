'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading-skeleton';
import { Award, Trophy } from '@/components/icons';

export default function AwardsPage() {
  const { tournament, loading: tLoading } = useActiveTournament();

  if (tLoading || !tournament) {
    return <PageLoading />;
  }

  return (
    <div className="premium-container animate-scale-in">
      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeader
          title="Bảng Vàng Giải Thưởng"
          description="Vinh danh các đội tuyển và cá nhân đạt thứ hạng xuất sắc nhất tại giải đấu."
          icon={Trophy}
        />

        <div className="card p-6 space-y-6 shadow-xl">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Podium Placements
              </h3>
              <p className="text-xs text-slate-400 mt-1">Danh sách vinh danh các đội tuyển đạt thứ hạng cao nhất tại giải.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl flex items-center justify-between hover:border-amber-500/20 transition-colors shadow-md">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl">🥇</span>
                <div>
                  <div className="text-sm font-bold text-slate-100">Giải Nhất (Vô Địch)</div>
                  <div className="text-xs text-slate-400">Cup GOLAB và huy chương vàng</div>
                </div>
              </div>
              <div className="text-sm font-semibold text-amber-500">Chờ xác định chung kết</div>
            </div>
            
            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl flex items-center justify-between hover:border-slate-700 transition-colors shadow-md">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-slate-300/10 border border-slate-300/20 flex items-center justify-center text-xl">🥈</span>
                <div>
                  <div className="text-sm font-bold text-slate-100">Giải Nhì (Á Quân)</div>
                  <div className="text-xs text-slate-400">Huy chương bạc</div>
                </div>
              </div>
              <div className="text-sm font-semibold text-slate-400">Chờ xác định chung kết</div>
            </div>
            
            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl flex items-center justify-between hover:border-slate-700 transition-colors shadow-md">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-amber-700/10 border border-amber-750/20 flex items-center justify-center text-xl">🥉</span>
                <div>
                  <div className="text-sm font-bold text-slate-100">Giải Ba (Đồng hạng Ba)</div>
                  <div className="text-xs text-slate-400">Huy chương đồng</div>
                </div>
              </div>
              <div className="text-sm font-semibold text-amber-600">Chờ kết quả bán kết</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

