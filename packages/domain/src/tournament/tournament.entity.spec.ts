import { describe, it, expect } from 'vitest';
import { Tournament } from './tournament.entity';

describe('Tournament Entity', () => {
  it('should transition status successfully if allowed', () => {
    const t = new Tournament('t-1', 'DRAFT');
    expect(t.status).toBe('DRAFT');
    expect(t.isRulesetLocked()).toBe(false);

    t.transitionTo('PLAYER_IMPORT');
    expect(t.status).toBe('PLAYER_IMPORT');
    expect(t.isRulesetLocked()).toBe(true);
  });

  it('should fail transition if invalid', () => {
    const t = new Tournament('t-1', 'DRAFT');
    expect(() => t.transitionTo('RUNNING')).toThrow();
  });
});
