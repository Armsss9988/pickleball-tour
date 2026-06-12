'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading-skeleton';
import { GitBranch, Trophy, ChevronRight, ChevronLeft } from '@/components/icons';

/* ────────────────────────────────────────────────────────────────
   Constants
──────────────────────────────────────────────────────────────── */
const CARD_W = 220;
const CARD_H = 106; // two-team card height approx
const COL_GAP = 64; // gap between column groups
const CONNECTOR_W = 48; // horizontal connector arm

/* ────────────────────────────────────────────────────────────────
   Types
──────────────────────────────────────────────────────────────── */
interface BracketNode {
  id: string;
  nodeKey: string;
  roundName: string;
  teamAId?: string | null;
  teamBId?: string | null;
  teamA?: { name: string } | null;
  teamB?: { name: string } | null;
  sourceA?: string | null;
  sourceB?: string | null;
  match?: {
    status: string;
    result?: {
      winnerTeamId?: string;
      teamAScore?: number;
      teamBScore?: number;
    };
  } | null;
}

interface SeedCandidate {
  teamId: string;
  teamName: string | null;
  teamCode: string | null;
  groupCode: string;
  rank: number;
  sourceLabel: string;
  qualifiedByRule: boolean;
  requiresAdminDecision: boolean;
}

/* ────────────────────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────────────────────── */
function getTeamLabel(team: { name: string } | null | undefined, source: string | null | undefined): string {
  if (team) return team.name;
  if (!source) return 'Chưa xác định';
  if (source.startsWith('W:SF')) return `Thắng BK ${source.replace('W:SF', '')}`;
  if (source.startsWith('L:SF')) return `Thua BK ${source.replace('L:SF', '')}`;
  if (source.startsWith('W:QF')) return `Thắng Tứ Kết ${source.replace('W:QF', '')}`;
  if (source.startsWith('W:P')) return `Thắng Vòng Nhánh ${source.replace('W:P', '')}`;
  if (source.startsWith('BYE:')) return 'Miễn đấu';
  if (source.startsWith('S:')) return `Seed ${source.replace('S:', '')}`;
  return `(${source})`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'RESULT_CONFIRMED': return { label: 'Đã kết thúc', cls: 'bg-emerald-500/20 text-emerald-400' };
    case 'COMPLETED': return { label: 'Chờ xác nhận', cls: 'bg-amber-500/20 text-amber-400' };
    case 'RUNNING': return { label: 'Đang đấu', cls: 'bg-blue-500/20 text-blue-400 animate-pulse' };
    default: return { label: 'Chưa bắt đầu', cls: 'bg-slate-700/50 text-slate-400' };
  }
}

