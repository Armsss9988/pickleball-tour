import { z } from 'zod';
import { GenderEnum, MatchFormatEnum, EventTypeEnum, CompetitionFormatEnum } from '../enums';

export const SegmentDefinitionSchema = z.object({
  segmentKey: z.string().min(1),
  name: z.string().min(1),
  targetScore: z.number().int().positive(),
  playerCount: z.number().int().positive(),
  genderRule: z.enum(['mixed', 'male_only', 'female_only', 'any']),
  orderIndex: z.number().int().min(0),
  isDrawable: z.boolean().default(true),
});
export type SegmentDefinitionDto = z.infer<typeof SegmentDefinitionSchema>;

export const TeamCompositionRuleSchema = z.object({
  teamSize: z.number().int().positive(),
  maleCount: z.number().int().min(0),
  femaleCount: z.number().int().min(0),
  allMustPlay: z.boolean().default(true),
});
export type TeamCompositionRuleDto = z.infer<typeof TeamCompositionRuleSchema>;

export const PlayerLimitRuleSchema = z.object({
  gender: GenderEnum,
  minSegments: z.number().int().min(0),
  maxSegments: z.number().int().positive(),
});
export type PlayerLimitRuleDto = z.infer<typeof PlayerLimitRuleSchema>;

export const OverlapRuleSchema = z.object({
  segmentAKey: z.string().min(1),
  segmentBKey: z.string().min(1),
  gender: GenderEnum,
  isForbidden: z.boolean().default(true),
});
export type OverlapRuleDto = z.infer<typeof OverlapRuleSchema>;

export const ScoringConfigSchema = z.object({
  winScore: z.number().int().positive(),
  noDeuce: z.boolean().default(true),
  sideSwitchAfterSegments: z.number().int().min(0).default(0),
  pointsForWin: z.number().int().min(0).default(3),
  pointsForLoss: z.number().int().min(0).default(0),
  gamePointScore: z.number().int().positive().optional().nullable(),
  setsToWin: z.number().int().positive().default(2),
  lastSetPointScore: z.number().int().positive().optional().nullable(),
  deuceMaxScore: z.number().int().positive().optional().nullable(),
});
export type ScoringConfigDto = z.infer<typeof ScoringConfigSchema>;

/**
 * Schema dùng để tạo hoặc cập nhật ruleset.
 *
 * Constraints:
 * - matchFormat='relay' chỉ hợp lệ với eventType='TEAM_EVENT'
 * - eventType='SINGLES' → teamComposition.teamSize phải = 1
 * - eventType='DOUBLES' → teamComposition.teamSize phải = 2
 * - teamComposition optional khi SINGLES/DOUBLES (auto-derived)
 */
export const CreateRulesetSchema = z.object({
  name: z.string().min(1).max(200),
  sport: z.string().default('pickleball'),
  isTemplate: z.boolean().default(false),
  matchFormat: MatchFormatEnum.default('relay'),
  eventType: EventTypeEnum.default('TEAM_EVENT'),
  competitionFormat: CompetitionFormatEnum.default('GROUP_STAGE_KNOCKOUT'),
  requireCourtConfig: z.boolean().default(true),
  requireScheduleConfig: z.boolean().default(true),
  groupCount: z.number().int().min(1).max(8).default(2),
  advancePerGroup: z.number().int().min(1).max(8).default(1),
  segments: z.array(SegmentDefinitionSchema).default([]),
  // teamComposition optional — auto-set for SINGLES (1) / DOUBLES (2)
  teamComposition: TeamCompositionRuleSchema.optional(),
  playerLimits: z.array(PlayerLimitRuleSchema).default([]),
  overlapRules: z.array(OverlapRuleSchema).default([]),
  scoringConfig: ScoringConfigSchema,
}).refine(
  (data) => {
    // relay chỉ hợp lệ với TEAM_EVENT
    if (data.matchFormat === 'relay' && data.eventType !== 'TEAM_EVENT') {
      return false;
    }
    return true;
  },
  { message: "Thể thức 'Tiếp sức' chỉ dùng được với giải Đồng đội (TEAM_EVENT)" }
).refine(
  (data) => {
    // TEAM_EVENT phải có teamComposition
    if (data.eventType === 'TEAM_EVENT' && !data.teamComposition) {
      return false;
    }
    return true;
  },
  { message: "Giải đồng đội (TEAM_EVENT) phải có cấu hình thành phần đội (teamComposition)" }
);

export type CreateRulesetDto = z.infer<typeof CreateRulesetSchema>;
