import { Tournament as DomainTournament } from '@golab/domain';
import { TournamentStatus, EventType } from '@golab/contracts';

export class TournamentMapper {
  /**
   * Maps Prisma model (with optional ruleset include) to pure Domain entity.
   * Uses a loose input type so it works with any Prisma Tournament query shape
   * (with or without ruleset included).
   *
   * Passes eventType from the tournament's linked ruleset to enable
   * correct status transition branching (TEAM_EVENT vs SINGLES/DOUBLES).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static toDomain(raw: any): DomainTournament {
    const eventType = (raw?.ruleset?.eventType ?? 'TEAM_EVENT') as EventType;
    return new DomainTournament(
      raw.id as string,
      raw.status as TournamentStatus,
      eventType,
    );
  }

  /**
   * Maps Domain entity back to Prisma structure.
   */
  public static toPersistence(domain: DomainTournament): { status: string } {
    return {
      status: domain.status,
    };
  }
}
