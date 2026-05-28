import { Tournament as PrismaTournament } from '@golab/db';
import { Tournament as DomainTournament } from '@golab/domain';
import { TournamentStatus } from '@golab/contracts';

export class TournamentMapper {
  /**
   * Maps Prisma model to pure Domain entity.
   */
  public static toDomain(raw: PrismaTournament): DomainTournament {
    return new DomainTournament(raw.id, raw.status as TournamentStatus);
  }

  /**
   * Maps Domain entity back to Prisma structure.
   */
  public static toPersistence(domain: DomainTournament): Partial<PrismaTournament> {
    return {
      status: domain.status as any,
    };
  }
}
