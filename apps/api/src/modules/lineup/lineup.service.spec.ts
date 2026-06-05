import { ForbiddenException } from '@nestjs/common';
import { LineupService } from './lineup.service';

describe('LineupService captain ownership guard', () => {
  it('returns match teams with members so clients can map lineup player dropdowns', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: 'm1',
      teamAId: 'team-a',
      teamBId: 'team-b',
      teamA: {
        id: 'team-a',
        name: 'Đội A',
        members: [
          { playerProfile: { id: 'p1', fullName: 'Player 1', gender: 'MALE' } },
        ],
      },
      teamB: {
        id: 'team-b',
        name: 'Đội B',
        members: [
          { playerProfile: { id: 'p2', fullName: 'Player 2', gender: 'FEMALE' } },
        ],
      },
      segments: [],
      lineups: [],
    });
    const prisma = {
      match: {
        findUnique,
      },
    };
    const service = new LineupService(prisma as any, { log: jest.fn() } as any);

    const match = await service.getLineups('m1');

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'm1' },
      include: {
        group: true,
        teamA: {
          include: {
            members: {
              include: { playerProfile: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        teamB: {
          include: {
            members: {
              include: { playerProfile: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        segments: {
          orderBy: { segmentOrder: 'asc' },
        },
        lineups: {
          include: {
            players: {
              include: { playerProfile: true },
            },
          },
        },
      },
    });
    expect(match.teamA.members[0].playerProfile.fullName).toBe('Player 1');
    expect(match.teamB.members[0].playerProfile.fullName).toBe('Player 2');
  });

  it('rejects captain submissions for a team they do not own', async () => {
    const prisma = {
      match: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'm1',
          organizationId: 'org1',
          tournamentId: 't1',
          teamAId: 'team-a',
          teamBId: 'team-b',
          tournament: {
            ruleset: {
              name: 'Ruleset',
              sport: 'pickleball',
              isTemplate: false,
              segmentDefinitions: [
                {
                  segmentKey: 'md',
                  name: 'Nam đôi',
                  targetScore: 24,
                  playerCount: 2,
                  genderRule: 'MALE_ONLY',
                  orderIndex: 0,
                  isDrawable: true,
                },
              ],
              teamCompositionRule: {
                teamSize: 5,
                maleCount: 3,
                femaleCount: 2,
                allMustPlay: true,
              },
              playerLimitRules: [],
              overlapRules: [],
              scoringConfig: {
                winScore: 24,
                noDeuce: true,
                sideSwitchAfterSegments: 0,
                pointsForWin: 3,
                pointsForLoss: 0,
              },
            },
          },
          segments: [
            {
              id: 'seg-1',
              segmentKey: 'md',
            },
          ],
        }),
      },
      $transaction: jest
        .fn()
        .mockImplementation(async (callback: (tx: any) => Promise<unknown>) =>
          callback({
            team: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'team-a',
                name: 'Team A',
                tournamentId: 't1',
                captainPlayerId: 'captain-player-a',
                captain: {
                  id: 'captain-player-a',
                  userId: 'another-user',
                },
                members: [],
              }),
            },
          }),
        ),
    };

    const service = new LineupService(prisma, { log: jest.fn() } as any);
    const submitLineup = () =>
      service.submitLineup(
        'm1',
        [
          {
            teamId: 'team-a',
            segments: [{ segmentId: 'seg-1', playerIds: ['p1', 'p2'] }],
          },
        ],
        'captain-user',
        ['CAPTAIN'],
      );

    await expect(submitLineup()).rejects.toBeInstanceOf(ForbiddenException);

    await expect(submitLineup()).rejects.toThrow('đội mà mình đang phụ trách');
  });
});
