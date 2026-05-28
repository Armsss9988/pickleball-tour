/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import { Group, Team } from '../types';
import {
  Layers,
  Plus,
  Trash2,
  CalendarCheck2,
  Tv,
  Users,
  CalendarDays,
  Play,
  X,
  PlusSquare,
  Network,
  RotateCcw,
  Check
} from 'lucide-react';

export default function GroupManagementScreen() {
  const { state, addGroup, deleteGroup, updateTeam, generateMatchesForGroup, resetAllGroupMatches } = useTournament();

  const unassignedTeams = state.teams.filter(t => !t.groupId);

  const [newGroupName, setNewGroupName] = useState('');
  
  // Schedule Generator Meta State
  const [activeGroupGenId, setActiveGroupGenId] = useState<string | null>(null);
  const [genConfig, setGenConfig] = useState({
    startDateTime: '2026-06-01T08:00',
    intervalMinutes: 30,
    courtsText: 'Sân 1, Sân 2'
  });

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    addGroup(newGroupName.trim());
    setNewGroupName('');
  };

  const handleDeleteGroup = (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa "${name}"? Hành động này sẽ gỡ toàn bộ các đội liên kết và xóa lịch đấu vòng bảng tương ứng!`)) {
      deleteGroup(id);
    }
  };

  const handleAssignTeamToGroup = (teamId: string, groupId: string | null) => {
    updateTeam(teamId, { groupId });
  };

  const handleOpenGenModal = (groupId: string) => {
    setActiveGroupGenId(groupId);
  };

  const handleTriggerGenerator = () => {
    if (!activeGroupGenId) return;
    
    // Parse courts list
    const courts = genConfig.courtsText
      .split(',')
      .map(c => c.trim())
      .filter(Boolean);

    generateMatchesForGroup(activeGroupGenId, {
      courts: courts.length > 0 ? courts : ['Sân 1'],
      startDateTime: genConfig.startDateTime,
      intervalMinutes: genConfig.intervalMinutes
    });

    setActiveGroupGenId(null);
  };

  const handleResetMatches = (groupId: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn XÓA TOÀN BỘ lịch thi đấu vòng bảng của "${name}"? Thống kê điểm số liên quan cũng sẽ bị hoàn tác.`)) {
      resetAllGroupMatches(groupId);
    }
  };

   return (
    <div id="groups-screen-container" className="space-y-6 animate-fade-in">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-brand-primary" />
            <span>Phân Chia Bảng Đấu & Ghép Cặp</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Tạo bảng đấu vòng tròn, phân nhóm các đội, lập lịch ghép cặp tự động (Round Robin) theo số lượng sân thi đấu và mốc thời gian.
          </p>
        </div>

        {/* Action Form */}
        <form onSubmit={handleCreateGroup} className="flex items-center gap-2 shrink-0">
          <input
            id="group-name-input"
            type="text"
            required
            placeholder="Ví dụ: Bảng A, Bảng B..."
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            className="premium-input max-w-[160px] !py-1.5 text-xs font-semibold"
          />
          <button
            id="add-group-submit-btn"
            type="submit"
            className="btn-primary !py-1.8 !px-3 text-xs shrink-0 select-none"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo Bảng</span>
          </button>
        </form>
      </div>

      {state.groups.length === 0 ? (
        <div className="premium-card rounded-2xl p-10 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center mb-3">
            <Layers className="w-6 h-6 text-slate-500" />
          </div>
          <h3 className="text-slate-200 font-display font-semibold text-base">Chưa thiết lập bảng đấu nào</h3>
          <p className="text-slate-400 text-xs mt-1.5 max-w-sm font-light leading-relaxed">
            Sử dụng bảng điều khiển ở góc right phía trên để tạo bảng thi đấu đầu tiên (ví dụ: Bảng A, Bảng B).
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main List of Groups and their settings */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {state.groups.map(group => {
              const groupTeams = state.teams.filter(t => t.groupId === group.id);
              const groupMatches = state.matches.filter(m => m.groupId === group.id && m.stage === 'group');
              const compMatches = groupMatches.filter(m => m.status === 'completed');

              return (
                <div
                  key={group.id}
                  id={`group-card-${group.id}`}
                  className="premium-card rounded-2xl p-5 flex flex-col justify-between"
                >
                  <div>
                    {/* Header bar of Group box */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-1.5 h-5 bg-brand-primary rounded-sm shadow-[0_0_10px_rgba(190,242,100,0.5)]"></div>
                        <h3 className="font-display font-bold text-slate-100 text-sm tracking-wide">{group.name}</h3>
                        <span className="text-[10px] bg-slate-900 border border-slate-800 font-bold px-2.5 py-0.5 rounded-full text-slate-400">
                          {groupTeams.length} đội
                        </span>
                      </div>

                      <button
                        id={`delete-group-btn-${group.id}`}
                        onClick={() => handleDeleteGroup(group.id, group.name)}
                        className="btn-danger !py-1 !px-2.5 !h-8 text-[10px] flex items-center gap-1 select-none"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa bảng</span>
                      </button>
                    </div>

                    {/* Assigned Teams within group */}
                    <div className="space-y-2 mb-5">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                        Danh sách đội trong nhóm
                      </p>
                      
                      {groupTeams.length === 0 ? (
                        <div className="py-6 text-center bg-slate-955/40 rounded-xl border border-dashed border-slate-850 text-slate-500 text-xs font-light">
                          Chưa có đội thi đấu nào được gán vào bảng này.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {groupTeams.map(t => (
                            <div
                              key={t.id}
                              className="p-3 bg-slate-900/60 border border-slate-850 hover:border-slate-800 transition-all rounded-xl flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="min-w-0">
                                <span className="font-bold text-slate-200 block truncate leading-tight">{t.name}</span>
                                <span className="font-mono text-[9px] text-slate-500 font-semibold uppercase tracking-wider block mt-0.5">({t.code})</span>
                              </div>
                              
                              <button
                                id={`remove-team-${t.id}-from-group`}
                                onClick={() => handleAssignTeamToGroup(t.id, null)}
                                title="Rút khỏi bảng đấu"
                                className="text-slate-400 hover:text-red-400 font-bold text-[10px] transition-colors shrink-0 bg-slate-850 hover:bg-red-500/10 px-2 py-1 rounded-md"
                              >
                                Gỡ bỏ
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Live Summary */}
                    <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-850 text-xs space-y-2 mb-4">
                      <p className="font-bold text-slate-400 text-[11px] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-ping"></span>
                        <span>Trạng thái lịch thi đấu:</span>
                      </p>
                      <div className="grid grid-cols-3 gap-2.5 text-center">
                        <div className="bg-slate-900/80 border border-slate-850/80 p-2 rounded-lg">
                          <span className="text-[9px] text-slate-500 font-extrabold uppercase block tracking-wider">Số đội</span>
                          <span className="font-mono text-sm font-bold text-slate-200 mt-0.5 block">{groupTeams.length}</span>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-850/80 p-2 rounded-lg">
                          <span className="text-[9px] text-slate-500 font-extrabold uppercase block tracking-wider">Số trận</span>
                          <span className="font-mono text-sm font-bold text-slate-200 mt-0.5 block">{groupMatches.length}</span>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-850/80 p-2 rounded-lg">
                          <span className="text-[9px] text-slate-500 font-extrabold uppercase block tracking-wider">Hoàn tất</span>
                          <span className="font-mono text-sm font-bold text-brand-primary mt-0.5 block">{compMatches.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions to schedule matches */}
                  <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                    {groupMatches.length === 0 ? (
                      <button
                        id={`generate-schedule-btn-${group.id}`}
                        onClick={() => handleOpenGenModal(group.id)}
                        disabled={groupTeams.length < 2}
                        className="btn-primary w-full justify-center !text-xs !py-2.5"
                      >
                        <CalendarCheck2 className="w-4 h-4" />
                        <span>Sinh lịch đấu Round Robin</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 w-full font-display">
                        <button
                          id={`regenerate-schedule-btn-${group.id}`}
                          onClick={() => handleOpenGenModal(group.id)}
                          className="btn-secondary flex-1 justify-center !text-xs !py-2"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Thiết lập lại lịch</span>
                        </button>
                        
                        <button
                          id={`reset-schedule-btn-${group.id}`}
                          onClick={() => handleResetMatches(group.id, group.name)}
                          className="btn-danger !p-2 !h-9 text-red-400 hover:text-red-300 rounded-xl"
                          title="Xóa toàn bộ trận đấu bảng này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom layout: Unassigned teams pool picker */}
          {unassignedTeams.length > 0 && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Network className="w-5 h-5 text-amber-400 animate-pulse" />
                <h3 className="font-display font-bold text-amber-200 text-xs uppercase tracking-wider">
                  Bể chờ xếp bảng ({unassignedTeams.length} đội tự do)
                </h3>
              </div>
              
              <p className="text-xs text-slate-400 leading-relaxed font-light mb-4">
                Các đội bóng dưới đây chưa được sắp xếp vào bất kỳ bảng đấu nào của giải Golab. Vui lòng chọn bảng đấu để phân nhóm.
              </p>

              <div className="flex flex-wrap gap-3">
                {unassignedTeams.map(t => (
                  <div
                    key={t.id}
                    className="p-3 bg-slate-900 border border-slate-850 rounded-xl text-xs flex items-center justify-between gap-4 shadow-xl"
                  >
                    <div>
                      <span className="font-bold text-slate-200 block">{t.name}</span>
                      <span className="text-[9px] text-slate-500 font-mono tracking-wider uppercase block mt-0.5">({t.code})</span>
                    </div>

                    <select
                      id={`assign-direct-team-${t.id}`}
                      defaultValue=""
                      onChange={e => {
                        handleAssignTeamToGroup(t.id, e.target.value || null);
                      }}
                      className="premium-input !py-1 text-[11px] font-bold cursor-pointer bg-slate-955 focus:border-amber-400/60"
                    >
                      <option value="">📁 Nhấp chọn bảng đấu...</option>
                      {state.groups.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scheduler Generator Interactive Settings Modal */}
      {activeGroupGenId && (
        <div
          id="gen-modal-backdrop"
          onClick={() => setActiveGroupGenId(null)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 pointer-events-auto"
        >
          <div
            id="gen-modal"
            onClick={e => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-zoom-in pointer-events-auto flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950 text-white shrink-0">
              <h3 className="font-display font-bold text-base flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-brand-primary" />
                <span>Cấu hình & Ghép cặp Tự Động</span>
              </h3>
              <button
                id="close-gen-modal-btn"
                onClick={() => setActiveGroupGenId(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="bg-brand-secondary/10 text-slate-300 border-brand-secondary/20 border p-3.5 rounded-2xl text-[11px] leading-relaxed">
                🤖 <strong>Vận hành bởi Golab Engine:</strong> Thuật toán Circle Method sẽ bốc thăm ghép cặp ngẫu nhiên các đội thi đấu vòng bảng với số lượng trận đấu tối ưu, khớp chính xác số giờ bắt đầu và khoảng cách mỗi trận.
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Mốc ngày giờ khai mạc bảng</label>
                <input
                  id="gen-startDateTime"
                  type="datetime-local"
                  required
                  value={genConfig.startDateTime}
                  onChange={e => setGenConfig({ ...genConfig, startDateTime: e.target.value })}
                  className="premium-input w-full cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Danh sách sân đấu</label>
                  <input
                    id="gen-courtsText"
                    type="text"
                    required
                    placeholder="Sân 1, Sân 2"
                    value={genConfig.courtsText}
                    onChange={e => setGenConfig({ ...genConfig, courtsText: e.target.value })}
                    className="premium-input w-full"
                  />
                  <span className="text-[9px] text-slate-500 mt-1 block">Cách nhau bằng dấu phẩy</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Giãn cách trận đấu</label>
                  <select
                    id="gen-intervalMinutes"
                    value={genConfig.intervalMinutes}
                    onChange={e => setGenConfig({ ...genConfig, intervalMinutes: parseInt(e.target.value) })}
                    className="premium-input w-full cursor-pointer"
                  >
                    <option value={20}>20 phút / trận</option>
                    <option value={30}>30 phút / trận</option>
                    <option value={45}>45 phút / trận</option>
                    <option value={60}>60 phút / trận</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-800 flex items-center justify-end gap-3 h-18 shrink-0">
              <button
                id="gen-cancel-btn"
                type="button"
                onClick={() => setActiveGroupGenId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Quay lại
              </button>
              <button
                id="gen-confirm-btn"
                onClick={handleTriggerGenerator}
                className="btn-primary !py-2.5 !px-5 text-xs shadow-md"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Tiến hành tạo lịch</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
