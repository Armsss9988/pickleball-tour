import { z } from 'zod';

export const TeamResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  captainPlayerId: z.string().uuid().nullable(),
  seedNo: z.number().int().nullable(),
  members: z.array(z.object({
    id: z.string().uuid(),
    playerId: z.string().uuid(),
    playerName: z.string(),
    gender: z.string(),
    role: z.string(),
  })),
});
export type TeamResponse = z.infer<typeof TeamResponseSchema>;

export const TeamDrawRequestSchema = z.object({
  randomSeed: z.string().optional(),
});
export type TeamDrawRequestDto = z.infer<typeof TeamDrawRequestSchema>;
