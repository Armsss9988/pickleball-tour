'use client';

import { SidebarWrapper } from '@/components/sidebar';
import { ToastProvider } from '@/components/toast';
import { useActiveTournament } from '@/lib/use-tournament';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { tournament } = useActiveTournament();

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-950">
        <SidebarWrapper tournamentStatus={tournament?.status} />
        <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
          {/* Mobile top spacer for hamburger button */}
          <div className="h-16 md:h-0 w-full flex-shrink-0" />
          <div className="w-full flex-1 min-h-0">
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
