import { describe, it, expect } from 'vitest';
import { getEffectivePhase, canEditRuleset, canUnpublish, isRulesetLocked, isScoringAllowed } from './tournament-phase';

describe('getEffectivePhase', () => {
  it('DRAFT status → DRAFT phase regardless of dates', () => {
    const openingTime = new Date('2026-06-01T08:00:00Z');
    const now = new Date('2026-06-02T08:00:00Z');
    expect(getEffectivePhase('DRAFT', openingTime, true, now)).toBe('DRAFT');
    expect(getEffectivePhase('DRAFT', openingTime, false, now)).toBe('DRAFT');
  });

  it('pre-publish lifecycle statuses still resolve to DRAFT phase', () => {
    const openingTime = new Date('2026-06-01T08:00:00Z');
    const now = new Date('2026-06-02T08:00:00Z');
    expect(getEffectivePhase('PLAYER_IMPORT', openingTime, true, now)).toBe('DRAFT');
    expect(getEffectivePhase('COMPLETED', openingTime, true, now)).toBe('DRAFT');
  });

  it('PUBLISHED + future openingTime → PUBLISHED_BEFORE_START', () => {
    const openingTime = new Date('2026-06-01T08:00:00Z');
    const now = new Date('2026-05-31T08:00:00Z');
    expect(getEffectivePhase('PUBLISHED', openingTime, true, now)).toBe('PUBLISHED_BEFORE_START');
    expect(getEffectivePhase('PUBLISHED', openingTime, false, now)).toBe('PUBLISHED_BEFORE_START');
  });

  it('PUBLISHED + past openingTime + isOperationallyReady → PUBLISHED_RUNNING', () => {
    const openingTime = new Date('2026-06-01T08:00:00Z');
    const now = new Date('2026-06-02T08:00:00Z');
    expect(getEffectivePhase('PUBLISHED', openingTime, true, now)).toBe('PUBLISHED_RUNNING');
  });

  it('PUBLISHED + past openingTime + NOT isOperationallyReady → PUBLISHED_NOT_READY', () => {
    const openingTime = new Date('2026-06-01T08:00:00Z');
    const now = new Date('2026-06-02T08:00:00Z');
    expect(getEffectivePhase('PUBLISHED', openingTime, false, now)).toBe('PUBLISHED_NOT_READY');
  });

  it('PUBLISHED + null openingTime → PUBLISHED_BEFORE_START', () => {
    expect(getEffectivePhase('PUBLISHED', null, true)).toBe('PUBLISHED_BEFORE_START');
  });
});

describe('canEditRuleset', () => {
  it('allows edit unless phase is PUBLISHED_RUNNING and has scored matches', () => {
    expect(canEditRuleset('DRAFT', false)).toBe(true);
    expect(canEditRuleset('PUBLISHED_BEFORE_START', false)).toBe(true);
    expect(canEditRuleset('PUBLISHED_NOT_READY', false)).toBe(true);
    expect(canEditRuleset('PUBLISHED_RUNNING', false)).toBe(true);
    expect(canEditRuleset('PUBLISHED_RUNNING', true)).toBe(false);
  });
});

describe('canUnpublish', () => {
  it('allows unpublish only in PUBLISHED_BEFORE_START', () => {
    expect(canUnpublish('PUBLISHED_BEFORE_START')).toBe(true);
    expect(canUnpublish('DRAFT')).toBe(false);
    expect(canUnpublish('PUBLISHED_NOT_READY')).toBe(false);
    expect(canUnpublish('PUBLISHED_RUNNING')).toBe(false);
  });
});
