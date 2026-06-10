'use client';

import { Target, Users, Lock, Trophy, Layers } from '@/components/icons';
import { MatchFormat, EventType, CompetitionFormat } from '@golab/contracts';

const EVENT_TYPE_LABEL: Record<EventType, string> = {
  TEAM_EVENT: 'Giải Đồng đội',
  DOUBLES: 'Giải Đôi',
  SINGLES: 'Giải Đơn',
};

const COMPETITION_FORMAT_LABEL: Record<CompetitionFormat, string> = {
  GROUP_STAGE_KNOCKOUT: 'Vòng bảng → Knockout',
  ROUND_ROBIN: 'Vòng tròn',
  KNOCKOUT: 'Loại trực tiếp',
  SWISS: 'Hệ Thụy Sĩ',
};

interface RulesetViewProps {
  name: string;
  matchFormat: MatchFormat;
  eventType?: EventType;
  competitionFormat?: CompetitionFormat;
  teamComposition?: {
    teamSize: number;
    maleCount: number;
    femaleCount: number;
    allMustPlay: boolean;
  };
  scoringConfig: {
    winScore: number;
    gamePointScore?: number | null;
    setsToWin?: number | null;
    lastSetPointScore?: number | null;
    noDeuce: boolean;
    deuceMaxScore?: number | null;
  };
  segments: any[];
  overlapRules: any[];
  requireCourtConfig?: boolean;
  requireScheduleConfig?: boolean;
}

