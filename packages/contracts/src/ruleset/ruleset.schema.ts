import { z } from 'zod';
import { GenderEnum } from '../enums';

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
});
export type ScoringConfigDto = z.infer<typeof ScoringConfigSchema>;

export const CreateRulesetSchema = z.object({
  name: z.string().min(1).max(200),
  sport: z.string().default('pickleball'),
  isTemplate: z.boolean().default(false),
  segments: z.array(SegmentDefinitionSchema).min(1),
  teamComposition: TeamCompositionRuleSchema,
  playerLimits: z.array(PlayerLimitRuleSchema),
  overlapRules: z.array(OverlapRuleSchema).default([]),
  scoringConfig: ScoringConfigSchema,
});
export type CreateRulesetDto = z.infer<typeof CreateRulesetSchema>;
