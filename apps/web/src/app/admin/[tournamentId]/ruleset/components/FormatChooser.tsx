'use client';

import { Zap, Target, Trophy, Check } from '@/components/icons';
import { MatchFormat } from '@golab/contracts';

interface FormatChooserProps {
  value: MatchFormat;
  onChange: (format: MatchFormat) => void;
  disabled?: boolean;
}

export function FormatChooser({ value, onChange, disabled }: FormatChooserProps) {
  const formats = [
    {
      id: 'relay' as MatchFormat,
      title: 'Tiếp sức đồng đội (Relay)',
      description: 'Nhiều chặng thi đấu tích lũy điểm số nối tiếp nhau. Đội chạm điểm đích cuối cùng trước sẽ chiến thắng.',
      icon: Zap,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      activeColor: 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-550/10',
    },
    {
      id: 'single_game' as MatchFormat,
      title: 'Trận đơn/đôi (Single Game)',
      description: 'Chỉ gồm 1 set đấu duy nhất chạm điểm đích (ví dụ chạm 11 hoặc 15 điểm).',
      icon: Target,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
      activeColor: 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-500/10',
    },
    {
      id: 'best_of' as MatchFormat,
      title: 'Thi đấu sets (Best of Sets)',
      description: 'Đánh theo thể thức thắng 2 trên 3 (BO3) hoặc 3 trên 5 (BO5) sets. Mỗi set chạm số điểm mục tiêu.',
      icon: Trophy,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      activeColor: 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/10',
    },
  ];

  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
        Chọn Thể Thức Thi Đấu
      </label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {formats.map((f) => {
          const Icon = f.icon;
          const isActive = value === f.id;
          return (
            <button
              key={f.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(f.id)}
              className={`flex flex-col text-left p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                isActive
                  ? f.activeColor
                  : 'bg-slate-905/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/20'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isActive && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-550 flex items-center justify-center text-slate-950 animate-scale-in">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
              <div className={`p-2.5 rounded-xl border ${f.color} w-fit mb-4 group-hover:scale-110 transition-transform duration-350`}>
                <Icon className="w-5 h-5" />
              </div>
              <h4 className={`font-bold text-sm ${isActive ? 'text-slate-100' : 'text-slate-300'}`}>
                {f.title}
              </h4>
              <p className="text-xs text-slate-450 mt-2 leading-relaxed">
                {f.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
