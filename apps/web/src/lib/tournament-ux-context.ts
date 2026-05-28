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

function hasTournamentInfo(tournament?: TournamentLike | null): boolean {
  return isNonEmptyString(tournament?.name)
    && isNonEmptyString(tournament?.slug)
    && isNonEmptyString(tournament?.venueName)
    && Boolean(tournament?.openingTime);
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

function hasKnockoutStage(status: string, matchCount: number): boolean {
  if (status === 'KNOCKOUT_GENERATED' || status === 'KNOCKOUT_RUNNING') {
    return true;
  }

  return matchCount > 0 && (status === 'COMPLETED' || status === 'PUBLISHED');
}

function areGroupsAssigned(status: string, teamCount: number, matchCount: number): boolean {
  const statusWithGroups = new Set([
    'GROUP_ASSIGNED',
    'SCHEDULE_GENERATED',
    'RUNNING',
    'GROUP_COMPLETED',
    'KNOCKOUT_GENERATED',
    'KNOCKOUT_RUNNING',
    'COMPLETED',
    'PUBLISHED',
  ]);

  if (statusWithGroups.has(status)) {
    return true;
  }

  return teamCount > 0 && matchCount > 0;
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
    hasTournamentInfo: hasTournamentInfo(tournament),
    hasValidRuleset: Boolean(getComposition(ruleset) && hasRulesetScoring(ruleset)),
    hasDependentSetupData:
      playerTotal > 0
      || teamCount > 0
      || matchCount > 0
      || lineupReadyCount > 0
      || scoringReadyCount > 0
      || completedMatchCount > 0
      || resultConfirmedMatchCount > 0,
    playerTotal,
    maleCount,
    femaleCount,
    requiredPlayers: required.requiredPlayers,
    requiredMales: required.requiredMales,
    requiredFemales: required.requiredFemales,
    teamCount,
    groupsAssigned: areGroupsAssigned(status, teamCount, matchCount),
    scheduleConfigReady: Boolean(tournament?.openingTime),
    matchCount,
    lineupReadyCount,
    scoringReadyCount,
    completedMatchCount,
    resultConfirmedMatchCount,
    hasKnockoutStage: hasKnockoutStage(status, matchCount),
    currentUserOwnsTeam: Boolean(input.currentUserOwnsTeam),
  };
}
