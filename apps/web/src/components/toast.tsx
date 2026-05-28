'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from './icons';
import type { LucideIcon } from './icons';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextType {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

const variantConfig: Record<ToastVariant, { icon: LucideIcon; border: string; iconColor: string }> = {
  success: { icon: CheckCircle2, border: 'border-emerald-500/20', iconColor: 'text-emerald-400' },
  error:   { icon: XCircle,      border: 'border-rose-500/20',    iconColor: 'text-rose-400' },
  warning: { icon: AlertCircle,  border: 'border-amber-500/20',   iconColor: 'text-amber-400' },
  info:    { icon: Info,         border: 'border-sky-500/20',     iconColor: 'text-sky-400' },
};

function ToastNotification({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const config = variantConfig[item.variant];
  const IconComp = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(item.id), 4000);
    return () => clearTimeout(timer);
  }, [item.id, onDismiss]);

  return (
    <div className={`
      flex items-center gap-3 bg-slate-800 border ${config.border}
      rounded-xl px-4 py-3 shadow-2xl min-w-[300px] max-w-[420px]
      animate-slide-right
    `}>
      <IconComp className={`w-5 h-5 ${config.iconColor} flex-shrink-0`} />
      <span className="text-sm text-slate-200 flex-1">{item.message}</span>
      <button
        onClick={() => onDismiss(item.id)}
        className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, message, variant }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2">
        {toasts.map(item => (
          <ToastNotification key={item.id} item={item} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
