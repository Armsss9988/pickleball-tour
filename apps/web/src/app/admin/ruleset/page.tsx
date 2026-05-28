'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading-skeleton';
import { ClipboardList, Award, Users, Target } from '@/components/icons';

export default function RulesetSettingsPage() {
  const { tournament, loading: tLoading } = useActiveTournament();

  if (tLoading || !tournament) {
    return <PageLoading />;
  }

  const ruleset = tournament.ruleset || {};

  return (
    <div className="premium-container animate-scale-in">
      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeader
          title="Cấu Hình Luật Thi Đấu"
          description="Thể thức ruleset đang được áp dụng cho giải đấu này."
          icon={ClipboardList}
        />

        <div className="card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-lg text-amber-500">{ruleset.name || 'Thể thức GOLAB Standard'}</h3>
              <p className="text-xs text-slate-400 mt-1">Cấu hình luật thi đấu và chạm tiếp sức của giải đấu đang hoạt động.</p>
            </div>
            <span className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-xs font-semibold border border-amber-500/20">
              Active Ruleset
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
                <Target className="w-4 h-4 text-sky-400" />
                Điểm chạm thi đấu
              </div>
              <div className="text-base font-semibold text-slate-200 mt-1">
                Điểm thắng chung cuộc: {ruleset.scoringConfig?.winScore || 24}đ
              </div>
              <div className="text-xs text-slate-500">
                Không áp dụng luật chạm deuce (first to win). Đổi sân theo cấu hình chặng.
              </div>
            </div>
            
            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
                <Users className="w-4 h-4 text-emerald-400" />
                Quy mô đội hình tuyển
              </div>
              <div className="text-base font-semibold text-slate-200 mt-1">
                Quy mô: {ruleset.teamComposition?.teamSize || 5} VĐV ({ruleset.teamComposition?.maleCount || 3} Nam, {ruleset.teamComposition?.femaleCount || 2} Nữ)
              </div>
              <div className="text-xs text-slate-500">
                Tất cả thành viên bắt buộc phải ra sân thi đấu ít nhất 1 lần.
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Các chặng thi đấu tiếp sức ({ruleset.segments?.length || 0} chặng)</span>
            <div className="flex flex-col gap-2">
              {(ruleset.segments || []).map((seg: any, idx: number) => (
                <div key={seg.segmentKey} className="flex items-center justify-between p-3.5 bg-slate-900/40 border border-slate-800/80 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-[11px] font-bold text-slate-350 flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-semibold text-slate-200">{seg.name}</span>
                      <span className="text-[10px] text-slate-500 ml-2 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                        {seg.segmentKey}
                      </span>
                    </div>
                  </div>
                  <div className="font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 text-xs">
                    Target chạm: {seg.targetScore}đ
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