/* ────────────────────────────────────────────────────────────────
   MatchCard component
──────────────────────────────────────────────────────────────── */
function MatchCard({ node, isFinal = false }: { node: BracketNode; isFinal?: boolean }) {
  const winnerTeamId = node.match?.result?.winnerTeamId;
  const teamALabel = getTeamLabel(node.teamA, node.sourceA);
  const teamBLabel = getTeamLabel(node.teamB, node.sourceB);
  const isWinA = winnerTeamId && winnerTeamId === node.teamAId;
  const isWinB = winnerTeamId && winnerTeamId === node.teamBId;
  const isTbdA = !node.teamAId;
  const isTbdB = !node.teamBId;
  const badge = node.match ? getStatusBadge(node.match.status) : null;

  const baseCard = isFinal
    ? 'relative rounded-2xl border shadow-2xl overflow-hidden'
    : 'relative rounded-xl border shadow-lg overflow-hidden';

  const borderCls = isFinal
    ? 'border-amber-500/50'
    : 'border-slate-700/60 hover:border-slate-600/80 transition-colors';

  const bgCls = isFinal ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20' : 'bg-slate-900/80';

  return (
    <div className={`${baseCard} ${borderCls} ${bgCls}`} style={{ width: CARD_W }}>
      {/* Glow for final */}
      {isFinal && (
        <>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-amber-500/8 blur-2xl pointer-events-none" />
        </>
      )}

      {/* Header */}
      <div className={`px-3 py-1.5 flex items-center justify-between border-b ${isFinal ? 'border-amber-500/20 bg-amber-500/5' : 'border-slate-800/80 bg-slate-950/40'}`}>
        <span className={`text-[9px] font-mono tracking-wider ${isFinal ? 'text-amber-400/70' : 'text-slate-500'}`}>
          #{node.nodeKey}
        </span>
        {badge && (
          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${badge.cls}`}>
            {badge.label}
          </span>
        )}
      </div>

      {/* Teams */}
      <div className="p-3 space-y-2">
        {/* Team A */}
        <div className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs gap-2 ${
          isWinA
            ? 'bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20'
            : isTbdA
            ? 'bg-slate-800/30 text-slate-600 italic border border-dashed border-slate-800'
            : 'bg-slate-800/50 text-slate-300 border border-transparent'
        }`}>
          <span className="truncate" title={teamALabel}>{isWinA && '🏆 '}{teamALabel}</span>
          {node.match?.result != null && (
            <span className={`font-mono tabular-nums shrink-0 ${isFinal ? 'text-sm font-bold' : ''}`}>
              {node.match.result.teamAScore}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-1.5 px-1">
          <div className="flex-1 h-px bg-slate-800/60" />
          <span className="text-[8px] text-slate-600 font-mono">VS</span>
          <div className="flex-1 h-px bg-slate-800/60" />
        </div>

        {/* Team B */}
        <div className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs gap-2 ${
          isWinB
            ? 'bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20'
            : isTbdB
            ? 'bg-slate-800/30 text-slate-600 italic border border-dashed border-slate-800'
            : 'bg-slate-800/50 text-slate-300 border border-transparent'
        }`}>
          <span className="truncate" title={teamBLabel}>{isWinB && '🏆 '}{teamBLabel}</span>
          {node.match?.result != null && (
            <span className={`font-mono tabular-nums shrink-0 ${isFinal ? 'text-sm font-bold' : ''}`}>
              {node.match.result.teamBScore}
            </span>
          )}
        </div>
      </div>

      {/* Winner banner */}
      {winnerTeamId && node.match?.status === 'RESULT_CONFIRMED' && (
        <div className="px-3 pb-3">
          <div className="flex items-center justify-center gap-1.5 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[9px] font-bold text-amber-400 tracking-wide">
            <Trophy className="w-3 h-3" />
            {winnerTeamId === node.teamAId ? node.teamA?.name : node.teamB?.name}
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   SVG Connector: from round-1 cards to semi-final
   Draws a right-facing bracket arm (for left branch, →)
──────────────────────────────────────────────────────────────── */
function BracketConnectorLeft({ topY, botY, midY }: { topY: number; botY: number; midY: number }) {
  // topY, botY = y-centers of the two QF/P cards (relative to SVG top)
  // midY = y-center of the SF card
  const armX = CONNECTOR_W - 8;
  return (
    <svg width={CONNECTOR_W} height={Math.max(botY + 20, midY + 20)} style={{ overflow: 'visible' }}>
      {/* Vertical bar on left */}
      <line x1={0} y1={topY} x2={0} y2={botY} stroke="#334155" strokeWidth={1.5} />
      {/* Top horizontal arm */}
      <line x1={0} y1={topY} x2={armX} y2={topY} stroke="#334155" strokeWidth={1.5} />
      {/* Bottom horizontal arm */}
      <line x1={0} y1={botY} x2={armX} y2={botY} stroke="#334155" strokeWidth={1.5} />
      {/* From mid of vertical to SF */}
      <line x1={0} y1={midY} x2={armX} y2={midY} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 2" />
      {/* Arrow head pointing right */}
      <polyline points={`${armX - 5},${midY - 4} ${armX},${midY} ${armX - 5},${midY + 4}`} stroke="#f59e0b" strokeWidth={1.5} fill="none" />
    </svg>
  );
}

function BracketConnectorRight({ topY, botY, midY }: { topY: number; botY: number; midY: number }) {
  const armX = 8;
  return (
    <svg width={CONNECTOR_W} height={Math.max(botY + 20, midY + 20)} style={{ overflow: 'visible' }}>
      {/* Vertical bar on right */}
      <line x1={CONNECTOR_W} y1={topY} x2={CONNECTOR_W} y2={botY} stroke="#334155" strokeWidth={1.5} />
      {/* Top horizontal arm */}
      <line x1={CONNECTOR_W} y1={topY} x2={armX} y2={topY} stroke="#334155" strokeWidth={1.5} />
      {/* Bottom horizontal arm */}
      <line x1={CONNECTOR_W} y1={botY} x2={armX} y2={botY} stroke="#334155" strokeWidth={1.5} />
      {/* From mid of vertical to SF */}
      <line x1={CONNECTOR_W} y1={midY} x2={armX} y2={midY} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 2" />
      {/* Arrow head pointing left */}
      <polyline points={`${armX + 5},${midY - 4} ${armX},${midY} ${armX + 5},${midY + 4}`} stroke="#f59e0b" strokeWidth={1.5} fill="none" />
    </svg>
  );
}

/* SF → Final connector (simple horizontal arrow) */
function SFtoFinalArrow({ direction }: { direction: 'left' | 'right' }) {
  return (
    <div className="flex items-center self-center" style={{ width: COL_GAP }}>
      {direction === 'left' ? (
        <div className="w-full flex items-center justify-center">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-amber-500/70" />
          <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
        </div>
      ) : (
        <div className="w-full flex items-center justify-center">
          <ChevronLeft className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-amber-500/40 to-amber-500/70" />
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   BracketTree — renders one branch (left or right) + connector
──────────────────────────────────────────────────────────────── */
function BracketBranch({
  round1Nodes,
  round2Node,
  direction,
}: {
  round1Nodes: BracketNode[];
  round2Node: BracketNode | undefined;
  direction: 'left' | 'right';
}) {
  const hasR1 = round1Nodes.length > 0;
  const CARD_TOTAL_H = CARD_H + 16; // card + gap
  const R1_GAP = 24;

  // Vertical positions of R1 card centers (relative to column top)
  const r1Centers = round1Nodes.map((_, i) => i * (CARD_TOTAL_H + R1_GAP) + CARD_TOTAL_H / 2);
  const totalR1H = round1Nodes.length * (CARD_TOTAL_H + R1_GAP) - R1_GAP;
  const sfCenterY = totalR1H / 2; // vertically center SF against R1 stack

  const roundLabel = (dir: 'left' | 'right') =>
    dir === 'left' ? (
      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 mb-3">
        Vòng Nhánh <ChevronRight className="w-2.5 h-2.5 text-amber-500/60" />
      </div>
    ) : (
      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 mb-3">
        <ChevronLeft className="w-2.5 h-2.5 text-amber-500/60" /> Vòng Nhánh
      </div>
    );

  const sfLabel = (dir: 'left' | 'right') =>
    dir === 'left' ? (
      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 mb-3">
        Bán Kết 1 <ChevronRight className="w-2.5 h-2.5 text-amber-500/60" />
      </div>
    ) : (
      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 mb-3">
        <ChevronLeft className="w-2.5 h-2.5 text-amber-500/60" /> Bán Kết 2
      </div>
    );

  const renderR1Column = () => (
    <div className="flex flex-col" style={{ gap: R1_GAP }}>
      {roundLabel(direction)}
      {round1Nodes.map(n => <MatchCard key={n.id} node={n} />)}
    </div>
  );

  const renderConnector = () => {
    if (!hasR1 || round1Nodes.length < 2) return null;
    const topY = r1Centers[0];
    const botY = r1Centers[r1Centers.length - 1];
    const midY = sfCenterY;
    return direction === 'left'
      ? <BracketConnectorLeft topY={topY} botY={botY} midY={midY} />
      : <BracketConnectorRight topY={topY} botY={botY} midY={midY} />;
  };

  const renderSFColumn = () => (
    <div className="flex flex-col justify-center">
      {sfLabel(direction)}
      {round2Node
        ? <MatchCard node={round2Node} />
        : <div className="flex items-center justify-center text-slate-600 text-xs italic" style={{ width: CARD_W, height: CARD_H }}>Chưa có dữ liệu</div>
      }
    </div>
  );

  if (direction === 'left') {
    return (
      <div className="flex items-center gap-0">
        {hasR1 && renderR1Column()}
        {hasR1 && renderConnector()}
        {renderSFColumn()}
        <SFtoFinalArrow direction="left" />
      </div>
    );
  } else {
    return (
      <div className="flex items-center gap-0">
        <SFtoFinalArrow direction="right" />
        {renderSFColumn()}
        {hasR1 && renderConnector()}
        {hasR1 && renderR1Column()}
      </div>
    );
  }
}

/* ────────────────────────────────────────────────────────────────
   Main Page
──────────────────────────────────────────────────────────────── */
export default function BracketPage() {
  const { tournament, loading: tLoading, reload: reloadTournament } = useActiveTournament();
  const { toast } = useToast();
  const [nodes, setNodes] = useState<BracketNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [seedCandidates, setSeedCandidates] = useState<SeedCandidate[]>([]);
  const [seedLoading, setSeedLoading] = useState(false);
 
  const loadBracket = async () => {
    if (!tournament) return;
    try {
      setLoading(true);
      const data = await apiFetch(`/tournaments/${tournament.id}/bracket`);
      setNodes(data);
    } catch (e: any) {
      console.error(e);
      toast(e.message || 'Lỗi tải thông tin nhánh đấu.', 'error');
    } finally {
      setLoading(false);
    }
  };
 
  const loadSeedCandidates = async () => {
    if (!tournament) return;
    try {
      setSeedLoading(true);
      const data = await apiFetch<{ candidates: SeedCandidate[] }>(`/tournaments/${tournament.id}/bracket/seed-candidates`);
      setSeedCandidates(data.candidates || []);
    } catch (e: any) {
      console.error(e);
      toast(e.message || 'Lỗi tải danh sách đội seed.', 'error');
    } finally {
      setSeedLoading(false);
    }
  };
 
  useEffect(() => { loadBracket(); }, [tournament]);
  useEffect(() => {
    if (tournament && nodes.length === 0) void loadSeedCandidates();
  }, [tournament, nodes.length]);
 
  // WebSocket real-time updates
  useEffect(() => {
    if (!tournament) return;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    const socket = io(`${wsUrl}/ws`, { transports: ['websocket'] });
    const joinRoom = () => socket.emit('joinTournament', { tournamentId: tournament.id });
    socket.on('connect', joinRoom);
    socket.on('score.updated', () => void loadBracket());
    if (socket.connected) joinRoom();
    return () => { socket.emit('leaveTournament', { tournamentId: tournament.id }); socket.disconnect(); };
  }, [tournament]);
 
  const handleGenerateBracket = async () => {
    if (!tournament) return;
    setActionLoading(true);
    try {
      await apiFetch(`/tournaments/${tournament.id}/bracket/generate`, {
        method: 'POST',
        body: {}, // Send empty body to trigger automatic ruleset-based seeding
      });
      toast('Đã khởi tạo thành công nhánh đấu Playoffs tự động!', 'success');
      setConfirmModalOpen(false);
      loadBracket();
      reloadTournament();
    } catch (err: any) {
      toast(err.message || 'Lỗi tạo nhánh đấu.', 'error');
    } finally {
      setActionLoading(false);
    }
  };
 
  if (tLoading || (loading && nodes.length === 0)) return <PageLoading />;
 
  /* Partition nodes */
  const finalNode = nodes.find(n => n.nodeKey === 'F');
  const leftR1 = nodes.filter(n => ['QF1', 'QF2', 'P1'].includes(n.nodeKey));
  const leftSF = nodes.find(n => n.nodeKey === 'SF1');
  const rightSF = nodes.find(n => n.nodeKey === 'SF2');
  const rightR1 = nodes.filter(n => ['QF3', 'QF4', 'P2'].includes(n.nodeKey));
  const thirdPlaceNode = nodes.find(n => n.nodeKey === '3P');
 
  const hasBracket = nodes.length > 0;

  return (
    <div className="premium-container space-y-6 animate-scale-in">
      <PageHeader
        title="Nhánh Đấu Loại Trực Tiếp"
        description="Sơ đồ thi đấu Playoffs Knockout — các nhánh rẽ vào trận Chung Kết trung tâm."
        icon={GitBranch}
      />

      {hasBracket ? (
        <div className="overflow-x-auto py-10 bg-slate-900/20 rounded-3xl border border-slate-800 shadow-inner px-8 scrollbar-thin">
          {/* ── Legend ─────────────────────────────────── */}
          <div className="flex items-center gap-5 mb-8 justify-center flex-wrap">
            {[
              { color: 'bg-slate-600', label: 'Chưa bắt đầu' },
              { color: 'bg-blue-500', label: 'Đang đấu' },
              { color: 'bg-amber-500', label: 'Chờ xác nhận' },
              { color: 'bg-emerald-500', label: 'Đã kết thúc' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <div className={`w-2 h-2 rounded-full ${item.color}`} />
                {item.label}
              </div>
            ))}
          </div>

          {/* ── Bracket Tree ──────────────────────────── */}
          <div
            className="flex items-center justify-start xl:justify-center gap-0 mx-auto"
            style={{ minWidth: 1100 }}
          >
            {/* LEFT BRANCH */}
            <BracketBranch
              round1Nodes={leftR1}
              round2Node={leftSF}
              direction="left"
            />

            {/* CENTER: FINAL */}
            <div className="flex flex-col items-center gap-3 px-4 relative">
              {/* Crown icon above Final */}
              <div className="flex flex-col items-center gap-2 mb-1">
                <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                  Chung Kết
                </div>
              </div>
              {finalNode ? (
                <MatchCard node={finalNode} isFinal />
              ) : (
                <div
                  className="flex items-center justify-center rounded-2xl border border-dashed border-amber-500/30 text-slate-500 text-xs italic bg-slate-900/40"
                  style={{ width: CARD_W, height: CARD_H + 30 }}
                >
                  Chưa có dữ liệu
                </div>
              )}
              {thirdPlaceNode && (
                <div className="mt-8 flex flex-col items-center gap-2">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Tranh Hạng 3
                  </div>
                  <MatchCard node={thirdPlaceNode} />
                </div>
              )}
            </div>

            {/* RIGHT BRANCH */}
            <BracketBranch
              round1Nodes={rightR1}
              round2Node={rightSF}
              direction="right"
            />
          </div>

          {/* ── Bracket key ─────────────────────────────── */}
          <div className="mt-8 flex justify-center">
            <div className="text-[10px] text-slate-600 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="inline-block w-5 h-px bg-slate-600" />
                Kết nối vòng đấu
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-5 h-px border-t border-dashed border-amber-500/50" />
                Người thắng tiến vào
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto w-full">
          <div className="card p-8 space-y-5 flex flex-col items-center text-center w-full border border-slate-800 bg-slate-900/30 rounded-2xl shadow-xl">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-lg shadow-amber-500/5 mb-2">
              <GitBranch className="w-8 h-8 text-amber-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-100">Khởi tạo sơ đồ Playoffs Knockout</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                Hệ thống sẽ tự động khởi tạo nhánh đấu loại trực tiếp dựa trên cấu hình hạt giống đã thiết lập trong Luật thi đấu (Ruleset) và bảng xếp hạng vòng bảng hiện tại.
              </p>
            </div>
            
            <div className="pt-4 border-t border-slate-800/60 w-full flex justify-center">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(true)}
                disabled={actionLoading}
                className="btn btn-primary flex items-center justify-center gap-2 font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-amber-500/10"
              >
                <GitBranch className="w-4 h-4" />
                Khởi tạo nhánh đấu Knockout
              </button>
            </div>
          </div>

          {seedCandidates.length > 0 && (
            <div className="w-full bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Danh sách đội đi tiếp (Hạt giống vòng bảng)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {seedCandidates.map((c) => (
                  <div key={c.teamId} className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-850 rounded-xl hover:border-slate-700 transition-colors">
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-slate-200 text-xs truncate max-w-[180px]">
                        {c.teamName || `Đội #${c.teamId.slice(0, 4)}`}
                      </span>
                      {c.teamCode && <span className="text-[10px] text-slate-500 font-mono mt-0.5">{c.teamCode}</span>}
                    </div>
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-mono font-bold">
                      {c.sourceLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmModalOpen}
        title="Khởi tạo sơ đồ Playoffs?"
        description="Hệ thống sẽ tạo bracket tự động dựa trên cấu hình hạt giống trong Luật thi đấu và bảng xếp hạng vòng bảng hiện tại. Nếu có bất kỳ đội nào được miễn đấu (Miễn đấu), họ sẽ tự động tiến vào vòng tiếp theo."
        confirmLabel="Khởi tạo"
        cancelLabel="Hủy"
        variant="warning"
        loading={actionLoading}
        onConfirm={handleGenerateBracket}
        onCancel={() => setConfirmModalOpen(false)}
      />
    </div>
  );
}
