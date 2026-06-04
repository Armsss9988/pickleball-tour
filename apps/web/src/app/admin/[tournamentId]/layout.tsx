'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarWrapper } from '@/components/sidebar';
import { PageLoading } from '@/components/loading-skeleton';
import { getCurrentUser, type CurrentUserState } from '@/lib/current-user';
import { buildTournamentUxContext } from '@/lib/tournament-ux-context';
import { getVisibleAreasForRole, type AppRole, type AreaKey } from '@/lib/tournament-ux-policy';
import { useActiveTournament } from '@/lib/use-tournament';

function areaFromPath(pathname: string): AreaKey {
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

function getRoleFallbackHref(role: AppRole, tournamentId: string): string {
  if (role === 'scorer') {
    return `/admin/${tournamentId}/scoring`;
  }

  if (role === 'captain') {
    return `/admin/${tournamentId}/lineup`;
  }

  return `/admin/${tournamentId}`;
}

const guestUser: CurrentUserState = {
  user: null,
  role: 'guest',
  authenticated: false,
};

function subscribeToUserStore(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleStorage = () => onStoreChange();
  window.addEventListener('storage', handleStorage);

  return () => window.removeEventListener('storage', handleStorage);
}

export default function TournamentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { tournament, loading } = useActiveTournament();
  const currentUser = useSyncExternalStore(
    subscribeToUserStore,
    getCurrentUser,
    () => guestUser,
  );

  const context = useMemo(
    () => buildTournamentUxContext({ tournament }),
    [tournament],
  );

  const currentArea = areaFromPath(pathname);
  const visibleAreas = useMemo(() => {
    return new Set(getVisibleAreasForRole(currentUser.role, context));
  }, [context, currentUser.role]);

  const shouldRedirectGuest = Boolean(
    tournament
    && currentUser
    && currentUser.role === 'guest',
  );

  const shouldRedirectForbiddenArea = Boolean(
    tournament
    && currentUser
    && (currentUser.role === 'super_admin' || currentUser.role === 'btc_admin')
    && !visibleAreas.has(currentArea)
  );

  const fallbackHref = tournament ? getRoleFallbackHref(currentUser.role, tournament.id) : '/login';

  useEffect(() => {
    if (loading || !tournament) {
      return;
    }

    if (shouldRedirectGuest) {
      router.replace(tournament.publicEnabled && tournament.slug ? `/t/${tournament.slug}` : '/login');
      return;
    }

    if (shouldRedirectForbiddenArea) {
      router.replace(fallbackHref);
    }
  }, [
    fallbackHref,
    loading,
    router,
    shouldRedirectForbiddenArea,
    shouldRedirectGuest,
    tournament,
  ]);

  if (loading || shouldRedirectGuest || shouldRedirectForbiddenArea) {
    return <PageLoading />;
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      <SidebarWrapper
        context={context}
        role={currentUser.role}
        userDisplayName={currentUser.user?.displayName ?? null}
      />
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        <div className="h-16 md:h-0 w-full flex-shrink-0" />
        <div className="w-full flex-1 min-h-0">
          {children}
        </div>
      </main>
    </div>
  );
}
