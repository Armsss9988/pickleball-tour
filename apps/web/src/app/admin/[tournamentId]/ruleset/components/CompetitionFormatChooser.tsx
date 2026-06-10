'use client';

import { RotateCcw, Swords, BarChart3, Layers, Check } from '@/components/icons';
import { CompetitionFormat } from '@golab/contracts';

interface CompetitionFormatChooserProps {
  value: CompetitionFormat;
  onChange: (format: CompetitionFormat) => void;
  disabled?: boolean;
}

export function CompetitionFormatChooser({ value, onChange, disabled }: CompetitionFormatChooserProps) {
  const options = [
    {
      id: 'GROUP_STAGE_KNOCKOUT' as CompetitionFormat,
      title: 'Vòng bảng → Knockout',
      description: 'Thi đấu vòng tròn trong bảng, rồi các đội xếp hạng cao vào vòng loại trực tiếp.',
      icon: Layers,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      activeColor: 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-550/10',
    },
    {
      id: 'ROUND_ROBIN' as CompetitionFormat,
      title: 'Vòng tròn',
      description: 'Mỗi đội thi đấu với tất cả các đội còn lại. Xếp hạng cuối cùng theo bảng.',
      icon: RotateCcw,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
      activeColor: 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-500/10',
    },
    {
      id: 'KNOCKOUT' as CompetitionFormat,
      title: 'Loại trực tiếp',
      description: 'Thua là bị loại ngay. Thắng tiến vào vòng tiếp theo cho đến chung kết.',
      icon: Swords,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      activeColor: 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-500/10',
    },
    {
      id: 'SWISS' as CompetitionFormat,
      title: 'Hệ Thụy Sĩ',
      description: 'Nhiều vòng đấu, ghép cặp theo điểm số hiện tại. Không bị loại sớm.',
      icon: BarChart3,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      activeColor: 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-500/10',
    },
  ];

  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
        Cách tổ chức giải đấu
      </label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              className={`flex flex-col text-left p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                isActive
                  ? opt.activeColor
                  : 'bg-slate-905/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/20'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isActive && (
                <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-amber-550 flex items-center justify-center text-slate-950 animate-scale-in">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
              <div className={`p-2 rounded-lg border ${opt.color} w-fit mb-3 group-hover:scale-110 transition-transform duration-350`}>
                <Icon className="w-4 h-4" />
              </div>
              <h4 className={`font-bold text-xs ${isActive ? 'text-slate-100' : 'text-slate-300'}`}>
                {opt.title}
              </h4>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {opt.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
