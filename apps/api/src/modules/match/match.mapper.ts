import { Match as PrismaMatch } from '@golab/db';
import { Match as DomainMatch, MatchProps } from '@golab/domain';

export class MatchMapper {
  /**
   * Maps Prisma Match model to pure Domain Match entity.
   */
  public static toDomain(raw: PrismaMatch): DomainMatch {
    return new DomainMatch(raw.id, {
      tournamentId: raw.tournamentId,
      stageId: raw.stageId,
      groupId: raw.groupId || null,
      roundNo: raw.roundNo || null,
      matchNo: raw.matchNo || null,
      label: raw.label || null,
      teamAId: raw.teamAId || null,
      teamBId: raw.teamBId || null,
      status: raw.status as MatchProps['status'],
      winnerTeamId: raw.winnerTeamId || null,
      scheduledTime: raw.scheduledTime ? new Date(raw.scheduledTime) : null,
      courtName: raw.courtName || null,
    });
  }

  /**
   * Maps Domain Match entity properties for database persistence updates.
   */
  public static toPersistence(domain: DomainMatch): any {
    return {
      status: domain.status as any,
      winnerTeamId: domain.winnerTeamId || null,
    };
  }
}
