import { BadRequestException } from '@nestjs/common';
import { GroupService } from './group.service';

describe('GroupService dependency guards', () => {
  it('rejects group assignment when confirmed teams are missing', async () => {
    const prisma = {
      tournament: {
        findUnique: jest.fn().mockResolvedValue({
          id: 't1',
          organizationId: 'org1',
        }),
      },
      team: {
        count: jest.fn().mockResolvedValue(1),
      },
    };

    const service = new GroupService(
      prisma as any,
      { log: jest.fn() } as any,
      { validateAll: jest.fn() } as any,
    );
    const assignTeams = () => service.assignTeams('t1', [], 'u1');

    await expect(assignTeams()).rejects.toBeInstanceOf(BadRequestException);
    await expect(assignTeams()).rejects.toThrow('Phân bảng yêu cầu ít nhất 2 đội/entry');
  });

  it('marks tournament as group assigned when assignment is saved', async () => {
    const tournament = {
      id: 't1',
      organizationId: 'org1',
    };
    const assignment = [
      { code: 'A', teamIds: ['team1', 'team2', 'team3', 'team4'] },
      { code: 'B', teamIds: ['team5', 'team6', 'team7', 'team8'] },
    ];
    const stage = { id: 'stage1' };
    const tournamentUpdate = jest.fn().mockResolvedValue({});

    const tx: any = {
      stage: {
        findFirst: jest.fn().mockResolvedValue(stage),
        create: jest.fn(),
      },
      groupTeam: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
      },
      group: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'groupA', code: 'A' })
          .mockResolvedValueOnce({ id: 'groupB', code: 'B' }),
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      tournament: {
        update: tournamentUpdate,
      },
    };

    const prisma = {
      tournament: {
        findUnique: jest.fn().mockResolvedValue(tournament),
      },
      team: {
        count: jest.fn().mockResolvedValue(8),
      },
      group: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(async (callback) => callback(tx)),
    };
    const auditService = { log: jest.fn().mockResolvedValue(undefined) };
    const validatorService = { validateAll: jest.fn().mockResolvedValue(undefined) };

    const service = new GroupService(prisma as any, auditService as any, validatorService as any);

    await service.assignTeams('t1', assignment, 'u1');

    expect(tournamentUpdate).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { status: 'GROUP_ASSIGNED' },
    });
    expect(validatorService.validateAll).toHaveBeenCalledWith('t1', expect.anything());
  });
});
