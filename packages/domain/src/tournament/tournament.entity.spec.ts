import { describe, it, expect } from 'vitest';
import { Tournament } from './tournament.entity';

describe('Tournament Entity', () => {
  it('should transition status successfully if allowed', () => {
    const t = new Tournament('t-1', 'DRAFT');
    expect(t.status).toBe('DRAFT');

    t.transitionTo('PLAYER_IMPORT');
    expect(t.status).toBe('PLAYER_IMPORT');

    t.transitionTo('DRAFT');
    expect(t.status).toBe('DRAFT');
  });

  it('should fail transition if invalid', () => {
    const t = new Tournament('t-1', 'DRAFT');
    expect(() => t.transitionTo('DRAFT')).toThrow();
  });

  it('should allow publishing only after completion', () => {
    const t = new Tournament('t-1', 'COMPLETED');

    expect(t.canTransitionTo('DRAFT')).toBe(false);
    expect(t.canTransitionTo('PUBLISHED')).toBe(true);
    expect(() => t.transitionTo('DRAFT')).toThrow();
  });
});
