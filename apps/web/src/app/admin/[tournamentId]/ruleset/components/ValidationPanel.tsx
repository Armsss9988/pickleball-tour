'use client';

import { CheckCircle2, XCircle, Info, Loader2 } from '@/components/icons';
import { MatchFormat } from '@golab/contracts';
import { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '@/lib/api-client';

interface SegmentDefinitionUI {
  segmentKey: string;
  name: string;
  targetScore: number;
  playerCount: number;
  genderRule: 'mixed' | 'male_only' | 'female_only' | 'any';
}

interface OverlapRuleUI {
  segmentAKey: string;
  segmentBKey: string;
  gender: 'MALE' | 'FEMALE';
}

interface ValidationPanelProps {
  tournamentId: string;
  name: string;
  matchFormat: MatchFormat;
  teamSize: number;
  maleCount: number;
  femaleCount: number;
  genderFormat: 'strict' | 'any';
  allMustPlay: boolean;
  noOverlapAllPlayers: boolean;
  maleMaxSegments: number;
  femaleMaxSegments: number;
  segmentsList: SegmentDefinitionUI[];
  overlapsList: OverlapRuleUI[];
  winScore: number;
  gamePointScore: number;
  setsToWin: number;
  lastSetPointScore: number | null;
  noDeuce: boolean;
  deuceMaxScore: number | null;
  requireCourtConfig: boolean;
  requireScheduleConfig: boolean;
  onValidationChange?: (isValid: boolean) => void;
}

interface CheckItem {
  id: string;
  label: string;
  status: 'passed' | 'failed' | 'not_applicable';
  reason?: string;
}

export function ValidationPanel({
  tournamentId,
  name,
  matchFormat,
  teamSize,
  maleCount,
  femaleCount,
  genderFormat,
  allMustPlay,
  noOverlapAllPlayers,
  maleMaxSegments,
  femaleMaxSegments,
  segmentsList,
  overlapsList,
  winScore,
  gamePointScore,
  setsToWin,
  lastSetPointScore,
  noDeuce,
  deuceMaxScore,
  requireCourtConfig,
  requireScheduleConfig,
  onValidationChange,
}: ValidationPanelProps) {
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // 1. Calculate local check list (V1-V16)
  const checklist = useMemo<CheckItem[]>(() => {
    const items: CheckItem[] = [];

    // V1: Team size check
    const isTeamSizeOk = teamSize > 0;
    items.push({
      id: 'V1',
      label: `Quy mô đội lớn hơn 0 (Đang là: ${teamSize})`,
      status: isTeamSizeOk ? 'passed' : 'failed',
    });

    // V2: Strict gender check
    if (genderFormat === 'strict') {
      const isGenderSumOk = maleCount + femaleCount === teamSize;
      items.push({
        id: 'V2',
        label: `Tổng số VĐV Nam (${maleCount}) + Nữ (${femaleCount}) bằng quy mô đội (${teamSize})`,
        status: isGenderSumOk ? 'passed' : 'failed',
      });
    }

    // V3: Target Win Score check for relay / single_game
    if (matchFormat === 'relay' || matchFormat === 'single_game') {
      const target = matchFormat === 'relay' && segmentsList.length > 0 
        ? segmentsList[segmentsList.length - 1].targetScore 
        : winScore;
      items.push({
        id: 'V3',
        label: `Điểm chiến thắng mục tiêu lớn hơn 0 (Đang là: ${target}đ)`,
        status: target > 0 ? 'passed' : 'failed',
      });
    }

    // Relay specific checks
    if (matchFormat === 'relay') {
      // V4: At least 1 segment
      const hasSegments = segmentsList.length > 0;
      items.push({
        id: 'V4',
        label: `Cấu hình ít nhất 1 chặng thi đấu`,
        status: hasSegments ? 'passed' : 'failed',
      });

      if (hasSegments) {
        // V5: Target scores increasing
        let targetsIncreasing = true;
        for (let i = 1; i < segmentsList.length; i++) {
          if (segmentsList[i].targetScore <= segmentsList[i - 1].targetScore) {
            targetsIncreasing = false;
            break;
          }
        }
        items.push({
          id: 'V5',
          label: 'Điểm chạm các chặng tăng dần nghiêm ngặt',
          status: targetsIncreasing ? 'passed' : 'failed',
        });

        // V7: playerCount <= teamSize
        let playersInLimit = true;
        for (const seg of segmentsList) {
          if (seg.playerCount > teamSize) {
            playersInLimit = false;
            break;
          }
        }
        items.push({
          id: 'V7',
          label: `Số người chơi mỗi chặng không vượt quá quy mô đội (${teamSize})`,
          status: playersInLimit ? 'passed' : 'failed',
        });

        // V8: Strict gender limits per segment
        if (genderFormat === 'strict') {
          let genderRulesPossible = true;
          let reason = '';
          for (const seg of segmentsList) {
            if (seg.genderRule === 'male_only' && maleCount < seg.playerCount) {
              genderRulesPossible = false;
              reason = `Chặng "${seg.name}" yêu cầu ${seg.playerCount} VĐV Nam nhưng đội hình chỉ có ${maleCount} Nam.`;
              break;
            }
            if (seg.genderRule === 'female_only' && femaleCount < seg.playerCount) {
              genderRulesPossible = false;
              reason = `Chặng "${seg.name}" yêu cầu ${seg.playerCount} VĐV Nữ nhưng đội hình chỉ có ${femaleCount} Nữ.`;
              break;
            }
            if (seg.genderRule === 'mixed' && (maleCount < 1 || femaleCount < 1)) {
              genderRulesPossible = false;
              reason = `Chặng "${seg.name}" yêu cầu cả Nam và Nữ nhưng đội hình thiếu Nam hoặc Nữ.`;
              break;
            }
          }
          items.push({
            id: 'V8',
            label: 'Đội hình đáp ứng yêu cầu giới tính của các chặng',
            status: genderRulesPossible ? 'passed' : 'failed',
            reason: reason || undefined,
          });
        }

        // V9: allMustPlay check
        if (allMustPlay) {
          const totalSlots = segmentsList.reduce((sum, s) => sum + s.playerCount, 0);
          items.push({
            id: 'V9',
            label: `Tổng lượt chơi (${totalSlots}) đủ để tất cả VĐV (${teamSize}) ra sân ít nhất 1 lần`,
            status: totalSlots >= teamSize ? 'passed' : 'failed',
          });
        }

        // V10: player limits
        const mMax = noOverlapAllPlayers ? 1 : maleMaxSegments;
        const fMax = noOverlapAllPlayers ? 1 : femaleMaxSegments;
        items.push({
          id: 'V10',
          label: `Giới hạn số chặng tối đa (${mMax}/${fMax}) không vượt quá tổng số chặng (${segmentsList.length})`,
          status: (mMax <= segmentsList.length && fMax <= segmentsList.length) ? 'passed' : 'failed',
        });
      }
    }

    // Best-of specific checks
    if (matchFormat === 'best_of') {
      // V11: setsToWin range
      const setsOk = setsToWin >= 1 && setsToWin <= 5;
      items.push({
        id: 'V11',
        label: `Số set đấu cần thắng hợp lệ (BO3 hoặc BO5, đang chọn set thắng: ${setsToWin})`,
        status: setsOk ? 'passed' : 'failed',
      });

      // V12: gamePointScore check
      items.push({
        id: 'V12',
        label: `Điểm mỗi set đấu lớn hơn 0 (Đang là: ${gamePointScore}đ)`,
        status: gamePointScore > 0 ? 'passed' : 'failed',
      });

      // V16: lastSetPointScore check
      if (lastSetPointScore !== null) {
        items.push({
          id: 'V16',
          label: `Điểm set cuối cùng hợp lệ (Đang cấu hình: ${lastSetPointScore}đ)`,
          status: lastSetPointScore > 0 ? 'passed' : 'failed',
        });
      }
    }

    // Single Game & Best of team size limit
    if (matchFormat === 'single_game' || matchFormat === 'best_of') {
      const isSinglesOrDoubles = teamSize === 1 || teamSize === 2;
      items.push({
        id: 'V14',
        label: `Quy mô đội hình đấu đơn/đôi là 1 hoặc 2 người`,
        status: isSinglesOrDoubles ? 'passed' : 'failed',
      });
    }

    return items;
  }, [
    matchFormat,
    teamSize,
    maleCount,
    femaleCount,
    genderFormat,
    allMustPlay,
    noOverlapAllPlayers,
    maleMaxSegments,
    femaleMaxSegments,
    segmentsList,
    winScore,
    gamePointScore,
    setsToWin,
    lastSetPointScore,
    noDeuce,
    deuceMaxScore,
  ]);

  // Determine if client validation passed
  const isClientValid = useMemo(() => {
    return checklist.every((item) => item.status !== 'failed');
  }, [checklist]);

  // 2. Debounced API Validation check
  useEffect(() => {
    if (!isClientValid) {
      setApiError(null);
      onValidationChange?.(false);
      return;
    }

    setApiLoading(true);
    setApiError(null);

    const mMax = noOverlapAllPlayers ? 1 : Number(maleMaxSegments);
    const fMax = noOverlapAllPlayers ? 1 : Number(femaleMaxSegments);

    const payload = {
      name: name.trim() || 'Ruleset Kiểm tra',
      sport: 'pickleball',
      isTemplate: false,
      matchFormat: matchFormat,
      requireCourtConfig,
      requireScheduleConfig,
      segments: matchFormat === 'relay'
        ? segmentsList.map((s, idx) => ({
            segmentKey: s.segmentKey,
            name: s.name.trim(),
            targetScore: Number(s.targetScore),
            playerCount: Number(s.playerCount),
            genderRule: s.genderRule,
            orderIndex: idx,
            isDrawable: true,
          }))
        : [],
      teamComposition: {
        teamSize: genderFormat === 'strict' ? maleCount + femaleCount : teamSize,
        maleCount: genderFormat === 'strict' ? maleCount : 0,
        femaleCount: genderFormat === 'strict' ? femaleCount : 0,
        allMustPlay: allMustPlay,
      },
      playerLimits: matchFormat === 'relay'
        ? [
            { gender: 'MALE', minSegments: 1, maxSegments: mMax },
            { gender: 'FEMALE', minSegments: 1, maxSegments: fMax },
          ]
        : [],
      overlapRules: matchFormat === 'relay'
        ? overlapsList.map((o) => ({
            segmentAKey: o.segmentAKey,
            segmentBKey: o.segmentBKey,
            gender: o.gender,
            isForbidden: true,
          }))
        : [],
      scoringConfig: {
        winScore: matchFormat === 'relay'
          ? (segmentsList[segmentsList.length - 1]?.targetScore || 24)
          : (matchFormat === 'single_game' ? winScore : 0),
        gamePointScore: matchFormat === 'best_of' ? gamePointScore : undefined,
        setsToWin: matchFormat === 'best_of' ? setsToWin : undefined,
        lastSetPointScore: matchFormat === 'best_of' && lastSetPointScore ? lastSetPointScore : undefined,
        noDeuce: noDeuce,
        deuceMaxScore: !noDeuce && deuceMaxScore ? deuceMaxScore : undefined,
        sideSwitchAfterSegments: 0,
        pointsForWin: 3,
        pointsForLoss: 0,
      },
    };

    const handler = setTimeout(async () => {
      try {
        const response = await apiFetch<{ valid: boolean; errors: string[] }>(
          `/tournaments/${tournamentId}/ruleset/validate`,
          {
            method: 'POST',
            body: payload,
          }
        );

        if (response.valid) {
          setApiError(null);
          onValidationChange?.(true);
        } else {
          setApiError(response.errors.join(', '));
          onValidationChange?.(false);
        }
      } catch (err: any) {
        console.error('Validation endpoint error:', err);
        setApiError(err.message || 'Lỗi kiểm tra cấu hình từ hệ thống.');
        onValidationChange?.(false);
      } finally {
        setApiLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [
    tournamentId,
    name,
    matchFormat,
    teamSize,
    maleCount,
    femaleCount,
    genderFormat,
    allMustPlay,
    noOverlapAllPlayers,
    maleMaxSegments,
    femaleMaxSegments,
    segmentsList,
    overlapsList,
    winScore,
    gamePointScore,
    setsToWin,
    lastSetPointScore,
    noDeuce,
    deuceMaxScore,
    isClientValid,
    onValidationChange,
    requireCourtConfig,
    requireScheduleConfig,
  ]);

  const failedItems = checklist.filter((item) => item.status === 'failed');

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-850 pb-2">
        <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-500" />
          Bảng Kiểm Tra Điều Kiện Lưu Cấu Hình
        </h4>
        {apiLoading && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
            Đang kiểm tra...
          </div>
        )}
      </div>

      {/* Checklist items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
        {checklist.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-2 p-2 rounded-lg border ${
              item.status === 'passed'
                ? 'bg-emerald-500/4 border-emerald-500/10 text-slate-300'
                : 'bg-rose-500/5 border-rose-500/10 text-rose-200'
            }`}
          >
            {item.status === 'passed' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex flex-col">
              <span className="font-medium">{item.label}</span>
              {item.reason && (
                <span className="text-[10px] text-rose-455 mt-0.5 font-normal leading-relaxed">
                  Lý do: {item.reason}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* API Summary / Results */}
      {!isClientValid ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-xs text-rose-350 flex items-start gap-2.5">
          <XCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-bold text-rose-200 block mb-0.5">Không thể lưu cấu hình!</span>
            Có {failedItems.length} điều kiện kiểm tra phía máy khách chưa đạt. Hãy điều chỉnh các thông số màu đỏ ở trên.
          </div>
        </div>
      ) : apiError ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-xs text-rose-350 flex items-start gap-2.5">
          <XCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-bold text-rose-200 block mb-0.5">Lỗi nghiệp vụ từ Máy Chủ (Domain Invariant):</span>
            {apiError}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-555/20 bg-emerald-500/8 px-4 py-3 text-xs text-emerald-350 flex items-start gap-2.5 animate-scale-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-bold text-emerald-200 block mb-0.5">Cấu hình hợp lệ!</span>
            Mọi quy tắc nghiệp vụ đã được kiểm chứng thành công. Bạn có thể nhấn nút lưu cấu hình luật.
          </div>
        </div>
      )}
    </div>
  );
}
