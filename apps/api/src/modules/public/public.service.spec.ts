import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PublicService } from './public.service';

type TournamentSummary = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  venueName: string | null;
  openingTime: Date | null;
  registrationDeadline: Date | null;
  status: string;
  publicEnabled: boolean;
  rulesetId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PublicPrismaMock = {
  tournament: {
    findMany: jest.Mock<Promise<TournamentSummary[]>, [unknown]>;
  };
  match: {
    findMany: jest.Mock;
  };
  group: {
    findMany: jest.Mock;
  };
  standing: {
    findMany: jest.Mock;
  };
  team: {
    findMany: jest.Mock;
  };
  bracketNode: {
    findMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

describe('PublicService', () => {
  const tournament: TournamentSummary = {
    id: 't-1',
    organizationId: 'org-1',
    name: 'Summer Open',
    slug: 'summer-open',
    description: null,
    venueName: 'Court 1',
    openingTime: new Date('2026-05-29T10:00:00.000Z'),
    registrationDeadline: null,
    status: 'PUBLISHED',
    publicEnabled: true,
    rulesetId: null,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-29T00:00:00.000Z'),
  };

  const prisma: PublicPrismaMock = {
    tournament: {
      findMany: jest.fn<Promise<TournamentSummary[]>, [unknown]>(),
    },
    match: {
      findMany: jest.fn(),
    },
    group: {
      findMany: jest.fn(),
    },
    standing: {
      findMany: jest.fn(),
    },
    team: {
      findMany: jest.fn(),
    },
    bracketNode: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  let service: PublicService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PublicService(prisma);
  });

  it('returns public tournament center data for a published slug', async () => {
    prisma.tournament.findMany.mockResolvedValue([tournament]);
    prisma.$transaction.mockResolvedValue([
      [
        {
          id: 'm-1',
          status: 'RUNNING',
          group: { code: 'A' },
          scoreEvents: [{ scoreAAfter: 11, scoreBAfter: 9 }],
        },
      ],
      [{ id: 'g-1', code: 'A', groupTeams: [] }],
      [
        {
          group: { code: 'A' },
          team: { id: 'team-1', name: 'Team 1', code: 'A1' },
          teamId: 'team-1',
          matchesPlayed: 3,
          wins: 2,
          losses: 1,
          pointsFor: 33,
          pointsAgainst: 27,
          pointDiff: 6,
          rank: 1,
          tieBreakDetail: {},
        },
      ],
      [{ id: 'team-1', code: 'A1' }],
      [{ id: 'node-1', orderNo: 1 }],
    ]);

    await expect(service.getTournamentCenter('summer-open')).resolves.toEqual({
      tournament,
      matches: [
        {
          id: 'm-1',
          status: 'RUNNING',
          group: { code: 'A' },
          scoreEvents: [{ scoreAAfter: 11, scoreBAfter: 9 }],
        },
      ],
      groups: [{ id: 'g-1', code: 'A', groupTeams: [] }],
      standings: [
        {
          groupCode: 'A',
          items: [
            {
              teamId: 'team-1',
              teamName: 'Team 1',
              teamCode: 'A1',
              matchesPlayed: 3,
              wins: 2,
              losses: 1,
              pointsFor: 33,
              pointsAgainst: 27,
              pointDiff: 6,
              rank: 1,
              requiresAdminDecision: false,
              tieBreakReason: null,
            },
          ],
        },
      ],
      teams: [{ id: 'team-1', code: 'A1' }],
      bracket: [{ id: 'node-1', orderNo: 1 }],
    });

    expect(prisma.tournament.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: 'summer-open',
          publicEnabled: true,
        },
      }),
    );
  });

  it('throws when no public tournament matches the slug', async () => {
    prisma.tournament.findMany.mockResolvedValue([]);

    await expect(
      service.getTournamentCenter('missing-slug'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when a tournament is public but not finished', async () => {
    prisma.tournament.findMany.mockResolvedValue([]);

    await expect(
      service.getTournamentCenter('summer-open'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.tournament.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: 'summer-open',
          publicEnabled: true,
        },
      }),
    );
  });

  it('throws when the public slug is ambiguous across organizations', async () => {
    prisma.tournament.findMany.mockResolvedValue([
      tournament,
      { ...tournament, id: 't-2', organizationId: 'org-2' },
    ]);

    await expect(
      service.getTournamentCenter('summer-open'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns public tournament summary by id for guest admin redirects', async () => {
    prisma.tournament.findMany.mockResolvedValue([tournament]);

    await expect(service.getPublicTournamentSummaryById('t-1')).resolves.toEqual({
      id: 't-1',
      name: 'Summer Open',
      slug: 'summer-open',
      description: null,
      venueName: 'Court 1',
      openingTime: new Date('2026-05-29T10:00:00.000Z'),
      registrationDeadline: null,
      status: 'PUBLISHED',
      publicEnabled: true,
      rulesetId: null,
    });
  });
});
