'use client';

import React from 'react';
import { Check, Lock, Circle } from './icons';

export type StepStatus = 'completed' | 'active' | 'locked';

export interface Step {
  key: string;
  label: string;
  status: StepStatus;
}

interface StepperProgressProps {
  steps: Step[];
}

/**
 * StepperProgress — một hàng ngang cực kỳ premium: ● ──────── ● ──────── ●
 * Sử dụng thanh trượt tiến trình (progress track) tuyệt đối dưới nền chạy qua tâm các vòng tròn.
 * Mỗi bước (step node) có chiều rộng cố định w-24 (96px) để nhãn không bao giờ bị che chữ ("che chữ") hay co ngắn.
 */
export function StepperProgress({ steps }: StepperProgressProps) {
  // Tìm bước hoạt động hiện tại để tính toán phần trăm hoàn thành của thanh tiến trình
  const activeIndex = steps.findIndex(s => s.status === 'active');
  const lastCompletedIndex = steps.map(s => s.status).lastIndexOf('completed');
  
  // Điểm mốc để tính toán độ dài thanh tiến trình
  const progressIndex = activeIndex !== -1 
    ? activeIndex 
    : (lastCompletedIndex !== -1 ? lastCompletedIndex : 0);
  
  // Phần trăm tiến trình: (index / (N - 1)) * 100%
  const percent = steps.length > 1 ? (progressIndex / (steps.length - 1)) * 100 : 0;

  return (
    <div className="w-full overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <div 
        className="relative flex items-start justify-between py-4 px-10" 
        style={{ minWidth: `${steps.length * 100}px` }}
      >
        {/* Đường nối xám dưới nền (Gray Track) chạy qua tâm tất cả các vòng tròn */}
        <div className="absolute top-[30px] left-[88px] right-[88px] h-[3px] bg-slate-800/80 rounded-full z-0" />
        
        {/* Đường nối màu hổ phách sáng loáng (Filled Progress Line) đại diện cho các chặng đã hoàn thành */}
        <div 
          className="absolute top-[30px] left-[88px] h-[3px] bg-gradient-to-r from-amber-600 to-amber-400 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.6)] z-0 transition-all duration-700 ease-out"
          style={{ width: `calc((100% - 176px) * ${percent / 100})` }}
        />

        {steps.map((step, i) => {
          const isCompleted = step.status === 'completed';
          const isActive = step.status === 'active';
          const isLocked = step.status === 'locked';

          return (
            <div 
              key={step.key} 
              className="flex flex-col items-center w-24 flex-shrink-0 relative z-10 select-none group"
            >
              {/* Vòng tròn trạng thái */}
              <div className="relative">
                {/* Vòng hào quang nhấp nháy cho chặng active */}
                {isActive && (
                  <div className="absolute inset-[-5px] rounded-full bg-amber-500/10 border border-amber-500/30 animate-pulse duration-1000 z-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]" />
                )}
                
                {/* Vòng tròn chính */}
                <div className={[
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 relative z-10 shadow-lg',
                  isCompleted
                    ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-bold border border-amber-300/30'
                    : isActive
                      ? 'bg-slate-900 text-amber-400 border-2 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                      : 'bg-slate-950 text-slate-600 border border-slate-800',
                ].join(' ')}>
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : isActive ? (
                    <Circle className="w-2.5 h-2.5 fill-amber-400 text-amber-400 animate-[pulse-soft_1.5s_infinite]" />
                  ) : (
                    <Lock className="w-3 h-3" />
                  )}
                </div>
              </div>

              {/* Nhãn văn bản (Text Label) — w-full của w-24 cho phép hiển thị tới 16 ký tự mà không ngắt dòng xấu */}
              <span className={[
                'mt-2.5 text-[11px] font-bold text-center leading-tight transition-colors duration-200 w-full px-1 break-words tracking-wide uppercase',
                isCompleted 
                  ? 'text-slate-400 group-hover:text-slate-350'
                  : isActive 
                    ? 'text-amber-400 font-extrabold drop-shadow-[0_0_4px_rgba(245,158,11,0.15)]'
                    : 'text-slate-650',
              ].join(' ')}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

