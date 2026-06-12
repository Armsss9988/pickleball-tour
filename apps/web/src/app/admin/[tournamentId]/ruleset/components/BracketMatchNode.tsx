'use client';

interface MatchSlot {
  slotNo: number;
  sourceKey: string | null; // null = empty, '__BYE__' = Miễn đấu, 'A1' etc.
}

interface BracketMatchNodeProps {
  label: string;        // e.g. 'SF 1', 'QF 2'
  roundName: string;    // e.g. 'Bán Kết'
  slotA: MatchSlot;
  slotB: MatchSlot;
  isEditing: boolean;
  isDragOver: boolean;
  draggingSource: string | null;
  selectedSource?: string | null;
  onDragOverSlot: (slotNo: number) => void;
  onDragLeaveSlot: () => void;
  onDropSlot: (slotNo: number, sourceKey: string) => void;
  onRemoveSlot: (slotNo: number) => void;
}

function formatSourceLabel(sourceKey: string | null): { label: string; isBye: boolean; isEmpty: boolean } {
  if (!sourceKey) return { label: '— chưa xếp —', isBye: false, isEmpty: true };
  if (sourceKey === '__BYE__') return { label: 'Miễn đấu', isBye: true, isEmpty: false };
  // e.g. 'A1' → 'A1 (Hạng 1 Bảng A)'
  const match = sourceKey.match(/^([A-H])(\d+)$/);
  if (match) {
    return { label: `${sourceKey} — Hạng ${match[2]} Bảng ${match[1]}`, isBye: false, isEmpty: false };
  }
  return { label: sourceKey, isBye: false, isEmpty: false };
}

