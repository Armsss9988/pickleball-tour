'use client';

import { Trophy } from '@/components/icons';

interface PreviewMatch {
  label: string;
  teamA: string;
  teamB: string;
}

interface BracketPreviewProps {
  knockoutBracketSize: number | null;
  knockoutSeedSlots: { slotNo: number; sourceKey: string | null }[];
  groupCount: number;
  advancePerGroup: number;
}

export function BracketPreview({
  knockoutBracketSize,
  knockoutSeedSlots,
  groupCount,
  advancePerGroup,
}: BracketPreviewProps) {
  const getBracketPreviewRounds = (): { roundName: string; matches: PreviewMatch[] }[] => {
    const isManual = knockoutBracketSize !== null;

    const formatSource = (src: string | null | undefined): string => {
      if (!src || src === 'Bye' || src === 'Miễn đấu') return 'Miễn đấu';
      return src;
    };

    if (isManual) {
      const size = knockoutBracketSize;
      const slotSource = (slotNo: number) => {
        const slot = knockoutSeedSlots.find((s) => s.slotNo === slotNo);
        return formatSource(slot?.sourceKey);
      };

      if (size === 4) {
        return [
          {
            roundName: 'Bán Kết',
            matches: [
              { label: 'SF 1', teamA: slotSource(1), teamB: slotSource(4) },
              { label: 'SF 2', teamA: slotSource(2), teamB: slotSource(3) },
            ],
          },
          {
            roundName: 'Chung Kết',
            matches: [
              { label: 'Final', teamA: 'Thắng SF 1', teamB: 'Thắng SF 2' },
            ],
          },
        ];
      }

      if (size === 8) {
        return [
          {
            roundName: 'Tứ Kết',
            matches: [
              { label: 'QF 1', teamA: slotSource(1), teamB: slotSource(8) },
              { label: 'QF 2', teamA: slotSource(4), teamB: slotSource(5) },
              { label: 'QF 3', teamA: slotSource(2), teamB: slotSource(7) },
              { label: 'QF 4', teamA: slotSource(3), teamB: slotSource(6) },
            ],
          },
          {
            roundName: 'Bán Kết',
            matches: [
              { label: 'SF 1', teamA: 'Thắng QF 1', teamB: 'Thắng QF 2' },
              { label: 'SF 2', teamA: 'Thắng QF 3', teamB: 'Thắng QF 4' },
            ],
          },
          {
            roundName: 'Chung Kết',
            matches: [
              { label: 'Final', teamA: 'Thắng SF 1', teamB: 'Thắng SF 2' },
            ],
          },
        ];
      }

      // size === 16
      return [
        {
          roundName: 'Vòng 1/8',
          matches: [
            { label: 'R16-1', teamA: slotSource(1), teamB: slotSource(16) },
            { label: 'R16-2', teamA: slotSource(4), teamB: slotSource(13) },
            { label: 'R16-3', teamA: slotSource(5), teamB: slotSource(12) },
            { label: 'R16-4', teamA: slotSource(8), teamB: slotSource(9) },
            { label: 'R16-5', teamA: slotSource(2), teamB: slotSource(15) },
            { label: 'R16-6', teamA: slotSource(7), teamB: slotSource(10) },
            { label: 'R16-7', teamA: slotSource(3), teamB: slotSource(14) },
            { label: 'R16-8', teamA: slotSource(6), teamB: slotSource(11) },
          ],
        },
        {
          roundName: 'Tứ Kết',
          matches: [
            { label: 'QF 1', teamA: 'Thắng R16-1', teamB: 'Thắng R16-4' },
            { label: 'QF 2', teamA: 'Thắng R16-2', teamB: 'Thắng R16-3' },
            { label: 'QF 3', teamA: 'Thắng R16-5', teamB: 'Thắng R16-6' },
            { label: 'QF 4', teamA: 'Thắng R16-7', teamB: 'Thắng R16-8' },
          ],
        },
        {
          roundName: 'Bán Kết',
          matches: [
            { label: 'SF 1', teamA: 'Thắng QF 1', teamB: 'Thắng QF 2' },
            { label: 'SF 2', teamA: 'Thắng QF 3', teamB: 'Thắng QF 4' },
          ],
        },
        {
          roundName: 'Chung Kết',
          matches: [
            { label: 'Final', teamA: 'Thắng SF 1', teamB: 'Thắng SF 2' },
          ],
        },
      ];
    } else {
      // Tự động (Automatic)
      const totalQualified = groupCount * advancePerGroup;

      if (totalQualified === 4) {
        let sf1_a = 'A1', sf1_b = 'B2', sf2_a = 'B1', sf2_b = 'A2';
        if (groupCount === 4) {
          sf1_a = 'A1'; sf1_b = 'B1'; sf2_a = 'C1'; sf2_b = 'D1';
        } else if (groupCount === 1) {
          sf1_a = 'T1'; sf1_b = 'T4'; sf2_a = 'T2'; sf2_b = 'T3';
        }
        return [
          {
            roundName: 'Bán Kết',
            matches: [
              { label: 'SF 1', teamA: sf1_a, teamB: sf1_b },
              { label: 'SF 2', teamA: sf2_a, teamB: sf2_b },
            ],
          },
          {
            roundName: 'Chung Kết',
            matches: [
              { label: 'Final', teamA: 'Thắng SF 1', teamB: 'Thắng SF 2' },
            ],
          },
        ];
      }

      if (totalQualified === 6 && groupCount === 2) {
        return [
          {
            roundName: 'Vòng Nhánh',
            matches: [
              { label: 'P 1', teamA: 'A2', teamB: 'B3' },
              { label: 'P 2', teamA: 'B2', teamB: 'A3' },
            ],
          },
          {
            roundName: 'Bán Kết',
            matches: [
              { label: 'SF 1', teamA: 'A1', teamB: 'Thắng P 2' },
              { label: 'SF 2', teamA: 'B1', teamB: 'Thắng P 1' },
            ],
          },
          {
            roundName: 'Chung Kết',
            matches: [
              { label: 'Final', teamA: 'Thắng SF 1', teamB: 'Thắng SF 2' },
            ],
          },
        ];
      }

      // Default fallback or totalQualified === 8
      let qf1_a = 'A1', qf1_b = 'B4', qf2_a = 'B2', qf2_b = 'A3', qf3_a = 'B1', qf3_b = 'A4', qf4_a = 'A2', qf4_b = 'B3';
      if (groupCount === 4) {
        qf1_a = 'A1'; qf1_b = 'B2'; qf2_a = 'C1'; qf2_b = 'D2'; qf3_a = 'B1'; qf3_b = 'A2'; qf4_a = 'D1'; qf4_b = 'C2';
      } else if (groupCount === 1) {
        qf1_a = 'T1'; qf1_b = 'T8'; qf2_a = 'T4'; qf2_b = 'T5'; qf3_a = 'T2'; qf3_b = 'T7'; qf4_a = 'T3'; qf4_b = 'T6';
      }

      return [
        {
          roundName: 'Tứ Kết',
          matches: [
            { label: 'QF 1', teamA: qf1_a, teamB: qf1_b },
            { label: 'QF 2', teamA: qf2_a, teamB: qf2_b },
            { label: 'QF 3', teamA: qf3_a, teamB: qf3_b },
            { label: 'QF 4', teamA: qf4_a, teamB: qf4_b },
          ],
        },
        {
          roundName: 'Bán Kết',
          matches: [
            { label: 'SF 1', teamA: 'Thắng QF 1', teamB: 'Thắng QF 2' },
            { label: 'SF 2', teamA: 'Thắng QF 3', teamB: 'Thắng QF 4' },
          ],
        },
        {
          roundName: 'Chung Kết',
          matches: [
            { label: 'Final', teamA: 'Thắng SF 1', teamB: 'Thắng SF 2' },
          ],
        },
      ];
    }
  };

  const previewRounds = getBracketPreviewRounds();

  return (
    <div className="space-y-3 mt-4">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-500" />
        Sơ đồ nhánh đấu Playoffs (Xem trước)
      </div>
      <div className="overflow-x-auto p-6 bg-slate-950/40 border border-slate-800/80 rounded-2xl flex items-center justify-start gap-10 min-w-full scrollbar-thin">
        {previewRounds.map((round, rIdx) => (
          <div key={rIdx} className="flex flex-col justify-around min-h-[280px] space-y-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">
              {round.roundName}
            </div>
            <div className="flex flex-col justify-center space-y-4">
              {round.matches.map((match, mIdx) => (
                <div
                  key={mIdx}
                  className="w-[180px] bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg hover:border-slate-700 transition-colors"
                >
                  <div className="bg-slate-950/40 py-1 px-2 border-b border-slate-800/60 text-[9px] font-bold text-slate-450 uppercase tracking-wider">
                    {round.roundName} - {match.label}
                  </div>
                  <div className="divide-y divide-slate-800/60 text-xs">
                    <div
                      className={`px-2.5 py-1.5 flex items-center justify-between ${
                        match.teamA === 'Miễn đấu'
                          ? 'text-slate-500 italic'
                          : 'text-slate-200 font-semibold'
                      }`}
                    >
                      <span>{match.teamA}</span>
                    </div>
                    <div
                      className={`px-2.5 py-1.5 flex items-center justify-between ${
                        match.teamB === 'Miễn đấu'
                          ? 'text-slate-500 italic'
                          : 'text-slate-200 font-semibold'
                      }`}
                    >
                      <span>{match.teamB}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
