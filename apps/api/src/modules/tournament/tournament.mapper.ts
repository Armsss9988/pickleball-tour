import { Tournament as DomainTournament } from '@golab/domain';
import { TournamentStatus, EventType } from '@golab/contracts';

// Raw tournament with optional ruleset (from Prisma include)
interface TournamentWithRuleset {
  id: string;
  status: string;
  ruleset?: { eventType?: string } | null;
}

export class TournamentMapper {
  /**
   * Maps Prisma model to pure Domain entity.
   * Passes eventType from the tournament's linked ruleset to enable
   * correct status transition branching (TEAM_EVENT vs SINGLES/DOUBLES).
   */
  public static toDomain(raw: TournamentWithRuleset): DomainTournament {
    const eventType = (raw.ruleset?.eventType ?? 'TEAM_EVENT') as EventType;
    return new DomainTournament(raw.id, raw.status as TournamentStatus, eventType);
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
