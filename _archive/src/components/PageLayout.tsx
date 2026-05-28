/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import { UserRole } from '../types';
import {
  LayoutDashboard,
  Layers,
  Users,
  Trophy,
  CalendarDays,
  Settings,
  ShieldAlert,
  Menu,
  X,
  Eye,
  RotateCcw,
  Sparkles,
  Award
} from 'lucide-react';
import Toaster from './Toaster';

interface PageLayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  children: React.ReactNode;
}

export default function PageLayout({ currentTab, setCurrentTab, children }: PageLayoutProps) {
  const { state, setCurrentUserRole, resetToFactoryDefaults } = useTournament();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentUser = state.currentUser;
  const currentRole = currentUser?.role || 'viewer';

  const menuItems = [
    { id: 'dashboard', label: 'Bảng điều khiển', icon: LayoutDashboard, roles: ['super_admin', 'organizer', 'operator', 'viewer'] },
    { id: 'athletes', label: 'Quản lý VĐV', icon: Users, roles: ['super_admin', 'organizer'] },
    { id: 'teams', label: 'Quản lý Đội', icon: Trophy, roles: ['super_admin', 'organizer'] },
    { id: 'groups', label: 'Bảng đấu', icon: Layers, roles: ['super_admin', 'organizer'] },
    { id: 'matches', label: 'Lịch thi đấu', icon: CalendarDays, roles: ['super_admin', 'organizer', 'operator', 'viewer'] },
    { id: 'standings', label: 'Bảng xếp hạng', icon: Award, roles: ['super_admin', 'organizer', 'operator', 'viewer'] },
    { id: 'knockout', label: 'Vòng loại trực tiếp', icon: Trophy, roles: ['super_admin', 'organizer', 'operator', 'viewer'] },
    { id: 'settings', label: 'Cấu hình giải', icon: Settings, roles: ['super_admin', 'organizer'] },
    { id: 'public', label: 'Trang công chúng', icon: Eye, roles: ['super_admin', 'organizer', 'operator', 'viewer'] }
  ];

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentUserRole(e.target.value as UserRole);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'bg-rose-500 text-white';
      case 'organizer':
        return 'bg-blue-600 text-white';
      case 'operator':
        return 'bg-amber-600 text-white';
      case 'viewer':
        return 'bg-slate-200 text-slate-700';
    }
  };

  return (
    <div id="app-root-container" className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Header */}
      <header id="app-main-header" className="sticky top-0 z-45 bg-slate-900/75 backdrop-blur-md border-b border-white/5 shadow-lg h-16 shrink-0 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            id="mobile-menu-trigger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:bg-slate-800 rounded-xl transition-all"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-brand-primary rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-brand-primary/20">
              <div className="w-4.5 h-4.5 rounded-full border-3 border-slate-950"></div>
            </div>
            <div>
              <span className="font-display font-black text-sm text-white tracking-tight leading-none block uppercase">
                GOLAB TOURNAMENT
              </span>
              <span className="text-[9px] text-brand-primary font-bold uppercase tracking-widest block mt-0.5">
                Relay Portal
              </span>
            </div>
          </div>
        </div>

        {/* Demo Controller Utility Header */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">Vai trò:</span>
            <select
              id="role-switch-dropdown"
              value={currentRole}
              onChange={handleRoleChange}
              className="text-xs font-semibold bg-transparent text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="super_admin" className="bg-slate-900">🔴 Super Admin</option>
              <option value="organizer" className="bg-slate-900">🔵 Ban Tổ Chức</option>
              <option value="operator" className="bg-slate-900">🟡 Trọng Tài</option>
              <option value="viewer" className="bg-slate-900">🟢 Người Xem</option>
            </select>
          </div>

          {currentRole === 'super_admin' && (
            <button
              id="factory-reset-trigger"
              onClick={() => {
                if (confirm('Bạn có chắc chắn muốn cài đặt lại toàn bộ ứng dụng về dữ liệu mẫu gốc? Hành động này sẽ ghi đè LocalStorage.')) {
                  resetToFactoryDefaults();
                }
              }}
              title="Khôi phục dữ liệu mẫu gốc"
              className="px-3.5 py-1.8 bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Reset mẫu</span>
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 relative min-h-0">
        {/* Desktop Sidebar */}
        <aside id="desktop-sidebar-nav" className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-white/5 shrink-0 p-4 justify-between text-white">
          <div className="flex flex-col gap-1.5">
            {/* Active Tournament visual card */}
            <div className="mb-4 bg-slate-950/40 rounded-2xl p-4 border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary rounded-full opacity-5 blur-xl"></div>
              <p className="text-[9px] text-brand-primary font-bold uppercase tracking-wider mb-1">Đang hoạt động</p>
              <h3 className="text-xs font-display font-bold text-white line-clamp-2 leading-snug">
                {state.tournaments.find(t => t.id === state.activeTournamentId)?.name || 'Chưa chọn giải'}
              </h3>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[9px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-lg border border-white/5">
                  Cúp Golab 2
                </span>
                <span className="text-[9px] text-brand-primary font-bold">
                  {state.tournaments.find(t => t.id === state.activeTournamentId)?.status === 'ongoing' ? '● Live' : 'Nháp'}
                </span>
              </div>
            </div>

            <nav className="space-y-1">
              {menuItems.map(item => {
                const hasAccess = item.roles.includes(currentRole);
                const Icon = item.icon;
                if (!hasAccess) return null;

                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`sidebar-link-${item.id}`}
                    onClick={() => setCurrentTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all ${
                      isActive
                        ? 'bg-brand-primary text-slate-950 shadow-md shadow-brand-primary/10'
                        : 'text-slate-400 hover:bg-slate-850 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User footer badge card */}
          <div className="border-t border-white/5 pt-4">
            <div className="flex items-center gap-2.5 p-2 bg-slate-950/30 rounded-xl border border-white/5">
              <div className="w-8.5 h-8.5 rounded-xl bg-brand-primary text-slate-950 font-black flex items-center justify-center text-xs shrink-0">
                {currentUser?.name.charAt(0) || 'K'}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-white truncate leading-tight">
                  {currentUser?.name || 'Khách truy cập'}
                </h4>
                <span className={`inline-block text-[8px] font-bold px-1.5 py-0.2 rounded-md ${getRoleBadge(currentRole)} mt-1`}>
                  {currentRole === 'super_admin' && 'SUPER ADMIN'}
                  {currentRole === 'organizer' && 'BAN TỔ CHỨC'}
                  {currentRole === 'operator' && 'TRỌNG TÀI'}
                  {currentRole === 'viewer' && 'NGƯỜI XEM'}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            id="mobile-drawer-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end pointer-events-auto"
          >
            <div
              id="mobile-drawer-content"
              onClick={e => e.stopPropagation()}
              className="w-72 bg-slate-900 text-slate-100 h-screen flex flex-col justify-between p-4 shadow-2xl relative animate-slide-in pointer-events-auto border-l border-white/5"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                  <span className="font-display font-black text-sm text-slate-200">MENU</span>
                  <button
                    id="mobile-menu-close"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Active Tournament info */}
                <div className="mb-4 bg-slate-950/40 rounded-xl p-3 border border-white/5 relative overflow-hidden">
                  <p className="text-[8px] text-brand-primary font-bold uppercase tracking-wider mb-1">Giải đấu</p>
                  <h3 className="text-xs font-bold font-display line-clamp-2 text-white">
                    {state.tournaments.find(t => t.id === state.activeTournamentId)?.name || 'Chưa chọn'}
                  </h3>
                </div>

                {/* Simulator Switcher inside mobile */}
                <div className="mb-3 px-3 py-2 bg-slate-950/50 rounded-xl border border-white/5">
                  <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Phân quyền giả lập</label>
                  <select
                    id="mobile-role-switch-dropdown"
                    value={currentRole}
                    onChange={e => {
                      handleRoleChange(e);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-xs font-semibold bg-transparent text-slate-200 cursor-pointer focus:outline-hidden"
                  >
                    <option value="super_admin" className="text-slate-900 bg-slate-900">🔴 Super Admin</option>
                    <option value="organizer" className="text-slate-900 bg-slate-900">🔵 Ban Tổ Chức</option>
                    <option value="operator" className="text-slate-900 bg-slate-900">🟡 Trọng Tài</option>
                    <option value="viewer" className="text-slate-900 bg-slate-900">🟢 Người Xem</option>
                  </select>
                </div>

                <nav className="space-y-1">
                  {menuItems.map(item => {
                    const hasAccess = item.roles.includes(currentRole);
                    const Icon = item.icon;
                    if (!hasAccess) return null;

                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        id={`mobile-sidebar-link-${item.id}`}
                        onClick={() => {
                          setCurrentTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all ${
                          isActive
                            ? 'bg-brand-primary text-slate-950 shadow-md shadow-brand-primary/10'
                            : 'text-slate-400 hover:bg-slate-850 hover:text-white'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Roster detail */}
              <div className="bg-slate-950/30 p-2.5 rounded-xl border border-white/5 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-primary text-slate-950 font-black flex items-center justify-center text-xs shrink-0">
                  {currentUser?.name.charAt(0) || 'K'}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white truncate max-w-[160px]">{currentUser?.name || 'Khách'}</h4>
                  <span className={`inline-block text-[8px] font-bold px-1.5 py-0.2 rounded-md ${getRoleBadge(currentRole)} mt-0.5`}>
                    {currentRole === 'super_admin' && 'SUPER ADMIN'}
                    {currentRole === 'organizer' && 'BAN TỔ CHỨC'}
                    {currentRole === 'operator' && 'TRỌNG TÀI'}
                    {currentRole === 'viewer' && 'NGƯỜI XEM'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <main id="app-content-area" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full min-w-0">
          {children}
        </main>
      </div>

      {/* Toast provider wrapper */}
      <Toaster />
    </div>
  );
}
