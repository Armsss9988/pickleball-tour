import { BadRequestException } from '@nestjs/common';
import { TeamService } from './team.service';

describe('TeamService dependency guards', () => {
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
          {
            playerProfile: {
              id: 'p1',
              fullName: 'Player 1',
              gender: 'male',
            },
          },
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
