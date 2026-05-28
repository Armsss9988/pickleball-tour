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
});
