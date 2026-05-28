import { z } from 'zod';

export const AddScoreSchema = z.object({
  teamId: z.string().uuid(),
});
export type AddScoreDto = z.infer<typeof AddScoreSchema>;

export const ScoreEventResponseSchema = z.object({
  id: z.string().uuid(),
  matchId: z.string().uuid(),
  segmentId: z.string().uuid(),
  scoringTeamId: z.string().uuid(),
  scoreAAfter: z.number().int(),
  scoreBAfter: z.number().int(),
  eventNo: z.number().int(),
  isUndone: z.boolean(),
  createdAt: z.string().datetime(),
});
export type ScoreEventResponse = z.infer<typeof ScoreEventResponseSchema>;

export const LiveScoreSchema = z.object({
  matchId: z.string().uuid(),
  scoreA: z.number().int(),
  scoreB: z.number().int(),
  currentSegmentId: z.string().uuid().nullable(),
  currentSegmentName: z.string().nullable(),
  status: z.string(),
});
export type LiveScore = z.infer<typeof LiveScoreSchema>;
