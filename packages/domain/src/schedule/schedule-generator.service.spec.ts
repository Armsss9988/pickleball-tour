import { describe, it, expect } from 'vitest';
import { ScheduleGeneratorService } from './schedule-generator.service';

describe('Schedule Generator Service', () => {
  it('should generate correct pairings for 4 teams (6 matches)', () => {
    const teams = ['t1', 't2', 't3', 't4'];
    const pairings = ScheduleGeneratorService.generateRoundRobin(teams);
    
    // N * (N - 1) / 2 = 4 * 3 / 2 = 6 matches
    expect(pairings).toHaveLength(6);
    
    // Check uniqueness of matches
    const seen = new Set<string>();
    for (const match of pairings) {
      const key = [match.teamA, match.teamB].sort().join('-');
      seen.add(key);
    }
    expect(seen.size).toBe(6);
  });
});
