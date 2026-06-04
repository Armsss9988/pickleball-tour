import { BadRequestException } from '@nestjs/common';
import { TournamentService } from './tournament.service';

describe('TournamentService publish guard', () => {
  it('rejects publishing while tournament is still in draft', async () => {
    const validateAll = jest.fn().mockResolvedValue({
      publishReady: { ready: true, missing: [] },
      operationalReady: { ready: true, missing: [] },
    });
    const update = jest.fn().mockResolvedValue({
      id: 't1',
      status: 'PUBLISHED',
      publicEnabled: true,
    });
    const prisma = {
      tournament: {
        findUnique: jest.fn().mockResolvedValue({
          id: 't1',
          organizationId: 'org1',
          name: 'Test Cup',
          slug: 'test-cup',
          venueName: 'Arena',
          openingTime: new Date('2026-05-29T09:00:00.000Z'),
          status: 'DRAFT',
          publicEnabled: false,
          ruleset: {
            segmentDefinitions: [],
            teamCompositionRule: null,
            playerLimitRules: [],
            overlapRules: [],
            scoringConfig: null,
          },
        }),
        update,
      },
    };

    const service = new TournamentService(prisma as any, { log: jest.fn() } as any, { validateAll } as any);

    await expect(service.publish('t1', 'u1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.publish('t1', 'u1')).rejects.toThrow('giải chưa hoàn tất');
  });

  it('rejects publishing before tournament completion', async () => {
    const prisma = {
      tournament: {
        findUnique: jest.fn().mockResolvedValue({
          id: 't1',
          organizationId: 'org1',
          name: 'Test Cup',
          slug: 'test-cup',
          venueName: 'Arena',
          openingTime: new Date('2026-05-29T09:00:00.000Z'),
          status: 'ONGOING',
          ruleset: {
            segmentDefinitions: [],
            teamCompositionRule: null,
            playerLimitRules: [],
            overlapRules: [],
            scoringConfig: null,
          },
        }),
      },
    };

    const service = new TournamentService(prisma as any, { log: jest.fn() } as any, { validateAll: jest.fn() } as any);
    const publish = () => service.publish('t1', 'u1');

    await expect(publish()).rejects.toBeInstanceOf(BadRequestException);
    await expect(publish()).rejects.toThrow('giải chưa hoàn tất');
  });

  it('publishes a completed tournament when readiness checks pass', async () => {
    const validateAll = jest.fn().mockResolvedValue({
      publishReady: { ready: true, missing: [] },
      operationalReady: { ready: true, missing: [] },
    });
    const update = jest.fn().mockResolvedValue({
      id: 't1',
      status: 'PUBLISHED',
      publicEnabled: true,
    });
    const log = jest.fn();
    const prisma = {
      tournament: {
        findUnique: jest.fn().mockResolvedValue({
          id: 't1',
          organizationId: 'org1',
          name: 'Test Cup',
          slug: 'test-cup',
          venueName: 'Arena',
          openingTime: new Date('2026-05-29T09:00:00.000Z'),
          status: 'COMPLETED',
          publicEnabled: false,
          ruleset: {
            segmentDefinitions: [{}],
            teamCompositionRule: { teamSize: 5, maleCount: 3, femaleCount: 2 },
            playerLimitRules: [],
            overlapRules: [],
            scoringConfig: { winScore: 21 },
          },
          sectionStatuses: [],
        }),
        update,
      },
      team: {
        count: jest.fn().mockResolvedValue(8),
      },
      match: {
        count: jest.fn().mockResolvedValue(12),
      },
      stage: {
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const service = new TournamentService(prisma as any, { log } as any, { validateAll } as any);

    await expect(service.publish('t1', 'u1')).resolves.toEqual({
      published: true,
      operationallyReady: true,
      operationalWarnings: [],
    });
    expect(validateAll).toHaveBeenCalledWith('t1');
    expect(update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { status: 'PUBLISHED', publicEnabled: true },
    });
    expect(log).toHaveBeenCalled();
  });

  it('rejects publishing a completed tournament when not all match results are confirmed', async () => {
    const validateAll = jest.fn().mockResolvedValue({
      publishReady: { ready: true, missing: [] },
      operationalReady: { ready: true, missing: [] },
    });
    const prisma = {
      tournament: {
        findUnique: jest.fn().mockResolvedValue({
          id: 't1',
          organizationId: 'org1',
          name: 'Test Cup',
          slug: 'test-cup',
          venueName: 'Arena',
          openingTime: new Date('2026-05-29T09:00:00.000Z'),
          status: 'COMPLETED',
          publicEnabled: false,
          ruleset: {
            segmentDefinitions: [{}],
            teamCompositionRule: { teamSize: 5, maleCount: 3, femaleCount: 2 },
            playerLimitRules: [],
            overlapRules: [],
            scoringConfig: { winScore: 21 },
          },
          sectionStatuses: [],
        }),
      },
      team: {
        count: jest.fn().mockResolvedValue(8),
      },
      match: {
        count: jest.fn().mockImplementation(({ where }: { where?: { status?: string } }) =>
          Promise.resolve(where?.status === 'RESULT_CONFIRMED' ? 11 : 12),
        ),
      },
      stage: {
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const service = new TournamentService(prisma as any, { log: jest.fn() } as any, { validateAll } as any);

    await expect(service.publish('t1', 'u1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.publish('t1', 'u1')).rejects.toThrow('Chưa đủ điều kiện công khai giải đấu');
  });

  it('returns success without re-publishing an already public tournament', async () => {
    const validateAll = jest.fn();
    const update = jest.fn();
    const log = jest.fn();
    const prisma = {
      tournament: {
        findUnique: jest.fn().mockResolvedValue({
          id: 't1',
          organizationId: 'org1',
          name: 'Test Cup',
          slug: 'test-cup',
          venueName: 'Arena',
          openingTime: new Date('2026-05-29T09:00:00.000Z'),
          status: 'PUBLISHED',
          publicEnabled: true,
          ruleset: {
            segmentDefinitions: [],
            teamCompositionRule: null,
            playerLimitRules: [],
            overlapRules: [],
            scoringConfig: null,
          },
          sectionStatuses: [],
        }),
        update,
      },
    };

    const service = new TournamentService(prisma as any, { log } as any, { validateAll } as any);

    await expect(service.publish('t1', 'u1')).resolves.toEqual({
      published: true,
      operationallyReady: true,
      operationalWarnings: [],
    });
    expect(validateAll).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });
});