export function RulesetView({
  name,
  matchFormat = 'relay',
  eventType = 'TEAM_EVENT',
  competitionFormat = 'GROUP_STAGE_KNOCKOUT',
  teamComposition,
  scoringConfig,
  segments = [],
  overlapRules = [],
  requireCourtConfig = true,
  requireScheduleConfig = true,
}: RulesetViewProps) {
  const isStrict = (teamComposition?.maleCount ?? 0) > 0 || (teamComposition?.femaleCount ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 0: EventType + CompetitionFormat */}
        <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
            <Layers className="w-4 h-4 text-purple-400" />
            Loại nội dung
          </div>
          <div>
            <div className="text-sm font-bold text-slate-200">{EVENT_TYPE_LABEL[eventType]}</div>
            <div className="text-xs text-slate-400 mt-1">{COMPETITION_FORMAT_LABEL[competitionFormat]}</div>
          </div>
        </div>

        {/* Card 1: Score & Format */}
        <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
            <Target className="w-4 h-4 text-sky-400" />
            Thể thức & Điểm Số
          </div>
          <div>
            <div className="text-base font-bold text-slate-200">
              {matchFormat === 'relay' && `Tiếp Sức: Chặng cuối chạm ${scoringConfig.winScore}đ`}
              {matchFormat === 'single_game' && `Trận Đơn: Đánh 1 set chạm ${scoringConfig.winScore}đ`}
              {matchFormat === 'best_of' && (
                `Best of Sets: BO${(scoringConfig.setsToWin || 2) * 2 - 1} (Thắng ${scoringConfig.setsToWin || 2} sets)`
              )}
            </div>
            {matchFormat === 'best_of' && (
              <div className="text-xs text-slate-400 mt-1">
                Điểm chạm set đấu: {scoringConfig.gamePointScore}đ 
                {scoringConfig.lastSetPointScore ? ` (Set cuối chạm ${scoringConfig.lastSetPointScore}đ)` : ''}
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Team Roster size */}
        {teamComposition ? (
        <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
            <Users className="w-4 h-4 text-emerald-400" />
            Quy Mô Đội Hình tuyển
          </div>
          <div className="text-base font-bold text-slate-200">
            {isStrict ? (
              `Quy mô: ${teamComposition.teamSize} VĐV (${teamComposition.maleCount} Nam, ${teamComposition.femaleCount} Nữ)`
            ) : (
              `Quy mô: ${teamComposition.teamSize} VĐV (Tự do giới tính)`
            )}
          </div>
          <div className="text-xs text-slate-550 border-t border-slate-800/60 pt-2">
            {teamComposition.allMustPlay 
              ? 'Mọi thành viên đăng ký trong đội bắt buộc phải thi đấu ít nhất 1 lần.' 
              : 'Không bắt buộc tất cả thành viên ra sân.'}
          </div>
        </div>
        ) : (
        <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
            <Users className="w-4 h-4 text-emerald-400" />
            Entry
          </div>
          <div className="text-sm font-bold text-slate-300">
            {eventType === 'SINGLES' ? '1 VĐV/entry' : '2 VĐV/entry (cặp đôi)'}
          </div>
          <div className="text-xs text-slate-550 border-t border-slate-800/60 pt-2">
            Đăng ký trực tiếp, không cần bốc thăm đội.
          </div>
        </div>
        )}
      </div>

      {/* Flexibility settings view */}
      <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3">
        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-550" />
          Yêu cầu cấu hình vận hành
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${requireCourtConfig ? 'bg-emerald-500' : 'bg-slate-650'}`} />
            <span className="text-slate-300 font-medium">
              Cấu hình sân đấu: {requireCourtConfig ? 'Bắt buộc (Kiểm tra gán sân & xung đột)' : 'Linh hoạt (Bỏ qua kiểm tra gán sân)'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${requireScheduleConfig ? 'bg-emerald-500' : 'bg-slate-650'}`} />
            <span className="text-slate-300 font-medium">
              Xếp giờ lịch thi đấu: {requireScheduleConfig ? 'Bắt buộc (Kiểm tra gán giờ)' : 'Linh hoạt (Bỏ qua kiểm tra gán giờ)'}
            </span>
          </div>
        </div>
      </div>

      {/* Format-specific details */}
      {matchFormat === 'relay' ? (
        <>
          {/* Segments list */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Các Chặng Thi Đấu Tiếp Sức ({segments.length} chặng)
            </span>
            <div className="flex flex-col gap-2.5">
              {segments.map((segment, idx: number) => (
                <div
                  key={segment.segmentKey || idx}
                  className="flex items-center justify-between p-4 bg-slate-905/40 border border-slate-800/80 rounded-xl hover:border-slate-700/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-[11px] font-bold text-slate-300 flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-semibold text-slate-200">{segment.name}</span>
                      <span className="text-[10px] text-slate-500 ml-2 font-mono bg-slate-850 px-1.5 py-0.5 rounded border border-slate-800">
                        {segment.segmentKey}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-2 bg-slate-800 px-1.5 py-0.5 rounded">
                        {segment.playerCount ?? 2} VĐV · Giới tính:{' '}
                        {segment.genderRule === 'mixed' && 'Đôi Nam Nữ'}
                        {segment.genderRule === 'male_only' && 'Chỉ Nam'}
                        {segment.genderRule === 'female_only' && 'Chỉ Nữ'}
                        {segment.genderRule === 'any' && 'Tự do'}
                      </span>
                      <span className={`text-[10px] ml-2 px-1.5 py-0.5 rounded font-medium ${segment.isDrawable !== false ? 'bg-sky-500/10 text-sky-450 border border-sky-500/20' : 'bg-slate-800/80 text-slate-500 border border-slate-800'}`}>
                        {segment.isDrawable !== false ? '🎲 Bốc thăm' : '🔒 Cố định'}
                      </span>
                    </div>
                  </div>
                  <div className="font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 text-xs">
                    Target chạm: {segment.targetScore}đ
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Overlap rules */}
          {overlapRules && overlapRules.length > 0 && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Quy Tắc Cấm Trùng Chặng
              </span>
              <div className="flex flex-col gap-2">
                {overlapRules.map((rule: any, idx: number) => {
                  const segA = segments.find((s) => s.segmentKey === rule.segmentAKey)?.name || rule.segmentAKey;
                  const segB = segments.find((s) => s.segmentKey === rule.segmentBKey)?.name || rule.segmentBKey;
                  return (
                    <div
                      key={idx}
                      className="p-3 bg-slate-900/20 border border-slate-800 rounded-xl text-xs text-slate-300 font-medium"
                    >
                      • Cấm VĐV{' '}
                      <span className="text-amber-400 font-bold">
                        {rule.gender === 'MALE' ? 'Nam' : 'Nữ'}
                      </span>{' '}
                      thi đấu đồng thời ở cả hai chặng <span className="font-semibold text-slate-200">{segA}</span>{' '}
                      và <span className="font-semibold text-slate-200">{segB}</span>.
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Standard / Best of View */
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-455 uppercase tracking-wider">
            <Trophy className="w-4 h-4 text-amber-500" />
            Chi Tiết Thi Đấu Đơn / Đôi
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Hệ thống tự động sinh 1 set đấu duy nhất (đối với Trận Đơn) hoặc tối đa {((scoringConfig.setsToWin || 2) * 2 - 1)} set đấu (BO3/BO5 đối với Best-of Sets) khi xếp lịch thi đấu. Đội hình tham gia trận đấu sẽ được huấn luyện viên xác nhận trước giờ ra sân.
          </p>
        </div>
      )}
    </div>
  );
}
