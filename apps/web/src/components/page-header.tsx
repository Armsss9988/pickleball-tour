import type { LucideIcon } from './icons';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, icon: Icon, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6 w-full">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-amber-400" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight break-words">{title}</h1>
          {description && (
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5 leading-relaxed break-words">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

