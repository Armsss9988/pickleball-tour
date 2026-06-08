export interface ControlRoomMatchLike {
  id: string;
  status: string;
  groupId?: string | null;
}

export interface ControlRoomGroupLike {
  id: string;
  groupTeams?: unknown[] | null;
}

export interface ControlRoomStandingLike {
  id?: string;
  groupId?: string | null;
  rank?: number | null;
}

export interface MatchOperationCounts {
  total: number;
  lineupReady: number;
  scoringReady: number;
  completed: number;
  resultConfirmed: number;
}

const lineupStatuses = new Set(['SCHEDULED', 'LINEUP_PENDING', 'LINEUP_READY', 'READY']);
const lineupReadyStatuses = new Set(['LINEUP_READY', 'READY', 'RUNNING', 'SEGMENT_BREAK', 'COMPLETED']);
const scoringReadyStatuses = new Set(['READY', 'RUNNING', 'SEGMENT_BREAK']);
const completedStatuses = new Set(['COMPLETED', 'RESULT_CONFIRMED']);

export function getLineupMatches<T extends ControlRoomMatchLike>(matches: T[]): T[] {
  return matches.filter((match) => lineupStatuses.has(match.status));
}

export function getMatchOperationCounts(matches: ControlRoomMatchLike[]): MatchOperationCounts {
  return {
    total: matches.length,
    lineupReady: matches.filter((match) => lineupReadyStatuses.has(match.status)).length,
    scoringReady: matches.filter((match) => scoringReadyStatuses.has(match.status)).length,
    completed: matches.filter((match) => completedStatuses.has(match.status)).length,
    resultConfirmed: matches.filter((match) => match.status === 'RESULT_CONFIRMED').length,
  };
}

export function getAssignedGroupCount(groups: ControlRoomGroupLike[]): number {
  return groups.reduce((total, group) => {
    return total + (Array.isArray(group.groupTeams) ? group.groupTeams.length : 0);
  }, 0);
}

export function groupStandingsByGroup<T extends ControlRoomStandingLike>(standings: T[]): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};

  for (const standing of standings) {
    const key = standing.groupId || 'ungrouped';
    grouped[key] ??= [];
    grouped[key].push(standing);
  }

  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => {
      return (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER);
    });
  }

  return grouped;
}

export function getVenueSummary(value: string | null | undefined): string {
  const normalized = value?.replace(/\s*,\s*/g, ', ').trim();
  return normalized && normalized.length > 0 ? normalized : 'Chưa thiết lập địa điểm';
}
