'use client';

import { ToastProvider } from '@/components/toast';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        {children}
      </div>
    </ToastProvider>
  );
}
