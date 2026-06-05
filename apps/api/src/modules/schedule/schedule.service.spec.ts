import { ScheduleService } from './schedule.service';

describe('ScheduleService', () => {
  it('generates group matches without reusing the same court/time across groups', async () => {
    const createdMatches: any[] = [];
    const tournament = {
      id: 't1',
      organizationId: 'org1',
      openingTime: new Date('2026-06-05T01:00:00.000Z'),
      ruleset: {
        segmentDefinitions: [
          {
            segmentKey: 'mixed',
            name: 'Đôi nam nữ',
            targetScore: 8,
            orderIndex: 0,
          },
        ],
      },
      groups: [
        {
          id: 'gA',
          name: 'Bảng A',
          groupTeams: [{ teamId: 'a1' }, { teamId: 'a2' }],
        },
        {
          id: 'gB',
          name: 'Bảng B',
          groupTeams: [{ teamId: 'b1' }, { teamId: 'b2' }],
        },
      ],
    };
    const tx: any = {
      stage: {
        findFirst: jest.fn().mockResolvedValue({ id: 'stage1' }),
      },
      matchSegment: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
      },
      match: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn(async ({ data }) => {
          const match = { id: `m${createdMatches.length + 1}`, ...data };
          createdMatches.push(match);
          return match;
        }),
        findMany: jest.fn(async () => createdMatches),
      },
      court: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'court1',
            name: 'Sân 1',
            venueName: 'GOLAB',
          },
        ]),
      },
    };
    const prisma = {
      tournament: {
        findUnique: jest.fn().mockResolvedValue(tournament),
      },
      $transaction: jest.fn(async (callback) => callback(tx)),
    };
    const service = new ScheduleService(
      prisma as any,
      { log: jest.fn().mockResolvedValue(undefined) } as any,
      { validateAll: jest.fn().mockResolvedValue(undefined) } as any,
    );

    await service.generateGroupStageSchedule('t1', 'u1');

    expect(createdMatches).toHaveLength(2);
    expect(createdMatches[0].courtId).toBe('court1');
    expect(createdMatches[1].courtId).toBe('court1');
    expect(createdMatches[0].scheduledTime.toISOString()).toBe('2026-06-05T01:00:00.000Z');
    expect(createdMatches[1].scheduledTime.toISOString()).toBe('2026-06-05T01:30:00.000Z');
  });

  it('uses custom duration and start time when provided', async () => {
    const createdMatches: any[] = [];
    const tx: any = {
      stage: { findFirst: jest.fn().mockResolvedValue({ id: 'stage1' }) },
      matchSegment: { deleteMany: jest.fn(), create: jest.fn() },
      match: {
        deleteMany: jest.fn(),
        create: jest.fn(async ({ data }) => {
          const match = { id: `m${createdMatches.length + 1}`, ...data };
          createdMatches.push(match);
          return match;
        }),
        findMany: jest.fn(async () => createdMatches),
      },
      court: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const prisma = {
      tournament: {
        findUnique: jest.fn().mockResolvedValue({
          id: 't1',
          organizationId: 'org1',
          openingTime: new Date('2026-06-05T01:00:00.000Z'),
          ruleset: {
            segmentDefinitions: [{ segmentKey: 'mixed', name: 'Mixed', targetScore: 8, orderIndex: 0 }],
          },
          groups: [
            { id: 'gA', name: 'Bảng A', groupTeams: [{ teamId: 'a1' }, { teamId: 'a2' }] },
            { id: 'gB', name: 'Bảng B', groupTeams: [{ teamId: 'b1' }, { teamId: 'b2' }] },
            { id: 'gC', name: 'Bảng C', groupTeams: [{ teamId: 'c1' }, { teamId: 'c2' }] },
          ],
        }),
      },
      $transaction: jest.fn(async (callback) => callback(tx)),
    };
    const service = new ScheduleService(
      prisma as any,
      { log: jest.fn().mockResolvedValue(undefined) } as any,
      { validateAll: jest.fn().mockResolvedValue(undefined) } as any,
    );

    await service.generateGroupStageSchedule('t1', 'u1', {
      durationMinutes: 20,
      startTime: '2026-06-05T02:15:00.000Z',
    });

    expect(createdMatches.map((match) => match.scheduledTime.toISOString())).toEqual([
      '2026-06-05T02:15:00.000Z',
      '2026-06-05T02:15:00.000Z',
      '2026-06-05T02:35:00.000Z',
    ]);
    expect(createdMatches.map((match) => match.courtName)).toEqual(['Sân 1', 'Sân 2', 'Sân 1']);
  });
});
