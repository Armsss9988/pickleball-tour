'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { logout } from '@/lib/api-client';
import {
  getVisibleAreasForRole,
  type AppRole,
  type AreaKey,
  type TournamentUxContext,
} from '@/lib/tournament-ux-policy';
import {
  LayoutDashboard, Trophy, Settings, Users, Dices,
  Calendar, Target, ClipboardList, Zap,
  BarChart3, GitBranch, Award, FileText,
  LogOut, Menu, X, Circle, ArrowLeft,
} from './icons';
import type { LucideIcon } from './icons';

interface NavItem {
  key: AreaKey;
  href: string;
  icon: LucideIcon;
  label: string;
}

interface SidebarProps {
  context: TournamentUxContext;
  role: AppRole;
  userDisplayName?: string | null;
}

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'CHUẨN BỊ GIẢI',
    items: [
      { key: 'dashboard', href: '/admin', icon: LayoutDashboard, label: 'Bảng điều khiển' },
      { key: 'tournament', href: '/admin/tournament', icon: Trophy, label: 'Thông tin giải đấu' },
      { key: 'ruleset', href: '/admin/ruleset', icon: Settings, label: 'Luật thi đấu (Ruleset)' },
      { key: 'players', href: '/admin/players', icon: Users, label: 'Vận động viên' },
      { key: 'schedule', href: '/admin/schedule', icon: Calendar, label: 'Cấu hình lịch & Sân' },
      { key: 'draw', href: '/admin/draw', icon: Dices, label: 'Đội tuyển' },
    ],
  },
  {
    title: 'THI ĐẤU',
    items: [
      { key: 'groups', href: '/admin/groups', icon: Target, label: 'Bảng đấu & Lịch' },
      { key: 'matches', href: '/admin/matches', icon: ClipboardList, label: 'Danh sách trận' },
      { key: 'lineup', href: '/admin/lineup', icon: ClipboardList, label: 'Đội hình ra sân (Lineup)' },
      { key: 'scoring', href: '/admin/scoring', icon: Zap, label: 'Bàn trọng tài (Scoring)' },
    ],
  },
  {
    title: 'KẾT QUẢ',
    items: [
      { key: 'standings', href: '/admin/standings', icon: BarChart3, label: 'Bảng xếp hạng' },
      { key: 'bracket', href: '/admin/bracket', icon: GitBranch, label: 'Nhánh đấu Playoff' },
      { key: 'awards', href: '/admin/awards', icon: Award, label: 'Giải thưởng' },
      { key: 'audit', href: '/admin/audit', icon: FileText, label: 'Nhật ký hệ thống' },
    ],
  },
];

const roleLabels: Record<AppRole, string> = {
  guest: 'Khách',
  btc_admin: 'Ban tổ chức (BTC Admin)',
  scorer: 'Trọng tài',
  captain: 'HLV/Captain',
  super_admin: 'Quản trị viên (Super Admin)',
};

function SidebarContent({
  context,
  role,
  pathname,
  userDisplayName,
  onLinkClick,
}: {
  context: TournamentUxContext;
  role: AppRole;
  pathname: string;
  userDisplayName?: string | null;
  onLinkClick?: () => void;
}) {
  const params = useParams();
  const tournamentId = context.tournamentId || (params?.tournamentId as string | undefined) || '';
  const visibleAreas = new Set(getVisibleAreasForRole(role, context));

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800/50 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-base font-bold text-slate-950 flex-shrink-0">
          🏓
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-black text-white tracking-wider uppercase font-[family-name:var(--font-space-grotesk)]">
            GOLAB CUP
          </div>
          <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-[.12em]">
            Hệ Thống Giải Đấu
          </div>
        </div>
      </div>

      {/* Back to tournament list action button */}
      <div className="px-4 pt-4 flex-shrink-0">
        <Link
          href="/admin"
          className="flex items-center gap-2 px-3 py-1.8 rounded-xl text-xs font-semibold text-slate-400 bg-slate-900/30 border border-slate-850 hover:bg-slate-900 hover:text-amber-400 hover:border-amber-500/25 transition-all group w-full"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors flex-shrink-0" />
          <span className="truncate">Danh sách giải đấu</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => visibleAreas.has(item.key));

          if (visibleItems.length === 0) {
            return null;
          }

          return (
            <div key={group.title}>
              <div className="text-[10px] uppercase tracking-[.1em] text-slate-500 font-semibold px-3 pt-5 pb-2">
                {group.title}
              </div>
              {visibleItems.map((item) => {
                const targetHref = item.href === '/admin'
                  ? `/admin/${tournamentId}`
                  : `/admin/${tournamentId}${item.href.replace('/admin', '')}`;
                const isActive = item.href === '/admin'
                  ? pathname === `/admin/${tournamentId}`
                  : pathname === targetHref || pathname.startsWith(targetHref + '/');
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={targetHref}
                    onClick={() => onLinkClick?.()}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                      transition-all duration-150 group
                      ${isActive
                        ? 'bg-amber-500/10 text-amber-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      }
                    `}
                  >
                    <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${
                      isActive ? 'text-amber-400' : 'text-slate-500/80 group-hover:text-slate-300'
                    }`} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {isActive ? (
                      <Circle className="w-2 h-2 text-amber-400 fill-amber-400 animate-pulse flex-shrink-0" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-xs font-bold text-slate-900 flex-shrink-0">
            {userDisplayName?.slice(0, 1).toUpperCase() || 'G'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-slate-300 truncate">
              {userDisplayName || 'GOLAB User'}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-[.05em] truncate">
              {roleLabels[role]}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors rounded-md hover:bg-rose-500/10"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function SidebarWrapper({ context, role, userDisplayName }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors shadow-lg"
        aria-label="Mở menu"
      >
        <Menu className="w-5 h-5" />
      </button>

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
              context={context}
              role={role}
              pathname={pathname}
              userDisplayName={userDisplayName}
              onLinkClick={() => setIsOpen(false)}
            />
          </aside>
        </div>
      )}

      <aside className="hidden md:flex w-[260px] bg-slate-950 border-r border-slate-800/50 flex-col h-screen sticky top-0 flex-shrink-0">
        <SidebarContent
          context={context}
          role={role}
          pathname={pathname}
          userDisplayName={userDisplayName}
        />
      </aside>
    </>
  );
}
