import { describe, it, expect } from 'vitest';
import { LineupValidator } from './lineup.validator';
import { Ruleset } from '../ruleset/ruleset.value-object';

describe('LineupValidator', () => {
  const mockRulesetDto = {
    name: 'Test Ruleset',
    sport: 'pickleball',
    isTemplate: false,
    segments: [
      { segmentKey: 'seg1', name: 'Chặng 1', targetScore: 8, playerCount: 2, genderRule: 'any', orderIndex: 0, isDrawable: true },
      { segmentKey: 'seg2', name: 'Chặng 2', targetScore: 16, playerCount: 2, genderRule: 'any', orderIndex: 1, isDrawable: true },
    ],
    teamComposition: {
      teamSize: 4,
      maleCount: 0,
      femaleCount: 0,
      allMustPlay: true,
    },
    playerLimits: [
      { gender: 'MALE', minSegments: 1, maxSegments: 1 },
      { gender: 'FEMALE', minSegments: 1, maxSegments: 1 },
    ],
    overlapRules: [],
    scoringConfig: {
      winScore: 16,
      noDeuce: true,
      sideSwitchAfterSegments: 0,
      pointsForWin: 3,
      pointsForLoss: 0,
    },
  };

  const ruleset = new Ruleset(mockRulesetDto as any);

  const teamMembers = [
    { id: 'p1', fullName: 'Player 1', gender: 'MALE' as const },
    { id: 'p2', fullName: 'Player 2', gender: 'FEMALE' as const },
    { id: 'p3', fullName: 'Player 3', gender: 'MALE' as const },
    { id: 'p4', fullName: 'Player 4', gender: 'FEMALE' as const },
  ];

  it('validates a correct lineup where all members play exactly once', () => {
    const lineups = [
      { segmentKey: 'seg1', playerIds: ['p1', 'p2'] },
      { segmentKey: 'seg2', playerIds: ['p3', 'p4'] },
    ];

    const result = LineupValidator.validate(lineups, teamMembers, 'Đội A', ruleset);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails validation when a segment has wrong player count', () => {
    const lineups = [
      { segmentKey: 'seg1', playerIds: ['p1'] },
      { segmentKey: 'seg2', playerIds: ['p3', 'p4'] },
    ];

    const result = LineupValidator.validate(lineups, teamMembers, 'Đội A', ruleset);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('phải đăng ký đúng 2 VĐV');
  });

  it('fails validation when a player plays too many segments (overlap violation)', () => {
    const lineups = [
      { segmentKey: 'seg1', playerIds: ['p1', 'p2'] },
      { segmentKey: 'seg2', playerIds: ['p1', 'p4'] }, // Player 1 overlaps
    ];

    const result = LineupValidator.validate(lineups, teamMembers, 'Đội A', ruleset);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('vi phạm số chặng thi đấu: đăng ký 2 chặng'))).toBe(true);
  });

  it('fails validation when allMustPlay is true but a player is benched', () => {
    const lineups = [
      { segmentKey: 'seg1', playerIds: ['p1', 'p2'] },
      { segmentKey: 'seg2', playerIds: ['p1', 'p3'] }, // p4 is benched, p1 plays twice (which also violates limits)
    ];

    const result = LineupValidator.validate(lineups, teamMembers, 'Đội A', ruleset);
    expect(result.valid).toBe(false);
    // Should complain about p4 not playing
    expect(result.errors.some(e => e.includes('chưa ra sân: Player 4'))).toBe(true);
  });
});
