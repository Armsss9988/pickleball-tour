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
        count: jest.fn().mockResolvedValue(2),
      },
    };

    const service = new GroupService(prisma, { log: jest.fn() } as any);
    const assignTeams = () => service.assignTeams('t1', [], 'u1');

    await expect(assignTeams()).rejects.toBeInstanceOf(BadRequestException);
    await expect(assignTeams()).rejects.toThrow('Phân bảng đang khóa');
  });
});
