'use client';

import { Users, User, UsersRound, Check } from '@/components/icons';
import { EventType } from '@golab/contracts';

interface EventTypeChooserProps {
  value: EventType;
  onChange: (eventType: EventType) => void;
  disabled?: boolean;
}

export function EventTypeChooser({ value, onChange, disabled }: EventTypeChooserProps) {
  const options = [
    {
      id: 'TEAM_EVENT' as EventType,
      title: 'Giải Đồng đội',
      description: 'Nhiều VĐV thi đấu cùng đội. Phù hợp thể thức Tiếp sức (Relay).',
      icon: UsersRound,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      activeColor: 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-550/10',
    },
    {
      id: 'DOUBLES' as EventType,
      title: 'Giải Đôi',
      description: 'Mỗi entry gồm 2 VĐV (cặp đôi). Đăng ký trực tiếp không bốc thăm đội.',
      icon: Users,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
      activeColor: 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-500/10',
    },
    {
      id: 'SINGLES' as EventType,
      title: 'Giải Đơn',
      description: 'Mỗi entry gồm 1 VĐV. Đăng ký trực tiếp không bốc thăm đội.',
      icon: User,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      activeColor: 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/10',
    },
  ];

  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
        Loại nội dung thi đấu
      </label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              className={`flex flex-col text-left p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                isActive
                  ? opt.activeColor
                  : 'bg-slate-905/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/20'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isActive && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-550 flex items-center justify-center text-slate-950 animate-scale-in">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
              <div className={`p-2.5 rounded-xl border ${opt.color} w-fit mb-4 group-hover:scale-110 transition-transform duration-350`}>
                <Icon className="w-5 h-5" />
              </div>
              <h4 className={`font-bold text-sm ${isActive ? 'text-slate-100' : 'text-slate-300'}`}>
                {opt.title}
              </h4>
              <p className="text-xs text-slate-450 mt-2 leading-relaxed">
                {opt.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
