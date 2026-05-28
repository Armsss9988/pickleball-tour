/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import { Athlete } from '../types';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Edit2,
  FileCheck2,
  Flame,
  Check,
  X,
  Sparkles,
  Info,
  CalendarCheck,
  TrendingUp
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { parseAthleteBulkInput } from '../utils/tournamentLogic';

interface AthleteManagementScreenProps {
  athleteModalOpen: boolean;
  setAthleteModalOpen: (open: boolean) => void;
}

export default function AthleteManagementScreen({ athleteModalOpen, setAthleteModalOpen }: AthleteManagementScreenProps) {
  const { state, addAthlete, updateAthlete, deleteAthlete, bulkImportAthletes } = useTournament();

  const tourney = state.tournaments.find(t => t.id === state.activeTournamentId);
  const ruleset = tourney?.rulesetConfig;
  const requiredTotal = ruleset?.players?.requiredTotal ?? 40;
  const requiredMale = ruleset?.players?.requiredGenderCount?.male ?? 24;
  const requiredFemale = ruleset?.players?.requiredGenderCount?.female ?? 16;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortField, setSortField] = useState<'fullName' | 'skillLevel'>('fullName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Input States for New/Edit Athlete
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    gender: 'Nam' as 'Nam' | 'Nữ' | 'Khác' | '',
    phone: '',
    club: '',
    skillLevel: '',
    note: ''
  });

  // Bulk paste text state
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Helper: Find which team the athlete belongs to
  const getAthleteTeam = (athleteId: string) => {
    const memberRecord = state.teamMembers.find(m => m.athleteId === athleteId);
    if (!memberRecord) return null;
    return state.teams.find(t => t.id === memberRecord.teamId) || null;
  };

  // Filter & Search Logic
  const filteredAthletes = state.athletes
    .filter(a => {
      const matchSearch =
        a.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.club || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.skillLevel || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchGender = filterGender === '' || a.gender === filterGender;
      const matchStatus = filterStatus === '' || a.status === filterStatus;
      return matchSearch && matchGender && matchStatus;
    })
    .sort((a, b) => {
      let valA = sortField === 'fullName' ? a.fullName : (a.skillLevel || '0');
      let valB = sortField === 'fullName' ? b.fullName : (b.skillLevel || '0');

      // Numeric comparison if skillLevel
      if (sortField === 'skillLevel') {
        const numA = parseFloat(valA) || 0;
        const numB = parseFloat(valB) || 0;
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }

      return sortDirection === 'asc'
        ? valA.localeCompare(valB, 'vi')
        : valB.localeCompare(valA, 'vi');
    });

  const handleSort = (field: 'fullName' | 'skillLevel') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      fullName: '',
      gender: 'Nam',
      phone: '',
      club: '',
      skillLevel: '3.5',
      note: ''
    });
    setAthleteModalOpen(true);
  };

  const handleOpenEditModal = (athlete: Athlete) => {
    setEditingId(athlete.id);
    setFormData({
      fullName: athlete.fullName,
      gender: athlete.gender || 'Nam',
      phone: athlete.phone || '',
      club: athlete.club || '',
      skillLevel: athlete.skillLevel || '3.5',
      note: athlete.note || ''
    });
    setAthleteModalOpen(true);
  };

  const handleSubmitAthlete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) return;

    if (editingId) {
      updateAthlete(editingId, {
        fullName: formData.fullName.trim(),
        gender: formData.gender,
        phone: formData.phone.trim(),
        club: formData.club.trim(),
        skillLevel: formData.skillLevel.trim(),
        note: formData.note.trim()
      });
    } else {
      addAthlete({
        fullName: formData.fullName.trim(),
        gender: formData.gender,
        phone: formData.phone.trim(),
        club: formData.club.trim(),
        skillLevel: formData.skillLevel.trim(),
        note: formData.note.trim(),
        status: 'registered'
      });
    }
    setAthleteModalOpen(false);
  };

  const handleBulkImport = () => {
    const list = parseAthleteBulkInput(bulkText);
    if (list.length === 0) {
      alert('Không nhận diện được vận động viên hợp lệ nào từ nội dung dán. Vui lòng kiểm tra lại cấu trúc.');
      return;
    }
    bulkImportAthletes(list as Omit<Athlete, 'id' | 'createdAt' | 'updatedAt'>[]);
    setBulkModalOpen(false);
    setBulkText('');
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa vận động viên "${name}"? Hành động này cũng sẽ gỡ vận động viên này khỏi danh sách đội nếu có.`)) {
      deleteAthlete(id);
    }
  };

  const currentRole = state.currentUser?.role || 'viewer';
  const canEdit = currentRole === 'super_admin' || currentRole === 'organizer';

  return (
    <div id="athletes-screen-container" className="space-y-6 animate-fade-in">
      {/* Header and top controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-brand-primary" />
            <span>Danh sách Vận động viên</span>
          </h1>
          <p className="text-[11px] text-slate-400 font-medium mt-1">
            Quản lý hồ sơ vận động viên, theo dõi trình độ, nhập nhanh dữ liệu danh sách từ Excel/Bảng tính.
          </p>
        </div>

        {/* Buttons */}
        {canEdit && (
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              id="open-bulk-import-modal-btn"
              onClick={() => setBulkModalOpen(true)}
              className="btn-secondary px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs select-none"
            >
              <FileCheck2 className="w-4 h-4 text-brand-primary" />
              <span>Nhập Excel nhanh</span>
            </button>
            
            <button
              id="open-add-athlete-modal-btn"
              onClick={handleOpenAddModal}
              className="btn-primary text-slate-950 px-4.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md select-none"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Thêm lẻ VĐV</span>
            </button>
          </div>
        )}
      </div>

      {/* Thống kê giới tính & Đủ điều kiện bốc thăm */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng số vận động viên', value: `${state.athletes.length} / ${requiredTotal}`, icon: Users, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
          { label: `VĐV Nam (Yêu cầu ${requiredMale})`, value: `${state.athletes.filter(a => a.gender === 'Nam').length} / ${requiredMale}`, icon: Flame, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
          { label: `VĐV Nữ (Yêu cầu ${requiredFemale})`, value: `${state.athletes.filter(a => a.gender === 'Nữ').length} / ${requiredFemale}`, icon: Flame, color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' }
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="premium-card p-4 rounded-2xl flex items-center gap-3.5">
              <div className={`p-2.5 rounded-xl border ${stat.color.split(' ').slice(1).join(' ')}`}>
                <Icon className={`w-5 h-5 ${stat.color.split(' ')[0]}`} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{stat.label}</span>
                <span className="text-lg font-display font-black text-white mt-0.5 block">{stat.value}</span>
              </div>
            </div>
          );
        })}

        <div className={`premium-card p-4 rounded-2xl flex flex-col justify-center ${
          state.athletes.filter(a => a.gender === 'Nam').length === requiredMale && state.athletes.filter(a => a.gender === 'Nữ').length === requiredFemale
            ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
            : 'border-amber-500/20 bg-amber-500/5 text-amber-400'
        }`}>
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">Điều kiện bốc thăm</span>
          <div className="text-xs font-bold mt-1.5 flex items-center gap-1.5 leading-none">
            {state.athletes.filter(a => a.gender === 'Nam').length === requiredMale && state.athletes.filter(a => a.gender === 'Nữ').length === requiredFemale ? (
              <>
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Đủ điều kiện chia đội</span>
              </>
            ) : (
              <>
                <X className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Chưa đủ VĐV (Cần {requiredMale}N, {requiredFemale}F)</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Box */}
      <div className="premium-card p-3 rounded-2xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            id="athlete-search-input"
            type="text"
            placeholder="Tìm theo tên vận động viên, CLB hoặc trình độ..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.8 text-xs border border-white/5 focus:border-brand-primary rounded-xl bg-slate-950/60 focus:outline-hidden text-slate-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Gender Filter */}
          <select
            id="filter-gender-dropdown"
            value={filterGender}
            onChange={e => setFilterGender(e.target.value)}
            className="px-3 py-1.8 border border-white/5 focus:border-brand-primary rounded-xl bg-slate-950/60 text-xs font-semibold cursor-pointer text-slate-200 focus:outline-hidden"
          >
            <option value="">Giới tính: Tất cả</option>
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
            <option value="Khác">Khác</option>
          </select>

          {/* Assignment Status Filter */}
          <select
            id="filter-status-dropdown"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-1.8 border border-white/5 focus:border-brand-primary rounded-xl bg-slate-950/60 text-xs font-semibold cursor-pointer text-slate-200 focus:outline-hidden"
          >
            <option value="">Trạng thái: Tất cả</option>
            <option value="assigned">Đã thuộc đội</option>
            <option value="registered">Còn tự do</option>
          </select>
        </div>
      </div>

      {/* Main Table view of athletes */}
      <div className="premium-card rounded-3xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-slate-900/40 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Tên VĐV</th>
                <th className="py-3.5 px-4">Giới tính</th>
                <th className="py-3.5 px-4">CLB / Đội nhóm</th>
                <th className="py-3.5 px-4 text-center">
                  <button
                    onClick={() => handleSort('skillLevel')}
                    className="inline-flex items-center gap-1.5 font-bold hover:text-brand-primary mx-auto transition-colors"
                  >
                    <span>Trình độ</span>
                    <span className="text-[8px]">▼▲</span>
                  </button>
                </th>
                <th className="py-3.5 px-4">Đội bóng</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                {canEdit && <th className="py-3.5 px-4 text-right">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300 text-xs">
              {filteredAthletes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 font-medium">
                    Không tìm thấy vận động viên nào khớp điều kiện lọc.
                  </td>
                </tr>
              ) : (
                filteredAthletes.map(athlete => {
                  const assignedTeam = getAthleteTeam(athlete.id);
                  const isMale = athlete.gender === 'Nam';

                  return (
                    <tr
                      key={athlete.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-slate-950 text-[10px] ${
                            isMale ? 'bg-sky-400' : 'bg-pink-400'
                          }`}>
                            {athlete.fullName.charAt(0)}
                          </div>
                          <div>
                            <span className="block leading-tight">{athlete.fullName}</span>
                            {athlete.phone && (
                              <span className="text-[9px] text-slate-500 font-mono block mt-0.5">{athlete.phone}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          isMale ? 'text-sky-400 bg-sky-500/10' : 'text-pink-400 bg-pink-500/10'
                        }`}>
                          {athlete.gender}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{athlete.club || '--'}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-brand-primary">{athlete.skillLevel || '3.5'}</td>
                      <td className="py-3.5 px-4">
                        {assignedTeam ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-white font-bold leading-none">{assignedTeam.name}</span>
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase tracking-wider">
                              {assignedTeam.code}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-650 text-slate-600 font-medium italic text-[11px]">Chưa vào đội</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge type="athlete_status" value={athlete.status} />
                      </td>
                      
                      {canEdit && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1 justify-end">
                            <button
                              id={`edit-athlete-${athlete.id}`}
                              onClick={() => handleOpenEditModal(athlete)}
                              className="p-1.5 text-slate-450 text-slate-400 hover:text-brand-primary hover:bg-white/5 rounded-lg transition-all"
                              title="Chỉnh sửa thông tin"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`delete-athlete-${athlete.id}`}
                              onClick={() => handleDelete(athlete.id, athlete.fullName)}
                              className="p-1.5 text-slate-450 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-all"
                              title="Xóa vận động viên"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. Modal: Dán Excel nhanh (Bulk Paste Modal) */}
      {bulkModalOpen && (
        <div id="bulk-import-modal-overlay" className="fixed inset-0 z-50 bg-slate-955/80 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden">
          <div id="bulk-import-modal-container" className="premium-card bg-slate-900 border border-white/5 w-full max-w-xl rounded-3xl p-6 shadow-2xl relative animate-fade-in flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-brand-primary" />
                <h3 className="text-base font-display font-bold text-white">Nhập danh sách Excel</h3>
              </div>
              <button
                id="close-bulk-modal-btn"
                onClick={() => setBulkModalOpen(false)}
                className="p-1.5 text-slate-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5 text-[10px] text-slate-400 leading-relaxed space-y-1.5 font-light">
                <p className="font-bold text-slate-300 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                  <span>Cấu trúc dán dữ liệu:</span>
                </p>
                <p>Mỗi dòng là một vận động viên. Phân tách các cột bằng dấu phẩy <code>,</code> hoặc phím Tab (khi copy trực tiếp từ Excel):</p>
                <pre className="bg-slate-900 p-2 rounded-lg text-slate-200 font-mono text-[9px] block whitespace-pre-wrap select-all">
                  Họ và tên, Giới tính, Số điện thoại, Câu lạc bộ, Trình độ, Ghi chú
                </pre>
                <p className="italic text-[9px]">Ví dụ: Nguyễn Văn A, Nam, 0901234567, Sài Gòn PB, 3.5, Đội trưởng</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5 tracking-wider">Nội dung dữ liệu</label>
                <textarea
                  id="bulk-athletes-input"
                  rows={8}
                  placeholder="Dán các dòng từ bảng Excel của bạn vào đây..."
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-white/5 focus:border-brand-primary focus:outline-hidden rounded-xl bg-slate-950/60 font-mono text-slate-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/5 mt-5 shrink-0">
              <button
                id="cancel-bulk-modal-btn"
                onClick={() => setBulkModalOpen(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Hủy bỏ
              </button>
              <button
                id="confirm-bulk-import-btn"
                onClick={handleBulkImport}
                className="btn-primary text-xs px-5 py-2"
              >
                Xác nhận nhập
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal: Thêm hoặc Sửa VĐV Lẻ */}
      {athleteModalOpen && (
        <div id="athlete-form-modal-overlay" className="fixed inset-0 z-50 bg-slate-955/80 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden">
          <form
            id="athlete-form"
            onSubmit={handleSubmitAthlete}
            className="premium-card bg-slate-900 border border-white/5 w-full max-w-md rounded-3xl p-6 shadow-2xl relative animate-fade-in flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-primary" />
                <h3 className="text-base font-display font-bold text-white">
                  {editingId ? 'Chỉnh sửa VĐV' : 'Thêm mới Vận động viên'}
                </h3>
              </div>
              <button
                id="close-athlete-modal-btn"
                type="button"
                onClick={() => setAthleteModalOpen(false)}
                className="p-1.5 text-slate-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1 tracking-wider">Họ và tên <span className="text-rose-500">*</span></label>
                <input
                  id="athlete-name-field"
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn Nam"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full premium-input font-semibold text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1 tracking-wider">Giới tính</label>
                  <select
                    id="athlete-gender-field"
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full premium-input font-semibold text-slate-200 cursor-pointer"
                  >
                    <option value="Nam" className="bg-slate-900">Nam</option>
                    <option value="Nữ" className="bg-slate-900">Nữ</option>
                    <option value="Khác" className="bg-slate-900">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1 tracking-wider">Số điện thoại</label>
                  <input
                    id="athlete-phone-field"
                    type="text"
                    placeholder="Không bắt buộc"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full premium-input font-semibold text-slate-150"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1 tracking-wider">Câu lạc bộ</label>
                  <input
                    id="athlete-club-field"
                    type="text"
                    placeholder="Ví dụ: Golab Club"
                    value={formData.club}
                    onChange={e => setFormData({ ...formData, club: e.target.value })}
                    className="w-full premium-input font-semibold text-slate-150"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1 tracking-wider">Trình độ (Rating)</label>
                  <input
                    id="athlete-skill-field"
                    type="text"
                    placeholder="Ví dụ: 3.5"
                    value={formData.skillLevel}
                    onChange={e => setFormData({ ...formData, skillLevel: e.target.value })}
                    className="w-full premium-input font-mono font-bold text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1 tracking-wider">Ghi chú</label>
                <textarea
                  id="athlete-note-field"
                  rows={2}
                  placeholder="Ví dụ: Thuận tay trái, Đội trưởng tiềm năng..."
                  value={formData.note}
                  onChange={e => setFormData({ ...formData, note: e.target.value })}
                  className="w-full premium-input text-slate-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/5 mt-5 shrink-0">
              <button
                id="cancel-athlete-form-btn"
                type="button"
                onClick={() => setAthleteModalOpen(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Hủy bỏ
              </button>
              <button
                id="confirm-save-athlete-btn"
                type="submit"
                className="btn-primary text-xs px-5 py-2"
              >
                Lưu hồ sơ
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
