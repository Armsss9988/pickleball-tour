'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarWrapper } from '@/components/sidebar';
import { PageLoading } from '@/components/loading-skeleton';
import { getCurrentUser, type CurrentUserState } from '@/lib/current-user';
import {
  areaFromPath,
  getAdminRouteRedirect,
} from '@/lib/admin-route-access';
import { buildTournamentUxContext } from '@/lib/tournament-ux-context';
import {
  getActionAccess,
  getPublishReadiness,
  getVisibleAreasForRole,
} from '@/lib/tournament-ux-policy';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';

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

// ─── Floating Publish Button ─────────────────────────────────────────────────

function FloatingPublishButton({
  tournamentId,
  isPublished,
  canPublish,
  onPublished,
}: {
  tournamentId: string;
  isPublished: boolean;
  canPublish: boolean;
  onPublished: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const handlePublish = useCallback(async () => {
    if (!canPublish || loading || isPublished) return;

    const confirmed = window.confirm(
      'Công khai giải sẽ mở trang public cho khán giả theo dõi lịch thi đấu và kết quả realtime. Bạn có chắc muốn tiếp tục?',
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      await apiFetch(`/tournaments/${tournamentId}/publish`, { method: 'POST' });
      onPublished();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể công khai giải lúc này.';
      window.alert(`Lỗi: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [canPublish, isPublished, loading, tournamentId, onPublished]);

  if (isPublished) {
    return (
      <div
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 shadow-lg backdrop-blur-sm"
        style={{ pointerEvents: 'none' }}
      >
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-bold text-emerald-400">Đang công khai</span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="relative">
        {/* Tooltip */}
        {showTooltip && !canPublish && (
          <div className="absolute bottom-full right-0 mb-2 w-56 rounded-xl border border-slate-700/80 bg-slate-900 p-3 text-xs text-slate-300 shadow-xl">
            Cần có lịch thi đấu, đội và thông tin giải trước khi công khai.
            <div className="absolute bottom-0 right-4 translate-y-full border-4 border-transparent border-t-slate-900" />
          </div>
        )}

        <button
          type="button"
          disabled={!canPublish || loading}
          onClick={handlePublish}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className={`
            group flex items-center gap-2.5 rounded-2xl px-5 py-3 text-sm font-bold shadow-2xl
            transition-all duration-200 active:scale-95
            ${canPublish
              ? 'cursor-pointer bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-500/30'
              : 'cursor-not-allowed bg-slate-800 text-slate-500 border border-slate-700/60'
            }
            ${loading ? 'opacity-75' : ''}
          `}
          aria-label="Công khai giải đấu"
        >
          {loading ? (
            <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <span className="text-base leading-none">🌐</span>
          )}
          <span>{loading ? 'Đang công khai...' : 'Công khai giải'}</span>
        </button>
      </div>
    </div>
  );
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export default function TournamentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentUser = useSyncExternalStore(
    subscribeToUserStore,
    getCurrentUser,
    () => guestUser,
  );
  const { tournament, loading, reload } = useActiveTournament(currentUser.role);

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

  const isAdminRole =
    currentUser.role === 'btc_admin' || currentUser.role === 'super_admin';

  const publishReadiness = useMemo(() => getPublishReadiness(context), [context]);
  const publishAccess = useMemo(
    () => getActionAccess('publishTournament', currentUser.role, context),
    [context, currentUser.role],
  );
  const isPublished = Boolean(tournament?.publicEnabled);
  const canPublish = !isPublished && publishAccess.allowed && publishReadiness.ready;

  const handlePublished = useCallback(() => {
    reload();
    router.refresh();
  }, [reload, router]);

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

      {/* Floating publish button — only for admin, always visible */}
      {isAdminRole && tournament && (
        <FloatingPublishButton
          tournamentId={tournament.id}
          isPublished={isPublished}
          canPublish={canPublish}
          onPublished={handlePublished}
        />
      )}
    </div>
  );
}
