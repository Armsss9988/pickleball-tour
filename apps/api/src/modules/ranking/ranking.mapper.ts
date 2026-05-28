import { StandingRow } from '@golab/domain';

export class RankingMapper {
  /**
   * Maps domain standing row to database standing record structure.
   */
  public static toPersistence(std: StandingRow, organizationId: string, tournamentId: string, groupId: string) {
    return {
      organizationId,
      tournamentId,
      groupId,
      teamId: std.teamId,
      matchesPlayed: std.matchesPlayed,
      wins: std.wins,
      losses: std.losses,
      pointsFor: std.pointsFor,
      pointsAgainst: std.pointsAgainst,
      pointDiff: std.pointDiff,
      points: std.points,
      rank: std.rank ?? 0,
      tieBreakDetail: {
        requiresAdminDecision: std.requiresAdminDecision,
        tieBreakReason: std.tieBreakReason || '',
      } as any,
    };
  }
}
