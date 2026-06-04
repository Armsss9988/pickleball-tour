import { TournamentStatus } from '@golab/contracts';

export type TournamentPhase =
  | 'DRAFT'
  | 'PUBLISHED_BEFORE_START'
  | 'PUBLISHED_NOT_READY'
  | 'PUBLISHED_RUNNING';

export function getEffectivePhase(
  status: TournamentStatus,
  openingTime: Date | null | undefined,
  isOperationallyReady: boolean,
  now: Date = new Date()
): TournamentPhase {
  if (status !== 'PUBLISHED') return 'DRAFT';
  if (!openingTime || now < openingTime) return 'PUBLISHED_BEFORE_START';
  return isOperationallyReady ? 'PUBLISHED_RUNNING' : 'PUBLISHED_NOT_READY';
}

export function canEditRuleset(phase: TournamentPhase, hasScoredMatches: boolean): boolean {
  // Ruleset chỉ khóa khi ở phase PUBLISHED_RUNNING và thực sự đã có trận nào ghi điểm
  return !(phase === 'PUBLISHED_RUNNING' && hasScoredMatches);
}

export function canUnpublish(phase: TournamentPhase): boolean {
  return phase === 'PUBLISHED_BEFORE_START';
}

export function isRulesetLocked(phase: TournamentPhase, hasScoredMatches: boolean): boolean {
  return phase === 'PUBLISHED_RUNNING' && hasScoredMatches;
}

export function isScoringAllowed(phase: TournamentPhase): boolean {
  return phase === 'PUBLISHED_RUNNING';
}
