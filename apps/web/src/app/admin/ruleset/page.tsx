'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { useState } from 'react';

export default function RulesetSettingsPage() {
  const { tournament, loading: tLoading } = useActiveTournament();

  if (tLoading || !tournament) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <span className="login-spinner" style={{ width: '40px', height: '40px', borderTopColor: 'var(--brand-500)' }} />
      </div>
    );
  }

  const ruleset = tournament.ruleset || {};

  return (
    <div className="premium-container p-6 space-y-6 max-w-3xl">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight">⚙️ Cấu Hình Ruleset Đang Sử Dụng</h1>

      <div className="card p-6 space-y-6">
        <div>
          <h3 className="font-bold text-base text-brand-400">{ruleset.name || 'Thể thức GOLAB Standard'}</h3>
          <p className="text-xs text-slate-400 mt-1">Cấu hình luật thi đấu và chạm tiếp sức của giải đấu đang hoạt động.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-slate-900/40 rounded-xl space-y-2">
            <div className="text-xs text-slate-500 font-bold uppercase">Điểm chạm thi đấu</div>
            <div className="text-sm font-semibold text-slate-200">Điểm thắng chung cuộc: {ruleset.scoringConfig?.winScore || 24}đ</div>
            <div className="text-xs text-slate-400">Không áp dụng luật chạm deuce (first to win). Đổi sân theo cấu hình chặng.</div>
          </div>
          
          <div className="p-3 bg-slate-900/40 rounded-xl space-y-2">
            <div className="text-xs text-slate-500 font-bold uppercase">Quy mô đội hình tuyển</div>
            <div className="text-sm font-semibold text-slate-200">
              Quy mô: {ruleset.teamComposition?.teamSize || 5} VĐV ({ruleset.teamComposition?.maleCount || 3} Nam, {ruleset.teamComposition?.femaleCount || 2} Nữ)
            </div>
            <div className="text-xs text-slate-400">Tất cả thành viên bắt buộc phải ra sân thi đấu ít nhất 1 lần.</div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-bold text-sm text-slate-350">3 Chặng đấu chính thức:</h4>
          <div className="divide-y divide-slate-850">
            {(ruleset.segmentDefinitions || []).map((seg: any, idx: number) => (
              <div key={seg.id} className="py-2.5 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-200">{idx + 1}. {seg.name}</span>
                  <span className="text-[10px] text-slate-500 ml-2">({seg.segmentKey})</span>
                </div>
                <div className="font-bold text-brand-400">Target chạm: {seg.targetScore}đ</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
