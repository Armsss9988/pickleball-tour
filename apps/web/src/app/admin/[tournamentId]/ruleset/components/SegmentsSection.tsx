'use client';

import { Target, Plus, Trash2 } from '@/components/icons';

interface SegmentDefinitionUI {
  id?: string;
  segmentKey: string;
  name: string;
  targetScore: number;
  playerCount: number;
  genderRule: 'mixed' | 'male_only' | 'female_only' | 'any';
  isDrawable?: boolean;
}

interface SegmentsSectionProps {
  segmentsList: SegmentDefinitionUI[];
  onAddSegment: () => void;
  onRemoveSegment: (index: number) => void;
  onSegmentChange: (index: number, fields: Partial<SegmentDefinitionUI>) => void;
  genderFormat: 'strict' | 'any';
  disabled?: boolean;
}

export function SegmentsSection({
  segmentsList,
  onAddSegment,
  onRemoveSegment,
  onSegmentChange,
  genderFormat,
  disabled,
}: SegmentsSectionProps) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/30 p-5">
      <div className="flex items-center justify-between border-b border-slate-850 pb-2">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Target className="w-4 h-4 text-sky-400" />
          Các Chặng Thi Đấu Tiếp Sức
        </h4>
        <button
          type="button"
          disabled={disabled}
          onClick={onAddSegment}
          className="btn btn-xs flex items-center gap-1 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/20 px-2 py-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm chặng
        </button>
      </div>

      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
        {segmentsList.map((segment, index) => (
          <div
            key={segment.segmentKey}
            className="flex flex-col gap-3 p-4 bg-slate-905/30 border border-slate-800/80 rounded-xl relative group hover:border-slate-700/60 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-400">Chặng {index + 1}</span>
              {segmentsList.length > 1 && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onRemoveSegment(index)}
                  className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                  title="Xóa chặng này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1 col-span-1 md:col-span-2">
                <label className="text-[10px] text-slate-450 font-medium">Tên chặng</label>
                <input
                  type="text"
                  required
                  disabled={disabled}
                  value={segment.name}
                  onChange={(e) => onSegmentChange(index, { name: e.target.value })}
                  className="w-full premium-input text-xs"
                  placeholder="Tên chặng thi đấu (VD: Đôi Nam)"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-455 font-medium">Điểm chạm</label>
                <input
                  type="number"
                  required
                  min={1}
                  disabled={disabled}
                  value={segment.targetScore}
                  onChange={(e) => onSegmentChange(index, { targetScore: Math.max(1, Number(e.target.value)) })}
                  className="w-full premium-input text-xs font-semibold text-amber-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-455 font-medium">Số VĐV / chặng</label>
                <input
                  type="number"
                  required
                  min={1}
                  disabled={disabled}
                  value={segment.playerCount}
                  onChange={(e) => onSegmentChange(index, { playerCount: Math.max(1, Number(e.target.value)) })}
                  className="w-full premium-input text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-450 font-medium">Luật giới tính</label>
                <select
                  disabled={disabled}
                  value={segment.genderRule}
                  onChange={(e) => onSegmentChange(index, { genderRule: e.target.value as any })}
                  className="w-full premium-input text-xs"
                >
                  <option value="any">Tự do / Bất kỳ giới tính nào</option>
                  {genderFormat === 'strict' && (
                    <>
                      <option value="mixed">Đôi Nam Nữ (Ít nhất 1 Nam, 1 Nữ)</option>
                      <option value="male_only">Chỉ Nam</option>
                      <option value="female_only">Chỉ Nữ</option>
                    </>
                  )}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-450 font-medium">Mã định danh chặng</label>
                <input
                  type="text"
                  readOnly
                  value={segment.segmentKey}
                  className="w-full premium-input text-xs bg-slate-900/60 text-slate-500 cursor-not-allowed font-mono"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id={`isDrawable-${segment.segmentKey}`}
                disabled={disabled}
                checked={segment.isDrawable ?? true}
                onChange={(e) => onSegmentChange(index, { isDrawable: e.target.checked })}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500 cursor-pointer"
              />
              <label
                htmlFor={`isDrawable-${segment.segmentKey}`}
                className="text-[11px] text-slate-350 font-medium cursor-pointer select-none"
              >
                Cho phép bốc thăm / thay đổi thứ tự chặng này
              </label>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-500">
        * Điểm chạm của chặng cuối cùng sẽ tự động được sử dụng làm điểm chạm chiến thắng trận đấu.
      </p>
    </div>
  );
}
