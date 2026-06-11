import { MatchService } from './match.service';

describe('MatchService.startMatch lineup policy', () => {
  it('allows a READY match to start without locked lineups when ruleset does not require lineup', async () => {
    const match = {
      id: 'match-1',
      organizationId: 'org-1',
      tournamentId: 'tour-1',
      stageId: 'stage-1',
      groupId: null,
      roundNo: null,
      matchNo: 1,
      label: 'Match 1',
      teamAId: 'team-a',
      teamBId: 'team-b',
      status: 'READY',
      winnerTeamId: null,
      scheduledTime: null,
      courtName: 'Sân 1',
      segments: [
        {
          id: 'seg-1',
          segmentOrder: 0,
          segmentKey: 'game',
          name: 'Trận đấu',
          targetScore: 24,
          status: 'PENDING',
        },
      ],
      lineups: [],
      scoreEvents: [],
      result: null,
      court: null,
      teamA: { id: 'team-a', members: [] },
      teamB: { id: 'team-b', members: [] },
      tournament: {
        id: 'tour-1',
        status: 'SCHEDULE_GENERATED',
        ruleset: {
          matchFormat: 'relay',
          requireLineup: false,
        },
      },
    };

    const tx = {
      match: {
        update: jest.fn().mockResolvedValue({ ...match, status: 'RUNNING' }),
      },
      matchSegment: {
        update: jest.fn().mockResolvedValue({}),
      },
      tournament: {
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      match: {
        findUnique: jest.fn().mockResolvedValue(match),
      },
      matchLineup: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(async (callback) => callback(tx)),
    };
    const auditService = { log: jest.fn().mockResolvedValue(undefined) };
    const validatorService = { validateAll: jest.fn() };
    const gateway = { broadcastScoreUpdate: jest.fn() };
    const service = new MatchService(prisma as any, auditService as any, validatorService as any, gateway as any);

    await expect(service.startMatch('match-1', 'user-1')).resolves.toEqual({ ...match, status: 'RUNNING' });

    expect(prisma.matchLineup.findMany).toHaveBeenCalledWith({ where: { matchId: 'match-1' } });
    expect(tx.match.update).toHaveBeenCalledWith({
      where: { id: 'match-1' },
      data: { status: 'RUNNING', winnerTeamId: null },
    });
    expect(tx.matchSegment.update).toHaveBeenCalledWith({
      where: { id: 'seg-1' },
      data: { status: 'RUNNING' },
    });
  });
});
