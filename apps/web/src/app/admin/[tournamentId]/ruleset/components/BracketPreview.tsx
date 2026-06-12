'use client';

import { useState, useMemo, useCallback } from 'react';
import { Trophy } from '@/components/icons';
import { SeedSourcePanel } from './SeedSourcePanel';
import { BracketMatchNode } from './BracketMatchNode';

export interface SeedSlot {
  slotNo: number;
  sourceKey: string | null;
}

interface BracketRound {
  roundName: string;
  matches: BracketMatch[];
}

interface BracketMatch {
  label: string;
  slotA: number;   // slot number from knockoutSeedSlots for first-round matches
  slotB: number;
  isFirstRound: boolean;
  teamALabel?: string | null;
  teamBLabel?: string | null;
  visible?: boolean;
  winnerLabel?: string | null;
  sourceMatchA?: { rIdx: number; mIdx: number };
  sourceMatchB?: { rIdx: number; mIdx: number };
}

interface MatchTemplate {
  label: string;
  isFirstRound: boolean;
  slotA?: number;
  slotB?: number;
  parentA?: number;
  parentB?: number;
}

interface BracketPreviewProps {
  knockoutBracketSize: number | null;
  knockoutSeedSlots: SeedSlot[];
  groupCount: number;
  advancePerGroup: number;
  isEditing?: boolean;
  onSeedSlotsChange?: (slots: SeedSlot[]) => void;
  onBracketSizeChange?: (size: number | null) => void;
  seedingMethod?: 'crossover' | 'crossover_reverse' | 'sequential' | 'manual';
}

// Build static bracket round/match structure for display (Auto mode)
function buildBracketRounds(
  size: number | null,
  groupCount: number,
  advancePerGroup: number
): { rounds: BracketRound[]; firstRoundSlotPairs: [number, number][]; isAuto: boolean } {
  // Automatic mode — derive from groupCount * advancePerGroup
  const totalQualified = groupCount * advancePerGroup;

  if (totalQualified === 2) {
    return {
      rounds: [{ roundName: 'Chung Kết', matches: [{ label: 'Final', slotA: 1, slotB: 2, isFirstRound: true }] }],
      firstRoundSlotPairs: [[1, 2]],
      isAuto: true,
    };
  }
  if (totalQualified <= 4) {
    let sfA = 'A1', sfB = 'B2', sfC = 'B1', sfD = 'A2';
    if (groupCount === 4) { sfA = 'A1'; sfB = 'B1'; sfC = 'C1'; sfD = 'D1'; }
    if (groupCount === 1) { sfA = 'T1'; sfB = 'T4'; sfC = 'T2'; sfD = 'T3'; }
    return {
      rounds: [
        { roundName: 'Bán Kết', matches: [
          { label: 'SF 1', slotA: 0, slotB: 0, isFirstRound: false, teamALabel: sfA, teamBLabel: sfB },
          { label: 'SF 2', slotA: 0, slotB: 0, isFirstRound: false, teamALabel: sfC, teamBLabel: sfD },
        ]},
        { roundName: 'Chung Kết', matches: [
          { label: 'Final', slotA: 0, slotB: 0, isFirstRound: false, teamALabel: 'Thắng SF 1', teamBLabel: 'Thắng SF 2' },
        ]},
      ],
      firstRoundSlotPairs: [],
      isAuto: true,
    };
  }
  if (totalQualified === 6 && groupCount === 2) {
    return {
      rounds: [
        { roundName: 'Vòng Nhánh', matches: [
          { label: 'P 1', slotA: 0, slotB: 0, isFirstRound: false, teamALabel: 'A2', teamBLabel: 'B3' },
          { label: 'P 2', slotA: 0, slotB: 0, isFirstRound: false, teamALabel: 'B2', teamBLabel: 'A3' },
        ]},
        { roundName: 'Bán Kết', matches: [
          { label: 'SF 1', slotA: 0, slotB: 0, isFirstRound: false, teamALabel: 'A1', teamBLabel: 'Thắng P 2' },
          { label: 'SF 2', slotA: 0, slotB: 0, isFirstRound: false, teamALabel: 'B1', teamBLabel: 'Thắng P 1' },
        ]},
        { roundName: 'Chung Kết', matches: [
          { label: 'Final', slotA: 0, slotB: 0, isFirstRound: false, teamALabel: 'Thắng SF 1', teamBLabel: 'Thắng SF 2' },
        ]},
      ],
      firstRoundSlotPairs: [],
      isAuto: true,
    };
  }
  // Defaults to 8-team auto
  let q1a = 'A1', q1b = 'B4', q2a = 'B2', q2b = 'A3', q3a = 'B1', q3b = 'A4', q4a = 'A2', q4b = 'B3';
  if (groupCount === 4) { q1a = 'A1'; q1b = 'B2'; q2a = 'C1'; q2b = 'D2'; q3a = 'B1'; q3b = 'A2'; q4a = 'D1'; q4b = 'C2'; }
  if (groupCount === 1) { q1a = 'T1'; q1b = 'T8'; q2a = 'T4'; q2b = 'T5'; q3a = 'T2'; q3b = 'T7'; q4a = 'T3'; q4b = 'T6'; }
  return {
    rounds: [
      { roundName: 'Tứ Kết', matches: [
        { label: 'QF 1', slotA: 0, slotB: 0, isFirstRound: false, teamALabel: q1a, teamBLabel: q1b },
        { label: 'QF 2', slotA: 0, slotB: 0, isFirstRound: false, teamALabel: q2a, teamBLabel: q2b },
        { label: 'QF 3', slotA: 0, slotB: 0, isFirstRound: false, teamALabel: q3a, teamBLabel: q3b },
        { label: 'QF 4', slotA: 0, slotB: 0, isFirstRound: false, teamALabel: q4a, teamBLabel: q4b },
      ]},
      { roundName: 'Bán Kết', matches: [
        { label: 'SF 1', slotA: 0, slotB: 0, isFirstRound: false, teamALabel: 'Thắng QF 1', teamBLabel: 'Thắng QF 2' },
        { label: 'SF 2', slotA: 0, slotB: 0, isFirstRound: false, teamALabel: 'Thắng QF 3', teamBLabel: 'Thắng QF 4' },
      ]},
      { roundName: 'Chung Kết', matches: [
        { label: 'Final', slotA: 0, slotB: 0, isFirstRound: false, teamALabel: 'Thắng SF 1', teamBLabel: 'Thắng SF 2' },
      ]},
    ],
    firstRoundSlotPairs: [],
    isAuto: true,
  };
}

