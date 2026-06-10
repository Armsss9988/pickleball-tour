import type { TournamentUxContext } from './tournament-ux-policy';

const DEFAULT_TEAM_TARGET = 8;

interface TournamentCompositionLike {
  teamSize?: number | null;
  maleCount?: number | null;
  femaleCount?: number | null;
}

interface TournamentRulesetLike {
  teamCompositionRule?: TournamentCompositionLike | null;
  teamComposition?: TournamentCompositionLike | null;
  scoringConfig?: Record<string, unknown> | null;
  segmentDefinitions?: unknown[] | null;
  segments?: unknown[] | null;
}

interface TournamentLike {
  id?: string | null;
  slug?: string | null;
  name?: string | null;
  venueName?: string | null;
  openingTime?: string | Date | null;
  status?: string | null;
  publicEnabled?: boolean | null;
  ruleset?: TournamentRulesetLike | null;
}

export interface TournamentUxStats {
  playersCount?: number;
  malesCount?: number;
  femalesCount?: number;
  teamsCount?: number;
  matchesCount?: number;
  completedMatches?: number;
  resultConfirmedMatches?: number;
  lineupReadyCount?: number;
  scoringReadyCount?: number;
  groupsAssigned?: boolean;
}

export interface BuildTournamentUxContextInput {
  tournament: TournamentLike | null | undefined;
  stats?: TournamentUxStats;
  currentUserOwnsTeam?: boolean;
}

interface RequiredCounts {
  requiredPlayers: number | null;
  requiredMales: number | null;
  requiredFemales: number | null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function toNonNegativeInteger(value: number | null | undefined, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.trunc(value));
}

function getComposition(ruleset?: TournamentRulesetLike | null): TournamentCompositionLike | null {
  return ruleset?.teamCompositionRule ?? ruleset?.teamComposition ?? null;
}

function hasRulesetScoring(ruleset?: TournamentRulesetLike | null): boolean {
  return Boolean(ruleset?.scoringConfig);
}

function hasRulesetSegments(ruleset?: TournamentRulesetLike | null): boolean {
  const segmentDefinitions = ruleset?.segmentDefinitions;
  if (Array.isArray(segmentDefinitions) && segmentDefinitions.length > 0) {
    return true;
  }

  const segments = ruleset?.segments;
  return Array.isArray(segments) && segments.length > 0;
}

function hasTournamentInfo(tournament?: TournamentLike | null, ruleset?: TournamentRulesetLike | null): boolean {
  const requireSchedule = (ruleset as any)?.requireScheduleConfig ?? true;
  return isNonEmptyString(tournament?.name)
    && isNonEmptyString(tournament?.slug)
    && isNonEmptyString(tournament?.venueName)
    && (!requireSchedule || Boolean(tournament?.openingTime));
}

function getRequiredCounts(
  ruleset: TournamentRulesetLike | null | undefined,
  teamsCount: number,
): RequiredCounts {
  const composition = getComposition(ruleset);

  if (!composition) {
    return {
      requiredPlayers: null,
      requiredMales: null,
      requiredFemales: null,
    };
  }

  const teamTarget = teamsCount > 0 ? teamsCount : DEFAULT_TEAM_TARGET;
  const teamSize = toNonNegativeInteger(composition.teamSize, 0);
  const maleCount = toNonNegativeInteger(composition.maleCount, 0);
  const femaleCount = toNonNegativeInteger(composition.femaleCount, 0);

  return {
    requiredPlayers: teamTarget * teamSize,
    requiredMales: teamTarget * maleCount,
    requiredFemales: teamTarget * femaleCount,
  };
}

function hasKnockoutStage(status: string): boolean {
  return ['KNOCKOUT_GENERATED', 'KNOCKOUT_RUNNING', 'COMPLETED', 'PUBLISHED'].includes(status);
}

function hasDependentSetupData(status: string, playerTotal: number, teamCount: number, matchCount: number): boolean {
  return teamCount > 0
    || matchCount > 0
    || [
      'TEAM_DRAW_COMPLETED',
      'GROUP_ASSIGNED',
      'SCHEDULE_GENERATED',
      'RUNNING',
      'GROUP_COMPLETED',
      'KNOCKOUT_GENERATED',
      'KNOCKOUT_RUNNING',
      'COMPLETED',
      'PUBLISHED',
    ].includes(status);
}

function areGroupsAssigned(status: string, teamCount: number, matchCount: number): boolean {
  return (
    [
      'GROUP_ASSIGNED',
      'SCHEDULE_GENERATED',
      'RUNNING',
      'GROUP_COMPLETED',
      'KNOCKOUT_GENERATED',
      'KNOCKOUT_RUNNING',
      'COMPLETED',
      'PUBLISHED',
    ].includes(status)
    || matchCount > 0
  );
}

export function buildTournamentUxContext(input: BuildTournamentUxContextInput): TournamentUxContext {
  const tournament = input.tournament ?? null;
  const stats = input.stats ?? {};

  const playerTotal = toNonNegativeInteger(stats.playersCount);
  const maleCount = toNonNegativeInteger(stats.malesCount);
  const femaleCount = toNonNegativeInteger(stats.femalesCount);
  const teamCount = toNonNegativeInteger(stats.teamsCount);
  const matchCount = toNonNegativeInteger(stats.matchesCount);
  const lineupReadyCount = toNonNegativeInteger(stats.lineupReadyCount);
  const scoringReadyCount = toNonNegativeInteger(stats.scoringReadyCount);
  const completedMatchCount = toNonNegativeInteger(stats.completedMatches);
  const resultConfirmedMatchCount = toNonNegativeInteger(stats.resultConfirmedMatches);
  const ruleset = tournament?.ruleset ?? null;
  const status = tournament?.status ?? 'DRAFT';
  const required = getRequiredCounts(ruleset, teamCount);

  return {
    tournamentId: tournament?.id ?? '',
    tournamentSlug: tournament?.slug ?? null,
    status,
    publicEnabled: Boolean(tournament?.publicEnabled),
    hasTournamentInfo: hasTournamentInfo(tournament, ruleset),
    hasValidRuleset: Boolean(
      getComposition(ruleset)
      && hasRulesetScoring(ruleset)
      && ((ruleset as any)?.matchFormat !== 'relay' || hasRulesetSegments(ruleset)),
    ),
    hasDependentSetupData: hasDependentSetupData(status, playerTotal, teamCount, matchCount),
    playerTotal,
    maleCount,
    femaleCount,
    requiredPlayers: required.requiredPlayers,
    requiredMales: required.requiredMales,
    requiredFemales: required.requiredFemales,
    teamCount,
    groupsAssigned: stats.groupsAssigned ?? areGroupsAssigned(status, teamCount, matchCount),
    scheduleConfigReady: Boolean(tournament?.openingTime),
    matchCount,
    lineupReadyCount,
    scoringReadyCount,
    completedMatchCount,
    resultConfirmedMatchCount,
    hasKnockoutStage: hasKnockoutStage(status),
    currentUserOwnsTeam: Boolean(input.currentUserOwnsTeam),
    requireCourtConfig: (ruleset as any)?.requireCourtConfig ?? true,
    requireScheduleConfig: (ruleset as any)?.requireScheduleConfig ?? true,
  };
}
