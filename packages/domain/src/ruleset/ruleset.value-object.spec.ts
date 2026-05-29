import { describe, it, expect } from 'vitest';
import { Ruleset } from './ruleset.value-object';
import rulesetStandard from '../../test-fixtures/golab/ruleset-standard.json';

describe('Ruleset Value Object', () => {
  it('should create and validate standard ruleset successfully', () => {
    const ruleset = new Ruleset(rulesetStandard as any);
    expect(ruleset.name).toBe('Thể thức Tiếp sức 24 (GOLAB Standard)');
    expect(ruleset.scoringConfig.winScore).toBe(24);
  });

  it('should throw validation error for mismatched last segment target score', () => {
    const invalidRuleset = {
      ...rulesetStandard,
      scoringConfig: {
        ...rulesetStandard.scoringConfig,
        winScore: 30,
      },
    };
    expect(() => new Ruleset(invalidRuleset as any)).toThrow();
  });

  it('should support gender-neutral (any-gender) team compositions', () => {
    const neutralRuleset = {
      ...rulesetStandard,
      teamComposition: {
        teamSize: 6,
        maleCount: 0,
        femaleCount: 0,
        allMustPlay: true,
      },
    };
    const ruleset = new Ruleset(neutralRuleset as any);
    expect(ruleset.teamComposition.teamSize).toBe(6);
    expect(ruleset.teamComposition.maleCount).toBe(0);
    expect(ruleset.teamComposition.femaleCount).toBe(0);
  });

  it('should throw validation error for non-sequential segment orderIndex', () => {
    const invalidOrderRuleset = {
      ...rulesetStandard,
      segments: [
        { segmentKey: 'seg_1', name: 'Chặng 1', targetScore: 8, playerCount: 2, genderRule: 'any', orderIndex: 0 },
        { segmentKey: 'seg_2', name: 'Chặng 2', targetScore: 16, playerCount: 2, genderRule: 'any', orderIndex: 2 }, // Gap in index
      ],
    };
    expect(() => new Ruleset(invalidOrderRuleset as any)).toThrow('Thứ tự chặng thi đấu không liên tục hoặc không bắt đầu từ 0.');
  });

  it('should throw validation error for non-increasing target scores', () => {
    const invalidScoresRuleset = {
      ...rulesetStandard,
      scoringConfig: {
        ...rulesetStandard.scoringConfig,
        winScore: 12,
      },
      segments: [
        { segmentKey: 'seg_1', name: 'Chặng 1', targetScore: 8, playerCount: 2, genderRule: 'any', orderIndex: 0 },
        { segmentKey: 'seg_2', name: 'Chặng 2', targetScore: 6, playerCount: 2, genderRule: 'any', orderIndex: 1 }, // Target score drops
        { segmentKey: 'seg_3', name: 'Chặng 3', targetScore: 12, playerCount: 2, genderRule: 'any', orderIndex: 2 },
      ],
    };
    expect(() => new Ruleset(invalidScoresRuleset as any)).toThrow('phải lớn hơn chặng trước đó');
  });
});
