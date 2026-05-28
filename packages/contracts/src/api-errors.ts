import { z } from 'zod';

export const ApiErrorSchema = z.object({
  statusCode: z.number(),
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

// Standard error codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  INVALID_STATE: 'INVALID_STATE',
  TOURNAMENT_LOCKED: 'TOURNAMENT_LOCKED',
  LINEUP_INVALID: 'LINEUP_INVALID',
  MATCH_COMPLETED: 'MATCH_COMPLETED',
  SCORE_UNDO_FAILED: 'SCORE_UNDO_FAILED',
} as const;
