import { describe, it, expect } from 'vitest';
import { Tournament } from './tournament.entity';

describe('Tournament Entity', () => {
  it('should transition status successfully if allowed', () => {
    const t = new Tournament('t-1', 'DRAFT');
    expect(t.status).toBe('DRAFT');

    t.transitionTo('PUBLISHED');
    expect(t.status).toBe('PUBLISHED');

    t.transitionTo('DRAFT');
    expect(t.status).toBe('DRAFT');
  });

  it('should fail transition if invalid', () => {
    const t = new Tournament('t-1', 'DRAFT');
    expect(() => t.transitionTo('DRAFT')).toThrow();
  });
});
