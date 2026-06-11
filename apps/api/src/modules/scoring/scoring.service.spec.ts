import { BadRequestException } from '@nestjs/common';
import { ScoringService } from './scoring.service';

describe('ScoringService.quickResult', () => {
  it('stores a result-only draft without creating score events', async () => {
    const match = {
      id: 'match-1',
      organizationId: 'org-1',
      tournamentId: 'tour-1',
      groupId: 'group-1',
      teamAId: 'team-a',
      teamBId: 'team-b',
      status: 'READY',
      result: null,
      tournament: {
        ruleset: {
          quickScoreEntryEnabled: true,
          matchFormat: 'relay',
        },
      },
    };

    const tx = {
      match: {
        update: jest.fn().mockResolvedValue({ ...match, status: 'COMPLETED', winnerTeamId: 'team-a' }),
      },
      matchResult: {
        upsert: jest.fn().mockResolvedValue({
          matchId: 'match-1',
          teamAScore: 24,
          teamBScore: 12,
          winnerTeamId: 'team-a',
        }),
      },
      scoreEvent: {
        create: jest.fn(),
      },
    };

    const prisma = {
      match: {
        findUnique: jest.fn().mockResolvedValue(match),
      },
      $transaction: jest.fn(async (callback) => callback(tx)),
    };
    const auditService = { log: jest.fn().mockResolvedValue(undefined) };
    const gateway = { broadcastScoreUpdate: jest.fn() };
    const eventEmitter = { emitAsync: jest.fn() };
    const service = new ScoringService(prisma as any, auditService as any, gateway as any, eventEmitter as any);

    await expect(service.quickResult('match-1', { teamAScore: 24, teamBScore: 12 }, 'user-1')).resolves.toEqual({
      matchId: 'match-1',
      teamAScore: 24,
      teamBScore: 12,
      winnerTeamId: 'team-a',
    });

    expect(tx.scoreEvent.create).not.toHaveBeenCalled();
    expect(tx.match.update).toHaveBeenCalledWith({
      where: { id: 'match-1' },
      data: { status: 'COMPLETED', winnerTeamId: 'team-a' },
    });
    expect(tx.matchResult.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { matchId: 'match-1' },
      create: expect.objectContaining({
        teamAScore: 24,
        teamBScore: 12,
        winnerTeamId: 'team-a',
      }),
    }));
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'QUICK_RESULT_ENTERED',
      entityId: 'match-1',
    }));
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
  });

  it('rejects quick result when the ruleset does not enable it', async () => {
    const prisma = {
      match: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'match-1',
          tournament: { ruleset: { quickScoreEntryEnabled: false } },
        }),
      },
    };
    const service = new ScoringService(
      prisma as any,
      { log: jest.fn() } as any,
      { broadcastScoreUpdate: jest.fn() } as any,
      { emitAsync: jest.fn() } as any,
    );

    await expect(service.quickResult('match-1', { teamAScore: 24, teamBScore: 12 }, 'user-1'))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
