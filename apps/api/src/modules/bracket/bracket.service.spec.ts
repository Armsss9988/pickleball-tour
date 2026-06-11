import { BracketService } from './bracket.service';

describe('BracketService.getSeedCandidates', () => {
  it('returns standings-backed seed candidates in group/rank order', async () => {
    const prisma = {
      tournament: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'tour-1',
          ruleset: { advancePerGroup: 1 },
        }),
      },
      standing: {
        findMany: jest.fn().mockResolvedValue([
          {
            teamId: 'team-b1',
            rank: 1,
            group: { id: 'group-b', code: 'B', name: 'Bảng B' },
            team: { id: 'team-b1', name: 'Team B1', code: 'B1' },
            tieBreakDetail: {},
          },
          {
            teamId: 'team-a2',
            rank: 2,
            group: { id: 'group-a', code: 'A', name: 'Bảng A' },
            team: { id: 'team-a2', name: 'Team A2', code: 'A2' },
            tieBreakDetail: { requiresAdminDecision: true },
          },
          {
            teamId: 'team-a1',
            rank: 1,
            group: { id: 'group-a', code: 'A', name: 'Bảng A' },
            team: { id: 'team-a1', name: 'Team A1', code: 'A1' },
            tieBreakDetail: {},
          },
        ]),
      },
    };
    const service = new BracketService(prisma as any, { log: jest.fn() } as any);

    await expect(service.getSeedCandidates('tour-1')).resolves.toEqual({
      advancePerGroup: 1,
      candidates: [
        expect.objectContaining({
          teamId: 'team-a1',
          groupCode: 'A',
          rank: 1,
          sourceLabel: 'A1',
          qualifiedByRule: true,
          requiresAdminDecision: false,
        }),
        expect.objectContaining({
          teamId: 'team-a2',
          groupCode: 'A',
          rank: 2,
          sourceLabel: 'A2',
          qualifiedByRule: false,
          requiresAdminDecision: true,
        }),
        expect.objectContaining({
          teamId: 'team-b1',
          groupCode: 'B',
          rank: 1,
          sourceLabel: 'B1',
          qualifiedByRule: true,
        }),
      ],
    });
  });
});

describe('BracketService.advanceBracketNode', () => {
  it('auto-advances a newly single-team target node through an empty bye branch', async () => {
    const qf1 = {
      id: 'node-qf1',
      organizationId: 'org-1',
      tournamentId: 'tour-1',
      stageId: 'stage-playoff',
      nodeKey: 'QF1',
      roundName: 'Tứ Kết',
      sourceA: 'S:1',
      sourceB: 'S:8',
      teamAId: 'team-1',
      teamBId: 'team-8',
      winnerToNodeKey: 'SF1',
      matchId: 'match-qf1',
      match: {
        id: 'match-qf1',
        result: {
          winnerTeamId: 'team-1',
        },
      },
    };
    const sf1 = {
      id: 'node-sf1',
      organizationId: 'org-1',
      tournamentId: 'tour-1',
      stageId: 'stage-playoff',
      nodeKey: 'SF1',
      roundName: 'Bán Kết',
      sourceA: 'W:QF1',
      sourceB: 'W:QF2',
      teamAId: null,
      teamBId: null,
      winnerToNodeKey: 'F',
      matchId: null,
    };
    const final = {
      id: 'node-final',
      organizationId: 'org-1',
      tournamentId: 'tour-1',
      stageId: 'stage-playoff',
      nodeKey: 'F',
      roundName: 'Chung Kết',
      sourceA: 'W:SF1',
      sourceB: 'W:SF2',
      teamAId: null,
      teamBId: null,
      winnerToNodeKey: null,
      matchId: null,
    };
    const nodesById: Record<string, any> = {
      [qf1.id]: qf1,
      [sf1.id]: sf1,
      [final.id]: final,
    };

    const prisma = {
      bracketNode: {
        findFirst: jest.fn(async ({ where }: any) => {
          if (where.matchId === 'match-qf1') return qf1;
          if (where.nodeKey === '3P') return null;
          if (where.nodeKey === 'SF1') return sf1;
          if (where.nodeKey === 'F') return final;
          return null;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const node = nodesById[where.id];
          Object.assign(node, data);
          return { ...node };
        }),
      },
      match: {
        update: jest.fn(),
        create: jest.fn(),
      },
      matchSegment: {
        create: jest.fn(),
      },
      tournament: {
        findUnique: jest.fn(),
      },
    };
    const service = new BracketService(prisma as any, { log: jest.fn() } as any);

    await service.advanceBracketNode('match-qf1');

    expect(prisma.bracketNode.update).toHaveBeenCalledWith({
      where: { id: 'node-sf1' },
      data: { teamAId: 'team-1', teamBId: null },
    });
    expect(prisma.bracketNode.update).toHaveBeenCalledWith({
      where: { id: 'node-final' },
      data: { teamAId: 'team-1', teamBId: null },
    });
    expect(prisma.match.create).not.toHaveBeenCalled();
  });
});
