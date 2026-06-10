'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading-skeleton';
import { apiFetch } from '@/lib/api-client';
import { ClipboardList, Save, Edit3, X, Lock, Trophy } from '@/components/icons';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { getCurrentUser } from '@/lib/current-user';
import { buildTournamentUxContext } from '@/lib/tournament-ux-context';
import { getActionAccess } from '@/lib/tournament-ux-policy';
import { useToast } from '@/components/toast';
import { MatchFormat, EventType, CompetitionFormat } from '@golab/contracts';
import { ConfirmModal } from '@/components/confirm-modal';

// Import subcomponents
import { FormatChooser } from './components/FormatChooser';
import { EventTypeChooser } from './components/EventTypeChooser';
import { CompetitionFormatChooser } from './components/CompetitionFormatChooser';
import { TeamCompositionSection } from './components/TeamCompositionSection';
import { ScoringConfigSection } from './components/ScoringConfigSection';
import { SegmentsSection } from './components/SegmentsSection';
import { OverlapsSection } from './components/OverlapsSection';
import { ValidationPanel } from './components/ValidationPanel';
import { RulesetView } from './components/RulesetView';

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

interface SegmentDefinitionUI {
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

export default function RulesetSettingsPage() {
  const { tournament, loading: tLoading, reload } = useActiveTournament();
  const [dependencyStats, setDependencyStats] = useState<DependencyStats>(emptyDependencyStats);
  const [statsLoading, setStatsLoading] = useState(true);
  const currentUser = useMemo(() => getCurrentUser(), []);
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [name, setName] = useState('');
  const [matchFormat, setMatchFormat] = useState<MatchFormat>('relay');
  const [eventType, setEventType] = useState<EventType>('TEAM_EVENT');
  const [competitionFormat, setCompetitionFormat] = useState<CompetitionFormat>('GROUP_STAGE_KNOCKOUT');
  const [genderFormat, setGenderFormat] = useState<'strict' | 'any'>('strict');
  const [teamSize, setTeamSize] = useState(5);
  const [maleCount, setMaleCount] = useState(3);
  const [femaleCount, setFemaleCount] = useState(2);
  const [allMustPlay, setAllMustPlay] = useState(true);
  const [maleMaxSegments, setMaleMaxSegments] = useState(1);
  const [femaleMaxSegments, setFemaleMaxSegments] = useState(2);
  const [noOverlapAllPlayers, setNoOverlapAllPlayers] = useState(false);
  const [saving, setSaving] = useState(false);

  const [winScore, setWinScore] = useState(24);
  const [gamePointScore, setGamePointScore] = useState(11);
  const [setsToWin, setSetsToWin] = useState(2);
  const [lastSetPointScore, setLastSetPointScore] = useState<number | null>(null);
  const [noDeuce, setNoDeuce] = useState(true);
  const [deuceMaxScore, setDeuceMaxScore] = useState<number | null>(null);

  // Flexibility Toggles
  const [requireCourtConfig, setRequireCourtConfig] = useState(true);
  const [requireScheduleConfig, setRequireScheduleConfig] = useState(true);

  const [segmentsList, setSegmentsList] = useState<SegmentDefinitionUI[]>([
    { segmentKey: 'mixed_doubles', name: 'Đôi Nam Nữ', targetScore: 8, playerCount: 2, genderRule: 'mixed' },
    { segmentKey: 'mens_doubles', name: 'Đôi Nam', targetScore: 16, playerCount: 2, genderRule: 'male_only' },
    { segmentKey: 'womens_doubles', name: 'Đôi Nữ', targetScore: 24, playerCount: 2, genderRule: 'female_only' },
  ]);

  const [overlapsList, setOverlapsList] = useState<OverlapRuleUI[]>([]);
  const [rulesetState, setRulesetState] = useState<any>(null);
  const [rulesetLoading, setRulesetLoading] = useState(true);

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleResetTournament = async () => {
    try {
      setResetLoading(true);
      await apiFetch(`/tournaments/${tournament!.id}/reset`, {
        method: 'POST',
      });
      toast('Đặt lại dữ liệu giải đấu thành công! Cấu hình luật đã được mở khóa.', 'success');
      setResetModalOpen(false);
      await loadDependencyStats();
      await loadRuleset();
      await reload();
    } catch (error: any) {
      console.error(error);
      toast(error?.message || 'Lỗi khi đặt lại giải đấu.', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  const loadDependencyStats = useCallback(async () => {
    if (!tournament) return;
    try {
      setStatsLoading(true);
      const [playersData, teamsData, matchesData] = await Promise.all([
        apiFetch<any>(`/tournaments/${tournament.id}/players`).catch(() => ({ items: [] })),
        apiFetch<any[]>(`/tournaments/${tournament.id}/teams`).catch(() => []),
        apiFetch<any[]>(`/tournaments/${tournament.id}/matches`).catch(() => []),
      ]);

      setDependencyStats({
        playersCount: Array.isArray(playersData?.items) ? playersData.items.length : 0,
        teamsCount: Array.isArray(teamsData) ? teamsData.length : 0,
        matchesCount: Array.isArray(matchesData) ? matchesData.length : 0,
      });
    } catch (error) {
      console.error(error);
      setDependencyStats(emptyDependencyStats);
    } finally {
      setStatsLoading(false);
    }
  }, [tournament]);

  const loadRuleset = useCallback(async () => {
    if (!tournament) return;
    try {
      setRulesetLoading(true);
      const data = await apiFetch<any>(`/tournaments/${tournament.id}/ruleset`);
      setRulesetState(data);

      if (data) {
        setName(data.name || '');
        setMatchFormat(data.matchFormat || 'relay');
        setEventType(data.eventType || 'TEAM_EVENT');
        setCompetitionFormat(data.competitionFormat || 'GROUP_STAGE_KNOCKOUT');

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
          setGenderFormat(mc > 0 || fc > 0 ? 'strict' : 'any');
        }

        const limits = data.playerLimitRules || data.playerLimits || [];
        const maleLim = limits.find((l: any) => l.gender === 'MALE');
        const femaleLim = limits.find((l: any) => l.gender === 'FEMALE');
        const mMax = maleLim?.maxSegments ?? 1;
        const fMax = femaleLim?.maxSegments ?? 2;
        setMaleMaxSegments(mMax);
        setFemaleMaxSegments(fMax);
        setNoOverlapAllPlayers(mMax === 1 && fMax === 1);

        const overlaps = data.overlapRules || [];
        setOverlapsList(overlaps.map((o: any) => ({
          segmentAKey: o.segmentAKey,
          segmentBKey: o.segmentBKey,
          gender: o.gender,
        })));

        const sc = data.scoringConfig;
        if (sc) {
          setWinScore(sc.winScore ?? 24);
          setGamePointScore(sc.gamePointScore ?? 11);
          setSetsToWin(sc.setsToWin ?? 2);
          setLastSetPointScore(sc.lastSetPointScore ?? null);
          setNoDeuce(true);
          setDeuceMaxScore(null);
        }

        setRequireCourtConfig(data.requireCourtConfig ?? true);
        setRequireScheduleConfig(data.requireScheduleConfig ?? true);
      }
    } catch (error) {
      console.error('Failed to load ruleset:', error);
    } finally {
      setRulesetLoading(false);
    }
  }, [tournament]);

  useEffect(() => {
    loadDependencyStats();
  }, [loadDependencyStats]);

  useEffect(() => {
    loadRuleset();
  }, [loadRuleset]);

  if (tLoading || statsLoading || rulesetLoading || !tournament) {
    return <PageLoading />;
  }

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

    if (!isValid) {
      toast('Vui lòng sửa các lỗi cấu hình hiển thị màu đỏ ở bảng kiểm tra.', 'error');
      return;
    }

    const mc = genderFormat === 'strict' ? Number(maleCount) : 0;
    const fc = genderFormat === 'strict' ? Number(femaleCount) : 0;
    const tSize = genderFormat === 'strict' ? mc + fc : Number(teamSize);

    const mMax = noOverlapAllPlayers ? 1 : Number(maleMaxSegments);
    const fMax = noOverlapAllPlayers ? 1 : Number(femaleMaxSegments);

    const finalWinScore = matchFormat === 'relay'
      ? Number(segmentsList[segmentsList.length - 1].targetScore)
      : Number(winScore);

    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        sport: 'pickleball',
        isTemplate: false,
        matchFormat: matchFormat,
        eventType: eventType,
        competitionFormat: competitionFormat,
        requireCourtConfig,
        requireScheduleConfig,
        segments: matchFormat === 'relay'
          ? segmentsList.map((s, idx) => ({
              segmentKey: s.segmentKey,
              name: s.name.trim(),
              targetScore: Number(s.targetScore),
              playerCount: Number(s.playerCount),
              genderRule: s.genderRule,
              orderIndex: idx,
              isDrawable: true,
            }))
          : [],
        teamComposition: eventType === 'TEAM_EVENT' ? {
          teamSize: tSize,
          maleCount: mc,
          femaleCount: fc,
          allMustPlay: allMustPlay,
        } : {
          teamSize: eventType === 'SINGLES' ? 1 : 2,
          maleCount: 0,
          femaleCount: 0,
          allMustPlay: false,
        },
        playerLimits: matchFormat === 'relay'
          ? [
              { gender: 'MALE', minSegments: 1, maxSegments: mMax },
              { gender: 'FEMALE', minSegments: 1, maxSegments: fMax },
            ]
          : [],
        overlapRules: matchFormat === 'relay'
          ? overlapsList.map((o) => ({
              segmentAKey: o.segmentAKey,
              segmentBKey: o.segmentBKey,
              gender: o.gender,
              isForbidden: true,
            }))
          : [],
        scoringConfig: {
          winScore: finalWinScore,
          gamePointScore: matchFormat === 'best_of' ? gamePointScore : undefined,
          setsToWin: matchFormat === 'best_of' ? setsToWin : undefined,
          lastSetPointScore: matchFormat === 'best_of' && lastSetPointScore ? lastSetPointScore : undefined,
          noDeuce: true,
          deuceMaxScore: null,
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
            <div className="rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-sm text-rose-350 flex items-start justify-between gap-4">
              <div className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-rose-200">Luật thi đấu đã bị KHÓA!</span>
                  {' '}{editAccess.reason}
                  {editAccess.required && (
                    <div className="mt-1 text-xs text-slate-400">{editAccess.required}</div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetModalOpen(true)}
                disabled={resetLoading}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-550/10 border border-rose-500/25 text-rose-400 hover:bg-rose-550/20 transition-all cursor-pointer"
              >
                Mở khóa / Đặt lại
              </button>
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
                {isEditing ? 'Chỉnh sửa Luật thi đấu' : (name || 'Thể thức GOLAB Standard')}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Cấu hình luật thi đấu và chạm tiếp sức của giải đấu đang hoạt động.</p>
            </div>

            {editAccess.allowed && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(!isEditing);
                  if (!isEditing) void loadRuleset();
                }}
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

              {/* Bước 1: Loại nội dung thi đấu */}
              <EventTypeChooser
                value={eventType}
                onChange={(et) => {
                  setEventType(et);
                  // Auto-switch away from relay when not TEAM_EVENT
                  if (et !== 'TEAM_EVENT' && matchFormat === 'relay') {
                    setMatchFormat('single_game');
                  }
                }}
                disabled={saving || dependencyStats.matchesCount > 0}
              />

              {/* Bước 2: Cách tổ chức giải đấu */}
              <CompetitionFormatChooser
                value={competitionFormat}
                onChange={setCompetitionFormat}
                disabled={saving}
              />

              {/* Bước 3: Thể thức tính điểm trận đấu */}
              {/* relay chỉ hiển thị khi TEAM_EVENT */}
              <div className="space-y-3">
                <FormatChooser
                  value={matchFormat}
                  onChange={setMatchFormat}
                  disabled={saving || dependencyStats.matchesCount > 0}
                />
                {eventType !== 'TEAM_EVENT' && matchFormat === 'relay' && (
                  <p className="text-xs text-rose-400 mt-1">
                    ⚠️ Thể thức Tiếp sức chỉ dùng được với giải Đồng đội. Vui lòng chọn Single Game hoặc Best of Sets.
                  </p>
                )}
              </div>

              {/* Bước 4: Cấu hình chi tiết đội — chỉ TEAM_EVENT */}
              {eventType === 'TEAM_EVENT' && (
              <TeamCompositionSection
                matchFormat={matchFormat}
                teamSize={teamSize}
                setTeamSize={setTeamSize}
                maleCount={maleCount}
                setMaleCount={setMaleCount}
                femaleCount={femaleCount}
                setFemaleCount={setFemaleCount}
                genderFormat={genderFormat}
                setGenderFormat={setGenderFormat}
                allMustPlay={allMustPlay}
                setAllMustPlay={setAllMustPlay}
                disabled={saving}
              />
              )}

              {/* Scoring Config Section */}
              <ScoringConfigSection
                matchFormat={matchFormat}
                winScore={winScore}
                setWinScore={setWinScore}
                gamePointScore={gamePointScore}
                setGamePointScore={setGamePointScore}
                setsToWin={setsToWin}
                setSetsToWin={setSetsToWin}
                lastSetPointScore={lastSetPointScore}
                setLastSetPointScore={setLastSetPointScore}
                noDeuce={noDeuce}
                setNoDeuce={setNoDeuce}
                deuceMaxScore={deuceMaxScore}
                setDeuceMaxScore={setDeuceMaxScore}
                lastSegmentTargetScore={segmentsList[segmentsList.length - 1]?.targetScore}
                disabled={saving}
              />

              {/* Relay segments configuration */}
              {matchFormat === 'relay' && (
                <>
                  <SegmentsSection
                    segmentsList={segmentsList}
                    onAddSegment={handleAddSegment}
                    onRemoveSegment={handleRemoveSegment}
                    onSegmentChange={handleSegmentChange}
                    genderFormat={genderFormat}
                    disabled={saving}
                  />

                  <OverlapsSection
                    segmentsList={segmentsList}
                    overlapsList={overlapsList}
                    onAddOverlap={handleAddOverlap}
                    onRemoveOverlap={handleRemoveOverlap}
                    onOverlapChange={handleOverlapChange}
                    noOverlapAllPlayers={noOverlapAllPlayers}
                    setNoOverlapAllPlayers={setNoOverlapAllPlayers}
                    maleMaxSegments={maleMaxSegments}
                    setMaleMaxSegments={setMaleMaxSegments}
                    femaleMaxSegments={femaleMaxSegments}
                    setFemaleMaxSegments={setFemaleMaxSegments}
                    genderFormat={genderFormat}
                    disabled={saving}
                  />
                </>
              )}

              {/* Operations Flexibility Section */}
              <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/30 p-5">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Yêu Cầu Vận Hành Linh Hoạt
                </h4>
                <p className="text-xs text-slate-400">
                  Bật/Tắt các ràng buộc khi kiểm tra độ sẵn sàng vận hành của giải đấu. Bỏ tích chọn nếu muốn xếp lịch tự do mà không cần định trước cụ thể.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-800/80 bg-slate-950/20 cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={requireCourtConfig}
                      onChange={(e) => setRequireCourtConfig(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500 mt-0.5"
                      disabled={saving}
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">Yêu cầu cấu hình sân đấu</span>
                      <span className="text-[10px] text-slate-455 mt-0.5 block">Kiểm tra việc gán sân đấu và xung đột lịch thi đấu.</span>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-800/80 bg-slate-950/20 cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={requireScheduleConfig}
                      onChange={(e) => setRequireScheduleConfig(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500 mt-0.5"
                      disabled={saving}
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">Yêu cầu xếp giờ lịch thi đấu</span>
                      <span className="text-[10px] text-slate-455 mt-0.5 block">Kiểm tra xem tất cả các trận đã được gán thời gian bắt đầu hay chưa.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Validation Panel */}
              <ValidationPanel
                tournamentId={tournament.id}
                name={name}
                matchFormat={matchFormat}
                teamSize={currentTeamSize}
                maleCount={genderFormat === 'strict' ? maleCount : 0}
                femaleCount={genderFormat === 'strict' ? femaleCount : 0}
                genderFormat={genderFormat}
                allMustPlay={allMustPlay}
                noOverlapAllPlayers={noOverlapAllPlayers}
                maleMaxSegments={maleMaxSegments}
                femaleMaxSegments={femaleMaxSegments}
                segmentsList={segmentsList}
                overlapsList={overlapsList}
                winScore={winScore}
                gamePointScore={gamePointScore}
                setsToWin={setsToWin}
                lastSetPointScore={lastSetPointScore}
                noDeuce={noDeuce}
                deuceMaxScore={deuceMaxScore}
                requireCourtConfig={requireCourtConfig}
                requireScheduleConfig={requireScheduleConfig}
                onValidationChange={setIsValid}
              />

              <button
                type="submit"
                disabled={saving || !isValid}
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
            <RulesetView
              name={name}
              matchFormat={matchFormat}
              eventType={eventType}
              competitionFormat={competitionFormat}
              teamComposition={eventType === 'TEAM_EVENT' ? {
                teamSize: currentTeamSize,
                maleCount: genderFormat === 'strict' ? maleCount : 0,
                femaleCount: genderFormat === 'strict' ? femaleCount : 0,
                allMustPlay,
              } : undefined}
              scoringConfig={{
                winScore: matchFormat === 'relay' ? (segmentsList[segmentsList.length - 1]?.targetScore || 24) : winScore,
                gamePointScore,
                setsToWin,
                lastSetPointScore,
                noDeuce,
                deuceMaxScore,
              }}
              segments={segmentsList}
              overlapRules={overlapsList}
              requireCourtConfig={requireCourtConfig}
              requireScheduleConfig={requireScheduleConfig}
            />
          )}
        </div>
      </div>

      <ConfirmModal
        open={resetModalOpen}
        title="Mở khóa Luật thi đấu & Đặt lại giải đấu?"
        description="Thao tác này sẽ xóa vĩnh viễn toàn bộ Đội bóng, Trận đấu, Chặng đấu, Đội hình thi đấu, bảng xếp hạng và điểm số hiện tại để bạn có thể chỉnh sửa lại Luật thi đấu. Danh sách Vận động viên đã đăng ký sẽ được giữ nguyên. Bạn có chắc chắn muốn tiến hành?"
        confirmLabel="Đặt lại & Mở khóa"
        cancelLabel="Hủy"
        variant="danger"
        loading={resetLoading}
        onConfirm={handleResetTournament}
        onCancel={() => setResetModalOpen(false)}
      />
    </div>
  );
}
