import React, { useState, useEffect } from 'react';
import { useTournament } from '../context/TournamentContext';
import { Match, Team, Athlete, SegmentKey } from '../types';
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  Check,
  X,
  PlusSquare,
  Play,
  ClipboardPen,
  ChevronDown,
  Trash2,
  AlertCircle,
  Users,
  Award,
  Undo2,
  RefreshCw,
  Zap,
  ArrowRightLeft,
  ChevronRight
} from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function MatchManagementScreen() {
  const { 
    state, 
    addMatch, 
    updateMatch, 
    deleteMatch, 
    drawMatchSegmentOrder, 
    submitMatchLineups, 
    addScorePoint, 
    undoLatestScorePoint, 
    startNextSegment 
  } = useTournament();

  // Filter States
  const [filterGroup, setFilterGroup] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCourt, setFilterCourt] = useState('');
  const [searchTeamId, setSearchTeamId] = useState('');

  // Manual Match creation modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newMatchData, setNewMatchData] = useState({
    groupId: '',
    stage: 'group' as Match['stage'],
    teamAId: '',
    teamBId: '',
    court: 'Sân Trung Tâm',
    scheduledAt: new Date().toISOString().slice(0, 16),
    status: 'scheduled' as Match['status'],
    note: ''
  });

  // Operating states
  const [lineupMatchId, setLineupMatchId] = useState<string | null>(null);
  const [scoringMatchId, setScoringMatchId] = useState<string | null>(null);

  // Draft lineups state for Team A and B
  const [lineupsA, setLineupsA] = useState<Record<SegmentKey, string[]>>({
    mens_doubles: [],
    womens_doubles: [],
    mixed_doubles: []
  });
  const [lineupsB, setLineupsB] = useState<Record<SegmentKey, string[]>>({
    mens_doubles: [],
    womens_doubles: [],
    mixed_doubles: []
  });

  // Validation feedback
  const [lineupErrors, setLineupErrors] = useState<string[]>([]);

  const getTeamNameAndCode = (teamId: string) => {
    const team = state.teams.find(t => t.id === teamId);
    return team ? { name: team.name, code: team.code } : { name: 'Đội tuyển trống', code: '???' };
  };

  const getTeamAthletes = (teamId: string): Athlete[] => {
    const refs = state.teamMembers.filter(m => m.teamId === teamId);
    return refs
      .map(ref => state.athletes.find(a => a.id === ref.athleteId))
      .filter((a): a is Athlete => !!a);
  };

  // Initialize lineups when selecting a match
  const handleOpenLineupPanel = (match: Match) => {
    setLineupMatchId(match.id);
    setLineupErrors([]);

    const initialA: Record<SegmentKey, string[]> = { mens_doubles: [], womens_doubles: [], mixed_doubles: [] };
    const initialB: Record<SegmentKey, string[]> = { mens_doubles: [], womens_doubles: [], mixed_doubles: [] };

    if (match.segments) {
      match.segments.forEach(seg => {
        initialA[seg.segmentKey] = seg.playerIdsA || [];
        initialB[seg.segmentKey] = seg.playerIdsB || [];
      });
    }

    setLineupsA(initialA);
    setLineupsB(initialB);
  };

  // Live validation triggers on draft lineup changes
  useEffect(() => {
    if (!lineupMatchId) return;
    const match = state.matches.find(m => m.id === lineupMatchId);
    if (!match) return;

    const athletesA = getTeamAthletes(match.teamAId);
    const athletesB = getTeamAthletes(match.teamBId);
    const teamA = state.teams.find(t => t.id === match.teamAId);
    const teamB = state.teams.find(t => t.id === match.teamBId);

    // Call validation logic in tournamentLogic (re-implemented robustly here as helper or directly)
    const errs: string[] = [];

    const validateSide = (lineups: Record<SegmentKey, string[]>, athletes: Athlete[], teamName: string) => {
      const ids = athletes.map(a => a.id);
      const males = athletes.filter(a => a.gender === 'Nam');
      const females = athletes.filter(a => a.gender === 'Nữ');

      if (athletes.length !== 5) {
        errs.push(`Đội ${teamName}: Danh sách đăng ký đội phải có đúng 5 thành viên (Hiện có ${athletes.length}). Vui lòng điều chỉnh lại danh sách thành viên.`);
      } else if (males.length !== 3 || females.length !== 2) {
        errs.push(`Đội ${teamName}: Đội hình đăng ký phải gồm đúng 3 Nam và 2 Nữ (Hiện có ${males.length} Nam, ${females.length} Nữ).`);
      }

      const appearances: Record<string, number> = {};
      athletes.forEach(a => { appearances[a.id] = 0; });

      // Genders per chặng check
      Object.entries(lineups).forEach(([key, pids]) => {
        const segAthletes = athletes.filter(a => pids.includes(a.id));
        const segMales = segAthletes.filter(a => a.gender === 'Nam');
        const segFemales = segAthletes.filter(a => a.gender === 'Nữ');

        pids.forEach(pid => {
          if (appearances[pid] !== undefined) appearances[pid]++;
        });

        if (pids.length > 0 && pids.length !== 2) {
          errs.push(`Đội ${teamName}: Mỗi chặng bắt buộc đăng ký đúng 2 người.`);
        }

        if (pids.length === 2) {
          if (key === 'mens_doubles' && segMales.length !== 2) {
            errs.push(`Đội ${teamName}: Chặng Đôi Nam phải gồm 2 vận động viên Nam.`);
          }
          if (key === 'womens_doubles' && segFemales.length !== 2) {
            errs.push(`Đội ${teamName}: Chặng Đôi Nữ phải gồm 2 vận động viên Nữ.`);
          }
          if (key === 'mixed_doubles' && (segMales.length !== 1 || segFemales.length !== 1)) {
            errs.push(`Đội ${teamName}: Chặng Đôi Nam Nữ phải gồm đúng 1 Nam và 1 Nữ.`);
          }
        }
      });

      // Total roster usage rules (only when all segments are filled)
      const allFilled = Object.values(lineups).every(pids => pids.length === 2);
      if (allFilled) {
        // Rule 1: Every member plays once
        const idle = athletes.filter(a => appearances[a.id] === 0);
        if (idle.length > 0) {
          errs.push(`Đội ${teamName}: Tất cả 5 thành viên đều phải thi đấu. Người chưa đấu: ${idle.map(i => i.fullName).join(', ')}.`);
        }

        // Rule 2: Male player plays at most 1 segment
        males.forEach(m => {
          if (appearances[m.id] > 1) {
            errs.push(`Đội ${teamName}: VĐV Nam "${m.fullName}" chỉ được phép thi đấu tối đa 1 chặng.`);
          }
        });

        // Rule 3: Female player plays at most 2 segments
        females.forEach(f => {
          if (appearances[f.id] > 2) {
            errs.push(`Đội ${teamName}: VĐV Nữ "${f.fullName}" chỉ được phép thi đấu tối đa 2 chặng.`);
          }
        });
      }
    };

    validateSide(lineupsA, athletesA, teamA?.name || 'A');
    validateSide(lineupsB, athletesB, teamB?.name || 'B');

    setLineupErrors(errs);
  }, [lineupsA, lineupsB, lineupMatchId, state]);

  const handleSaveLineups = () => {
    if (!lineupMatchId) return;
    const res = submitMatchLineups(lineupMatchId, lineupsA, lineupsB);
    if (res.valid) {
      setLineupMatchId(null);
    } else {
      setLineupErrors(res.errors);
    }
  };

  const handleCreateManualMatch = (e: React.FormEvent) => {
    e.preventDefault();
    const { teamAId, teamBId } = newMatchData;
    if (!teamAId || !teamBId) {
      alert('Vui lòng chọn đầy đủ Team A và Team B!');
      return;
    }
    if (teamAId === teamBId) {
      alert('Hai đội đối đầu không thể trùng lặp nhau!');
      return;
    }

    addMatch({
      tournamentId: state.activeTournamentId,
      groupId: newMatchData.stage === 'group' ? (newMatchData.groupId || null) : null,
      stage: newMatchData.stage,
      teamAId,
      teamBId,
      court: newMatchData.court.trim(),
      scheduledAt: newMatchData.scheduledAt,
      status: newMatchData.status,
      scoreA: null,
      scoreB: null,
      winnerTeamId: null,
      note: newMatchData.note.trim()
    });

    setCreateModalOpen(false);
  };

  const handleDeleteMatch = (id: string, detail: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa trận đấu "${detail}"?`)) {
      deleteMatch(id);
    }
  };

  // Courts unique pool for filter
  const courtsPool = Array.from(new Set(state.matches.map(m => m.court).filter(Boolean))) as string[];

  // Filter & Search Match results
  const filteredMatches = state.matches.filter(match => {
    const matchGroup = filterGroup === '' || match.groupId === filterGroup;
    const matchStatus = filterStatus === '' || match.status === filterStatus;
    const matchCourt = filterCourt === '' || match.court === filterCourt;
    const matchTeam = searchTeamId === '' || match.teamAId === searchTeamId || match.teamBId === searchTeamId;
    return matchGroup && matchStatus && matchCourt && matchTeam;
  });

  const getSegmentLabel = (key: SegmentKey) => {
    if (key === 'mens_doubles') return 'Đôi Nam';
    if (key === 'womens_doubles') return 'Đôi Nữ';
    return 'Đôi Nam Nữ';
  };

  // Auth helpers
  const currentRole = state.currentUser?.role || 'viewer';
  const isOperatorOnly = currentRole === 'operator';
  const canEdit = currentRole === 'super_admin' || currentRole === 'organizer';
  const canOperate = canEdit || isOperatorOnly;

  return (
    <div id="matches-screen-container" className="space-y-6 animate-fade-in text-slate-100">
      {/* Header block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-brand-primary" />
            <span>Điều Hành Lịch Đấu & Điểm Tiếp Sức</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">
            Quản lý lịch thi đấu, phân chặng tiếp sức. Trọng tài có thể khóa lineup đội hình và kích hoạt console ghi điểm quả bóng trực tiếp (+1 / Undo) vô cùng trực quan.
          </p>
        </div>

        {canEdit && (
          <button
            id="open-create-match-modal-btn"
            onClick={() => setCreateModalOpen(true)}
            className="btn-primary !py-2.5 !px-4 text-xs select-none shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo trận tiếp sức mới</span>
          </button>
        )}
      </div>

      {/* Multi Filtering Area */}
      <div className="premium-card p-4 rounded-2xl space-y-3">
        <div className="flex items-center gap-1.5 text-slate-450">
          <Filter className="w-4 h-4 text-brand-primary" />
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-300">Bộ lọc lịch thi đấu</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <select
            id="filter-matches-group"
            value={filterGroup}
            onChange={e => setFilterGroup(e.target.value)}
            className="premium-input w-full cursor-pointer text-xs"
          >
            <option value="">Tất cả Bảng đấu</option>
            {state.groups.map(g => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <select
            id="filter-matches-status"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="premium-input w-full cursor-pointer text-xs"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="scheduled">Chưa lập đội hình</option>
            <option value="lineup_pending">Chờ nộp lineup</option>
            <option value="ready">Chờ khai cuộc</option>
            <option value="ongoing">Đang Live chặng</option>
            <option value="segment_break">Đang nghỉ đổi sân</option>
            <option value="completed">Đã kết thúc</option>
          </select>

          <select
            id="filter-matches-court"
            value={filterCourt}
            onChange={e => setFilterCourt(e.target.value)}
            className="premium-input w-full cursor-pointer text-xs"
          >
            <option value="">Tất cả Sân đấu</option>
            {courtsPool.map(c => (
              <option key={c} value={c}>
                Sân: {c}
              </option>
            ))}
          </select>

          <select
            id="filter-matches-team"
            value={searchTeamId}
            onChange={e => setSearchTeamId(e.target.value)}
            className="premium-input w-full cursor-pointer text-xs"
          >
            <option value="">Theo Đội thi đấu (Tất cả)</option>
            {state.teams.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Renders match listings */}
      {filteredMatches.length === 0 ? (
        <div className="premium-card rounded-2xl p-10 text-center flex flex-col items-center justify-center">
          <CalendarDays className="w-12 h-12 text-slate-600 mb-3" />
          <h3 className="text-slate-350 font-display font-semibold text-base">Không tìm thấy trận thi đấu nào</h3>
          <p className="text-slate-500 text-xs mt-1 max-w-sm font-light">
            Không tìm thấy trận nào phù hợp với bộ lọc đã chọn.
          </p>
        </div>
      ) : (
        <div id="matches-grid" className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredMatches.map(match => {
            const teamA = getTeamNameAndCode(match.teamAId);
            const teamB = getTeamNameAndCode(match.teamBId);
            const groupName = state.groups.find(g => g.id === match.groupId)?.name || 'Vòng chung kết / Loại trực tiếp';
            const hasLineup = match.lineupLocked;

            return (
              <div
                key={match.id}
                id={`match-card-${match.id}`}
                className="premium-card rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  {/* Category row of match */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 flex-wrap gap-2 text-[10px] font-bold">
                    <div className="flex items-center gap-2">
                      <StatusBadge type="match_status" value={match.status} />
                      <span className="text-slate-400 uppercase tracking-wider font-semibold">{groupName}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {match.court && (
                        <span className="bg-slate-900 border border-slate-800 text-brand-primary font-bold px-2 py-0.5 rounded-md">
                          {match.court}
                        </span>
                      )}
                      <StatusBadge type="stage" value={match.stage} />
                    </div>
                  </div>

                  {/* Relay Score board widget */}
                  <div className="mt-4 grid grid-cols-12 items-center gap-2">
                    <div className="col-span-9 space-y-2.5">
                      {/* Team A */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        {match.winnerTeamId === match.teamAId && <span className="text-xs shrink-0">🏆</span>}
                        <span className={`text-sm truncate select-none tracking-wide ${
                          match.winnerTeamId === match.teamAId ? 'font-black text-brand-primary' : 'font-bold text-slate-200'
                        }`}>
                          {teamA.name}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 font-extrabold uppercase tracking-wider">({teamA.code})</span>
                      </div>
                      
                      {/* Team B */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        {match.winnerTeamId === match.teamBId && <span className="text-xs shrink-0">🏆</span>}
                        <span className={`text-sm truncate select-none tracking-wide ${
                          match.winnerTeamId === match.teamBId ? 'font-black text-brand-primary' : 'font-bold text-slate-200'
                        }`}>
                          {teamB.name}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 font-extrabold uppercase tracking-wider">({teamB.code})</span>
                      </div>
                    </div>

                    <div className="col-span-3 text-right">
                      {match.status !== 'scheduled' && match.status !== 'lineup_pending' ? (
                        <div className="flex flex-col gap-1 items-end justify-center font-mono">
                          <span className={`text-xs font-black px-2 py-0.5 rounded-md select-none ${
                            match.winnerTeamId === match.teamAId ? 'bg-brand-primary text-slate-950 font-extrabold' : 'bg-slate-900 border border-slate-800 text-slate-400'
                          }`}>{match.scoreA ?? 0}</span>
                          <span className={`text-xs font-black px-2 py-0.5 rounded-md select-none ${
                            match.winnerTeamId === match.teamBId ? 'bg-brand-primary text-slate-950 font-extrabold' : 'bg-slate-900 border border-slate-800 text-slate-400'
                          }`}>{match.scoreB ?? 0}</span>
                        </div>
                      ) : (
                        <span className="text-slate-650 font-black text-xs select-none tracking-widest bg-slate-900 border border-slate-850 px-2 py-1.5 rounded-md">VS</span>
                      )}
                    </div>
                  </div>

                  {/* Relay Segment Order Draw status */}
                  <div className="mt-4 bg-slate-950/40 border border-slate-850 p-3 rounded-xl text-[10px] space-y-2">
                    <div className="flex items-center justify-between text-slate-500 font-bold uppercase tracking-wider">
                      <span>Đường đua Tiếp sức 24</span>
                      <span className="text-indigo-400">3 Chặng thi đấu</span>
                    </div>

                    {match.segmentsOrder ? (
                      <div className="flex items-center gap-1.5 text-slate-300 font-semibold flex-wrap">
                        {match.segmentsOrder.map((key, idx) => (
                          <div key={key} className="flex items-center gap-1">
                            <span className={`px-2 py-0.8 rounded-md text-[9px] font-bold ${
                              match.activeSegmentIndex === idx && match.status !== 'completed'
                                ? 'bg-indigo-650 text-white font-black shadow-[0_0_10px_rgba(99,102,241,0.4)]'
                                : 'bg-slate-900 border border-slate-850 text-slate-400'
                            }`}>
                              Chặng {idx + 1}: {getSegmentLabel(key)} ({(idx + 1) * 8}đ)
                            </span>
                            {idx < 2 && <ChevronRight className="w-3 h-3 text-slate-650" />}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 italic font-light">Chưa bốc thăm thứ tự chặng đấu</span>
                        {canOperate && (
                          <button
                            onClick={() => drawMatchSegmentOrder(match.id)}
                            className="bg-brand-secondary/15 border border-brand-secondary/30 text-indigo-300 px-2.5 py-1 rounded-md font-bold text-[9px] hover:bg-brand-secondary/25 transition-all cursor-pointer"
                          >
                            🎲 Bốc thăm nhanh
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Match Footer */}
                <div className="flex items-center justify-between pt-3.5 border-t border-slate-800/80 flex-wrap gap-2 text-xs">
                  <div className="text-[10px] text-slate-500 font-bold">
                    🕒 {match.scheduledAt ? match.scheduledAt.replace('T', ' ') : 'Chưa định lịch'}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Setup Lineup Button */}
                    {canOperate && (match.status === 'scheduled' || match.status === 'lineup_pending' || !hasLineup) && (
                      <button
                        onClick={() => {
                          if (!match.segmentsOrder) {
                            drawMatchSegmentOrder(match.id);
                          }
                          handleOpenLineupPanel(match);
                        }}
                        className="btn-secondary !h-8 !py-1 !px-2.5 !text-[10px] flex items-center gap-1.5 border-amber-500/20 text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 hover:border-amber-500/30"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Đăng ký Đội hình</span>
                      </button>
                    )}

                    {/* Launch Live Scorer Console */}
                    {canOperate && hasLineup && match.status !== 'completed' && (
                      <button
                        onClick={() => setScoringMatchId(match.id)}
                        className="btn-primary !h-8 !py-1 !px-2.5 !text-[10px] bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>Trọng tài Ghi điểm</span>
                      </button>
                    )}

                    {/* Show completed details */}
                    {match.status === 'completed' && (
                      <button
                        onClick={() => setScoringMatchId(match.id)}
                        className="btn-secondary !h-8 !py-1 !px-2.5 !text-[10px] flex items-center gap-1.5"
                      >
                        <ClipboardPen className="w-3.5 h-3.5 text-slate-400" />
                        <span>Log Điểm</span>
                      </button>
                    )}

                    {canEdit && (
                      <button
                        onClick={() => handleDeleteMatch(match.id, `${teamA.name} - ${teamB.name}`)}
                        title="Hủy trận đấu"
                        className="btn-danger !p-1.5 !h-8 !w-8 flex items-center justify-center rounded-xl"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Match Creator Form Modal */}
      {createModalOpen && (
        <div
          onClick={() => setCreateModalOpen(false)}
          className="fixed inset-0 bg-slate-955/80 backdrop-blur-md flex items-center justify-center p-4 z-50 pointer-events-auto overflow-hidden"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-zoom-in pointer-events-auto flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950 text-white shrink-0">
              <h3 className="font-display font-bold text-base flex items-center gap-2">
                <PlusSquare className="w-5 h-5 text-brand-primary" />
                <span>Tạo Trận Đấu Thủ Công</span>
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualMatch} className="flex-1 flex flex-col min-h-0">
              <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Giai đoạn</label>
                    <select
                      value={newMatchData.stage}
                      onChange={e => {
                        const val = e.target.value as Match['stage'];
                        setNewMatchData({ ...newMatchData, stage: val });
                      }}
                      className="premium-input w-full cursor-pointer"
                    >
                      <option value="group">Vòng bảng (Group)</option>
                      <option value="playoff">Tứ kết Playoffs</option>
                      <option value="knockout">Bán kết (Semi-Final)</option>
                      <option value="final">Chung kết (Final)</option>
                      <option value="third_place">Tranh Hạng ba (3rd-place)</option>
                      <option value="friendly">Giao hữu khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Bảng đấu (Nếu có)</label>
                    <select
                      value={newMatchData.groupId}
                      disabled={newMatchData.stage !== 'group'}
                      onChange={e => setNewMatchData({ ...newMatchData, groupId: e.target.value })}
                      className="premium-input w-full cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Chưa chia bảng đấu --</option>
                      {state.groups.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Contenders choice option */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Đội A <span className="text-red-400">*</span></label>
                    <select
                      required
                      value={newMatchData.teamAId}
                      onChange={e => setNewMatchData({ ...newMatchData, teamAId: e.target.value })}
                      className="premium-input w-full cursor-pointer"
                    >
                      <option value="">-- Chọn Đội A --</option>
                      {state.teams.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Đội B <span className="text-red-400">*</span></label>
                    <select
                      required
                      value={newMatchData.teamBId}
                      onChange={e => setNewMatchData({ ...newMatchData, teamBId: e.target.value })}
                      className="premium-input w-full cursor-pointer"
                    >
                      <option value="">-- Chọn Đội B --</option>
                      {state.teams.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Sân thi đấu</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Sân Số 1"
                      value={newMatchData.court}
                      onChange={e => setNewMatchData({ ...newMatchData, court: e.target.value })}
                      className="premium-input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Ngày giờ thi đấu</label>
                    <input
                      type="datetime-local"
                      value={newMatchData.scheduledAt}
                      onChange={e => setNewMatchData({ ...newMatchData, scheduledAt: e.target.value })}
                      className="premium-input w-full cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Ghi chú</label>
                  <textarea
                    rows={2}
                    placeholder="Ghi chú thêm về lịch..."
                    value={newMatchData.note}
                    onChange={e => setNewMatchData({ ...newMatchData, note: e.target.value })}
                    className="premium-input w-full text-slate-200"
                  />
                </div>
              </div>

              <div className="p-5 border-t border-slate-800 flex items-center justify-end gap-3 h-18 shrink-0">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Đóng lại
                </button>
                <button
                  type="submit"
                  className="btn-primary !py-2.5 !px-5 text-xs shadow-md"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Tải lên lịch đấu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lineups Registry Assignment Panel Modal */}
      {lineupMatchId && (
        <div
          onClick={() => setLineupMatchId(null)}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto pointer-events-auto"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-zoom-in my-8 pointer-events-auto flex flex-col max-h-[90vh]"
          >
            {(() => {
              const activeMatch = state.matches.find(m => m.id === lineupMatchId);
              if (!activeMatch) return null;

              const teamA = state.teams.find(t => t.id === activeMatch.teamAId);
              const teamB = state.teams.find(t => t.id === activeMatch.teamBId);

              const athletesA = getTeamAthletes(activeMatch.teamAId);
              const athletesB = getTeamAthletes(activeMatch.teamBId);

              const order = activeMatch.segmentsOrder || ['mixed_doubles', 'mens_doubles', 'womens_doubles'];

              return (
                <>
                  {/* Modal Header */}
                  <div className="p-5 border-b border-slate-805 bg-slate-950 text-white shrink-0 flex justify-between items-center">
                    <div>
                      <h3 className="font-display font-black text-slate-100 text-base">Đăng ký Đội hình Đường đua Tiếp sức</h3>
                      <p className="text-[10px] text-slate-450 mt-1 font-semibold uppercase tracking-wider">
                        Đối đầu: <span className="text-brand-primary">{teamA?.name}</span> vs <span className="text-brand-primary">{teamB?.name}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => setLineupMatchId(null)}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Segment Assignment Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Team A Lineup Panel */}
                      <div className="space-y-4 border border-slate-800 p-4 rounded-2xl bg-slate-950/40">
                        <div className="flex items-center justify-between border-b pb-2 border-slate-800/80">
                          <h4 className="font-display font-bold text-slate-200 text-xs sm:text-sm uppercase tracking-tight">Roster: {teamA?.name}</h4>
                          <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-extrabold uppercase tracking-wider">5 Thành viên</span>
                        </div>

                        <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-bold text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-855">
                          {athletesA.map(a => (
                            <div key={a.id} className="truncate">
                              <div className="font-bold text-slate-200">{a.fullName.split(' ').pop()}</div>
                              <div className={`mt-1 text-[8px] px-1.5 py-0.2 rounded-full inline-block font-extrabold uppercase tracking-wider ${
                                a.gender === 'Nam' ? 'bg-sky-500/10 text-sky-400' : 'bg-pink-500/10 text-pink-400'
                              }`}>{a.gender === 'Nam' ? 'N' : 'F'}</div>
                            </div>
                          ))}
                        </div>

                        {order.map((key, idx) => (
                          <div key={key} className="space-y-1.5 p-3 bg-slate-900 border border-slate-850 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Chặng {idx + 1}: {getSegmentLabel(key)}
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              {[0, 1].map(pos => (
                                <select
                                  key={pos}
                                  value={lineupsA[key]?.[pos] || ''}
                                  onChange={e => {
                                    const val = e.target.value;
                                    const current = [...(lineupsA[key] || [])];
                                    current[pos] = val;
                                    setLineupsA({ ...lineupsA, [key]: current.filter(Boolean) });
                                  }}
                                  className="premium-input w-full cursor-pointer py-1.5 text-[11px] font-semibold"
                                >
                                  <option value="">-- VĐV {pos + 1} --</option>
                                  {athletesA.map(a => (
                                    <option key={a.id} value={a.id}>
                                      {a.fullName} ({a.gender})
                                    </option>
                                  ))}
                                </select>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Team B Lineup Panel */}
                      <div className="space-y-4 border border-slate-800 p-4 rounded-2xl bg-slate-950/40">
                        <div className="flex items-center justify-between border-b pb-2 border-slate-800/80">
                          <h4 className="font-display font-bold text-slate-200 text-xs sm:text-sm uppercase tracking-tight">Roster: {teamB?.name}</h4>
                          <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-extrabold uppercase tracking-wider">5 Thành viên</span>
                        </div>

                        <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-bold text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-855">
                          {athletesB.map(a => (
                            <div key={a.id} className="truncate">
                              <div className="font-bold text-slate-200">{a.fullName.split(' ').pop()}</div>
                              <div className={`mt-1 text-[8px] px-1.5 py-0.2 rounded-full inline-block font-extrabold uppercase tracking-wider ${
                                a.gender === 'Nam' ? 'bg-sky-500/10 text-sky-400' : 'bg-pink-500/10 text-pink-400'
                              }`}>{a.gender === 'Nam' ? 'N' : 'F'}</div>
                            </div>
                          ))}
                        </div>

                        {order.map((key, idx) => (
                          <div key={key} className="space-y-1.5 p-3 bg-slate-900 border border-slate-855 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Chặng {idx + 1}: {getSegmentLabel(key)}
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              {[0, 1].map(pos => (
                                <select
                                  key={pos}
                                  value={lineupsB[key]?.[pos] || ''}
                                  onChange={e => {
                                    const val = e.target.value;
                                    const current = [...(lineupsB[key] || [])];
                                    current[pos] = val;
                                    setLineupsB({ ...lineupsB, [key]: current.filter(Boolean) });
                                  }}
                                  className="premium-input w-full cursor-pointer py-1.5 text-[11px] font-semibold"
                                >
                                  <option value="">-- VĐV {pos + 1} --</option>
                                  {athletesB.map(a => (
                                    <option key={a.id} value={a.id}>
                                      {a.fullName} ({a.gender})
                                    </option>
                                  ))}
                                </select>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                    </div>

                    {/* Real-time lineup errors log warnings */}
                    {lineupErrors.length > 0 && (
                      <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-2xl space-y-2">
                        <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span>Vi phạm Điều Lệ Giải Pickleball Golab</span>
                        </span>
                        <ul className="list-disc pl-5 text-[11px] text-slate-350 space-y-1 font-medium leading-relaxed">
                          {lineupErrors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Modal Footer Controls */}
                  <div className="p-5 border-t border-slate-800 bg-slate-950 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-center sm:text-left">
                      💡 VĐV Nam chỉ được đánh tối đa 1 chặng. Toàn bộ 5 VĐV đều bắt buộc ra sân đấu.
                    </span>
                    
                    <div className="flex items-center gap-3.5">
                      <button
                        type="button"
                        onClick={() => setLineupMatchId(null)}
                        className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveLineups}
                        disabled={lineupErrors.length > 0 || (Object.values(lineupsA) as string[][]).some(pids => pids.length !== 2) || (Object.values(lineupsB) as string[][]).some(pids => pids.length !== 2)}
                        className="btn-primary !py-2.5 !px-5 text-xs shadow-md shrink-0 flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>KHÓA ĐỘI HÌNH & KHAI CUỘC</span>
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Next-Gen Interactive Fullscreen Scorer Console */}
      {scoringMatchId && (
        <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col pointer-events-auto text-white overflow-hidden select-none animate-fade-in font-sans">
          {(() => {
            const activeMatch = state.matches.find(m => m.id === scoringMatchId);
            if (!activeMatch) return null;

            const teamA = state.teams.find(t => t.id === activeMatch.teamAId);
            const teamB = state.teams.find(t => t.id === activeMatch.teamBId);

            const activeIdx = activeMatch.activeSegmentIndex || 0;
            const activeSeg = activeMatch.segments?.[activeIdx];

            const playersA = activeSeg?.playerIdsA?.map(pid => state.athletes.find(a => a.id === pid)?.fullName.split(' ').pop()).filter(Boolean).join(' + ') || '...';
            const playersB = activeSeg?.playerIdsB?.map(pid => state.athletes.find(a => a.id === pid)?.fullName.split(' ').pop()).filter(Boolean).join(' + ') || '...';

            return (
              <>
                {/* Console Header Bar */}
                <div className="bg-slate-950/80 backdrop-blur-md border-b border-slate-850 p-4 shrink-0 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="bg-brand-primary text-slate-950 font-black text-[10px] px-2.5 py-0.8 rounded-md uppercase tracking-wider animate-pulse font-display shadow-[0_0_15px_rgba(190,242,100,0.4)]">
                      Live Operator Console
                    </span>
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></div>
                    <span className="text-xs font-mono font-bold text-slate-400 tracking-wide uppercase">
                      SÂN: {activeMatch.court || 'Trung tâm'} | Trọng tài Golab
                    </span>
                  </div>

                  <button
                    onClick={() => setScoringMatchId(null)}
                    className="btn-secondary !h-8 !py-1 !px-4 !text-xs border-slate-800 text-slate-400 hover:text-slate-200"
                  >
                    Thoát
                  </button>
                </div>

                {/* Score panel body */}
                <div className="flex-1 flex flex-col md:flex-row items-stretch justify-center p-6 gap-6 relative overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900">
                  
                  {/* Left Side: Team A Scoring Clicker */}
                  <div 
                    onClick={() => {
                      if (activeMatch.status === 'ongoing') {
                        addScorePoint(activeMatch.id, activeMatch.teamAId);
                      }
                    }}
                    className={`flex-1 rounded-3xl border flex flex-col justify-between p-8 cursor-pointer transition-all duration-300 relative group overflow-hidden ${
                      activeMatch.status === 'ongoing'
                        ? 'bg-indigo-950/20 border-indigo-700/40 hover:bg-indigo-950/35 hover:border-indigo-500/50 hover:shadow-[0_0_50px_rgba(99,102,241,0.08)]'
                        : 'bg-slate-900/10 border-slate-900 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {activeMatch.status === 'ongoing' && (
                      <div className="absolute inset-0 bg-indigo-500/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    )}
                    <div className="text-center z-10">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Đội hình Trái</span>
                      <h2 className="text-xl sm:text-3xl font-display font-bold text-slate-100 mt-2 truncate tracking-wide">{teamA?.name}</h2>
                      <span className="text-xs text-indigo-400 font-mono mt-1 font-extrabold uppercase tracking-wider block bg-indigo-950/50 px-2 py-0.5 rounded-full inline-block">{teamA?.code}</span>
                    </div>

                    <div className="text-center font-mono text-[100px] sm:text-[180px] font-black tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.05)] py-4 select-none leading-none z-10 transition-transform duration-200 active:scale-95">
                      {activeMatch.scoreA ?? 0}
                    </div>

                    <div className="text-center bg-slate-955/60 p-4 rounded-2xl border border-slate-850/80 text-xs z-10 backdrop-blur-md shadow-inner">
                      <span className="text-slate-500 font-bold uppercase tracking-wider block mb-1 text-[9px]">VĐV Đang thi đấu:</span>
                      <span className="text-indigo-300 font-extrabold uppercase tracking-wide">{playersA}</span>
                    </div>
                  </div>

                  {/* Mid stats panel: Active Segment detail */}
                  <div className="md:w-72 shrink-0 flex flex-col justify-between bg-slate-950/60 border border-slate-850 rounded-3xl p-6 gap-6 z-25 backdrop-blur-lg">
                    <div className="text-center border-b border-slate-850 pb-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Chặng thi đấu Live</span>
                      <span className="text-sm font-display font-bold text-brand-primary block mt-2 tracking-wide">{activeSeg?.name || 'Đường đua Tiếp sức'}</span>
                      <span className="text-[10px] text-slate-400 font-mono mt-1 block font-bold uppercase tracking-wider font-semibold">
                        Đang chạm mốc: {activeSeg?.targetScore || 24} điểm
                      </span>
                    </div>

                    {/* Segment details */}
                    <div className="space-y-4 flex-1 flex flex-col justify-center">
                      <div className="text-center">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2.5">Tiến trình chặng</span>
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          {activeMatch.segments?.map((seg, idx) => (
                            <div
                              key={seg.id}
                              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                                seg.status === 'completed'
                                  ? 'bg-brand-primary shadow-[0_0_10px_rgba(190,242,100,0.5)]'
                                  : idx === activeIdx && activeMatch.status !== 'completed'
                                  ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] animate-pulse border border-indigo-300'
                                  : 'bg-slate-900 border border-slate-800'
                              }`}
                              title={seg.name}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Referee Undo and Reset Logs panel */}
                      <div className="space-y-2.5 pt-5 border-t border-slate-850/80">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            undoLatestScorePoint(activeMatch.id);
                          }}
                          disabled={!activeMatch.scoreEvents || activeMatch.scoreEvents.filter(e => !e.isUndone).length === 0}
                          className="w-full h-10 flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-slate-900 disabled:hover:border-slate-800 text-slate-300 hover:text-white font-bold text-[11px] rounded-xl transition-all cursor-pointer select-none uppercase tracking-wider"
                        >
                          <Undo2 className="w-4 h-4 text-brand-primary" />
                          <span>Hủy Điểm Gần Nhất</span>
                        </button>
                      </div>
                    </div>

                    {/* Display Event log history */}
                    <div className="border-t border-slate-855/80 pt-4">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                        Sự kiện điểm vừa ghi
                      </span>
                      <div className="max-h-28 overflow-y-auto space-y-1.5 font-mono text-[10px] custom-scrollbar pr-1">
                        {activeMatch.scoreEvents && activeMatch.scoreEvents.filter(e => !e.isUndone).length > 0 ? (
                          [...activeMatch.scoreEvents].filter(e => !e.isUndone).reverse().slice(0, 3).map((ev) => {
                            const scTeam = getTeamNameAndCode(ev.scoringTeamId);
                            return (
                              <div key={ev.id} className="flex justify-between items-center text-slate-400 p-2 bg-slate-900 border border-slate-850 rounded-xl">
                                <span className="font-extrabold text-brand-primary">+{scTeam.code}</span>
                                <span className="text-[9px] text-slate-500">Tỉ số: <strong className="text-white">{ev.scoreAAfter}-{ev.scoreBAfter}</strong></span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-slate-650 text-center py-3 italic text-[10px]">Trận chưa ghi điểm...</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Team B Scoring Clicker */}
                  <div 
                    onClick={() => {
                      if (activeMatch.status === 'ongoing') {
                        addScorePoint(activeMatch.id, activeMatch.teamBId);
                      }
                    }}
                    className={`flex-1 rounded-3xl border flex flex-col justify-between p-8 cursor-pointer transition-all duration-300 relative group overflow-hidden ${
                      activeMatch.status === 'ongoing'
                        ? 'bg-indigo-950/20 border-indigo-700/40 hover:bg-indigo-950/35 hover:border-indigo-500/50 hover:shadow-[0_0_50px_rgba(99,102,241,0.08)]'
                        : 'bg-slate-900/10 border-slate-900 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {activeMatch.status === 'ongoing' && (
                      <div className="absolute inset-0 bg-indigo-500/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    )}
                    <div className="text-center z-10">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Đội hình Phải</span>
                      <h2 className="text-xl sm:text-3xl font-display font-bold text-slate-100 mt-2 truncate tracking-wide">{teamB?.name}</h2>
                      <span className="text-xs text-indigo-400 font-mono mt-1 font-extrabold uppercase tracking-wider block bg-indigo-950/50 px-2 py-0.5 rounded-full inline-block">{teamB?.code}</span>
                    </div>

                    <div className="text-center font-mono text-[100px] sm:text-[180px] font-black tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.05)] py-4 select-none leading-none z-10 transition-transform duration-200 active:scale-95">
                      {activeMatch.scoreB ?? 0}
                    </div>

                    <div className="text-center bg-slate-955/60 p-4 rounded-2xl border border-slate-850/80 text-xs z-10 backdrop-blur-md shadow-inner">
                      <span className="text-slate-500 font-bold uppercase tracking-wider block mb-1 text-[9px]">VĐV Đang thi đấu:</span>
                      <span className="text-indigo-300 font-extrabold uppercase tracking-wide">{playersB}</span>
                    </div>
                  </div>

                  {/* SEGMENT BREAK OVERLAY - SIDE SWITCH REQUIRED */}
                  {activeMatch.status === 'segment_break' && (
                    <div className="absolute inset-0 bg-slate-955/95 backdrop-blur-md flex flex-col items-center justify-center p-6 z-30 animate-fade-in text-center">
                      <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 animate-bounce">
                        <ArrowRightLeft className="w-7 h-7" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-display font-bold text-amber-400 tracking-tight">CHẶNG HOÀN THÀNH - YÊU CẦU ĐỔI SÂN</h2>
                      <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed font-light">
                        Một đội đã chạm mốc tiếp sức chạm {activeMatch.segments?.[activeIdx]?.targetScore} điểm. Vui lòng cho 2 đội tiến hành đổi sân thi đấu. Đội hình chặng tiếp theo sẵn sàng.
                      </p>

                      <div className="mt-6 flex items-center gap-3">
                        <button
                          onClick={() => startNextSegment(activeMatch.id)}
                          className="btn-primary !py-3 !px-6 text-xs shadow-lg flex items-center gap-2"
                        >
                          <Play className="w-4 h-4 fill-current text-slate-950" />
                          <span>KÍCH HOẠT CHẶNG TIẾP THEO</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* READY INITIAL STATE LAUNCH */}
                  {activeMatch.status === 'ready' && (
                    <div className="absolute inset-0 bg-slate-955/95 backdrop-blur-md flex flex-col items-center justify-center p-6 z-30 animate-fade-in text-center">
                      <div className="w-16 h-16 rounded-full bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center text-brand-primary mb-4">
                        <Play className="w-7 h-7 fill-current text-slate-950" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-display font-bold text-brand-primary tracking-tight">ĐỘI HÌNH ĐÃ KHÓA & SẴN SÀNG KHAI CUỘC</h2>
                      <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed font-light">
                        Đội hình chặng 1 ({activeMatch.segments?.[0]?.name}) đã sẵn sàng nhập cuộc thi đấu tiếp sức chạm 8.
                      </p>

                      <div className="mt-6">
                        <button
                          onClick={() => startNextSegment(activeMatch.id)}
                          className="btn-primary !py-3 !px-6 text-xs shadow-lg flex items-center gap-2"
                        >
                          <Zap className="w-4 h-4 fill-current text-slate-950" />
                          <span>PHÁT BÓNG KHAI CUỘC</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* MATCH COMPLETED RESULT OVERLAY */}
                  {activeMatch.status === 'completed' && (
                    <div className="absolute inset-0 bg-slate-955/95 backdrop-blur-md flex flex-col items-center justify-center p-6 z-30 animate-fade-in text-center">
                      <span className="text-5xl mb-4">🏆</span>
                      <h2 className="text-xl sm:text-2xl font-display font-bold text-brand-primary tracking-tight">TRẬN ĐẤU KẾT THÚC</h2>
                      
                      <div className="my-5 bg-slate-900 p-6 border border-slate-800 rounded-2xl max-w-sm w-full">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black block mb-1">Nhà Vô Địch Lượt Đấu</span>
                        <div className="text-base font-display font-bold text-white uppercase tracking-wide">
                          {activeMatch.winnerTeamId === teamA?.id ? teamA?.name : teamB?.name}
                        </div>
                        <div className="text-2xl font-mono font-black text-brand-primary mt-3 shadow-inner bg-slate-950 py-2 rounded-xl border border-slate-850">
                          {activeMatch.scoreA} - {activeMatch.scoreB}
                        </div>
                      </div>

                      <button
                        onClick={() => setScoringMatchId(null)}
                        className="btn-secondary !py-3 !px-6 text-xs shadow-lg"
                      >
                        ĐÓNG & LƯU BẢNG XẾP HẠNG
                      </button>
                    </div>
                  )}

                </div>
              </>
            );
          })()}
        </div>
      )}

    </div>
  );
}
