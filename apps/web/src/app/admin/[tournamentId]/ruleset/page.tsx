'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading-skeleton';
import { apiFetch } from '@/lib/api-client';
import { ClipboardList, Users, Target, Save, Edit3, X } from '@/components/icons';
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

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [segment1Name, setSegment1Name] = useState('Đôi Nam Nữ');
  const [segment1Score, setSegment1Score] = useState(8);
  const [segment2Name, setSegment2Name] = useState('Đôi Nam');
  const [segment2Score, setSegment2Score] = useState(16);
  const [segment3Name, setSegment3Name] = useState('Đôi Nữ');
  const [segment3Score, setSegment3Score] = useState(24);
  const [maleCount, setMaleCount] = useState(3);
  const [femaleCount, setFemaleCount] = useState(2);
  const [allMustPlay, setAllMustPlay] = useState(true);
  const [maleMaxSegments, setMaleMaxSegments] = useState(1);
  const [femaleMaxSegments, setFemaleMaxSegments] = useState(2);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDependencyStats();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDependencyStats]);

  useEffect(() => {
    if (tournament?.ruleset) {
      const r = tournament.ruleset;
      setName(r.name || '');

      const segs = r.segmentDefinitions || r.segments || [];
      if (segs[0]) {
        setSegment1Name(segs[0].name || 'Đôi Nam Nữ');
        setSegment1Score(segs[0].targetScore || 8);
      }
      if (segs[1]) {
        setSegment2Name(segs[1].name || 'Đôi Nam');
        setSegment2Score(segs[1].targetScore || 16);
      }
      if (segs[2]) {
        setSegment3Name(segs[2].name || 'Đôi Nữ');
        setSegment3Score(segs[2].targetScore || 24);
      }

      const comp = r.teamCompositionRule || r.teamComposition;
      if (comp) {
        setMaleCount(comp.maleCount ?? 3);
        setFemaleCount(comp.femaleCount ?? 2);
        setAllMustPlay(comp.allMustPlay ?? true);
      }

      const limits = r.playerLimitRules || r.playerLimits || [];
      const maleLim = limits.find((l: any) => l.gender === 'MALE');
      const femaleLim = limits.find((l: any) => l.gender === 'FEMALE');
      if (maleLim) setMaleMaxSegments(maleLim.maxSegments ?? 1);
      if (femaleLim) setFemaleMaxSegments(femaleLim.maxSegments ?? 2);
    }
  }, [tournament]);

  if (tLoading || statsLoading || !tournament) {
    return <PageLoading />;
  }

  const ruleset = (tournament.ruleset || {}) as RulesetLike;
  const composition = getRulesetComposition(ruleset);
  const segments = getRulesetSegments(ruleset);
  const uxContext = buildTournamentUxContext({
    tournament,
    stats: dependencyStats,
  });
  const editAccess = getActionAccess('editRuleset', currentUser.role, uxContext);

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

    const s1 = Number(segment1Score);
    const s2 = Number(segment2Score);
    const s3 = Number(segment3Score);
    const mc = Number(maleCount);
    const fc = Number(femaleCount);
    const mMax = Number(maleMaxSegments);
    const fMax = Number(femaleMaxSegments);

    if (s1 <= 0 || s2 <= s1 || s3 <= s2) {
      toast('Điểm chạm thi đấu phải tăng dần theo từng chặng (Chặng 1 < Chặng 2 < Chặng 3).', 'error');
      return;
    }

    if (mc < 0 || fc < 0) {
      toast('Số lượng VĐV nam/nữ không được nhỏ hơn 0.', 'error');
      return;
    }

    if (mMax <= 0 || fMax <= 0) {
      toast('Số chặng thi đấu tối đa của VĐV phải lớn hơn 0.', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        sport: 'pickleball',
        isTemplate: false,
        segments: [
          {
            segmentKey: 'mixed_doubles',
            name: segment1Name.trim(),
            targetScore: s1,
            playerCount: 2,
            genderRule: 'mixed',
            orderIndex: 0,
            isDrawable: true,
          },
          {
            segmentKey: 'mens_doubles',
            name: segment2Name.trim(),
            targetScore: s2,
            playerCount: 2,
            genderRule: 'male_only',
            orderIndex: 1,
            isDrawable: true,
          },
          {
            segmentKey: 'womens_doubles',
            name: segment3Name.trim(),
            targetScore: s3,
            playerCount: 2,
            genderRule: 'female_only',
            orderIndex: 2,
            isDrawable: true,
          },
        ],
        teamComposition: {
          teamSize: mc + fc,
          maleCount: mc,
          femaleCount: fc,
          allMustPlay: allMustPlay,
        },
        playerLimits: [
          { gender: 'MALE', minSegments: 1, maxSegments: mMax },
          { gender: 'FEMALE', minSegments: 1, maxSegments: fMax },
        ],
        overlapRules: [
          {
            segmentAKey: 'mens_doubles',
            segmentBKey: 'mixed_doubles',
            gender: 'MALE',
            isForbidden: true,
          },
        ],
        scoringConfig: {
          winScore: s3,
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
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Lỗi cập nhật cấu hình luật thi đấu.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="premium-container animate-scale-in">
      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeader
          title="Cấu Hình Luật Thi Đấu"
          description="Thể thức ruleset đang được áp dụng cho giải đấu này."
          icon={ClipboardList}
        />

        {!editAccess.allowed && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
            <div>{editAccess.reason}</div>
            {editAccess.required && (
              <div className="mt-2 text-xs text-amber-100/80">{editAccess.required}</div>
            )}
          </div>
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
              {/* Ruleset Name */}
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

              {/* Targets config */}
              <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/30 p-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Target className="w-4 h-4 text-sky-400" />
                  Điểm chạm chặng & Điểm thắng chung cuộc
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] text-slate-455">Chặng 1 (Đôi Nam Nữ)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={segment1Score}
                      onChange={(e) => setSegment1Score(Number(e.target.value))}
                      className="w-full premium-input text-sm"
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] text-slate-455">Chặng 2 (Đôi Nam)</label>
                    <input
                      type="number"
                      required
                      min={2}
                      value={segment2Score}
                      onChange={(e) => setSegment2Score(Number(e.target.value))}
                      className="w-full premium-input text-sm"
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] text-slate-455">Chặng 3 (Đôi Nữ - Thắng chung cuộc)</label>
                    <input
                      type="number"
                      required
                      min={3}
                      value={segment3Score}
                      onChange={(e) => setSegment3Score(Number(e.target.value))}
                      className="w-full premium-input text-sm font-bold text-amber-400"
                      disabled={saving}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  * Điểm mục tiêu của chặng cuối cùng sẽ tự động đồng bộ thành điểm chạm chiến thắng chung cuộc của trận đấu.
                </p>
              </div>

              {/* Team Composition & Player limits */}
              <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/30 p-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Quy mô đội hình tuyển & Giới hạn chặng
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] text-slate-455">Số lượng VĐV Nam mỗi đội</label>
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
                    <label className="block text-[11px] text-slate-455">Số lượng VĐV Nữ mỗi đội</label>
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
                  <div className="flex items-center gap-2 h-full pt-4">
                    <input
                      type="checkbox"
                      id="allMustPlay"
                      checked={allMustPlay}
                      onChange={(e) => setAllMustPlay(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500"
                      disabled={saving}
                    />
                    <label htmlFor="allMustPlay" className="text-xs font-semibold text-slate-300 cursor-pointer">
                      Tất cả 5 thành viên phải ra sân ít nhất 1 lần
                    </label>
                  </div>
                </div>

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
              </div>

              {/* Submit buttons */}
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
                    Quy mô: {composition?.teamSize || 5} VĐV ({composition?.maleCount || 3} Nam, {composition?.femaleCount || 2} Nữ)
                  </div>
                  <div className="text-xs text-slate-500">
                    Tất cả thành viên bắt buộc phải ra sân thi đấu ít nhất 1 lần.
                  </div>
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
                        </div>
                      </div>
                      <div className="font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 text-xs">
                        Target chạm: {segment.targetScore}đ
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
