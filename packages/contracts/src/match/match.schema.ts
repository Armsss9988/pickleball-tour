import { z } from 'zod';
import { MatchStatusEnum } from '../enums';

export const MatchResponseSchema = z.object({
  id: z.string().uuid(),
  tournamentId: z.string().uuid(),
  stageId: z.string().uuid(),
  groupId: z.string().uuid().nullable(),
  roundNo: z.number().int().nullable(),
  matchNo: z.number().int().nullable(),
  label: z.string().nullable(),
  teamAId: z.string().uuid().nullable(),
  teamBId: z.string().uuid().nullable(),
  status: MatchStatusEnum,
  winnerTeamId: z.string().uuid().nullable(),
  scheduledTime: z.string().datetime().nullable(),
  courtName: z.string().nullable(),
});
export type MatchResponse = z.infer<typeof MatchResponseSchema>;

export const SubmitLineupSchema = z.object({
  segmentId: z.string().uuid(),
  playerIds: z.array(z.string().uuid()),
});
export type SubmitLineupDto = z.infer<typeof SubmitLineupSchema>;
