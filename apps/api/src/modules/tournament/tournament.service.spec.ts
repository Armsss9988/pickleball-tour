import { BadRequestException } from '@nestjs/common';
import { TournamentService } from './tournament.service';

describe('TournamentService publish guard', () => {
  it('rejects publishing before tournament completion', async () => {
    const runTransaction = jest.fn();
    const prisma = {
      tournament: {
        findUnique: jest.fn().mockResolvedValue({
          id: 't1',
          organizationId: 'org1',
          name: 'Test Cup',
          slug: 'test-cup',
          venueName: 'Arena',
          openingTime: new Date('2026-05-29T09:00:00.000Z'),
          status: 'RUNNING',
          ruleset: {
            segmentDefinitions: [],
            teamCompositionRule: null,
            playerLimitRules: [],
            overlapRules: [],
            scoringConfig: null,
          },
        }),
      },
      team: { count: jest.fn() },
      match: { count: jest.fn() },
      stage: { count: jest.fn() },
      $transaction: runTransaction,
    };

    const service = new TournamentService(prisma, { log: jest.fn() } as any);
    const publish = () => service.publish('t1', 'u1');

    await expect(publish()).rejects.toBeInstanceOf(BadRequestException);
    await expect(publish()).rejects.toThrow('giải chưa hoàn tất');
    expect(runTransaction).not.toHaveBeenCalled();
  });
});
