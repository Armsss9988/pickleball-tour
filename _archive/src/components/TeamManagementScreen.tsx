/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import { Team, Athlete } from '../types';
import {
  Trophy,
  Plus,
  Trash2,
  Edit2,
  UserCheck,
  X,
  PlusSquare,
  Users,
  Award,
  CircleMinus,
  Check,
  AlertTriangle,
  Search,
  Dice5
} from 'lucide-react';

interface TeamManagementScreenProps {
  teamModalOpen: boolean;
  setTeamModalOpen: (open: boolean) => void;
}

export default function TeamManagementScreen({ teamModalOpen, setTeamModalOpen }: TeamManagementScreenProps) {
  const { state, addTeam, updateTeam, deleteTeam, addAthleteToTeam, removeAthleteFromTeam, performAutomaticTeamDraw } = useTournament();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [randomSeed, setRandomSeed] = useState('GOLAB-CUP-2');

  const tourney = state.tournaments.find(t => t.id === state.activeTournamentId);
  const ruleset = tourney?.rulesetConfig;
  const requiredTotal = ruleset?.players?.requiredTotal ?? 40;
  const requiredMale = ruleset?.players?.requiredGenderCount?.male ?? 24;
  const requiredFemale = ruleset?.players?.requiredGenderCount?.female ?? 16;
  const teamCount = ruleset?.team?.count ?? 8;
  const mPerTeam = ruleset?.team?.composition?.male ?? 3;
  const fPerTeam = ruleset?.team?.composition?.female ?? 2;

  const maleCount = state.athletes.filter(a => a.gender === 'Nam').length;
  const femaleCount = state.athletes.filter(a => a.gender === 'Nữ').length;
  const isEligibleForDraw = maleCount >= requiredMale && femaleCount >= requiredFemale;
  const hasExistingDraw = state.teamMembers.length > 0;

  // Editing state controls
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    captainAthleteId: '',
    groupId: '',
    seed: '',
    note: ''
  });

  // Track checked athletes for new team creation modal
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);

  // Get list of athletes in a team
  const getTeamMembers = (teamId: string) => {
    const refs = state.teamMembers.filter(m => m.teamId === teamId);
    return refs
      .map(ref => {
        const athlete = state.athletes.find(a => a.id === ref.athleteId);
        return athlete ? { ...athlete, isCaptain: ref.role === 'captain' } : null;
      })
      .filter((a): a is Athlete & { isCaptain: boolean } => a !== null);
  };

  // Get available unassigned athletes
  const availableAthletes = state.athletes.filter(a => a.status !== 'assigned');

  // Filtered Teams list
  const filteredTeams = state.teams.filter(t => {
    const matchSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchGroup = filterGroup === '' || t.groupId === filterGroup;
    return matchSearch && matchGroup;
  });

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      code: '',
      captainAthleteId: '',
      groupId: '',
      seed: '',
      note: ''
    });
    setSelectedAthleteIds([]);
    setTeamModalOpen(true);
  };

  const handleOpenEditModal = (team: Team) => {
    setEditingId(team.id);
    const members = state.teamMembers.filter(m => m.teamId === team.id);
    setFormData({
      name: team.name,
      code: team.code,
      captainAthleteId: team.captainAthleteId || '',
      groupId: team.groupId || '',
      seed: team.seed || '',
      note: team.note || ''
    });
    setSelectedAthleteIds(members.map(m => m.athleteId));
    setTeamModalOpen(true);
  };

  const handleSubmitTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) return;

    if (editingId) {
      updateTeam(
        editingId,
        {
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          captainAthleteId: formData.captainAthleteId || null,
          groupId: formData.groupId || null,
          seed: formData.seed || null,
          note: formData.note.trim()
        },
        selectedAthleteIds // Updates team members roster
      );
    } else {
      addTeam(
        {
          tournamentId: state.activeTournamentId,
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          captainAthleteId: formData.captainAthleteId || null,
          groupId: formData.groupId || null,
          seed: formData.seed || null,
          note: formData.note.trim()
        },
        selectedAthleteIds
      );
    }
    setTeamModalOpen(false);
  };

  const handleDeleteTeam = (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn giải tán đội "${name}"? Thao tác này sẽ gỡ toàn bộ thành viên trở lại trạng thái Tự Do và xóa sạch lịch đấu lịch sử liên quan.`)) {
      deleteTeam(id);
    }
  };

  const handleQuickAddMember = (teamId: string, athleteId: string) => {
    if (!athleteId) return;
    const err = addAthleteToTeam(teamId, athleteId);
    if (err) {
      alert(err);
    }
  };

  const handleRemoveMember = (teamId: string, athleteId: string, athleteName: string) => {
    if (confirm(`Bạn có muốn gỡ vận động viên "${athleteName}" khỏi đội?`)) {
      removeAthleteFromTeam(teamId, athleteId);
    }
  };

  const toggleSelectAthleteForTeam = (athId: string) => {
    setSelectedAthleteIds(prev => {
      if (prev.includes(athId)) {
        return prev.filter(id => id !== athId);
      } else {
        return [...prev, athId];
      }
    });

    // If removed the captain draft
    if (formData.captainAthleteId === athId) {
      setFormData(prev => ({ ...prev, captainAthleteId: '' }));
    }
  };

  const getGroupName = (groupId: string | null) => {
    if (!groupId) return 'Chưa phân bảng';
    return state.groups.find(g => g.id === groupId)?.name || 'Chưa phân bảng';
  };

  const getTeamRosterAthletes = () => {
    // Return athletes that are either unassigned OR currently already assigned to this exact editing team
    return state.athletes.filter(a => {
      if (a.status !== 'assigned') return true;
      if (editingId) {
        return state.teamMembers.some(m => m.teamId === editingId && m.athleteId === a.id);
      }
      return false;
    });
  };

  const listToSelectFrom = getTeamRosterAthletes();
  const currentRole = state.currentUser?.role || 'viewer';
  const canEdit = currentRole === 'super_admin' || currentRole === 'organizer';

  const selectedAthletes = state.athletes.filter(a => selectedAthleteIds.includes(a.id));
  const selectedMales = selectedAthletes.filter(a => a.gender === 'Nam');
  const selectedFemales = selectedAthletes.filter(a => a.gender === 'Nữ');
  const isSelectedRosterValid = selectedAthleteIds.length === 5 && selectedMales.length === 3 && selectedFemales.length === 2;

  return (
    <div id="team-screen-container" className="space-y-6 animate-fade-in">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-brand-primary" />
            <span>Danh sách Đội bóng</span>
          </h1>
          <p className="text-[11px] text-slate-400 font-medium mt-1">
            Quản lý đội tuyển, phân chia bảng đấu, hạt giống hạt nhân và sơ đồ nhân sự chặng đấu.
          </p>
        </div>

        {canEdit && (
          <button
            id="open-add-team-modal-btn"
            onClick={handleOpenAddModal}
            className="btn-primary text-slate-950 px-4.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md self-start sm:self-auto select-none"
          >
            <Plus className="w-4 h-4 text-slate-955" />
            <span>Tạo đội thi đấu</span>
          </button>
        )}
      </div>

      {/* Giao diện Bốc thăm chia đội ngẫu nhiên */}
      {canEdit && (
        <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-radial from-slate-900 via-slate-950 to-slate-950 p-5 shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-primary rounded-full opacity-5 blur-3xl -translate-y-24 translate-x-24"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="space-y-1.5">
              <h2 className="text-sm sm:text-base font-display font-black tracking-tight text-white flex items-center gap-2">
                <Dice5 className="w-5 h-5 text-brand-primary animate-spin" style={{ animationDuration: '3s' }} />
                <span>Bốc thăm chia đội tự động 100% công khai</span>
              </h2>
              <p className="text-[11px] text-slate-400 max-w-xl font-light leading-relaxed">
                Phân bổ ngẫu nhiên {requiredTotal} vận động viên ({requiredMale} Nam, {requiredFemale} Nữ) vào {teamCount} đội bằng thuật toán seeded-random. Đảm bảo mỗi đội đạt tỷ lệ cân bằng hoàn hảo {mPerTeam} Nam và {fPerTeam} Nữ.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="bg-slate-950/80 border border-white/5 px-3 py-1.8 rounded-xl flex items-center gap-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Seed:</span>
                <input
                  type="text"
                  placeholder="Nhập seed..."
                  value={randomSeed}
                  onChange={e => setRandomSeed(e.target.value)}
                  className="bg-transparent border-none text-xs font-black text-white focus:outline-hidden w-28 font-mono uppercase"
                />
              </div>
              
              <button
                onClick={() => {
                  if (hasExistingDraw && !confirm("Cảnh báo: Giải đấu đã có danh sách đội hình. Bốc thăm lại sẽ ghi đè toàn bộ đội hình cũ và reset lịch thi đấu. Bạn có chắc muốn tiếp tục?")) {
                     return;
                  }
                  performAutomaticTeamDraw(randomSeed);
                }}
                disabled={!isEligibleForDraw}
                className="btn-primary text-slate-950 font-black px-4.5 py-2.5 rounded-xl transition-all shadow-md text-xs select-none disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
              >
                🎲 {hasExistingDraw ? 'Bốc thăm lại' : 'Bốc thăm tự động'}
              </button>
            </div>
          </div>

          {!isEligibleForDraw && (
            <div className="bg-rose-500/5 border border-rose-500/10 text-rose-350 px-3 py-2.5 rounded-2xl text-[10px] leading-relaxed flex items-center gap-2 mt-4">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>Không đủ điều kiện bốc thăm:</strong> Cơ sở dữ liệu hiện có {state.athletes.filter(a => a.gender === 'Nam').length} Nam và {state.athletes.filter(a => a.gender === 'Nữ').length} Nữ. Vui lòng cập nhật danh sách VĐV đạt tối thiểu <strong>{requiredMale} Nam và {requiredFemale} Nữ</strong>.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Searching & Filter inputs */}
      <div className="premium-card p-3 rounded-2xl flex flex-col sm:flex-row gap-2.5 items-stretch justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            id="team-search-input"
            type="text"
            placeholder="Tìm theo tên đội hoặc ký hiệu viết tắt..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.8 text-xs border border-white/5 focus:border-brand-primary rounded-xl bg-slate-950/60 focus:outline-hidden text-slate-100"
          />
        </div>

        <select
          id="team-filter-group"
          value={filterGroup}
          onChange={e => setFilterGroup(e.target.value)}
          className="px-3 py-1.8 border border-white/5 focus:border-brand-primary rounded-xl bg-slate-955/60 text-xs font-semibold cursor-pointer focus:outline-hidden text-slate-200"
        >
          <option value="">Phân chia bảng: Tất cả</option>
          {state.groups.map(g => (
            <option key={g.id} value={g.id} className="bg-slate-900">
              {g.name}
            </option>
          ))}
        </select>
      </div>

      {/* Teams Render Grid */}
      {filteredTeams.length === 0 ? (
        <div className="premium-card rounded-3xl p-12 text-center">
          <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-white font-display font-semibold text-sm">Chưa có đội thi đấu</h3>
          <p className="text-slate-450 text-[11px] mt-1 max-w-xs mx-auto font-light">
            Nhấn nút tạo đội bên trên để thiết lập đội bóng thi đấu thủ công hoặc sử dụng bốc thăm tự động.
          </p>
        </div>
      ) : (
        <div id="teams-grid" className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {filteredTeams.map(team => {
            const roster = getTeamMembers(team.id);
            const teamMales = roster.filter(m => m.gender === 'Nam');
            const teamFemales = roster.filter(m => m.gender === 'Nữ');
            const isRosterValid = roster.length === 5 && teamMales.length === 3 && teamFemales.length === 2;

            return (
              <div
                key={team.id}
                id={`team-card-${team.id}`}
                className="premium-card rounded-3xl p-5 flex flex-col justify-between hover:border-brand-primary/20"
              >
                <div>
                  {/* Team Card Header block */}
                  <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-white/5">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-black text-white text-base leading-tight">
                          {team.name}
                        </h3>
                        <span className="font-mono text-[9px] font-black bg-slate-955/60 border border-white/5 text-slate-350 px-2 py-0.5 rounded-lg uppercase tracking-wide">
                          {team.code}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="text-[9px] text-brand-primary bg-brand-primary/10 font-bold px-2 py-0.5 rounded-lg border border-brand-primary/20">
                          {getGroupName(team.groupId)}
                        </span>
                        {team.seed && (
                          <span className="text-[9px] text-yellow-400 bg-yellow-500/10 font-bold px-2 py-0.5 rounded-lg border border-yellow-500/20 flex items-center gap-0.5">
                            <Award className="w-3 h-3 text-yellow-400" />
                            <span>Hạt giống: {team.seed}</span>
                          </span>
                        )}
                      </div>

                      {!isRosterValid && (
                        <div className="mt-2 text-[10px] text-amber-400 bg-amber-500/5 border border-amber-500/20 px-2.5 py-1.5 rounded-xl flex items-start gap-1.5 leading-normal max-w-sm">
                          <span className="shrink-0 mt-0.5">⚠️</span>
                          <div>
                            <span className="font-bold block">Chưa chuẩn điều lệ giải</span>
                            <span className="block font-light text-[9px] text-slate-400">Yêu cầu đủ 5 thành viên (3 Nam, 2 Nữ). Hiện có {roster.length} người ({teamMales.length}N, {teamFemales.length}F).</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Left Actions */}
                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          id={`edit-team-${team.id}`}
                          onClick={() => handleOpenEditModal(team)}
                          className="p-1.5 h-8 w-8 bg-slate-905/40 hover:bg-slate-950 border border-white/5 hover:border-brand-primary/30 text-slate-300 hover:text-white rounded-xl flex items-center justify-center transition-all cursor-pointer"
                          title="Sửa thông tin"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`delete-team-${team.id}`}
                          onClick={() => handleDeleteTeam(team.id, team.name)}
                          title="Giải tán đội thi đấu"
                          className="p-1.5 h-8 w-8 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/15 hover:border-rose-500/35 text-rose-350 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Roster Listing */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-slate-455 font-black uppercase tracking-wider block">
                        Đội hình đăng ký
                      </span>
                      <span className="text-[9px] text-slate-500 font-semibold font-mono">
                        ({teamMales.length} Nam, {teamFemales.length} Nữ)
                      </span>
                    </div>

                    {roster.length === 0 ? (
                      <div className="py-4 text-center bg-slate-955/40 rounded-2xl border border-dashed border-white/5 text-slate-500 text-[11px]">
                        Roster trống. Thêm thành viên bên dưới.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {roster.map(member => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-white/5 hover:border-white/10 transition-colors text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-2 h-2 rounded-full ${member.gender === 'Nam' ? 'bg-sky-400 shadow-sm shadow-sky-400/20' : 'bg-pink-400 shadow-sm shadow-pink-400/20'}`} />
                              <span className="font-semibold text-slate-200 truncate">{member.fullName}</span>
                              {member.isCaptain && (
                                <span className="text-[8px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-lg flex items-center gap-0.5">
                                  <UserCheck className="w-2.5 h-2.5 text-amber-400" />
                                  <span>Đội trưởng</span>
                                </span>
                              )}
                              {member.club && (
                                <span className="text-[10px] text-slate-500 truncate hidden sm:inline">| {member.club}</span>
                              )}
                            </div>

                            {canEdit && (
                              <button
                                id={`remove-member-${team.id}-${member.id}`}
                                onClick={() => handleRemoveMember(team.id, member.id, member.fullName)}
                                title="Gỡ khỏi đội"
                                className="text-slate-500 hover:text-rose-455 hover:text-rose-400 transition-colors p-1 hover:bg-white/5 rounded-lg"
                              >
                                <CircleMinus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {team.note && (
                    <div className="mt-3.5 text-[10px] text-slate-400 p-2 bg-slate-955/40 rounded-xl border-l-2 border-brand-primary/45 flex gap-1.5">
                      <span className="font-bold text-brand-primary shrink-0">ℹ️</span>
                      <span className="italic leading-relaxed">{team.note}</span>
                    </div>
                  )}
                </div>

                {/* Quick Add Member to exact team */}
                {canEdit && (
                  <div className="mt-5 pt-3.5 border-t border-white/5">
                    <select
                      id={`quick-add-member-select-${team.id}`}
                      defaultValue=""
                      onChange={e => {
                        handleQuickAddMember(team.id, e.target.value);
                        e.target.value = ''; // Reset select
                      }}
                      className="w-full px-3 py-2 border border-white/5 focus:border-brand-primary rounded-xl bg-slate-950/60 text-[10px] font-bold text-slate-300 cursor-pointer focus:outline-hidden"
                    >
                      <option value="">➕ Thêm nhanh VĐV tự do vào đội...</option>
                      {availableAthletes.map(a => (
                        <option key={a.id} value={a.id} className="bg-slate-900 text-xs">
                          {a.fullName} {a.club ? `(${a.club})` : ''} - Trình độ: {a.skillLevel || '3.5'} ({a.gender})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Roster Add/Edit Modal */}
      {teamModalOpen && (
        <div
          id="team-form-modal-backdrop"
          onClick={() => setTeamModalOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 pointer-events-auto overflow-hidden"
        >
          <div
            id="team-form-modal"
            onClick={e => e.stopPropagation()}
            className="premium-card bg-slate-900 border border-white/5 w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh] pointer-events-auto rounded-3xl"
          >
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-slate-955 text-white shrink-0">
              <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
                <PlusSquare className="w-5 h-5 text-brand-primary" />
                <span>{editingId ? 'Chỉnh sửa Đội thi đấu' : 'Thêm mới Đội thi đấu'}</span>
              </h3>
              <button
                id="close-team-modal-btn"
                onClick={() => setTeamModalOpen(false)}
                className="p-1.5 text-slate-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="team-submit-form" onSubmit={handleSubmitTeam} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1 tracking-wider">Tên đội <span className="text-rose-500">*</span></label>
                  <input
                    id="team-name-input"
                    type="text"
                    required
                    placeholder="Ví dụ: Đội Sét Golab"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full premium-input font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1 tracking-wider">Ký hiệu viết tắt <span className="text-rose-500">*</span></label>
                  <input
                    id="team-code-input"
                    type="text"
                    required
                    placeholder="Ví dụ: GOLAB-SET"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="w-full premium-input font-mono font-bold uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1 tracking-wider">Hạt giống bảng (Seed)</label>
                  <input
                    id="team-seed-input"
                    type="text"
                    placeholder="Không bắt buộc (ví dụ: 1, 2)"
                    value={formData.seed}
                    onChange={e => setFormData({ ...formData, seed: e.target.value })}
                    className="w-full premium-input font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1 tracking-wider">Bảng đấu phân chia</label>
                  <select
                    id="team-group-select"
                    value={formData.groupId}
                    onChange={e => setFormData({ ...formData, groupId: e.target.value })}
                    className="w-full premium-input font-semibold text-slate-200 cursor-pointer"
                  >
                    <option value="" className="bg-slate-900">Chưa phân bảng</option>
                    {state.groups.map(g => (
                      <option key={g.id} value={g.id} className="bg-slate-900">
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1 tracking-wider">Ghi chú chiến thuật</label>
                <input
                  id="team-note-input"
                  type="text"
                  placeholder="Ghi chú về đội bóng..."
                  value={formData.note}
                  onChange={e => setFormData({ ...formData, note: e.target.value })}
                  className="w-full premium-input text-slate-150"
                />
              </div>

              {/* Roster list picker inside modal */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Chọn VĐV tham gia Đội tuyển ({selectedAthleteIds.length} đã chọn)
                </span>
                
                {listToSelectFrom.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic py-3 text-center bg-slate-950/40 rounded-xl">
                    Không tìm thấy vận động viên tự do nào khả dụng. Vui lòng thêm vận động viên mới trước.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 bg-slate-955/40 p-2 rounded-2xl border border-white/5">
                    {listToSelectFrom.map(athlete => {
                      const isChecked = selectedAthleteIds.includes(athlete.id);
                      return (
                        <label
                          key={athlete.id}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-brand-primary/10 border-brand-primary/40 text-white'
                              : 'bg-transparent border-white/5 text-slate-400 hover:bg-white/[0.02]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectAthleteForTeam(athlete.id)}
                            className="w-3.5 h-3.5 accent-brand-primary rounded"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="block truncate">{athlete.fullName}</span>
                            <span className="text-[8px] text-slate-500">
                              {athlete.gender} | rating {athlete.skillLevel || '3.5'}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedAthleteIds.length > 0 && (
                <div className={`p-3 rounded-xl border text-[11px] leading-relaxed flex items-start gap-1.5 ${
                  isSelectedRosterValid 
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                    : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                }`}>
                  <span className="shrink-0 mt-0.5">{isSelectedRosterValid ? '✅' : '⚠️'}</span>
                  <div>
                    <span className="font-bold">{isSelectedRosterValid ? 'Đội hình hợp lệ' : 'Đội hình chưa đủ điều kiện:'}</span>
                    <span className="block font-light text-[10px] text-slate-400 mt-0.5">
                      {isSelectedRosterValid 
                        ? 'Đã đủ 5 thành viên (3 Nam, 2 Nữ) chuẩn điều lệ giải.' 
                        : `Yêu cầu 5 thành viên (3 Nam, 2 Nữ). Hiện có ${selectedAthleteIds.length} người (${selectedMales.length} Nam, ${selectedFemales.length} Nữ).`}
                    </span>
                  </div>
                </div>
              )}

              {/* Captain Dropdown Selection */}
              {selectedAthleteIds.length > 0 && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1 tracking-wider">Chỉ định Đội trưởng</label>
                  <select
                    id="team-captain-select"
                    value={formData.captainAthleteId}
                    onChange={e => setFormData({ ...formData, captainAthleteId: e.target.value })}
                    className="w-full premium-input font-bold text-slate-205 cursor-pointer"
                  >
                    <option value="" className="bg-slate-900">Không chỉ định đội trưởng</option>
                    {selectedAthleteIds.map(id => {
                      const ath = state.athletes.find(a => a.id === id);
                      return ath ? (
                        <option key={id} value={id} className="bg-slate-900">
                          {ath.fullName} ({ath.gender})
                        </option>
                      ) : null;
                    })}
                  </select>
                </div>
              )}
            </form>

            <div className="flex items-center justify-end gap-2.5 p-5 border-t border-white/5 bg-slate-950 shrink-0">
              <button
                id="cancel-team-modal-btn"
                type="button"
                onClick={() => setTeamModalOpen(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Hủy bỏ
              </button>
              <button
                id="confirm-save-team-btn"
                onClick={handleSubmitTeam}
                className="btn-primary text-xs px-5 py-2"
              >
                Lưu đội đấu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
