'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading-skeleton';
import { apiFetch } from '@/lib/api-client';
import { ClipboardList, Users, Target, Save, Edit3, X, Lock, Plus, Trash2 } from '@/components/icons';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { getCurrentUser } from '@/lib/current-user';
import { buildTournamentUxContext } from '@/lib/tournament-ux-context';
import { getActionAccess } from '@/lib/tournament-ux-policy';
import { useToast } from '@/components/toast';

interface DependencyStats {
  playersCount: number;
  teamsCount: number;
  matchesCount: number;
}

const emptyDependencyStats: DependencyStats = {
  playersCount: 0,
  teamsCount: 0,
  matchesCount: 0,
};

interface RulesetCompositionLike {
  teamSize?: number | null;
  maleCount?: number | null;
  femaleCount?: number | null;
  allMustPlay?: boolean | null;
}

interface RulesetSegmentLike {
  segmentKey?: string | null;
  name?: string | null;
  targetScore?: number | null;
}

interface RulesetLike {
  name?: string | null;
  teamCompositionRule?: RulesetCompositionLike | null;
  teamComposition?: RulesetCompositionLike | null;
  scoringConfig?: {
    winScore?: number | null;
  } | null;
  segmentDefinitions?: RulesetSegmentLike[] | null;
  segments?: RulesetSegmentLike[] | null;
}

interface PlayersResponse {
  items?: unknown[];
}

function getRulesetComposition(ruleset: RulesetLike) {
  return ruleset?.teamCompositionRule ?? ruleset?.teamComposition ?? null;
}

function getRulesetSegments(ruleset: RulesetLike) {
  if (Array.isArray(ruleset?.segmentDefinitions)) {
    return ruleset.segmentDefinitions;
  }

  if (Array.isArray(ruleset?.segments)) {
    return ruleset.segments;
  }

  return [];
}

