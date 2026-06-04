'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarWrapper } from '@/components/sidebar';
import { PageLoading } from '@/components/loading-skeleton';
import { getCurrentUser, type CurrentUserState } from '@/lib/current-user';
import {
  areaFromPath,
  getAdminRouteRedirect,
} from '@/lib/admin-route-access';
import { buildTournamentUxContext } from '@/lib/tournament-ux-context';
import { getVisibleAreasForRole, type AreaKey } from '@/lib/tournament-ux-policy';
import { useActiveTournament } from '@/lib/use-tournament';

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
  const currentUser = useSyncExternalStore(
    subscribeToUserStore,
    getCurrentUser,
    () => guestUser,
  );
  const { tournament, loading } = useActiveTournament(currentUser.role);

  const context = useMemo(
    () => buildTournamentUxContext({ tournament }),
    [tournament],
  );

  const currentArea = areaFromPath(pathname);
  const visibleAreas = useMemo(() => {
    return new Set(getVisibleAreasForRole(currentUser.role, context));
  }, [context, currentUser.role]);

  const redirectHref = useMemo(() => {
    if (loading) {
      return null;
    }

    return getAdminRouteRedirect({
      role: currentUser.role,
      currentArea,
      visibleAreas,
      tournament: tournament
        ? {
            id: tournament.id,
            slug: tournament.slug,
            publicEnabled: tournament.publicEnabled,
          }
        : null,
    });
  }, [currentArea, currentUser.role, loading, tournament, visibleAreas]);

  useEffect(() => {
    if (loading || !redirectHref) {
      return;
    }
    router.replace(redirectHref);
  }, [
    loading,
    redirectHref,
    router,
  ]);

  if (loading || redirectHref) {
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
