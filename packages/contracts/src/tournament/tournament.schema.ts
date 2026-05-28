import { z } from 'zod';
import { TournamentStatusEnum } from '../enums';

export const CreateTournamentSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  venueName: z.string().optional(),
  openingTime: z.string().datetime().optional(),
  registrationDeadline: z.string().datetime().optional(),
  publicEnabled: z.boolean().default(false),
});
export type CreateTournamentDto = z.infer<typeof CreateTournamentSchema>;

export const UpdateTournamentSchema = CreateTournamentSchema.partial();
export type UpdateTournamentDto = z.infer<typeof UpdateTournamentSchema>;

export const TournamentResponseSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  venueName: z.string().nullable(),
  openingTime: z.string().datetime().nullable(),
  registrationDeadline: z.string().datetime().nullable(),
  status: TournamentStatusEnum,
  publicEnabled: z.boolean(),
  rulesetId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TournamentResponse = z.infer<typeof TournamentResponseSchema>;