export default function RulesetSettingsPage() {
  const { tournament, loading: tLoading, reload } = useActiveTournament();
  const [dependencyStats, setDependencyStats] = useState<DependencyStats>(emptyDependencyStats);
  const [statsLoading, setStatsLoading] = useState(true);
  const currentUser = useMemo(() => getCurrentUser(), []);
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [genderFormat, setGenderFormat] = useState<'strict' | 'any'>('strict');
  const [teamSize, setTeamSize] = useState(5);
  const [maleCount, setMaleCount] = useState(3);
  const [femaleCount, setFemaleCount] = useState(2);
  const [allMustPlay, setAllMustPlay] = useState(true);
  const [maleMaxSegments, setMaleMaxSegments] = useState(1);
  const [femaleMaxSegments, setFemaleMaxSegments] = useState(2);
  const [noOverlapAllPlayers, setNoOverlapAllPlayers] = useState(false);
  const [saving, setSaving] = useState(false);

  const [segmentsList, setSegmentsList] = useState<SegmentDefinitionUI[]>([
    { segmentKey: 'mixed_doubles', name: 'Đôi Nam Nữ', targetScore: 8, playerCount: 2, genderRule: 'mixed' },
    { segmentKey: 'mens_doubles', name: 'Đôi Nam', targetScore: 16, playerCount: 2, genderRule: 'male_only' },
    { segmentKey: 'womens_doubles', name: 'Đôi Nữ', targetScore: 24, playerCount: 2, genderRule: 'female_only' },
  ]);

  const [overlapsList, setOverlapsList] = useState<OverlapRuleUI[]>([]);

  const [rulesetState, setRulesetState] = useState<any>(null);
  const [rulesetLoading, setRulesetLoading] = useState(true);

  const loadDependencyStats = useCallback(async () => {
    if (!tournament) {
      return;
    }

    try {
      setStatsLoading(true);
      const [playersData, teamsData, matchesData] = await Promise.all([
        apiFetch<PlayersResponse>(`/tournaments/${tournament.id}/players`).catch(() => ({ items: [] })),
        apiFetch<unknown[]>(`/tournaments/${tournament.id}/teams`).catch(() => []),
        apiFetch<unknown[]>(`/tournaments/${tournament.id}/matches`).catch(() => []),
      ]);

      setDependencyStats({
        playersCount: Array.isArray(playersData?.items) ? playersData.items.length : 0,
        teamsCount: Array.isArray(teamsData) ? teamsData.length : 0,
        matchesCount: Array.isArray(matchesData) ? matchesData.length : 0,
      });
    } catch (error: unknown) {
      console.error(error);
      setDependencyStats(emptyDependencyStats);
    } finally {
      setStatsLoading(false);
    }
  }, [tournament]);

  const loadRuleset = useCallback(async () => {
    if (!tournament) {
      return;
    }

    try {
      setRulesetLoading(true);
      const data = await apiFetch<any>(`/tournaments/${tournament.id}/ruleset`);
      setRulesetState(data);

      if (data) {
        setName(data.name || '');

        const segs = data.segmentDefinitions || data.segments || [];
        if (segs.length > 0) {
          setSegmentsList(segs.map((s: any) => ({
            segmentKey: s.segmentKey || `seg_${Math.random().toString(36).substr(2, 9)}`,
            name: s.name || '',
            targetScore: s.targetScore || 0,
            playerCount: s.playerCount || 2,
            genderRule: s.genderRule || 'any',
          })));
        }

        const comp = data.teamCompositionRule || data.teamComposition;
        if (comp) {
          const mc = comp.maleCount ?? 0;
          const fc = comp.femaleCount ?? 0;
          setMaleCount(mc);
          setFemaleCount(fc);
          setTeamSize(comp.teamSize ?? 5);
          setAllMustPlay(comp.allMustPlay ?? true);
          if (mc > 0 || fc > 0) {
            setGenderFormat('strict');
          } else {
            setGenderFormat('any');
          }
        }

        const limits = data.playerLimitRules || data.playerLimits || [];
        const maleLim = limits.find((l: any) => l.gender === 'MALE');
        const femaleLim = limits.find((l: any) => l.gender === 'FEMALE');
        const mMax = maleLim?.maxSegments ?? 1;
        const fMax = femaleLim?.maxSegments ?? 2;
        setMaleMaxSegments(mMax);
        setFemaleMaxSegments(fMax);
        if (mMax === 1 && fMax === 1) {
          setNoOverlapAllPlayers(true);
        } else {
          setNoOverlapAllPlayers(false);
        }

        const overlaps = data.overlapRules || [];
        setOverlapsList(overlaps.map((o: any) => ({
          segmentAKey: o.segmentAKey,
          segmentBKey: o.segmentBKey,
          gender: o.gender,
        })));
      }
    } catch (error) {
      console.error('Failed to load ruleset:', error);
    } finally {
      setRulesetLoading(false);
    }
  }, [tournament]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDependencyStats();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDependencyStats]);

  useEffect(() => {
    void loadRuleset();
  }, [loadRuleset]);

  if (tLoading || statsLoading || rulesetLoading || !tournament) {
    return <PageLoading />;
  }

  const ruleset = (rulesetState || {}) as RulesetLike;
  const composition = getRulesetComposition(ruleset);
  const segments = getRulesetSegments(ruleset);
  const uxContext = buildTournamentUxContext({
    tournament: {
      ...tournament,
      ruleset: rulesetState || undefined,
    },
    stats: dependencyStats,
  });
  const editAccess = getActionAccess('editRuleset', currentUser.role, uxContext);

  const handleAddSegment = () => {
    const lastSeg = segmentsList[segmentsList.length - 1];
    const lastScore = lastSeg ? Number(lastSeg.targetScore) : 0;
    const newKey = `seg_${Math.random().toString(36).substr(2, 9)}`;
    setSegmentsList([
      ...segmentsList,
      {
        segmentKey: newKey,
        name: `Chặng ${segmentsList.length + 1}`,
        targetScore: lastScore + 8,
        playerCount: 2,
        genderRule: 'any',
      },
    ]);
  };

  const handleRemoveSegment = (index: number) => {
    if (segmentsList.length <= 1) return;
    const itemToRemove = segmentsList[index];
    setSegmentsList(segmentsList.filter((_, idx) => idx !== index));
    setOverlapsList(
      overlapsList.filter(
        (o) => o.segmentAKey !== itemToRemove.segmentKey && o.segmentBKey !== itemToRemove.segmentKey
      )
    );
  };

  const handleSegmentChange = (index: number, fields: Partial<SegmentDefinitionUI>) => {
    setSegmentsList(
      segmentsList.map((s, idx) => (idx === index ? { ...s, ...fields } : s))
    );
  };

  const handleAddOverlap = () => {
    if (segmentsList.length < 2) return;
    setOverlapsList([
      ...overlapsList,
      {
        segmentAKey: segmentsList[0].segmentKey,
        segmentBKey: segmentsList[1].segmentKey,
        gender: 'MALE',
      },
    ]);
  };

  const handleRemoveOverlap = (index: number) => {
    setOverlapsList(overlapsList.filter((_, idx) => idx !== index));
  };

  const handleOverlapChange = (index: number, fields: Partial<OverlapRuleUI>) => {
    setOverlapsList(
      overlapsList.map((o, idx) => (idx === index ? { ...o, ...fields } : o))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAccess.allowed) {
      toast(editAccess.reason || 'Không có quyền sửa đổi luật thi đấu.', 'error');
      return;
    }

    if (!name.trim()) {
      toast('Vui lòng điền tên thể thức.', 'error');
      return;
    }

    if (segmentsList.length === 0) {
      toast('Cần ít nhất 1 chặng thi đấu.', 'error');
      return;
    }

    for (let i = 0; i < segmentsList.length; i++) {
      const currentScore = Number(segmentsList[i].targetScore);
      if (isNaN(currentScore) || currentScore <= 0) {
        toast(`Chặng "${segmentsList[i].name}" có số điểm chạm không hợp lệ.`, 'error');
        return;
      }
      if (i > 0) {
        const prevScore = Number(segmentsList[i - 1].targetScore);
        if (currentScore <= prevScore) {
          toast(
            `Điểm chạm của chặng "${segmentsList[i].name}" (${currentScore}) phải lớn hơn chặng trước "${segmentsList[i - 1].name}" (${prevScore}).`,
            'error'
          );
          return;
        }
      }
    }

    const mc = genderFormat === 'strict' ? Number(maleCount) : 0;
    const fc = genderFormat === 'strict' ? Number(femaleCount) : 0;
    const tSize = genderFormat === 'strict' ? mc + fc : Number(teamSize);

    if (genderFormat === 'strict' && (mc < 0 || fc < 0)) {
      toast('Số lượng VĐV nam/nữ không được nhỏ hơn 0.', 'error');
      return;
    }
    if (genderFormat === 'any' && tSize <= 0) {
      toast('Quy mô đội hình tuyển phải lớn hơn 0.', 'error');
      return;
    }

    const mMax = noOverlapAllPlayers ? 1 : Number(maleMaxSegments);
    const fMax = noOverlapAllPlayers ? 1 : Number(femaleMaxSegments);

    if (mMax <= 0 || fMax <= 0) {
      toast('Số chặng thi đấu tối đa của VĐV phải lớn hơn 0.', 'error');
      return;
    }

    const finalWinScore = Number(segmentsList[segmentsList.length - 1].targetScore);

    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        sport: 'pickleball',
        isTemplate: false,
        segments: segmentsList.map((s, idx) => ({
          segmentKey: s.segmentKey,
          name: s.name.trim(),
          targetScore: Number(s.targetScore),
          playerCount: Number(s.playerCount),
          genderRule: s.genderRule,
          orderIndex: idx,
          isDrawable: true,
        })),
        teamComposition: {
          teamSize: tSize,
          maleCount: mc,
          femaleCount: fc,
          allMustPlay: allMustPlay,
        },
        playerLimits: [
          { gender: 'MALE', minSegments: 1, maxSegments: mMax },
          { gender: 'FEMALE', minSegments: 1, maxSegments: fMax },
        ],
        overlapRules: overlapsList.map((o) => ({
          segmentAKey: o.segmentAKey,
          segmentBKey: o.segmentBKey,
          gender: o.gender,
          isForbidden: true,
        })),
        scoringConfig: {
          winScore: finalWinScore,
          noDeuce: true,
          sideSwitchAfterSegments: 0,
          pointsForWin: 3,
          pointsForLoss: 0,
        },
      };

      await apiFetch(`/tournaments/${tournament.id}/ruleset`, {
        method: 'PUT',
        body: payload,
      });

      toast('Cập nhật cấu hình luật thi đấu thành công!', 'success');
      setIsEditing(false);
      reload();
      void loadRuleset();
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Lỗi cập nhật cấu hình luật thi đấu.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const currentTeamSize = genderFormat === 'strict' ? maleCount + femaleCount : teamSize;

  return (
    <div className="premium-container animate-scale-in">
      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeader
          title="Cấu Hình Luật Thi Đấu"
          description="Thể thức ruleset đang được áp dụng cho giải đấu này."
          icon={ClipboardList}
        />

        {!editAccess.allowed && (
          editAccess.locked ? (
            <div className="rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-sm text-rose-350 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-rose-200">Luật thi đấu đã bị KHÓA!</span>
                {' '}{editAccess.reason}
                {editAccess.required && (
                  <div className="mt-1 text-xs text-slate-400">{editAccess.required}</div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
              <div>{editAccess.reason}</div>
              {editAccess.required && (
                <div className="mt-2 text-xs text-amber-100/80">{editAccess.required}</div>
              )}
            </div>
          )
        )}

        <div className="card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-lg text-amber-500">
                {isEditing ? 'Chỉnh sửa Luật thi đấu' : (ruleset.name || 'Thể thức GOLAB Standard')}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Cấu hình luật thi đấu và chạm tiếp sức của giải đấu đang hoạt động.</p>
            </div>

            {editAccess.allowed && (
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`btn btn-sm flex items-center gap-1.5 ${
                  isEditing
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-350 border border-slate-700'
                    : 'bg-amber-550/10 text-amber-400 hover:bg-amber-550/20 border border-amber-500/30'
                }`}
              >
                {isEditing ? (
                  <>
                    <X className="w-3.5 h-3.5" />
                    Hủy bỏ
                  </>
                ) : (
                  <>
                    <Edit3 className="w-3.5 h-3.5" />
                    Chỉnh sửa cấu hình
                  </>
                )}
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400">Tên thể thức luật</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full premium-input"
                  disabled={saving}
                  placeholder="VD: Thể thức Tiếp sức 24 (GOLAB Standard)"
                />
              </div>

              <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/30 p-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Thể thức Giới tính & Quy mô
                </h4>
                
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="genderFormat"
                      checked={genderFormat === 'strict'}
                      onChange={() => setGenderFormat('strict')}
                      className="text-amber-500 focus:ring-amber-500 bg-slate-800 border-slate-700"
                    />
                    Ràng buộc giới tính (Ví dụ: Đội có 3 Nam, 2 Nữ)
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="genderFormat"
                      checked={genderFormat === 'any'}
                      onChange={() => setGenderFormat('any')}
                      className="text-amber-500 focus:ring-amber-500 bg-slate-800 border-slate-700"
                    />
                    Tự do / Một giới tính (Chỉ yêu cầu tổng số lượng)
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {genderFormat === 'strict' ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="block text-[11px] text-slate-455">Số lượng VĐV Nam / đội</label>
                        <input
                          type="number"
                          required
                          min={0}
                          value={maleCount}
                          onChange={(e) => setMaleCount(Number(e.target.value))}
                          className="w-full premium-input text-sm"
                          disabled={saving}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[11px] text-slate-455">Số lượng VĐV Nữ / đội</label>
                        <input
                          type="number"
                          required
                          min={0}
                          value={femaleCount}
                          onChange={(e) => setFemaleCount(Number(e.target.value))}
                          className="w-full premium-input text-sm"
                          disabled={saving}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[11px] text-slate-455">Tổng quy mô đội</label>
                        <input
                          type="text"
                          readOnly
                          value={`${maleCount + femaleCount} người`}
                          className="w-full premium-input text-sm bg-slate-900/60 text-slate-400 cursor-not-allowed"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1.5 col-span-2 md:col-span-1">
                      <label className="block text-[11px] text-slate-455">Tổng số lượng VĐV / đội</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={teamSize}
                        onChange={(e) => setTeamSize(Number(e.target.value))}
                        className="w-full premium-input text-sm"
                        disabled={saving}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="allMustPlay"
                    checked={allMustPlay}
                    onChange={(e) => setAllMustPlay(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500"
                    disabled={saving}
                  />
                  <label htmlFor="allMustPlay" className="text-xs font-semibold text-slate-300 cursor-pointer">
                    Tất cả {currentTeamSize} thành viên bắt buộc phải ra sân thi đấu ít nhất 1 lần
                  </label>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/30 p-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  Giới hạn số chặng thi đấu
                </h4>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="noOverlapAll"
                    checked={noOverlapAllPlayers}
                    onChange={(e) => setNoOverlapAllPlayers(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500"
                    disabled={saving}
                  />
                  <label htmlFor="noOverlapAll" className="text-xs font-semibold text-slate-300 cursor-pointer text-amber-400">
                    ⚠️ Mỗi VĐV chỉ được thi đấu tối đa 1 chặng / trận (Không ai được đánh 2 nội dung)
                  </label>
                </div>

                {!noOverlapAllPlayers && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] text-slate-455">Số chặng tối đa VĐV Nam được đánh / trận</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={maleMaxSegments}
                        onChange={(e) => setMaleMaxSegments(Number(e.target.value))}
                        className="w-full premium-input text-sm"
                        disabled={saving}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] text-slate-455">Số chặng tối đa VĐV Nữ được đánh / trận</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={femaleMaxSegments}
                        onChange={(e) => setFemaleMaxSegments(Number(e.target.value))}
                        className="w-full premium-input text-sm"
                        disabled={saving}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/30 p-4">
                <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Target className="w-4 h-4 text-sky-400" />
                    Các chặng thi đấu tiếp sức
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddSegment}
                    className="btn btn-xs flex items-center gap-1 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/20 px-2 py-1"
                    disabled={saving}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm chặng
                  </button>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {segmentsList.map((segment, index) => (
                    <div key={segment.segmentKey} className="flex flex-col gap-3 p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl relative group">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sky-400">Chặng {index + 1}</span>
                        {segmentsList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSegment(index)}
                            className="text-slate-500 hover:text-rose-400 transition-colors"
                            title="Xóa chặng này"
                            disabled={saving}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <div className="space-y-1 col-span-1 md:col-span-2">
                          <label className="text-[10px] text-slate-500">Tên chặng</label>
                          <input
                            type="text"
                            required
                            value={segment.name}
                            onChange={(e) => handleSegmentChange(index, { name: e.target.value })}
                            className="w-full premium-input text-xs"
                            placeholder="Tên chặng thi đấu"
                            disabled={saving}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500">Điểm chạm</label>
                          <input
                            type="number"
                            required
                            min={1}
                            value={segment.targetScore}
                            onChange={(e) => handleSegmentChange(index, { targetScore: Number(e.target.value) })}
                            className="w-full premium-input text-xs font-semibold text-amber-400"
                            disabled={saving}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500">Số VĐV / chặng</label>
                          <input
                            type="number"
                            required
                            min={1}
                            value={segment.playerCount}
                            onChange={(e) => handleSegmentChange(index, { playerCount: Number(e.target.value) })}
                            className="w-full premium-input text-xs"
                            disabled={saving}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500">Luật giới tính</label>
                          <select
                            value={segment.genderRule}
                            onChange={(e) => handleSegmentChange(index, { genderRule: e.target.value as any })}
                            className="w-full premium-input text-xs"
                            disabled={saving}
                          >
                            <option value="any">Tự do / Bất kỳ giới tính nào</option>
                            {genderFormat === 'strict' && (
                              <>
                                <option value="mixed">Đôi Nam Nữ (Ít nhất 1 Nam, 1 Nữ)</option>
                                <option value="male_only">Chỉ Nam</option>
                                <option value="female_only">Chỉ Nữ</option>
                              </>
                            )}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500">Mã định danh chặng</label>
                          <input
                            type="text"
                            readOnly
                            value={segment.segmentKey}
                            className="w-full premium-input text-xs bg-slate-900/60 text-slate-500 cursor-not-allowed font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500">
                  * Điểm chạm của chặng cuối cùng sẽ tự động làm điểm chạm kết thúc trận đấu.
                </p>
              </div>

              {genderFormat === 'strict' && !noOverlapAllPlayers && (
                <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/30 p-4">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      Quy tắc cấm trùng lặp VĐV giữa các chặng
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddOverlap}
                      className="btn btn-xs flex items-center gap-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 px-2 py-1"
                      disabled={saving || segmentsList.length < 2}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Thêm quy định
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {overlapsList.length > 0 ? (
                      overlapsList.map((overlap, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-slate-900/40 border border-slate-800/80 rounded-xl">
                          <span className="text-xs text-slate-400">Cấm VĐV</span>
                          <select
                            value={overlap.gender}
                            onChange={(e) => handleOverlapChange(index, { gender: e.target.value as any })}
                            className="premium-input text-xs py-1"
                            disabled={saving}
                          >
                            <option value="MALE">Nam</option>
                            <option value="FEMALE">Nữ</option>
                          </select>
                          <span className="text-xs text-slate-400">đánh cả</span>
                          <select
                            value={overlap.segmentAKey}
                            onChange={(e) => handleOverlapChange(index, { segmentAKey: e.target.value })}
                            className="premium-input text-xs py-1 flex-1"
                            disabled={saving}
                          >
                            {segmentsList.map((s) => (
                              <option key={s.segmentKey} value={s.segmentKey}>{s.name}</option>
                            ))}
                          </select>
                          <span className="text-xs text-slate-400">và</span>
                          <select
                            value={overlap.segmentBKey}
                            onChange={(e) => handleOverlapChange(index, { segmentBKey: e.target.value })}
                            className="premium-input text-xs py-1 flex-1"
                            disabled={saving}
                          >
                            {segmentsList.map((s) => (
                              <option key={s.segmentKey} value={s.segmentKey}>{s.name}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleRemoveOverlap(index)}
                            className="text-slate-500 hover:text-rose-455 transition-colors p-1"
                            disabled={saving}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic">Chưa thiết lập quy định cấm trùng chặng cụ thể nào.</p>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full btn btn-primary py-2.5 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <span className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Lưu cấu hình luật
                  </>
                )}
              </button>
            </form>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
                    <Target className="w-4 h-4 text-sky-400" />
                    Điểm chạm thi đấu
                  </div>
                  <div className="text-base font-semibold text-slate-200 mt-1">
                    Điểm thắng chung cuộc: {ruleset.scoringConfig?.winScore || 24}đ
                  </div>
                  <div className="text-xs text-slate-500">
                    Không áp dụng luật chạm deuce (first to win). Đổi sân theo cấu hình chặng.
                  </div>
                </div>

                <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Quy mô đội hình tuyển
                  </div>
                  <div className="text-base font-semibold text-slate-200 mt-1">
                    {composition?.maleCount || composition?.femaleCount ? (
                      `Quy mô: ${composition?.teamSize || 5} VĐV (${composition?.maleCount || 0} Nam, ${composition?.femaleCount || 0} Nữ)`
                    ) : (
                      `Quy mô: ${composition?.teamSize || 5} VĐV (Tự do/Bất kỳ giới tính nào)`
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {composition?.allMustPlay ? 'Tất cả thành viên bắt buộc phải ra sân thi đấu ít nhất 1 lần.' : 'Không bắt buộc tất cả thành viên ra sân.'}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  Giới hạn số chặng thi đấu
                </div>
                <div className="text-xs text-slate-300 space-y-1">
                  {rulesetState?.playerLimits?.map((limit: any) => (
                    <div key={limit.gender}>
                      • Giới tính {limit.gender === 'MALE' ? 'Nam' : 'Nữ'}: Thi đấu từ {limit.minSegments} đến {limit.maxSegments} chặng / trận.
                    </div>
                  ))}
                  {rulesetState?.playerLimits?.every((l: any) => l.maxSegments === 1) && (
                    <div className="text-amber-400 font-semibold mt-1">
                      ⚠️ Mỗi VĐV chỉ được thi đấu tối đa 1 chặng / trận (Không ai được đánh 2 nội dung).
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Các chặng thi đấu tiếp sức ({segments.length} chặng)</span>
                <div className="flex flex-col gap-2">
                  {segments.map((segment, idx: number) => (
                    <div key={segment.segmentKey || `${segment.name || 'segment'}-${idx}`} className="flex items-center justify-between p-3.5 bg-slate-900/40 border border-slate-800/80 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-[11px] font-bold text-slate-350 flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-semibold text-slate-200">{segment.name}</span>
                          <span className="text-[10px] text-slate-500 ml-2 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                            {segment.segmentKey}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-2 bg-slate-850 px-1.5 py-0.5 rounded">
                            {(segment as any).playerCount ?? 2} VĐV · Giới tính: {(segment as any).genderRule === 'mixed' ? 'Mixed' : (segment as any).genderRule === 'male_only' ? 'Nam' : (segment as any).genderRule === 'female_only' ? 'Nữ' : 'Tự do'}
                          </span>
                        </div>
                      </div>
                      <div className="font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 text-xs">
                        Target chạm: {segment.targetScore}đ
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {rulesetState?.overlapRules && rulesetState.overlapRules.length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quy tắc cấm trùng chặng</span>
                  <div className="flex flex-col gap-2">
                    {rulesetState.overlapRules.map((rule: any, idx: number) => {
                      const segA = segments.find(s => s.segmentKey === rule.segmentAKey)?.name || rule.segmentAKey;
                      const segB = segments.find(s => s.segmentKey === rule.segmentBKey)?.name || rule.segmentBKey;
                      return (
                        <div key={idx} className="p-3 bg-slate-900/20 border border-slate-800 rounded-xl text-xs text-slate-350 font-medium">
                          • Cấm VĐV <span className="text-amber-400 font-bold">{rule.gender === 'MALE' ? 'Nam' : 'Nữ'}</span> thi đấu đồng thời ở cả hai chặng <span className="font-semibold">{segA}</span> và <span className="font-semibold">{segB}</span>.
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface SegmentDefinitionUI {
  id?: string;
  segmentKey: string;
  name: string;
  targetScore: number;
  playerCount: number;
  genderRule: 'mixed' | 'male_only' | 'female_only' | 'any';
}

interface OverlapRuleUI {
  segmentAKey: string;
  segmentBKey: string;
  gender: 'MALE' | 'FEMALE';
}
