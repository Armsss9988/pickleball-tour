'use client';

import { Lock, Plus, Trash2 } from '@/components/icons';

interface SegmentDefinitionUI {
  segmentKey: string;
  name: string;
}

interface OverlapRuleUI {
  segmentAKey: string;
  segmentBKey: string;
  gender: 'MALE' | 'FEMALE';
}

interface OverlapsSectionProps {
  segmentsList: SegmentDefinitionUI[];
  overlapsList: OverlapRuleUI[];
  onAddOverlap: () => void;
  onRemoveOverlap: (index: number) => void;
  onOverlapChange: (index: number, fields: Partial<OverlapRuleUI>) => void;
  noOverlapAllPlayers: boolean;
  setNoOverlapAllPlayers: (val: boolean) => void;
  maleMaxSegments: number;
  setMaleMaxSegments: (val: number) => void;
  femaleMaxSegments: number;
  setFemaleMaxSegments: (val: number) => void;
  genderFormat: 'strict' | 'any';
  disabled?: boolean;
}

export function OverlapsSection({
  segmentsList,
  overlapsList,
  onAddOverlap,
  onRemoveOverlap,
  onOverlapChange,
  noOverlapAllPlayers,
  setNoOverlapAllPlayers,
  maleMaxSegments,
  setMaleMaxSegments,
  femaleMaxSegments,
  setFemaleMaxSegments,
  genderFormat,
  disabled,
}: OverlapsSectionProps) {
  return (
    <div className="space-y-4">
      {/* Player Limits */}
      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/30 p-5">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-400" />
          Giới Hạn Số Chặng Thi Đấu Của VĐV
        </h4>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="noOverlapAll"
            checked={noOverlapAllPlayers}
            onChange={(e) => setNoOverlapAllPlayers(e.target.checked)}
            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500"
            disabled={disabled}
          />
          <label htmlFor="noOverlapAll" className="text-xs font-semibold text-amber-400 cursor-pointer">
            ⚠️ Mỗi VĐV chỉ được thi đấu tối đa 1 chặng / trận (Không ai được đánh 2 nội dung)
          </label>
        </div>

        {!noOverlapAllPlayers && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="block text-[11px] text-slate-400 font-medium">Số chặng tối đa VĐV Nam được đánh / trận</label>
              <input
                type="number"
                required
                min={1}
                value={maleMaxSegments}
                onChange={(e) => setMaleMaxSegments(Math.max(1, Number(e.target.value)))}
                className="w-full premium-input text-xs"
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] text-slate-400 font-medium">Số chặng tối đa VĐV Nữ được đánh / trận</label>
              <input
                type="number"
                required
                min={1}
                value={femaleMaxSegments}
                onChange={(e) => setFemaleMaxSegments(Math.max(1, Number(e.target.value)))}
                className="w-full premium-input text-xs"
                disabled={disabled}
              />
            </div>
          </div>
        )}
      </div>

      {/* Overlap rules (only if strict gender and not single-overlap-only) */}
      {genderFormat === 'strict' && !noOverlapAllPlayers && (
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/30 p-5">
          <div className="flex items-center justify-between border-b border-slate-850 pb-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              Quy Tắc Cấm Trùng Lặp VĐV Giữa Các Chặng
            </h4>
            <button
              type="button"
              onClick={onAddOverlap}
              className="btn btn-xs flex items-center gap-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 px-2 py-1"
              disabled={disabled || segmentsList.length < 2}
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm quy định
            </button>
          </div>

          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
            {overlapsList.length > 0 ? (
              overlapsList.map((overlap, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2 p-2 bg-slate-905/30 border border-slate-800/80 rounded-xl">
                  <span className="text-xs text-slate-400">Cấm VĐV</span>
                  <select
                    value={overlap.gender}
                    onChange={(e) => onOverlapChange(index, { gender: e.target.value as any })}
                    className="bg-slate-900 border border-slate-800/80 rounded-xl text-xs px-2.5 py-1.5 h-9 text-slate-250 outline-none focus:border-amber-500/50 transition-all cursor-pointer"
                    disabled={disabled}
                  >
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                  </select>
                  <span className="text-xs text-slate-400">đánh cả</span>
                  <select
                    value={overlap.segmentAKey}
                    onChange={(e) => onOverlapChange(index, { segmentAKey: e.target.value })}
                    className="bg-slate-900 border border-slate-800/80 rounded-xl text-xs px-2.5 py-1.5 h-9 text-slate-250 outline-none focus:border-amber-500/50 transition-all flex-1 min-w-[120px] cursor-pointer"
                    disabled={disabled}
                  >
                    {segmentsList.map((s) => (
                      <option key={s.segmentKey} value={s.segmentKey}>{s.name}</option>
                    ))}
                  </select>
                  <span className="text-xs text-slate-400">và</span>
                  <select
                    value={overlap.segmentBKey}
                    onChange={(e) => onOverlapChange(index, { segmentBKey: e.target.value })}
                    className="bg-slate-900 border border-slate-800/80 rounded-xl text-xs px-2.5 py-1.5 h-9 text-slate-250 outline-none focus:border-amber-500/50 transition-all flex-1 min-w-[120px] cursor-pointer"
                    disabled={disabled}
                  >
                    {segmentsList.map((s) => (
                      <option key={s.segmentKey} value={s.segmentKey}>{s.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onRemoveOverlap(index)}
                    className="text-slate-500 hover:text-rose-450 transition-colors p-1"
                    disabled={disabled}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">Chưa thiết lập quy định cấm trùng chặng cụ thể nào.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
