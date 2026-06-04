import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlayerService } from './player.service';

describe('PlayerService.removePlayer', () => {
  const auditService = { log: jest.fn() };
  const validatorService = {
    markSectionNeedsReview: jest.fn(),
    validateAll: jest.fn(),
  };

  const prisma = {
    tournament: {
      findUnique: jest.fn(),
    },
    tournamentRegistration: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    teamMember: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  let service: PlayerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlayerService(prisma as any, auditService as any, validatorService as any);
  });

  it('throws when the tournament does not exist', async () => {
    prisma.tournament.findUnique.mockResolvedValue(null);

    await expect(service.removePlayer('t1', 'p1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when the player is already assigned to a team', async () => {
    prisma.tournament.findUnique.mockResolvedValue({
      id: 't1',
      organizationId: 'org1',
    });
    prisma.tournamentRegistration.findUnique.mockResolvedValue({
      playerProfile: { fullName: 'Player One' },
    });
    prisma.teamMember.findFirst.mockResolvedValue({ id: 'tm1' });

    await expect(service.removePlayer('t1', 'p1', 'u1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.removePlayer('t1', 'p1', 'u1')).rejects.toThrow('đã được phân phối vào một đội tuyển');
    expect(prisma.tournamentRegistration.delete).not.toHaveBeenCalled();
  });

  it('deletes the registration and revalidates dependent sections', async () => {
    prisma.tournament.findUnique.mockResolvedValue({
      id: 't1',
      organizationId: 'org1',
    });

    const registration = {
      tournamentId: 't1',
      playerProfileId: 'p1',
      playerProfile: { fullName: 'Player One' },
    };

    prisma.tournamentRegistration.findUnique.mockResolvedValue(registration);
    prisma.teamMember.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma as any));

    await expect(service.removePlayer('t1', 'p1', 'u1')).resolves.toEqual({ success: true });

    expect(prisma.tournamentRegistration.delete).toHaveBeenCalledWith({
      where: {
        tournamentId_playerProfileId: {
          tournamentId: 't1',
          playerProfileId: 'p1',
        },
      },
    });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PLAYER_REMOVED',
        tournamentId: 't1',
        entityId: 'p1',
      }),
    );
    expect(validatorService.markSectionNeedsReview).toHaveBeenCalledWith('t1', ['players', 'teams']);
    expect(validatorService.validateAll).toHaveBeenCalledWith('t1');
  });
});
