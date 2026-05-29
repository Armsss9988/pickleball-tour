import { BadRequestException } from '@nestjs/common';
import { TournamentService } from './tournament.service';

describe('TournamentService publish guard', () => {
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
          status: 'PUBLISHED', // Not DRAFT
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
    await expect(publish()).rejects.toThrow('Giải đấu không ở trạng thái nháp DRAFT.');
  });
});
