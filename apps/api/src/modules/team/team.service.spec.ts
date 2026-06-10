import { BadRequestException } from '@nestjs/common';
import { TeamService } from './team.service';

describe('TeamService dependency guards', () => {
  it('creates teams from a valid manual assignment', async () => {
    const teamCreate = jest.fn()
      .mockResolvedValueOnce({ id: 'team-a', code: 'A', name: 'Đội A' })
      .mockResolvedValueOnce({ id: 'team-b', code: 'B', name: 'Đội B' });
    const teamMemberCreate = jest.fn().mockResolvedValue({});
    const teamUpdate = jest.fn().mockResolvedValue({});
    const tx = {
      awardRecipient: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      bracketNode: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      standing: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      matchResult: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      scoreEvent: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      matchLineupPlayer: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      matchLineup: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      matchSegment: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      match: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      groupTeam: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      teamMember: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: teamMemberCreate,
      },
      team: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: teamCreate,
        update: teamUpdate,
      },
      teamDraw: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      tournament: {
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      tournament: {
        findUnique: jest.fn().mockResolvedValue({
          id: 't1',
          organizationId: 'org1',
          ruleset: {
            teamCompositionRule: {
              teamSize: 2,
              maleCount: 1,
              femaleCount: 1,
            },
          },
        }),
      },
      tournamentRegistration: {
        findMany: jest.fn().mockResolvedValue([
          { playerProfile: { id: 'm1', fullName: 'Male 1', gender: 'MALE' } },
          { playerProfile: { id: 'f1', fullName: 'Female 1', gender: 'FEMALE' } },
          { playerProfile: { id: 'm2', fullName: 'Male 2', gender: 'MALE' } },
          { playerProfile: { id: 'f2', fullName: 'Female 2', gender: 'FEMALE' } },
        ]),
      },
      $transaction: jest.fn(async (cb) => cb(tx)),
    };
    const auditService = { log: jest.fn() };
    const validatorService = {
      markSectionNeedsReview: jest.fn(),
      validateAll: jest.fn(),
    };
    const service = new TeamService(
      prisma as any,
      auditService as any,
      validatorService as any,
    );

    await expect(service.saveManualAssignment('t1', {
      teams: [
        { code: 'A', name: 'Đội A', playerIds: ['m1', 'f1'] },
        { code: 'B', name: 'Đội B', playerIds: ['m2', 'f2'] },
      ],
    }, 'u1')).resolves.toHaveLength(2);

    expect(teamCreate).toHaveBeenCalledTimes(2);
    expect(teamMemberCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        teamId: 'team-a',
        playerProfileId: 'm1',
        joinedMethod: 'manual_assign',
      }),
    }));
    expect(teamUpdate).toHaveBeenCalledWith({
      where: { id: 'team-a' },
      data: { captainPlayerId: 'm1' },
    });
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'TEAM_MANUAL_ASSIGNMENT_CONFIRMED',
      tournamentId: 't1',
    }));
    expect(validatorService.markSectionNeedsReview).toHaveBeenCalledWith('t1', ['lineup']);
    expect(validatorService.validateAll).toHaveBeenCalledWith('t1');
  });

  it('rejects manual assignment when a player appears in multiple teams', async () => {
    const prisma = {
      tournament: {
        findUnique: jest.fn().mockResolvedValue({
          id: 't1',
          organizationId: 'org1',
          ruleset: {
            teamCompositionRule: {
              teamSize: 2,
              maleCount: 1,
              femaleCount: 1,
            },
          },
        }),
      },
      tournamentRegistration: {
        findMany: jest.fn().mockResolvedValue([
          { playerProfile: { id: 'm1', fullName: 'Male 1', gender: 'MALE' } },
          { playerProfile: { id: 'f1', fullName: 'Female 1', gender: 'FEMALE' } },
          { playerProfile: { id: 'm2', fullName: 'Male 2', gender: 'MALE' } },
          { playerProfile: { id: 'f2', fullName: 'Female 2', gender: 'FEMALE' } },
        ]),
      },
      $transaction: jest.fn(),
    };
    const service = new TeamService(
      prisma as any,
      { log: jest.fn() } as any,
      {} as any,
    );

    await expect(service.saveManualAssignment('t1', {
      teams: [
        { code: 'A', name: 'Đội A', playerIds: ['m1', 'f1'] },
        { code: 'B', name: 'Đội B', playerIds: ['m1', 'f2'] },
      ],
    }, 'u1')).rejects.toThrow('không được xếp vào nhiều đội');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('uses the standard ruleset for draw preview when an old tournament has no ruleset attached', async () => {
    const createTeamDraw = jest.fn().mockResolvedValue({
      id: 'draw1',
      status: 'PREVIEW',
    });
    const prisma = {
      tournament: {
        findUnique: jest.fn().mockResolvedValue({
          id: 't1',
          organizationId: 'org1',
          status: 'PLAYERS_READY',
          ruleset: null,
        }),
      },
      tournamentRuleset: {
        findUnique: jest.fn().mockResolvedValue({
          teamCompositionRule: {
            teamSize: 5,
            maleCount: 3,
            femaleCount: 2,
          },
        }),
      },
      tournamentRegistration: {
        findMany: jest.fn().mockResolvedValue([
          { playerProfile: { id: 'm1', fullName: 'Male 1', gender: 'MALE' } },
          { playerProfile: { id: 'm2', fullName: 'Male 2', gender: 'MALE' } },
          { playerProfile: { id: 'm3', fullName: 'Male 3', gender: 'MALE' } },
          { playerProfile: { id: 'f1', fullName: 'Female 1', gender: 'FEMALE' } },
          { playerProfile: { id: 'f2', fullName: 'Female 2', gender: 'FEMALE' } },
        ]),
      },
      teamDraw: {
        create: createTeamDraw,
      },
    };

    const service = new TeamService(
      prisma as any,
      { log: jest.fn() } as any,
      {} as any,
    );

    await expect(service.createDrawPreview('t1', 'seed', 'u1')).resolves.toEqual({
      id: 'draw1',
      status: 'PREVIEW',
    });
    expect(prisma.tournamentRuleset.findUnique).toHaveBeenCalledWith({
      where: { id: '00000000-0000-0000-0000-000000000010' },
      include: { teamCompositionRule: true },
    });
    expect(createTeamDraw).toHaveBeenCalled();
  });

  it('rejects draw preview when player composition does not match ruleset', async () => {
    const createTeamDraw = jest.fn();
    const prisma = {
      tournament: {
        findUnique: jest.fn().mockResolvedValue({
          id: 't1',
          organizationId: 'org1',
          status: 'PLAYERS_READY',
          ruleset: {
            teamCompositionRule: {
              teamSize: 5,
              maleCount: 3,
              femaleCount: 2,
            },
          },
        }),
      },
      tournamentRegistration: {
        findMany: jest.fn().mockResolvedValue([
          { playerProfile: { id: 'p1', fullName: 'Player 1', gender: 'male' } },
          { playerProfile: { id: 'p2', fullName: 'Player 2', gender: 'male' } },
          { playerProfile: { id: 'p3', fullName: 'Player 3', gender: 'male' } },
          { playerProfile: { id: 'p4', fullName: 'Player 4', gender: 'male' } },
          { playerProfile: { id: 'p5', fullName: 'Player 5', gender: 'male' } },
        ]),
      },
      teamDraw: {
        create: createTeamDraw,
      },
    };

    const service = new TeamService(
      prisma,
      { log: jest.fn() } as any,
      {} as any,
    );
    const createDrawPreview = () =>
      service.createDrawPreview('t1', undefined, 'u1');

    await expect(createDrawPreview()).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(createDrawPreview()).rejects.toThrow('Bốc thăm đang khóa');
    expect(createTeamDraw).not.toHaveBeenCalled();
  });
});
