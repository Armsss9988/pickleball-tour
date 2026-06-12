'use client';

import { Users } from '@/components/icons';
import { MatchFormat, CompetitionFormat } from '@golab/contracts';
import { useEffect, useState } from 'react';

interface TeamCompositionSectionProps {
  matchFormat: MatchFormat;
  teamSize: number;
  setTeamSize: (size: number) => void;
  maleCount: number;
  setMaleCount: (count: number) => void;
  femaleCount: number;
  setFemaleCount: (count: number) => void;
  genderFormat: 'strict' | 'any';
  setGenderFormat: (format: 'strict' | 'any') => void;
  allMustPlay: boolean;
  setAllMustPlay: (val: boolean) => void;
  disabled?: boolean;
  groupCount: number;
  competitionFormat: CompetitionFormat;
}

export function TeamCompositionSection({
  matchFormat,
  teamSize,
  setTeamSize,
  maleCount,
  setMaleCount,
  femaleCount,
  setFemaleCount,
  genderFormat,
  setGenderFormat,
  allMustPlay,
  setAllMustPlay,
  disabled,
  groupCount,
  competitionFormat,
}: TeamCompositionSectionProps) {
  // Local UI states for single_game / best_of to make it extremely user-friendly
  const [playMode, setPlayMode] = useState<'singles' | 'doubles'>('doubles');
  const [genderCombo, setGenderCombo] = useState<string>('any');

  // Initialize helper UI states when loading standard/best_of format
  useEffect(() => {
    if (matchFormat !== 'relay') {
      if (teamSize === 1) {
        setPlayMode('singles');
        if (maleCount === 1) setGenderCombo('male_only');
        else if (femaleCount === 1) setGenderCombo('female_only');
        else setGenderCombo('any');
      } else {
        setPlayMode('doubles');
        if (maleCount === 1 && femaleCount === 1) setGenderCombo('mixed');
        else if (maleCount === 2) setGenderCombo('male_only');
        else if (femaleCount === 2) setGenderCombo('female_only');
        else setGenderCombo('any');
      }
    }
  }, [matchFormat, teamSize, maleCount, femaleCount]);

  // Handle changes in singles/doubles mode
  const handlePlayModeChange = (mode: 'singles' | 'doubles') => {
    setPlayMode(mode);
    if (mode === 'singles') {
      setTeamSize(1);
      // Reset gender combo if incompatible
      if (genderCombo === 'mixed') {
        setGenderCombo('any');
        setGenderFormat('any');
        setMaleCount(0);
        setFemaleCount(0);
      } else {
        applyStandardGenderRules(1, genderCombo);
      }
    } else {
      setTeamSize(2);
      applyStandardGenderRules(2, genderCombo);
    }
  };

  // Handle standard gender combination changes
  const handleGenderComboChange = (combo: string) => {
    setGenderCombo(combo);
    const size = playMode === 'singles' ? 1 : 2;
    applyStandardGenderRules(size, combo);
  };

  const applyStandardGenderRules = (size: number, combo: string) => {
    if (combo === 'any') {
      setGenderFormat('any');
      setMaleCount(0);
      setFemaleCount(0);
    } else {
      setGenderFormat('strict');
      if (size === 1) {
        if (combo === 'male_only') {
          setMaleCount(1);
          setFemaleCount(0);
        } else if (combo === 'female_only') {
          setMaleCount(0);
          setFemaleCount(1);
        }
      } else {
        if (combo === 'mixed') {
          setMaleCount(1);
          setFemaleCount(1);
        } else if (combo === 'male_only') {
          setMaleCount(2);
          setFemaleCount(0);
        } else if (combo === 'female_only') {
          setMaleCount(0);
          setFemaleCount(2);
        }
      }
    }
  };

  // Calculations for display
  const currentTeamSize = genderFormat === 'strict' ? maleCount + femaleCount : teamSize;

  if (matchFormat !== 'relay') {
    return (
      <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/30 p-5">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400" />
          Quy Mô Đội Hình & Giới Tính
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400">Hình thức thi đấu</label>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => handlePlayModeChange('singles')}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                  playMode === 'singles'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                Đấu Đơn (1 người / đội)
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => handlePlayModeChange('doubles')}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                  playMode === 'doubles'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                Đấu Đôi (2 người / đội)
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400">Yêu cầu giới tính</label>
            <select
              disabled={disabled}
              value={genderCombo}
              onChange={(e) => handleGenderComboChange(e.target.value)}
              className="w-full premium-input text-xs h-9"
            >
              <option value="any">Tự do (Bất kỳ giới tính nào)</option>
              {playMode === 'singles' ? (
                <>
                  <option value="male_only">Chỉ Nam</option>
                  <option value="female_only">Chỉ Nữ</option>
                </>
              ) : (
                <>
                  <option value="mixed">Đôi Nam Nữ (1 Nam, 1 Nữ)</option>
                  <option value="male_only">Đôi Nam (2 Nam)</option>
                  <option value="female_only">Đôi Nữ (2 Nữ)</option>
                </>
              )}
            </select>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800/60 text-xs text-slate-400">
          Quy mô lưu trữ: <span className="font-semibold text-slate-200">{currentTeamSize} VĐV</span> 
          {genderFormat === 'strict' ? ` (${maleCount} Nam, ${femaleCount} Nữ)` : ' (Không ràng buộc giới tính)'}
        </div>

        {competitionFormat === 'GROUP_STAGE_KNOCKOUT' && (
          <div className="text-xs text-amber-500 font-semibold mt-2 bg-amber-500/5 border border-amber-500/15 rounded-lg p-2.5">
            💡 Với {groupCount} bảng đấu, yêu cầu tối thiểu: {groupCount * 2} đội (tương đương {groupCount * 2 * currentTeamSize} VĐV
            {genderFormat === 'strict' && ` gồm ${groupCount * 2 * maleCount} Nam và ${groupCount * 2 * femaleCount} Nữ`}
            ) để giải đấu hợp lệ.
          </div>
        )}
      </div>
    );
  }

  // Else, return the flexible layout for relay
  return (
    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/30 p-5">
      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
        <Users className="w-4 h-4 text-emerald-400" />
        Thể thức Giới tính & Quy mô (Relay)
      </h4>
      
      <div className="flex flex-col md:flex-row gap-4 border-b border-slate-800 pb-3">
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input
            type="radio"
            name="genderFormat"
            disabled={disabled}
            checked={genderFormat === 'strict'}
            onChange={() => {
              setGenderFormat('strict');
              setTeamSize(maleCount + femaleCount);
            }}
            className="text-amber-500 focus:ring-amber-500 bg-slate-800 border-slate-700"
          />
          Ràng buộc giới tính (Ví dụ: Đội có 3 Nam, 2 Nữ)
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input
            type="radio"
            name="genderFormat"
            disabled={disabled}
            checked={genderFormat === 'any'}
            onChange={() => {
              setGenderFormat('any');
              setMaleCount(0);
              setFemaleCount(0);
            }}
            className="text-amber-500 focus:ring-amber-500 bg-slate-800 border-slate-700"
          />
          Tự do / Một giới tính (Chỉ yêu cầu tổng số lượng)
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        {genderFormat === 'strict' ? (
          <>
            <div className="space-y-1.5">
              <label className="block text-[11px] text-slate-400 font-medium">Số lượng VĐV Nam / đội</label>
              <input
                type="number"
                required
                min={0}
                value={maleCount}
                onChange={(e) => {
                  const m = Math.max(0, Number(e.target.value));
                  setMaleCount(m);
                  setTeamSize(m + femaleCount);
                }}
                className="w-full premium-input text-xs"
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] text-slate-400 font-medium">Số lượng VĐV Nữ / đội</label>
              <input
                type="number"
                required
                min={0}
                value={femaleCount}
                onChange={(e) => {
                  const f = Math.max(0, Number(e.target.value));
                  setFemaleCount(f);
                  setTeamSize(maleCount + f);
                }}
                className="w-full premium-input text-xs"
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] text-slate-400 font-medium">Tổng quy mô đội</label>
              <input
                type="text"
                readOnly
                value={`${maleCount + femaleCount} người`}
                className="w-full premium-input text-xs bg-slate-900/60 text-slate-450 cursor-not-allowed font-medium"
              />
            </div>
          </>
        ) : (
          <div className="space-y-1.5 col-span-1">
            <label className="block text-[11px] text-slate-400 font-medium">Tổng số lượng VĐV / đội</label>
            <input
              type="number"
              required
              min={1}
              value={teamSize}
              onChange={(e) => setTeamSize(Math.max(1, Number(e.target.value)))}
              className="w-full premium-input text-xs"
              disabled={disabled}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="allMustPlay"
          checked={allMustPlay}
          onChange={(e) => setAllMustPlay(e.target.checked)}
          className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500"
          disabled={disabled}
        />
        <label htmlFor="allMustPlay" className="text-xs font-semibold text-slate-350 cursor-pointer">
          Tất cả {currentTeamSize} thành viên bắt buộc phải ra sân thi đấu ít nhất 1 lần
        </label>
      </div>

      {competitionFormat === 'GROUP_STAGE_KNOCKOUT' && (
        <div className="text-xs text-amber-500 font-semibold mt-2 bg-amber-500/5 border border-amber-500/15 rounded-lg p-2.5">
          💡 Với {groupCount} bảng đấu, yêu cầu tối thiểu: {groupCount * 2} đội (tương đương {groupCount * 2 * currentTeamSize} VĐV
          {genderFormat === 'strict' && ` gồm ${groupCount * 2 * maleCount} Nam và ${groupCount * 2 * femaleCount} Nữ`}
          ) để giải đấu hợp lệ.
        </div>
      )}
    </div>
  );
}