// Helper to determine if a team label represents a real team/winner
const isRealTeam = (label?: string | null) => {
  return label && label !== '— TBD —' && label !== 'Miễn đấu' && label !== '__BYE__';
};

// Seeding propagation algorithm for Manual mode
function propagateBracket(
  size: number,
  seedSlots: SeedSlot[]
): BracketRound[] {
  let roundsTemplate: { roundName: string; matches: MatchTemplate[] }[] = [];
  if (size === 2) {
    roundsTemplate = [
      {
        roundName: 'Chung Kết',
        matches: [{ label: 'Final', isFirstRound: true, slotA: 1, slotB: 2 }]
      }
    ];
  } else if (size === 4) {
    roundsTemplate = [
      {
        roundName: 'Bán Kết',
        matches: [
          { label: 'SF 1', isFirstRound: true, slotA: 1, slotB: 4 },
          { label: 'SF 2', isFirstRound: true, slotA: 2, slotB: 3 }
        ]
      },
      {
        roundName: 'Chung Kết',
        matches: [{ label: 'Final', isFirstRound: false, parentA: 0, parentB: 1 }]
      }
    ];
  } else if (size === 8) {
    roundsTemplate = [
      {
        roundName: 'Tứ Kết',
        matches: [
          { label: 'QF 1', isFirstRound: true, slotA: 1, slotB: 8 },
          { label: 'QF 2', isFirstRound: true, slotA: 4, slotB: 5 },
          { label: 'QF 3', isFirstRound: true, slotA: 2, slotB: 7 },
          { label: 'QF 4', isFirstRound: true, slotA: 3, slotB: 6 }
        ]
      },
      {
        roundName: 'Bán Kết',
        matches: [
          { label: 'SF 1', isFirstRound: false, parentA: 0, parentB: 1 },
          { label: 'SF 2', isFirstRound: false, parentA: 2, parentB: 3 }
        ]
      },
      {
        roundName: 'Chung Kết',
        matches: [{ label: 'Final', isFirstRound: false, parentA: 0, parentB: 1 }]
      }
    ];
  } else {
    // size === 16
    roundsTemplate = [
      {
        roundName: 'Vòng 1/8',
        matches: [
          { label: 'R16-1', isFirstRound: true, slotA: 1, slotB: 16 },
          { label: 'R16-2', isFirstRound: true, slotA: 4, slotB: 13 },
          { label: 'R16-3', isFirstRound: true, slotA: 5, slotB: 12 },
          { label: 'R16-4', isFirstRound: true, slotA: 8, slotB: 9 },
          { label: 'R16-5', isFirstRound: true, slotA: 2, slotB: 15 },
          { label: 'R16-6', isFirstRound: true, slotA: 7, slotB: 10 },
          { label: 'R16-7', isFirstRound: true, slotA: 3, slotB: 14 },
          { label: 'R16-8', isFirstRound: true, slotA: 6, slotB: 11 }
        ]
      },
      {
        roundName: 'Tứ Kết',
        matches: [
          { label: 'QF 1', isFirstRound: false, parentA: 0, parentB: 3 },
          { label: 'QF 2', isFirstRound: false, parentA: 1, parentB: 2 },
          { label: 'QF 3', isFirstRound: false, parentA: 4, parentB: 5 },
          { label: 'QF 4', isFirstRound: false, parentA: 6, parentB: 7 }
        ]
      },
      {
        roundName: 'Bán Kết',
        matches: [
          { label: 'SF 1', isFirstRound: false, parentA: 0, parentB: 1 },
          { label: 'SF 2', isFirstRound: false, parentA: 2, parentB: 3 }
        ]
      },
      {
        roundName: 'Chung Kết',
        matches: [{ label: 'Final', isFirstRound: false, parentA: 0, parentB: 1 }]
      }
    ];
  }

  const getSlotKey = (slotNo: number) => {
    return seedSlots.find((s) => s.slotNo === slotNo)?.sourceKey ?? null;
  };

  const formatKeyToLabel = (key: string | null): string | null => {
    if (!key) return null;
    if (key === '__BYE__') return 'Miễn đấu';
    const match = key.match(/^([A-H])(\d+)$/);
    if (match) {
      return `${key} — Hạng ${match[2]} Bảng ${match[1]}`;
    }
    return key;
  };

  const formatWinnerLabel = (winnerVal: string | null, parentMatch: any): string | null => {
    if (!winnerVal) return null;
    if (winnerVal.startsWith('Thắng ')) {
      return winnerVal;
    }
    return formatKeyToLabel(winnerVal);
  };

  // Instantiate result matches
  const roundsResult: BracketRound[] = roundsTemplate.map((r) => ({
    roundName: r.roundName,
    matches: r.matches.map((m) => ({
      label: m.label,
      slotA: m.slotA ?? 0,
      slotB: m.slotB ?? 0,
      isFirstRound: m.isFirstRound,
      teamALabel: undefined,
      teamBLabel: undefined,
      visible: true,
      winnerLabel: null,
      sourceMatchA: undefined,
      sourceMatchB: undefined
    }))
  }));

  // Assign correct parent indices
  for (let r = 1; r < roundsResult.length; r++) {
    const matches = roundsResult[r].matches;
    const templateMatches = roundsTemplate[r].matches;
    for (let m = 0; m < matches.length; m++) {
      const tm = templateMatches[m];
      if (tm.parentA !== undefined) {
        matches[m].sourceMatchA = { rIdx: r - 1, mIdx: tm.parentA };
      }
      if (tm.parentB !== undefined) {
        matches[m].sourceMatchB = { rIdx: r - 1, mIdx: tm.parentB };
      }
    }
  }

  // Propagate labels & visibility
  for (let r = 0; r < roundsResult.length; r++) {
    const round = roundsResult[r];
    for (let m = 0; m < round.matches.length; m++) {
      const match = round.matches[m];
      if (match.isFirstRound) {
        const keyA = getSlotKey(match.slotA);
        const keyB = getSlotKey(match.slotB);
        
        const hasA = keyA && keyA !== '__BYE__';
        const hasB = keyB && keyB !== '__BYE__';

        if (!hasA && !hasB) {
          match.visible = false;
          match.winnerLabel = null;
        } else if (hasA && !hasB) {
          match.visible = true;
          match.teamALabel = formatKeyToLabel(keyA);
          match.teamBLabel = null;
          match.winnerLabel = keyA;
        } else if (!hasA && hasB) {
          match.visible = true;
          match.teamALabel = null;
          match.teamBLabel = formatKeyToLabel(keyB);
          match.winnerLabel = keyB;
        } else {
          match.visible = true;
          match.teamALabel = formatKeyToLabel(keyA);
          match.teamBLabel = formatKeyToLabel(keyB);
          match.winnerLabel = `Thắng ${match.label}`;
        }
      } else {
        const parentA = roundsResult[match.sourceMatchA!.rIdx].matches[match.sourceMatchA!.mIdx];
        const parentB = roundsResult[match.sourceMatchB!.rIdx].matches[match.sourceMatchB!.mIdx];
        
        const inputA = parentA.winnerLabel;
        const inputB = parentB.winnerLabel;

        const hasA = inputA !== null;
        const hasB = inputB !== null;

        if (!hasA && !hasB) {
          match.visible = false;
          match.winnerLabel = null;
        } else if (hasA && !hasB) {
          match.visible = true;
          match.teamALabel = formatWinnerLabel(inputA, parentA);
          match.teamBLabel = null;
          match.winnerLabel = inputA;
        } else if (!hasA && hasB) {
          match.visible = true;
          match.teamALabel = null;
          match.teamBLabel = formatWinnerLabel(inputB, parentB);
          match.winnerLabel = inputB;
        } else {
          match.visible = true;
          match.teamALabel = formatWinnerLabel(inputA, parentA);
          match.teamBLabel = formatWinnerLabel(inputB, parentB);
          match.winnerLabel = `Thắng ${match.label}`;
        }
      }
    }
  }

  return roundsResult;
}

