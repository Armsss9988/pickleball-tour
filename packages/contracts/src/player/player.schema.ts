import { z } from 'zod';
import { GenderEnum } from '../enums';

export const CreatePlayerSchema = z.object({
  fullName: z.string().min(1).max(200),
  gender: GenderEnum,
  phone: z.string().optional(),
  note: z.string().optional(),
});
export type CreatePlayerDto = z.infer<typeof CreatePlayerSchema>;

export const BulkImportPlayerSchema = z.object({
  players: z.array(CreatePlayerSchema).min(1),
});
export type BulkImportPlayerDto = z.infer<typeof BulkImportPlayerSchema>;

export const PlayerResponseSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  gender: GenderEnum,
  phone: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type PlayerResponse = z.infer<typeof PlayerResponseSchema>;
