'use client';

interface SeedSourcePanelProps {
  availableSources: string[]; // e.g. ['A1', 'B2', 'A2', 'B1']
  assignedSources: Set<string>; // sources currently placed in the bracket
  draggingSource: string | null;
  onDragStart: (source: string) => void;
  onDragEnd: () => void;
  selectedSource?: string | null;
  onSelectSource?: (source: string | null) => void;
}

export function SeedSourcePanel({
  availableSources,
  assignedSources,
  draggingSource,
  onDragStart,
  onDragEnd,
  selectedSource = null,
  onSelectSource,
}: SeedSourcePanelProps) {
  const unassigned = availableSources.filter((s) => !assignedSources.has(s));
  const assigned = availableSources.filter((s) => assignedSources.has(s));

  const badgeClasses = (source: string, isDragging: boolean, isSelected: boolean) =>
    `inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-grab active:cursor-grabbing select-none transition-all duration-200 ${
      isDragging
        ? 'opacity-40 scale-95 border-amber-500/40 bg-amber-500/10 text-amber-400'
        : isSelected
          ? 'ring-2 ring-brand-500/90 bg-brand-500/20 text-brand-300 border-brand-500 shadow-[0_0_12px_rgba(245,158,11,0.3)] scale-105'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:border-amber-500/60 hover:bg-amber-500/20 hover:scale-105'
    }`;

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        Hạt giống chưa xếp
      </div>

      <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60 min-h-[44px] flex flex-wrap gap-2">
        {unassigned.length === 0 ? (
          <span className="text-[11px] text-slate-600 italic self-center">Tất cả hạt giống đã được xếp vào sơ đồ</span>
        ) : (
          unassigned.map((source) => (
            <div
              key={source}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', source);
                e.dataTransfer.effectAllowed = 'move';
                onDragStart(source);
              }}
              onDragEnd={onDragEnd}
              onClick={() => onSelectSource?.(selectedSource === source ? null : source)}
              className={badgeClasses(source, draggingSource === source, selectedSource === source)}
              title={`Kéo hoặc Click để chọn và xếp ${source}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {source}
            </div>
          ))
        )}
      </div>

      {/* Miễn đấu badge (always draggable) */}
      <div className="flex items-center gap-2 flex-wrap mt-1">
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', '__BYE__');
            e.dataTransfer.effectAllowed = 'move';
            onDragStart('__BYE__');
          }}
          onDragEnd={onDragEnd}
          onClick={() => onSelectSource?.(selectedSource === '__BYE__' ? null : '__BYE__')}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-grab active:cursor-grabbing select-none transition-all duration-200 ${
            draggingSource === '__BYE__'
              ? 'opacity-40 scale-95 border-slate-600/40 bg-slate-700/20 text-slate-500'
              : selectedSource === '__BYE__'
                ? 'ring-2 ring-brand-500/90 bg-brand-500/20 text-brand-300 border-brand-500 shadow-[0_0_12px_rgba(245,158,11,0.3)] scale-105'
                : 'border-slate-700/60 bg-slate-800/40 text-slate-400 hover:border-slate-600 hover:bg-slate-700/40 hover:scale-105'
          }`}
          title="Kéo hoặc Click để chọn và xếp Miễn đấu (Bye)"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          Miễn đấu
        </div>

        {assigned.length > 0 && (
          <span className="text-[10px] text-slate-600">
            {assigned.length} hạt giống đã xếp: {assigned.join(', ')}
          </span>
        )}
      </div>
    </div>
  );
}
