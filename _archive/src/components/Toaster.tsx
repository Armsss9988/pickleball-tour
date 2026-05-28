/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTournament } from '../context/TournamentContext';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export default function Toaster() {
  const { toasts, removeToast } = useTournament();

  return (
    <div id="toaster-container" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => {
          let Icon = Info;
          let iconColor = 'text-blue-500';
          let borderColor = 'border-blue-100';
          let bgColor = 'bg-white';

          if (toast.type === 'success') {
            Icon = CheckCircle;
            iconColor = 'text-emerald-500';
            borderColor = 'border-emerald-100';
          } else if (toast.type === 'error') {
            Icon = AlertCircle;
            iconColor = 'text-rose-500';
            borderColor = 'border-rose-100';
          } else if (toast.type === 'warning') {
            Icon = AlertTriangle;
            iconColor = 'text-amber-500';
            borderColor = 'border-amber-100';
          }

          return (
            <motion.div
              key={toast.id}
              id={`toast_${toast.id}`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border ${borderColor} ${bgColor} text-slate-800`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 text-sm font-medium leading-5">{toast.message}</div>
              <button
                id={`btn-close-toast-${toast.id}`}
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-lg hover:bg-slate-50"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
