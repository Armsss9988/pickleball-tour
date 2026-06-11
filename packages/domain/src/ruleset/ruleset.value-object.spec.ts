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
    expect(ruleset.teamComposition!.teamSize).toBe(6);
    expect(ruleset.teamComposition!.maleCount).toBe(0);
    expect(ruleset.teamComposition!.femaleCount).toBe(0);
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

  it('should validate single_game ruleset successfully', () => {
    const validSingle = {
      name: 'Trận đơn 11đ',
      sport: 'pickleball',
      matchFormat: 'single_game',
      segments: [],
      teamComposition: {
        teamSize: 1,
        maleCount: 0,
        femaleCount: 0,
        allMustPlay: true,
      },
      playerLimits: [],
      overlapRules: [],
      scoringConfig: {
        winScore: 11,
        noDeuce: false,
        deuceMaxScore: 15,
        pointsForWin: 3,
        pointsForLoss: 0,
      },
    };
    const ruleset = new Ruleset(validSingle as any);
    expect(ruleset.matchFormat).toBe('single_game');
    expect(ruleset.scoringConfig.winScore).toBe(11);
  });

  it('should throw validation error for single_game ruleset with segments', () => {
    const invalidSingle = {
      name: 'Trận đơn lỗi',
      sport: 'pickleball',
      matchFormat: 'single_game',
      segments: [
        { segmentKey: 'seg_1', name: 'Chặng 1', targetScore: 8, playerCount: 2, genderRule: 'any', orderIndex: 0 },
      ],
      teamComposition: {
        teamSize: 1,
        maleCount: 0,
        femaleCount: 0,
        allMustPlay: true,
      },
      playerLimits: [],
      overlapRules: [],
      scoringConfig: {
        winScore: 11,
        noDeuce: false,
        pointsForWin: 3,
        pointsForLoss: 0,
      },
    };
    expect(() => new Ruleset(invalidSingle as any)).toThrow('Thể thức trận đơn không được cấu hình các chặng thi đấu.');
  });

  it('should validate best_of ruleset successfully', () => {
    const validBestOf = {
      name: 'BO3 Sets 11đ',
      sport: 'pickleball',
      matchFormat: 'best_of',
      segments: [],
      teamComposition: {
        teamSize: 2,
        maleCount: 0,
        femaleCount: 0,
        allMustPlay: true,
      },
      playerLimits: [],
      overlapRules: [],
      scoringConfig: {
        winScore: 2,
        noDeuce: false,
        gamePointScore: 11,
        setsToWin: 2,
        lastSetPointScore: 15,
        deuceMaxScore: 17,
        pointsForWin: 3,
        pointsForLoss: 0,
      },
    };
    const ruleset = new Ruleset(validBestOf as any);
    expect(ruleset.matchFormat).toBe('best_of');
    expect(ruleset.scoringConfig.setsToWin).toBe(2);
  });

  it('defaults new operational toggles to safe values', () => {
    const ruleset = new Ruleset(rulesetStandard as any);

    expect(ruleset.thirdPlaceMatchEnabled).toBe(false);
    expect(ruleset.quickScoreEntryEnabled).toBe(false);
    expect(ruleset.requireLineup).toBe(true);
  });

  it('exposes configured operational toggles', () => {
    const ruleset = new Ruleset({
      ...rulesetStandard,
      thirdPlaceMatchEnabled: true,
      quickScoreEntryEnabled: true,
      requireLineup: false,
    } as any);

    expect(ruleset.thirdPlaceMatchEnabled).toBe(true);
    expect(ruleset.quickScoreEntryEnabled).toBe(true);
    expect(ruleset.requireLineup).toBe(false);
  });

  it('defaults knockout bracket config to automatic source seeding', () => {
    const ruleset = new Ruleset(rulesetStandard as any);

    expect(ruleset.knockoutBracketSize).toBeNull();
    expect(ruleset.knockoutSeedSlots).toEqual([]);
  });

  it('exposes configured knockout source slots', () => {
    const ruleset = new Ruleset({
      ...rulesetStandard,
      knockoutBracketSize: 8,
      knockoutSeedSlots: [
        { slotNo: 1, sourceKey: 'A1' },
        { slotNo: 8, sourceKey: 'B2' },
        { slotNo: 4, sourceKey: null },
      ],
    } as any);

    expect(ruleset.knockoutBracketSize).toBe(8);
    expect(ruleset.knockoutSeedSlots).toEqual([
      { slotNo: 1, sourceKey: 'A1' },
      { slotNo: 8, sourceKey: 'B2' },
      { slotNo: 4, sourceKey: null },
    ]);
  });

  it('should throw validation error for best_of ruleset with invalid setsToWin', () => {
    const invalidBestOf = {
      name: 'BO3 Sets lỗi',
      sport: 'pickleball',
      matchFormat: 'best_of',
      segments: [],
      teamComposition: {
        teamSize: 2,
        maleCount: 0,
        femaleCount: 0,
        allMustPlay: true,
      },
      playerLimits: [],
      overlapRules: [],
      scoringConfig: {
        winScore: 2,
        noDeuce: false,
        gamePointScore: 11,
        setsToWin: 10,
        pointsForWin: 3,
        pointsForLoss: 0,
      },
    };
    expect(() => new Ruleset(invalidBestOf as any)).toThrow('Số set cần thắng để thắng trận đấu phải từ 1 đến 5.');
  });
});