export function BracketMatchNode({
  label,
  roundName,
  slotA,
  slotB,
  isEditing,
  isDragOver,
  draggingSource,
  selectedSource = null,
  onDragOverSlot,
  onDragLeaveSlot,
  onDropSlot,
  onRemoveSlot,
}: BracketMatchNodeProps) {
  const isRealA = slotA.sourceKey && slotA.sourceKey !== '__BYE__';
  const isRealB = slotB.sourceKey && slotB.sourceKey !== '__BYE__';
  
  const isBye = (isRealA && !isRealB) || (!isRealA && isRealB);
  const occupiedSlot = isRealA ? slotA : slotB;
  const emptySlot = isRealA ? slotB : slotA;

  const renderSlot = (slot: MatchSlot, originalSourceKey: string | null) => {
    const { label: slotLabel, isBye: slotIsBye, isEmpty } = formatSourceLabel(slot.sourceKey);
    const isDroppable = isEditing;
    const displayLabel = isEmpty ? `Hạt giống #${slot.slotNo} — chưa xếp` : slotLabel;

    const slotBaseClass = `relative flex items-center justify-between px-2.5 py-1.5 min-h-[32px] text-xs transition-all duration-150 group/slot`;
    const slotStateClass = isEmpty
      ? 'text-slate-600 italic'
      : slotIsBye
        ? 'text-slate-500 font-medium'
        : 'text-slate-200 font-semibold';

    let dropZoneClass = '';
    if (isDroppable) {
      if (isDragOver) {
        dropZoneClass = 'bg-amber-500/15 border border-amber-500/40';
      } else if (selectedSource) {
        dropZoneClass = 'bg-amber-500/5 border border-dashed border-amber-500/35 hover:bg-amber-500/10 cursor-pointer animate-pulse-soft';
      } else {
        dropZoneClass = 'hover:bg-slate-800/40 cursor-pointer';
      }
    }

    return (
      <div
        key={slot.slotNo}
        className={`${slotBaseClass} ${slotStateClass} ${dropZoneClass}`}
        onClick={() => {
          if (isDroppable && selectedSource) {
            onDropSlot(slot.slotNo, selectedSource);
          }
        }}
        onDragOver={isDroppable ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDragOverSlot(slot.slotNo); } : undefined}
        onDragLeave={isDroppable ? onDragLeaveSlot : undefined}
        onDrop={isDroppable ? (e) => {
          e.preventDefault();
          const src = e.dataTransfer.getData('text/plain');
          if (src) onDropSlot(slot.slotNo, src);
          onDragLeaveSlot();
        } : undefined}
      >
        <span className="truncate max-w-[180px]">{displayLabel}</span>
        {isEditing && originalSourceKey !== null && (
          <button
            type="button"
            title="Gỡ hạt giống"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveSlot(slot.slotNo);
            }}
            className="opacity-100 md:opacity-0 md:group-hover/slot:opacity-100 ml-1 flex-shrink-0 w-4 h-4 rounded-full bg-slate-700 hover:bg-rose-500/30 hover:text-rose-400 text-slate-500 flex items-center justify-center transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  };

  if (isBye) {
    const { label: slotLabel } = formatSourceLabel(occupiedSlot.sourceKey);
    const isDroppable = isEditing;
    
    let dropZoneClass = '';
    if (isDroppable) {
      if (isDragOver) {
        dropZoneClass = 'bg-amber-500/15 border border-amber-500/40';
      } else if (selectedSource) {
        dropZoneClass = 'bg-amber-500/5 border border-dashed border-amber-500/35 hover:bg-amber-500/10 cursor-pointer animate-pulse-soft';
      } else {
        dropZoneClass = 'hover:bg-slate-800/40 cursor-pointer';
      }
    }

    return (
      <div
        className={`w-[210px] rounded-xl overflow-hidden shadow-lg border transition-all duration-200 ${
          isDragOver && isEditing
            ? 'border-amber-500/50 shadow-amber-500/10'
            : 'border-slate-800 hover:border-slate-700'
        } bg-slate-900/80`}
        onClick={() => {
          if (isDroppable && selectedSource) {
            onDropSlot(emptySlot.slotNo, selectedSource);
          }
        }}
        onDragOver={isDroppable ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDragOverSlot(emptySlot.slotNo); } : undefined}
        onDragLeave={isDroppable ? onDragLeaveSlot : undefined}
        onDrop={isDroppable ? (e) => {
          e.preventDefault();
          const src = e.dataTransfer.getData('text/plain');
          if (src) onDropSlot(emptySlot.slotNo, src);
          onDragLeaveSlot();
        } : undefined}
      >
        {/* Header */}
        <div className="bg-slate-950/50 py-1 px-2.5 border-b border-slate-800/60 flex items-center justify-between">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{roundName}</span>
          <span className="text-[9px] font-bold text-slate-400">{label}</span>
        </div>

        {/* Merged Bye Slots Body */}
        <div className={`p-3 flex flex-col items-center justify-center min-h-[64px] relative group/slot bg-amber-500/[0.02] ${dropZoneClass}`}>
          <div className="text-xs text-slate-200 font-semibold text-center truncate w-full px-2">
            {slotLabel}
          </div>
          <div className="mt-1.5 px-2 py-0.5 text-[9px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded uppercase tracking-wider">
            Miễn đấu
          </div>

          {isEditing && occupiedSlot.sourceKey !== null && (
            <button
              type="button"
              title="Gỡ hạt giống"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveSlot(occupiedSlot.slotNo);
              }}
              className="absolute right-2 top-2 opacity-100 md:opacity-0 md:group-hover/slot:opacity-100 w-5 h-5 rounded-full bg-slate-800 hover:bg-rose-500/30 hover:text-rose-400 text-slate-500 flex items-center justify-center transition-all shadow-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  const effectiveSlotA = { ...slotA };
  const effectiveSlotB = { ...slotB };

  return (
    <div
      className={`w-[210px] rounded-xl overflow-hidden shadow-lg border transition-all duration-200 ${
        isDragOver && isEditing
          ? 'border-amber-500/50 shadow-amber-500/10'
          : 'border-slate-800 hover:border-slate-700'
      } bg-slate-900/80`}
    >
      {/* Header */}
      <div className="bg-slate-950/50 py-1 px-2.5 border-b border-slate-800/60 flex items-center justify-between">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{roundName}</span>
        <span className="text-[9px] font-bold text-slate-400">{label}</span>
      </div>

      {/* Slots */}
      <div className="divide-y divide-slate-800/50">
        {renderSlot(effectiveSlotA, slotA.sourceKey)}
        {renderSlot(effectiveSlotB, slotB.sourceKey)}
      </div>
    </div>
  );
}