export function BracketPreview({
  knockoutBracketSize,
  knockoutSeedSlots,
  groupCount,
  advancePerGroup,
  isEditing = false,
  onSeedSlotsChange,
  onBracketSizeChange,
  seedingMethod = 'crossover',
}: BracketPreviewProps) {
  const [draggingSource, setDraggingSource] = useState<string | null>(null);
  const [dragOverMatchLabel, setDragOverMatchLabel] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  // For manual mode, calculate dynamic propagated bracket
  const propagatedRounds = useMemo(() => {
    if (knockoutBracketSize === null) return [];
    return propagateBracket(knockoutBracketSize, knockoutSeedSlots);
  }, [knockoutBracketSize, knockoutSeedSlots]);

  const isAuto = knockoutBracketSize === null;

  // For auto mode, build standard structure
  const autoRounds = useMemo(
    () => buildBracketRounds(knockoutBracketSize, groupCount, advancePerGroup).rounds,
    [knockoutBracketSize, groupCount, advancePerGroup]
  );

  const firstRoundSlotPairs = useMemo((): [number, number][] => {
    if (knockoutBracketSize === 2) return [[1, 2]];
    if (knockoutBracketSize === 4) return [[1, 4], [2, 3]];
    if (knockoutBracketSize === 8) return [[1, 8], [4, 5], [2, 7], [3, 6]];
    if (knockoutBracketSize === 16) return [[1, 16], [4, 13], [5, 12], [8, 9], [2, 15], [7, 10], [3, 14], [6, 11]];
    return [];
  }, [knockoutBracketSize]);

  const rounds = isAuto ? autoRounds : propagatedRounds;

  // Compute available source keys from group config
  const availableSources = useMemo(() => {
    const keys: string[] = [];
    const alphabet = 'ABCDEFGH';
    for (let g = 0; g < groupCount; g++) {
      const groupCode = alphabet[g] || String.fromCharCode(65 + g);
      for (let r = 1; r <= advancePerGroup; r++) {
        keys.push(`${groupCode}${r}`);
      }
    }
    return keys;
  }, [groupCount, advancePerGroup]);

  // Which sources are already placed
  const assignedSources = useMemo(() => {
    const set = new Set<string>();
    for (const slot of knockoutSeedSlots) {
      if (slot.sourceKey && slot.sourceKey !== '__BYE__') {
        set.add(slot.sourceKey);
      }
    }
    return set;
  }, [knockoutSeedSlots]);

  const getSlot = useCallback(
    (slotNo: number): SeedSlot => {
      return knockoutSeedSlots.find((s) => s.slotNo === slotNo) ?? { slotNo, sourceKey: null };
    },
    [knockoutSeedSlots]
  );

  const updateSlot = useCallback(
    (slotNo: number, sourceKey: string | null) => {
      if (!onSeedSlotsChange) return;
      const newSlots = [...knockoutSeedSlots];
      const existingIdx = newSlots.findIndex((s) => s.slotNo === slotNo);
      if (existingIdx >= 0) {
        newSlots[existingIdx] = { slotNo, sourceKey };
      } else {
        newSlots.push({ slotNo, sourceKey });
      }
      onSeedSlotsChange(newSlots);
    },
    [knockoutSeedSlots, onSeedSlotsChange]
  );

  const handleDrop = useCallback(
    (slotNo: number, droppedSource: string) => {
      const normalizedSource = droppedSource === '__BYE__' ? null : droppedSource;

      // Auto-scaling check
      if (knockoutBracketSize && knockoutBracketSize < 16 && normalizedSource) {
        const S = knockoutBracketSize;
        const pair = firstRoundSlotPairs.find((p) => p.includes(slotNo));
        if (pair) {
          const [a, b] = pair; // a < b
          const occupantA = knockoutSeedSlots.find((s) => s.sourceKey && s.slotNo === a)?.sourceKey;
          const occupantB = knockoutSeedSlots.find((s) => s.sourceKey && s.slotNo === b)?.sourceKey;

          if (occupantA && occupantB && normalizedSource !== occupantA && normalizedSource !== occupantB) {
            const nextSize = S * 2;
            const maxQualified = groupCount * advancePerGroup;
            if (nextSize <= maxQualified) {
              const newSlots: SeedSlot[] = Array.from({ length: nextSize }, (_, i) => ({
                slotNo: i + 1,
                sourceKey: null,
              }));

              // Map old slots:
              for (const slot of knockoutSeedSlots) {
                if (slot.sourceKey) {
                  const x = slot.slotNo;
                  if (x <= S / 2) {
                    newSlots[x - 1].sourceKey = slot.sourceKey;
                  } else {
                    newSlots[S + x - 1].sourceKey = slot.sourceKey;
                  }
                }
              }

              // Place dropped team in slot b
              newSlots[b - 1].sourceKey = normalizedSource;

              // If the team was already somewhere else, clear it
              const oldSourceIdx = newSlots.findIndex(
                (s) => s.sourceKey === normalizedSource && s.slotNo !== b
              );
              if (oldSourceIdx >= 0) {
                newSlots[oldSourceIdx].sourceKey = null;
              }

              onBracketSizeChange?.(nextSize);
              onSeedSlotsChange?.(newSlots);
              return;
            } else {
              alert(
                `Không thể nâng quy mô sơ đồ vượt quá số đội tối đa được đi tiếp (${maxQualified} đội).`
              );
              return;
            }
          }
        }
      }

      // If this source is already placed somewhere else, swap or clear
      if (normalizedSource) {
        const existingSlot = knockoutSeedSlots.find((s) => s.sourceKey === normalizedSource);
        if (existingSlot && existingSlot.slotNo !== slotNo) {
          const targetSlot = knockoutSeedSlots.find((s) => s.slotNo === slotNo);
          const newSlots = knockoutSeedSlots.map((s) => {
            if (s.slotNo === existingSlot.slotNo) return { ...s, sourceKey: targetSlot?.sourceKey ?? null };
            if (s.slotNo === slotNo) return { ...s, sourceKey: normalizedSource };
            return s;
          });
          if (!newSlots.find((s) => s.slotNo === slotNo)) {
            newSlots.push({ slotNo, sourceKey: normalizedSource });
          }
          onSeedSlotsChange?.(newSlots);
          return;
        }
      }

      updateSlot(slotNo, normalizedSource);
    },
    [knockoutBracketSize, firstRoundSlotPairs, knockoutSeedSlots, groupCount, advancePerGroup, updateSlot, onSeedSlotsChange, onBracketSizeChange]
  );

  const handleRemoveSlot = useCallback(
    (slotNo: number) => {
      updateSlot(slotNo, null);
    },
    [updateSlot]
  );

  // Static read-only slot display
  const renderStaticSlot = (label: string, isBye = false) => (
    <div
      className={`px-2.5 py-1.5 text-xs ${
        isBye ? 'text-slate-500 italic' : label.startsWith('Thắng') ? 'text-slate-500 italic text-[10px]' : 'text-slate-200 font-semibold'
      }`}
    >
      {label}
    </div>
  );

  const renderStaticMatchNode = (match: BracketMatch, rIdx: number, mIdx: number) => {
    const hasA = isRealTeam(match.teamALabel);
    const hasB = isRealTeam(match.teamBLabel);
    
    // If it's a bye match (exactly 1 team present), render it as a single merged slot
    if ((hasA && !hasB) || (!hasA && hasB)) {
      const activeLabel = hasA ? match.teamALabel : match.teamBLabel;
      return (
        <div
          key={`${rIdx}-${mIdx}`}
          className="w-[210px] bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg hover:border-slate-700 transition-colors"
        >
          <div className="bg-slate-950/40 py-1 px-2.5 border-b border-slate-800/60 flex items-center justify-between">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{rounds[rIdx]?.roundName}</span>
            <span className="text-[9px] font-bold text-slate-400">{match.label}</span>
          </div>
          <div className="p-3 flex flex-col items-center justify-center min-h-[64px] bg-amber-500/[0.02]">
            <span className="text-xs text-slate-200 font-semibold text-center truncate w-full px-2">
              {activeLabel}
            </span>
            <span className="mt-1.5 px-2 py-0.5 text-[9px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded uppercase tracking-wider">
              Miễn đấu
            </span>
          </div>
        </div>
      );
    }

    return (
      <div
        key={`${rIdx}-${mIdx}`}
        className="w-[210px] bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg hover:border-slate-700 transition-colors"
      >
        <div className="bg-slate-950/40 py-1 px-2.5 border-b border-slate-800/60 flex items-center justify-between">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{rounds[rIdx]?.roundName}</span>
          <span className="text-[9px] font-bold text-slate-400">{match.label}</span>
        </div>
        <div className="divide-y divide-slate-800/60">
          {renderStaticSlot(match.teamALabel ?? '— TBD —', match.teamALabel === 'Miễn đấu')}
          {renderStaticSlot(match.teamBLabel ?? '— TBD —', match.teamBLabel === 'Miễn đấu')}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-500" />
        Sơ đồ nhánh đấu Playoffs
        {isEditing && !isAuto && (
          <span className="text-[10px] font-normal text-amber-500/70 normal-case tracking-normal ml-1">
            — Kéo hạt giống từ khay vào các ô trống bên dưới
          </span>
        )}
        {isAuto && (
          <span className="text-[10px] font-normal text-slate-500 normal-case tracking-normal ml-1">
            (Tự động — sơ đồ tự điều chỉnh theo số đội đi tiếp)
          </span>
        )}
      </div>

      {/* Seed source panel */}
      {isEditing && !isAuto && seedingMethod === 'manual' && (
        <SeedSourcePanel
          availableSources={availableSources}
          assignedSources={assignedSources}
          draggingSource={draggingSource}
          onDragStart={setDraggingSource}
          onDragEnd={() => setDraggingSource(null)}
          selectedSource={selectedSource}
          onSelectSource={setSelectedSource}
        />
      )}

      {/* Bracket diagram */}
      <div className="overflow-x-auto p-5 bg-slate-950/40 border border-slate-800/80 rounded-2xl scrollbar-thin">
        {isAuto ? (
          <div className="flex items-start gap-10 min-w-max">
            {rounds.map((round, rIdx) => (
              <div key={rIdx} className="flex flex-col gap-5">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center pb-1 border-b border-slate-800/40">
                  {round.roundName}
                </div>

                <div
                  className="flex flex-col gap-4 justify-center"
                  style={{ minHeight: `${Math.max(round.matches.length * 80, 80)}px` }}
                >
                  {round.matches.map((match, mIdx) => renderStaticMatchNode(match, rIdx, mIdx))}
                </div>
              </div>
            ))}
          </div>
        ) : (() => {
          const CELL_HEIGHT = 120; // height for a single cell in the first round
          const size = knockoutBracketSize || 2;
          const totalHeight = (size / 2) * CELL_HEIGHT;

          return (
            <div className="flex items-start min-w-max" style={{ height: `${totalHeight + 40}px` }}>
              {rounds.map((round, rIdx) => {
                const isLastRound = rIdx === rounds.length - 1;
                const roundCellHeight = CELL_HEIGHT * Math.pow(2, rIdx);
                const nextRoundCellHeight = CELL_HEIGHT * Math.pow(2, rIdx + 1);

                return (
                  <div key={rIdx} className="flex items-start">
                    {/* Round Column wrapper */}
                    <div className="flex flex-col gap-5">
                      {/* Round header */}
                      <div
                        className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center pb-1 border-b border-slate-800/40"
                        style={{ width: '210px' }}
                      >
                        {round.roundName}
                      </div>

                      {/* Matches Stack */}
                      <div className="flex flex-col" style={{ width: '210px', height: `${totalHeight}px` }}>
                        {round.matches.map((match, mIdx) => {
                          const isFirst = match.isFirstRound;
                          
                          // Determine if this match card should be visible
                          // In edit mode, we show all matches so the user can drag and drop seeds.
                          // In read-only mode, we hide completely empty matches.
                          const isMatchVisible = isEditing || match.visible;

                          return (
                            <div
                              key={mIdx}
                              className="flex items-center justify-center"
                              style={{ height: `${roundCellHeight}px` }}
                            >
                              <div className={isMatchVisible ? "" : "opacity-0 pointer-events-none"}>
                                {isFirst ? (() => {
                                  const slotA = getSlot(match.slotA);
                                  const slotB = getSlot(match.slotB);
                                  const isOver = dragOverMatchLabel === match.label;

                                  return (
                                    <BracketMatchNode
                                      label={match.label}
                                      roundName={round.roundName}
                                      slotA={{ slotNo: match.slotA, sourceKey: slotA.sourceKey }}
                                      slotB={{ slotNo: match.slotB, sourceKey: slotB.sourceKey }}
                                      isEditing={isEditing && seedingMethod === 'manual'}
                                      isDragOver={isOver}
                                      draggingSource={draggingSource}
                                      selectedSource={selectedSource}
                                      onDragOverSlot={() => setDragOverMatchLabel(match.label)}
                                      onDragLeaveSlot={() => setDragOverMatchLabel(null)}
                                      onDropSlot={(slotNo, src) => {
                                        handleDrop(slotNo, src);
                                        setSelectedSource(null);
                                      }}
                                      onRemoveSlot={handleRemoveSlot}
                                    />
                                  );
                                })() : (
                                  renderStaticMatchNode(match, rIdx, mIdx)
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Connector Column */}
                    {!isLastRound && (
                      <div className="flex flex-col gap-5">
                        {/* Header spacer */}
                        <div className="h-[21px] border-b border-transparent" style={{ width: '40px' }} />

                        {/* Connectors Stack */}
                        <div className="flex flex-col" style={{ width: '40px', height: `${totalHeight}px` }}>
                          {Array.from({ length: round.matches.length / 2 }).map((_, cIdx) => {
                            const parentA = round.matches[2 * cIdx];
                            const parentB = round.matches[2 * cIdx + 1];
                            const showA = isEditing || parentA.visible;
                            const showB = isEditing || parentB.visible;

                            return (
                              <div
                                key={cIdx}
                                className="relative"
                                style={{ height: `${nextRoundCellHeight}px` }}
                              >
                                {/* Top horizontal left line */}
                                {showA && (
                                  <div className="absolute left-0 w-1/2 top-[25%] border-t border-slate-700/60" />
                                )}
                                {/* Bottom horizontal left line */}
                                {showB && (
                                  <div className="absolute left-0 w-1/2 top-[75%] border-t border-slate-700/60" />
                                )}
                                {/* Vertical line connecting them */}
                                {showA && showB && (
                                  <div className="absolute left-1/2 top-[25%] h-[50%] border-l border-slate-700/60" />
                                )}
                                {showA && !showB && (
                                  <div className="absolute left-1/2 top-[25%] h-[25%] border-l border-slate-700/60" />
                                )}
                                {!showA && showB && (
                                  <div className="absolute left-1/2 top-[50%] h-[25%] border-l border-slate-700/60" />
                                )}
                                {/* Output horizontal right line */}
                                {(showA || showB) && (
                                  <div className="absolute right-0 w-1/2 top-[50%] border-t border-slate-700/60" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
