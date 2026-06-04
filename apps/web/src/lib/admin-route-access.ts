import type { AppRole, AreaKey } from './tournament-ux-policy';

export interface AdminRouteTournamentSummary {
  id: string;
  slug: string | null;
  publicEnabled: boolean;
}

export function areaFromPath(pathname: string): AreaKey {
  if (pathname.endsWith('/tournament')) return 'tournament';
  if (pathname.endsWith('/ruleset')) return 'ruleset';
  if (pathname.endsWith('/players')) return 'players';
  if (pathname.endsWith('/schedule')) return 'schedule';
  if (pathname.endsWith('/draw')) return 'draw';
  if (pathname.endsWith('/teams')) return 'teams';
  if (pathname.endsWith('/groups')) return 'groups';
  if (pathname.endsWith('/matches')) return 'matches';
  if (pathname.endsWith('/lineup')) return 'lineup';
  if (pathname.endsWith('/scoring')) return 'scoring';
  if (pathname.endsWith('/standings')) return 'standings';
  if (pathname.endsWith('/bracket')) return 'bracket';
  if (pathname.endsWith('/awards')) return 'awards';
  if (pathname.endsWith('/audit')) return 'audit';
  return 'dashboard';
}

export function getRoleFallbackHref(role: AppRole, tournamentId: string): string {
  if (role === 'scorer') {
    return `/admin/${tournamentId}/scoring`;
  }

  if (role === 'captain') {
    return `/admin/${tournamentId}/lineup`;
  }

  return `/admin/${tournamentId}`;
}

interface GetAdminRouteRedirectInput {
  role: AppRole;
  currentArea: AreaKey;
  visibleAreas: Set<AreaKey>;
  tournament: AdminRouteTournamentSummary | null;
}

export function getAdminRouteRedirect({
  role,
  currentArea,
  visibleAreas,
  tournament,
}: GetAdminRouteRedirectInput): string | null {
  if (role === 'guest') {
    if (!tournament) return '/login';
    return tournament.publicEnabled && tournament.slug ? `/t/${tournament.slug}` : '/login';
  }

  if (!tournament) {
    return null;
  }

  if (!visibleAreas.has(currentArea)) {
    return getRoleFallbackHref(role, tournament.id);
  }

  return null;
}
