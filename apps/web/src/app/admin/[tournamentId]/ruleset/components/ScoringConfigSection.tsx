'use client';

import { Target } from '@/components/icons';
import { MatchFormat } from '@golab/contracts';

interface ScoringConfigSectionProps {
  matchFormat: MatchFormat;
  winScore: number;
  setWinScore: (score: number) => void;
  gamePointScore: number;
  setGamePointScore: (score: number) => void;
  setsToWin: number;
  setSetsToWin: (sets: number) => void;
  lastSetPointScore: number | null;
  setLastSetPointScore: (score: number | null) => void;
  noDeuce: boolean;
  setNoDeuce: (val: boolean) => void;
  deuceMaxScore: number | null;
  setDeuceMaxScore: (score: number | null) => void;
  lastSegmentTargetScore?: number; // Read-only for relay
  disabled?: boolean;
}

export function ScoringConfigSection({
  matchFormat,
  winScore,
  setWinScore,
  gamePointScore,
  setGamePointScore,
  setsToWin,
  setSetsToWin,
  lastSetPointScore,
  setLastSetPointScore,
  noDeuce,
  setNoDeuce,
  deuceMaxScore,
  setDeuceMaxScore,
  lastSegmentTargetScore = 24,
  disabled,
}: ScoringConfigSectionProps) {
  
  if (matchFormat === 'relay') {
    return (
      <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/30 p-5">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Target className="w-4 h-4 text-sky-400" />
          Cấu Hình Điểm Số (Relay)
        </h4>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1">
            <label className="block text-[11px] text-slate-400 font-medium">Điểm chạm thắng chung cuộc</label>
            <input
              type="text"
              readOnly
              value={`${lastSegmentTargetScore} điểm`}
              className="w-full premium-input text-xs bg-slate-900/60 text-slate-400 cursor-not-allowed font-semibold"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              * Điểm chạm được kế thừa và xác định bởi chặng cuối cùng.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/30 p-5">
      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
        <Target className="w-4 h-4 text-sky-400" />
        Cấu Hình Điểm Số
      </h4>

      {matchFormat === 'single_game' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-[11px] text-slate-400 font-medium">Số điểm chạm để thắng trận</label>
            <input
              type="number"
              required
              min={1}
              value={winScore}
              onChange={(e) => setWinScore(Math.max(1, Number(e.target.value)))}
              className="w-full premium-input text-xs font-semibold text-amber-400"
              disabled={disabled}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="block text-[11px] text-slate-400 font-medium font-semibold">Thể thức Set cần thắng</label>
            <select
              value={setsToWin}
              onChange={(e) => setSetsToWin(Number(e.target.value))}
              className="w-full premium-input text-xs"
              disabled={disabled}
            >
              <option value={1}>Thắng 1 set (BO1)</option>
              <option value={2}>Thắng 2 trên 3 (BO3)</option>
              <option value={3}>Thắng 3 trên 5 (BO5)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] text-slate-400 font-medium">Số điểm chạm mỗi Set</label>
            <input
              type="number"
              required
              min={1}
              value={gamePointScore}
              onChange={(e) => setGamePointScore(Math.max(1, Number(e.target.value)))}
              className="w-full premium-input text-xs font-semibold text-amber-400"
              disabled={disabled}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] text-slate-400 font-medium">Điểm chạm Set cuối (Nếu khác)</label>
            <input
              type="number"
              placeholder="Mặc định như các set"
              value={lastSetPointScore || ''}
              onChange={(e) => {
                const val = e.target.value === '' ? null : Math.max(1, Number(e.target.value));
                setLastSetPointScore(val);
              }}
              className="w-full premium-input text-xs"
              disabled={disabled}
            />
          </div>
        </div>
      )}

    </div>
  );
}
