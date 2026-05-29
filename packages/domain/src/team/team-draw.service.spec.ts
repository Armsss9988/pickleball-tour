import { describe, it, expect } from 'vitest';
import { TeamDrawService } from './team-draw.service';
import playersFixture from '../../test-fixtures/golab/players-40-valid.json';

describe('Team Draw Service', () => {
  it('should draw gender-balanced teams correctly with seed', () => {
    const composition = { teamSize: 5, maleCount: 3, femaleCount: 2 };
    const result = TeamDrawService.draw(playersFixture as any, composition, 'golab-seed-123', 8);

    expect(result.teams).toHaveLength(8);
    expect(result.backups).toHaveLength(0); // 24 M + 16 F distributed perfectly to 8 teams

    for (const team of result.teams) {
      expect(team.players).toHaveLength(5);
      expect(team.players.filter((p) => p.gender === 'MALE')).toHaveLength(3);
      expect(team.players.filter((p) => p.gender === 'FEMALE')).toHaveLength(2);
    }
  });

  it('should draw gender-neutral teams correctly when maleCount and femaleCount are both 0', () => {
    const composition = { teamSize: 5, maleCount: 0, femaleCount: 0 };
    const result = TeamDrawService.draw(playersFixture as any, composition, 'golab-seed-123', 8);

    expect(result.teams).toHaveLength(8);
    expect(result.backups).toHaveLength(0);

    for (const team of result.teams) {
      expect(team.players).toHaveLength(5);
    }
  });
});
