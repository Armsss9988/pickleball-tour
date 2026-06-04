import { describe, expect, it } from 'vitest';
import {
  areaFromPath,
  getAdminRouteRedirect,
} from './admin-route-access';
import type { AreaKey } from './tournament-ux-policy';

describe('admin route access', () => {
  it('maps admin paths to area keys', () => {
    expect(areaFromPath('/admin/t1/scoring')).toBe('scoring');
    expect(areaFromPath('/admin/t1/draw')).toBe('draw');
    expect(areaFromPath('/admin/t1')).toBe('dashboard');
  });

  it('redirects guests to public page when tournament is public', () => {
    expect(getAdminRouteRedirect({
      role: 'guest',
      currentArea: 'dashboard',
      visibleAreas: new Set(['public']),
      tournament: {
        id: 't1',
        slug: 'summer-open',
        publicEnabled: true,
      },
    })).toBe('/t/summer-open');
  });

  it('redirects guests to login when tournament is not public or cannot be resolved', () => {
    expect(getAdminRouteRedirect({
      role: 'guest',
      currentArea: 'dashboard',
      visibleAreas: new Set(['public']),
      tournament: {
        id: 't1',
        slug: null,
        publicEnabled: false,
      },
    })).toBe('/login');

    expect(getAdminRouteRedirect({
      role: 'guest',
      currentArea: 'dashboard',
      visibleAreas: new Set(['public']),
      tournament: null,
    })).toBe('/login');
  });

  it('redirects scorer away from dashboard and draw pages', () => {
    const visibleAreas = new Set<AreaKey>(['scoring']);

    expect(getAdminRouteRedirect({
      role: 'scorer',
      currentArea: 'dashboard',
      visibleAreas,
      tournament: {
        id: 't1',
        slug: 'summer-open',
        publicEnabled: true,
      },
    })).toBe('/admin/t1/scoring');

    expect(getAdminRouteRedirect({
      role: 'scorer',
      currentArea: 'draw',
      visibleAreas,
      tournament: {
        id: 't1',
        slug: 'summer-open',
        publicEnabled: true,
      },
    })).toBe('/admin/t1/scoring');
  });

  it('redirects captain away from dashboard and scoring pages', () => {
    const visibleAreas = new Set<AreaKey>(['lineup', 'team-schedule', 'team-results']);

    expect(getAdminRouteRedirect({
      role: 'captain',
      currentArea: 'dashboard',
      visibleAreas,
      tournament: {
        id: 't1',
        slug: 'summer-open',
        publicEnabled: true,
      },
    })).toBe('/admin/t1/lineup');

    expect(getAdminRouteRedirect({
      role: 'captain',
      currentArea: 'scoring',
      visibleAreas,
      tournament: {
        id: 't1',
        slug: 'summer-open',
        publicEnabled: true,
      },
    })).toBe('/admin/t1/lineup');
  });

  it('allows admins to stay on any admin area', () => {
    expect(getAdminRouteRedirect({
      role: 'btc_admin',
      currentArea: 'draw',
      visibleAreas: new Set(['dashboard', 'draw']),
      tournament: {
        id: 't1',
        slug: 'summer-open',
        publicEnabled: true,
      },
    })).toBeNull();
  });
});
