/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

type BadgeType = 'match_status' | 'athlete_status' | 'tournament_status' | 'stage';

interface StatusBadgeProps {
  id?: string;
  type: BadgeType;
  value: string;
}

export default function StatusBadge({ id, type, value }: StatusBadgeProps) {
  let label = value;
  let bgClass = 'bg-slate-100 text-slate-700 border-slate-200';

  if (type === 'match_status') {
    switch (value) {
      case 'completed':
        label = 'Đã kết thúc';
        bgClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
        break;
      case 'ongoing':
        label = 'Đang diễn ra';
        bgClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse';
        break;
      case 'scheduled':
        label = 'Chưa đấu';
        bgClass = 'bg-blue-500/10 text-blue-400 border-blue-500/25';
        break;
      case 'cancelled':
        label = 'Đã hủy';
        bgClass = 'bg-rose-500/10 text-rose-400 border-rose-500/25';
        break;
    }
  } else if (type === 'athlete_status') {
    switch (value) {
      case 'assigned':
        label = 'Đã vào đội';
        bgClass = 'bg-teal-500/10 text-teal-400 border-teal-500/25';
        break;
      case 'registered':
        label = 'Tự do';
        bgClass = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25';
        break;
      case 'inactive':
        label = 'Không hoạt động';
        bgClass = 'bg-slate-500/10 text-slate-400 border-slate-500/25';
        break;
    }
  } else if (type === 'tournament_status') {
    switch (value) {
      case 'ongoing':
        label = 'Đang diễn ra';
        bgClass = 'bg-brand-primary/10 text-brand-primary border-brand-primary/25';
        break;
      case 'completed':
        label = 'Đã kết thúc';
        bgClass = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
        break;
      case 'published':
        label = 'Đã công bố';
        bgClass = 'bg-amber-500/10 text-amber-400 border-amber-500/25';
        break;
      case 'draft':
        label = 'Bản nháp';
        bgClass = 'bg-slate-500/10 text-slate-450 border-slate-500/25';
        break;
    }
  } else if (type === 'stage') {
    switch (value) {
      case 'group':
        label = 'Vòng bảng';
        bgClass = 'bg-purple-500/10 text-purple-400 border-purple-500/25';
        break;
      case 'knockout':
        label = 'Bán kết';
        bgClass = 'bg-pink-500/10 text-pink-400 border-pink-500/25';
        break;
      case 'final':
        label = 'Chung kết';
        bgClass = 'bg-amber-500/15 text-yellow-300 border-amber-500/25 font-bold';
        break;
      case 'third_place':
        label = 'Tranh Hạng 3';
        bgClass = 'bg-orange-500/10 text-orange-400 border-orange-500/25';
        break;
      case 'friendly':
        label = 'Giao hữu';
        bgClass = 'bg-slate-500/10 text-slate-400 border-slate-550/25';
        break;
    }
  }

  return (
    <span
      id={id}
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${bgClass}`}
    >
      {label}
    </span>
  );
}
