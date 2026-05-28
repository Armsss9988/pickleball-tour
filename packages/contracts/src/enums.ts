import { z } from 'zod';

export const UserStatusEnum = z.enum(['ACTIVE', 'DISABLED', 'PENDING']);
export type UserStatus = z.infer<typeof UserStatusEnum>;

export const GenderEnum = z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']);
export type Gender = z.infer<typeof GenderEnum>;

export const ClaimStatusEnum = z.enum(['UNCLAIMED', 'CLAIMED', 'PENDING_CLAIM']);
export type ClaimStatus = z.infer<typeof ClaimStatusEnum>;

export const RegistrationStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN']);
export type RegistrationStatus = z.infer<typeof RegistrationStatusEnum>;

export const RegistrationSourceEnum = z.enum(['ADMIN_IMPORT', 'MANUAL_ADMIN', 'SELF_REGISTER']);
export type RegistrationSource = z.infer<typeof RegistrationSourceEnum>;

export const TournamentStatusEnum = z.enum([
  'DRAFT', 'PLAYER_IMPORT', 'PLAYERS_READY', 'TEAM_DRAW_COMPLETED',
  'GROUP_ASSIGNED', 'SCHEDULE_GENERATED', 'RUNNING', 'GROUP_COMPLETED',
  'KNOCKOUT_GENERATED', 'KNOCKOUT_RUNNING', 'COMPLETED', 'PUBLISHED',
]);
export type TournamentStatus = z.infer<typeof TournamentStatusEnum>;

export const TeamMemberRoleEnum = z.enum(['CAPTAIN', 'MEMBER']);
export type TeamMemberRole = z.infer<typeof TeamMemberRoleEnum>;

export const DrawStatusEnum = z.enum(['PREVIEW', 'CONFIRMED', 'CANCELLED']);
export type DrawStatus = z.infer<typeof DrawStatusEnum>;

export const StageTypeEnum = z.enum(['GROUP', 'PLAYOFF', 'SEMIFINAL', 'FINAL', 'THIRD_PLACE', 'CUSTOM']);
export type StageType = z.infer<typeof StageTypeEnum>;

export const MatchStatusEnum = z.enum([
  'SCHEDULED', 'LINEUP_PENDING', 'LINEUP_READY', 'READY',
  'RUNNING', 'SEGMENT_BREAK', 'COMPLETED', 'RESULT_CONFIRMED', 'CANCELLED',
]);
export type MatchStatus = z.infer<typeof MatchStatusEnum>;

export const SegmentStatusEnum = z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'SKIPPED']);
export type SegmentStatus = z.infer<typeof SegmentStatusEnum>;

export const LineupStatusEnum = z.enum(['DRAFT', 'SUBMITTED', 'VALID', 'INVALID', 'LOCKED']);
export type LineupStatus = z.infer<typeof LineupStatusEnum>;
