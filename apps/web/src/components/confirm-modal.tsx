'use client';

import { AlertTriangle, Info, X } from './icons';

interface ConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

const variantStyles = {
  danger: {
    iconBg: 'bg-rose-500/15',
    iconColor: 'text-rose-400',
    btnClass: 'btn btn-danger',
  },
  warning: {
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-400',
    btnClass: 'btn btn-primary',
  },
  info: {
    iconBg: 'bg-sky-500/15',
    iconColor: 'text-sky-400',
    btnClass: 'btn btn-primary',
  },
};

export function ConfirmModal({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  variant = 'warning',
  loading = false,
}: ConfirmModalProps) {
  if (!open) return null;

  const v = variantStyles[variant];
  const IconComponent = variant === 'info' ? Info : AlertTriangle;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-in">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl ${v.iconBg} flex items-center justify-center mb-4`}>
          <IconComponent className={`w-6 h-6 ${v.iconColor}`} />
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-slate-100 mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-slate-400 leading-relaxed mb-6">{description}</p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="btn btn-ghost btn-sm"
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`${v.btnClass} btn-sm`}
            disabled={loading}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
