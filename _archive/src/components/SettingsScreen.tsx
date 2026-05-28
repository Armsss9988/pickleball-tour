/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import { Settings, Save, AlertCircle, RefreshCcw, Landmark, MapPin, Calendar, HelpCircle } from 'lucide-react';

export default function SettingsScreen() {
  const { state, updateTournament, resetToFactoryDefaults } = useTournament();

  const tourney = state.tournaments.find(t => t.id === state.activeTournamentId);

  const [formData, setFormData] = useState({
    name: tourney?.name || '',
    location: tourney?.location || '',
    startDate: tourney?.startDate || '',
    endDate: tourney?.endDate || '',
    description: tourney?.description || '',
    rules: tourney?.rules || '',
    status: tourney?.status || 'draft',
    pointsForWin: tourney?.scoringConfig.pointsForWin ?? 1,
    pointsForLoss: tourney?.scoringConfig.pointsForLoss ?? 0,
    pointsForDraw: tourney?.scoringConfig.pointsForDraw ?? 0,

    // Flex ruleset properties
    teamCount: tourney?.rulesetConfig?.team?.count ?? 8,
    teamSize: tourney?.rulesetConfig?.team?.size ?? 5,
    teamMale: tourney?.rulesetConfig?.team?.composition?.male ?? 3,
    teamFemale: tourney?.rulesetConfig?.team?.composition?.female ?? 2,
    winScore: tourney?.rulesetConfig?.match?.winScore ?? 24,
    target1: tourney?.rulesetConfig?.match?.segmentTargetsByOrder?.[0] ?? 8,
    target2: tourney?.rulesetConfig?.match?.segmentTargetsByOrder?.[1] ?? 16,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.teamMale + formData.teamFemale !== formData.teamSize) {
      alert('Lỗi cấu hình: Số lượng Nam + Nữ mỗi đội phải đúng bằng Quy mô thành viên của đội!');
      return;
    }

    if (formData.target1 >= formData.target2 || formData.target2 >= formData.winScore) {
      alert('Lỗi cấu hình: Điểm chạm chặng 1 phải nhỏ hơn chặng 2, và chặng 2 phải nhỏ hơn điểm thắng chung cuộc!');
      return;
    }

    updateTournament({
      name: formData.name.trim(),
      location: formData.location.trim(),
      startDate: formData.startDate,
      endDate: formData.endDate,
      description: formData.description.trim(),
      rules: formData.rules.trim(),
      status: formData.status as any,
      scoringConfig: {
        pointsForWin: formData.pointsForWin,
        pointsForLoss: formData.pointsForLoss,
        pointsForDraw: formData.pointsForDraw,
        tieBreakers: ['wins', 'diff', 'headToHead', 'name']
      },
      rulesetConfig: {
        ...(tourney?.rulesetConfig || {}),
        team: {
          count: formData.teamCount,
          size: formData.teamSize,
          composition: {
            male: formData.teamMale,
            female: formData.teamFemale
          }
        },
        players: {
          requiredTotal: formData.teamCount * formData.teamSize,
          requiredGenderCount: {
            male: formData.teamCount * formData.teamMale,
            female: formData.teamCount * formData.teamFemale
          }
        },
        groups: {
          count: 2,
          teamsPerGroup: Math.ceil(formData.teamCount / 2),
          names: ["Bảng A", "Bảng B"]
        },
        match: {
          ...(tourney?.rulesetConfig?.match || {}),
          type: 'relay',
          winScore: formData.winScore,
          segmentTargetsByOrder: [formData.target1, formData.target2, formData.winScore]
        }
      } as any
    });
  };

  const currentRole = state.currentUser?.role || 'viewer';
  const isSuperAdmin = currentRole === 'super_admin';

  return (
    <div id="settings-screen-container" className="space-y-6 animate-fade-in text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Settings className="w-7 h-7 text-brand-primary" />
            <span>Cấu Hình Luật Đấu & Thông Tin</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Cài đặt cơ bản về địa điểm, mốc thời gian, luật tính điểm vòng bảng, số điểm thu thập khi thắng/thua.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form (columns 1 & 2) */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6 premium-card p-6 rounded-3xl">
          
          <div className="space-y-4">
            <h3 className="text-slate-200 font-display font-bold text-sm border-b border-slate-800/80 pb-3">
              1. Thông tin tổng quan giải Golab
            </h3>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Tên gọi chính thức <span className="text-red-400">*</span></label>
              <input
                id="settings-name"
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full premium-input font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Địa điểm tổ chức <span className="text-red-400">*</span></label>
              <input
                id="settings-location"
                type="text"
                required
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                className="w-full premium-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Ngày bắt đầu</label>
                <input
                  id="settings-startDate"
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full premium-input cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Ngày kết thúc</label>
                <input
                  id="settings-endDate"
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full premium-input cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Giới thiệu giải đấu</label>
              <textarea
                id="settings-description"
                rows={3}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full premium-input"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Quy định đấu & Điều lệ chi tiết</label>
              <textarea
                id="settings-rules"
                rows={5}
                value={formData.rules}
                onChange={e => setFormData({ ...formData, rules: e.target.value })}
                className="w-full premium-input text-xs font-light leading-relaxed"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            <h3 className="text-slate-200 font-display font-bold text-sm border-b border-slate-800/80 pb-3">
              2. Cấu hình tính điểm & Trạng thái hoạt động
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Trạng thái giải đấu</label>
                <select
                  id="settings-status"
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full premium-input cursor-pointer font-bold"
                >
                  <option value="draft">Bản nháp (Draft)</option>
                  <option value="published">Đã đăng tải (Published)</option>
                  <option value="ongoing">Đang diễn ra (Ongoing)</option>
                  <option value="completed">Đã kết thúc (Completed)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Điểm số cho mỗi Trận Thắng</label>
                <input
                  id="settings-pointsForWin"
                  type="number"
                  min={0}
                  max={10}
                  value={formData.pointsForWin}
                  onChange={e => setFormData({ ...formData, pointsForWin: parseInt(e.target.value) || 0 })}
                  className="w-full premium-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Điểm số cho mỗi Trận Hòa</label>
                <input
                  id="settings-pointsForDraw"
                  type="number"
                  min={0}
                  max={10}
                  value={formData.pointsForDraw}
                  onChange={e => setFormData({ ...formData, pointsForDraw: parseInt(e.target.value) || 0 })}
                  className="w-full premium-input"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Điểm số cho mỗi Trận Thua</label>
                <input
                  id="settings-pointsForLoss"
                  type="number"
                  min={0}
                  max={10}
                  value={formData.pointsForLoss}
                  onChange={e => setFormData({ ...formData, pointsForLoss: parseInt(e.target.value) || 0 })}
                  className="w-full premium-input"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            <h3 className="text-slate-200 font-display font-bold text-sm border-b border-slate-800/80 pb-3">
              3. Thiết lập hệ thống cấu hình linh hoạt (Flexible Ruleset Config)
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Số lượng đội bóng</label>
                <input
                  id="settings-teamCount"
                  type="number"
                  min={2}
                  max={24}
                  value={formData.teamCount}
                  onChange={e => setFormData({ ...formData, teamCount: parseInt(e.target.value) || 0 })}
                  className="w-full premium-input font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Quy mô thành viên mỗi đội</label>
                <input
                  id="settings-teamSize"
                  type="number"
                  min={2}
                  max={10}
                  value={formData.teamSize}
                  onChange={e => setFormData({ ...formData, teamSize: parseInt(e.target.value) || 0 })}
                  className="w-full premium-input font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Số VĐV Nam mỗi đội</label>
                <input
                  id="settings-teamMale"
                  type="number"
                  min={0}
                  max={10}
                  value={formData.teamMale}
                  onChange={e => setFormData({ ...formData, teamMale: parseInt(e.target.value) || 0 })}
                  className="w-full premium-input font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Số VĐV Nữ mỗi đội</label>
                <input
                  id="settings-teamFemale"
                  type="number"
                  min={0}
                  max={10}
                  value={formData.teamFemale}
                  onChange={e => setFormData({ ...formData, teamFemale: parseInt(e.target.value) || 0 })}
                  className="w-full premium-input font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Mốc điểm Chặng 1</label>
                <input
                  id="settings-target1"
                  type="number"
                  min={1}
                  max={100}
                  value={formData.target1}
                  onChange={e => setFormData({ ...formData, target1: parseInt(e.target.value) || 0 })}
                  className="w-full premium-input font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Mốc điểm Chặng 2</label>
                <input
                  id="settings-target2"
                  type="number"
                  min={1}
                  max={100}
                  value={formData.target2}
                  onChange={e => setFormData({ ...formData, target2: parseInt(e.target.value) || 0 })}
                  className="w-full premium-input font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Mốc điểm Thắng (Chặng 3)</label>
                <input
                  id="settings-winScore"
                  type="number"
                  min={1}
                  max={100}
                  value={formData.winScore}
                  onChange={e => setFormData({ ...formData, winScore: parseInt(e.target.value) || 0 })}
                  className="w-full premium-input font-semibold"
                />
              </div>
            </div>

            <div className="bg-brand-secondary/5 border border-brand-secondary/25 p-4 rounded-2xl text-slate-300 text-xs font-light space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-slate-205">
                <span>ℹ️ Quy đổi tự động dựa trên thiết lập:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 mt-0.5 text-slate-400">
                <li>Tổng VĐV giải đấu yêu cầu: <strong className="font-bold text-brand-primary">{formData.teamCount * formData.teamSize} VĐV</strong></li>
                <li>Yêu cầu Nam giới: <strong className="font-bold text-brand-primary">{formData.teamCount * formData.teamMale} Nam</strong></li>
                <li>Yêu cầu Nữ giới: <strong className="font-bold text-brand-primary">{formData.teamCount * formData.teamFemale} Nữ</strong></li>
                <li>Mốc điểm chạm tiếp sức: <strong className="font-bold text-brand-primary">{formData.target1} ➔ {formData.target2} ➔ {formData.winScore}</strong></li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-end">
            <button
              id="save-settings-submit-btn"
              type="submit"
              className="btn-primary !py-2.5 !px-6 text-xs sm:text-sm shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>Lưu lại cấu hình</span>
            </button>
          </div>
        </form>

        {/* Right Info pane (column 3) */}
        <div className="space-y-6">
          <div className="premium-card rounded-3xl p-6 shadow-lg relative overflow-hidden">
            <h4 className="font-display font-bold text-sm mb-3 flex items-center gap-2 text-brand-primary">
              <Landmark className="w-5 h-5 text-brand-primary" />
              <span>Thông tin nền tảng Golab</span>
            </h4>
            
            <p className="text-xs text-slate-400 leading-relaxed font-light mb-4">
              Hệ điều hành đang kiểm soát giải đấu thông qua LocalStorage để lưu giữ tiến độ. Mọi hoạt động thêm bớt vận động viên, dán danh sách nhanh và cập nhật set đấu sẽ được đồng bộ ngay tức thì.
            </p>

            <div className="space-y-2 border-t border-slate-850 pt-4 text-[11px] font-mono text-slate-500">
              <div className="flex justify-between">
                <span>Môi trường:</span>
                <span className="text-emerald-400 font-bold">Direct Client</span>
              </div>
              <div className="flex justify-between">
                <span>Phiên bản MVP:</span>
                <span className="text-brand-primary font-bold">v1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>Ngôn ngữ hiển thị:</span>
                <span className="text-slate-350">Vietnamese</span>
              </div>
            </div>
          </div>

          {/* Superadmin reset controller */}
          {isSuperAdmin && (
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-3xl p-5 text-rose-300 space-y-3 shadow-lg">
              <h4 className="font-display font-bold text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4.5 h-4.5 text-red-400" />
                <span>Khu vực Rủi Ro (Danger Zone)</span>
              </h4>
              <p className="text-[11px] font-light leading-relaxed text-slate-400">
                Thao tác khôi phục cài đặt gốc sẽ xóa sạch các thay đổi bạn đã nhập thủ công trong phiên làm việc hiện tại và thiết lập lại 24 vận động viên mẫu mặc định cùng 8 đội tuyển gốc để thử nghiệm lại từ đầu.
              </p>
              
              <button
                id="danger-factory-reset-btn"
                onClick={() => {
                  if (confirm('Bấm OK sẽ khôi phục dữ liệu gốc. Bạn đồng ý?')) {
                    resetToFactoryDefaults();
                  }
                }}
                className="w-full btn-danger !h-10 text-xs shadow-md justify-center flex items-center gap-1.5"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                <span>Khôi phục dữ liệu mẫu gốc</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
