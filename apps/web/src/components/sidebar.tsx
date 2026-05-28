'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Trophy, Settings, Users, Dices,
  Shield, Calendar, Target, ClipboardList, Zap,
  BarChart3, GitBranch, Award, FileText,
  LogOut, Menu, X, Check, Lock, Circle,
} from './icons';
import type { LucideIcon } from './icons';

/* ── Types ──────────────────────────────────────── */

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  phase: number; // unlock level (0 = always)
}

interface SidebarProps {
  tournamentStatus?: string;
}

/* ── Nav structure ──────────────────────────────── */

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'CHUẨN BỊ GIẢI',
    items: [
      { href: '/admin',           icon: LayoutDashboard, label: 'Dashboard',          phase: 0 },
      { href: '/admin/tournament', icon: Trophy,         label: 'Giải đấu',           phase: 0 },
      { href: '/admin/ruleset',   icon: Settings,        label: 'Cấu hình Ruleset',   phase: 0 },
      { href: '/admin/players',   icon: Users,           label: 'Vận động viên',       phase: 1 },
      { href: '/admin/draw',      icon: Dices,           label: 'Bốc thăm',           phase: 2 },
    ],
  },
  {
    title: 'THI ĐẤU',
    items: [
      { href: '/admin/teams',     icon: Shield,         label: 'Đội hình',            phase: 3 },
      { href: '/admin/groups',    icon: Calendar,       label: 'Bảng đấu & Lịch',    phase: 4 },
      { href: '/admin/matches',   icon: Target,         label: 'Trận đấu',           phase: 5 },
      { href: '/admin/lineup',    icon: ClipboardList,  label: 'Đội hình thi đấu',   phase: 5 },
      { href: '/admin/scoring',   icon: Zap,            label: 'Chấm điểm',          phase: 5 },
    ],
  },
  {
    title: 'KẾT QUẢ',
    items: [
      { href: '/admin/standings', icon: BarChart3,      label: 'Bảng xếp hạng',      phase: 6 },
      { href: '/admin/bracket',   icon: GitBranch,      label: 'Bracket Knockout',    phase: 6 },
      { href: '/admin/awards',    icon: Award,          label: 'Giải thưởng',         phase: 7 },
      { href: '/admin/audit',     icon: FileText,       label: 'Nhật ký',             phase: 0 },
    ],
  },
];

/* ── Status → unlock level map ──────────────────── */

const statusToLevel: Record<string, number> = {
  DRAFT: 0,
  PLAYER_IMPORT: 1,
  PLAYERS_READY: 2,
  TEAM_DRAW_COMPLETED: 3,
  GROUP_ASSIGNED: 4,
  SCHEDULE_GENERATED: 5,
  RUNNING: 5,
  GROUP_COMPLETED: 6,
  KNOCKOUT_GENERATED: 6,
  KNOCKOUT_RUNNING: 6,
  COMPLETED: 7,
  PUBLISHED: 7,
};

function getUnlockLevel(status?: string): number {
  if (!status) return 7; // show all if no tournament
  return statusToLevel[status] ?? 0;
}

/* ── Nav item status badge ──────────────────────── */

function NavBadge({ phase, unlockLevel }: { phase: number; unlockLevel: number }) {
  if (phase === 0) return null; // always-accessible items

  if (phase < unlockLevel) {
    return <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />;
  }
  if (phase === unlockLevel) {
    return (
      <span className="w-6 h-6 flex items-center justify-center rounded-md bg-amber-500/5 border border-amber-500/20 shadow-sm flex-shrink-0">
        <Circle className="w-1.5 h-1.5 text-amber-500 fill-amber-500 animate-pulse" />
      </span>
    );
  }
  return (
    <span className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-900 border border-slate-800/80 text-slate-500/60 flex-shrink-0">
      <Lock className="w-2.5 h-2.5" />
    </span>
  );
}

/* ── Sidebar content (shared between mobile/desktop) */

function SidebarContent({
  unlockLevel,
  pathname,
  onLinkClick,
}: {
  unlockLevel: number;
  pathname: string;
  onLinkClick?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800/50">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-lg">
          🏓
        </div>
        <div>
          <div className="text-[15px] font-bold text-white tracking-tight font-[family-name:var(--font-space-grotesk)]">
            GOLAB
          </div>
          <div className="text-[10px] font-medium text-slate-500 uppercase tracking-[.08em]">
            Admin Console
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {navGroups.map(group => (
          <div key={group.title}>
            <div className="text-[10px] uppercase tracking-[.1em] text-slate-500 font-semibold px-3 pt-5 pb-2">
              {group.title}
            </div>
            {group.items.map(item => {
              const isActive = item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);
              const isLocked = item.phase > unlockLevel && item.phase !== 0;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={isLocked ? '#' : item.href}
                  onClick={(e) => {
                    if (isLocked) { e.preventDefault(); return; }
                    onLinkClick?.();
                  }}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                      transition-all duration-150 group
                      ${isActive
                        ? 'bg-amber-500/10 text-amber-400 font-semibold'
                        : isLocked
                          ? 'text-slate-500/60 cursor-not-allowed hover:bg-transparent'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      }
                    `}
                  >
                    <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${
                      isActive ? 'text-amber-400' : isLocked ? 'text-slate-500/40' : 'text-slate-500/80 group-hover:text-slate-300'
                    }`} />
                    <span className="flex-1 truncate">{item.label}</span>
                    <NavBadge phase={item.phase} unlockLevel={unlockLevel} />
                  </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-xs font-bold text-slate-900 flex-shrink-0">
            A
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-slate-300 truncate">GOLAB Admin</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-[.05em]">Super Admin</div>
          </div>
          <Link
            href="/login"
            className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors rounded-md hover:bg-rose-500/10"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Main export ────────────────────────────────── */

export function SidebarWrapper({ tournamentStatus }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const unlockLevel = getUnlockLevel(tournamentStatus);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors shadow-lg"
        aria-label="Mở menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay + sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-slate-950 border-r border-slate-800/50 shadow-2xl animate-slide-in">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent
              unlockLevel={unlockLevel}
              pathname={pathname}
              onLinkClick={() => setIsOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[260px] bg-slate-950 border-r border-slate-800/50 flex-col h-screen sticky top-0 flex-shrink-0">
        <SidebarContent
          unlockLevel={unlockLevel}
          pathname={pathname}
        />
      </aside>
    </>
  );
}
