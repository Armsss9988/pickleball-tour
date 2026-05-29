'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading-skeleton';
import { GitBranch, Trophy, AlertTriangle, CheckCircle2, ChevronRight } from '@/components/icons';

export default function BracketPage() {
  const { tournament, loading: tLoading, reload: reloadTournament } = useActiveTournament();
  const { toast } = useToast();
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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

  useEffect(() => {
    loadBracket();
  }, [tournament]);

  const handleGenerateBracket = async () => {
    if (!tournament) return;
    setActionLoading(true);

    try {
      await apiFetch(`/tournaments/${tournament.id}/bracket/generate`, {
        method: 'POST',
      });

      toast('Đã sinh thành công nhánh đấu loại trực tiếp Playoffs!', 'success');
      setConfirmModalOpen(false);
      loadBracket();
      reloadTournament();
    } catch (err: any) {
      toast(err.message || 'Lỗi tạo nhánh đấu.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (tLoading || (loading && nodes.length === 0)) {
    return <PageLoading />;
  }

  const round1 = nodes.filter(n => n.roundName === 'Vòng Nhánh');
  const round2 = nodes.filter(n => n.roundName === 'Bán Kết');
  const round3 = nodes.filter(n => n.roundName === 'Chung Kết');

  return (
    <div className="premium-container space-y-6 animate-scale-in">
      <PageHeader
        title="Nhánh Đấu Loại Trực Tiếp"
        description="Sơ đồ thi đấu Playoffs Knockout bắt đầu từ lượt Tứ Kết/Vòng Nhánh dựa trên thứ hạng vòng bảng."
        icon={GitBranch}
        actions={
          nodes.length === 0 && (
            <button
              onClick={() => setConfirmModalOpen(true)}
              className="btn btn-primary flex items-center gap-2 font-semibold"
              disabled={actionLoading}
            >
              <GitBranch className="w-4 h-4" />
              Sinh Nhánh Đấu Playoff
            </button>
          )
        }
      />

      {nodes.length > 0 ? (
        <div className="overflow-x-auto py-8 bg-slate-900/10 rounded-3xl border border-slate-800 shadow-inner px-6 scrollbar-thin">
          <div className="flex items-center justify-start gap-12" style={{ minWidth: '800px' }}>
            
            {/* Round 1: Vòng Nhánh */}
            <div className="flex flex-col gap-10 w-64">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center border-b border-slate-850 pb-2 flex items-center justify-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
                Vòng Nhánh (Tứ kết)
              </div>
              {round1.map(node => (
                <div key={node.id} className="card p-4 space-y-3 bg-slate-900/60 border-slate-800 hover:border-slate-700 transition-colors shadow-lg">
                  <div className="text-[9px] text-slate-500 font-mono tracking-wider">CODE: #{node.nodeKey}</div>
                  
                  <div className="space-y-2">
                    <div className={`p-2 rounded-xl text-xs flex justify-between items-center ${node.match?.result?.winnerTeamId === node.teamAId && node.teamAId ? 'bg-emerald-500/10 text-emerald-450 font-bold border border-emerald-500/20' : 'bg-slate-800/40 text-slate-300'}`}>
                      <span className="truncate max-w-[150px]">{node.teamA?.name || `Nhì Bảng A (${node.sourceA})`}</span>
                      {node.match?.result && <span className="font-mono text-[13px]">{node.match.result.teamAScore}</span>}
                    </div>
                    <div className={`p-2 rounded-xl text-xs flex justify-between items-center ${node.match?.result?.winnerTeamId === node.teamBId && node.teamBId ? 'bg-emerald-500/10 text-emerald-450 font-bold border border-emerald-500/20' : 'bg-slate-800/40 text-slate-300'}`}>
                      <span className="truncate max-w-[150px]">{node.teamB?.name || `Ba Bảng B (${node.sourceB})`}</span>
                      {node.match?.result && <span className="font-mono text-[13px]">{node.match.result.teamBScore}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Round 2: Bán Kết */}
            <div className="flex flex-col justify-around gap-16 w-64" style={{ minHeight: '380px' }}>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center border-b border-slate-850 pb-2 flex items-center justify-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
                Bán Kết
              </div>
              {round2.map(node => (
                <div key={node.id} className="card p-4 space-y-3 bg-slate-900/60 border-slate-800 hover:border-slate-700 transition-colors shadow-lg">
                  <div className="text-[9px] text-slate-500 font-mono tracking-wider">CODE: #{node.nodeKey}</div>
                  
                  <div className="space-y-2">
                    <div className={`p-2 rounded-xl text-xs flex justify-between items-center ${node.match?.result?.winnerTeamId === node.teamAId && node.teamAId ? 'bg-emerald-500/10 text-emerald-450 font-bold border border-emerald-500/20' : 'bg-slate-800/40 text-slate-300'}`}>
                      <span className="truncate max-w-[150px]">{node.teamA?.name || `Hạt giống (${node.sourceA})`}</span>
                      {node.match?.result && <span className="font-mono text-[13px]">{node.match.result.teamAScore}</span>}
                    </div>
                    <div className={`p-2 rounded-xl text-xs flex justify-between items-center ${node.match?.result?.winnerTeamId === node.teamBId && node.teamBId ? 'bg-emerald-500/10 text-emerald-450 font-bold border border-emerald-500/20' : 'bg-slate-800/40 text-slate-300'}`}>
                      <span className="truncate max-w-[150px]">{node.teamB?.name || `Thắng ${node.sourceB}`}</span>
                      {node.match?.result && <span className="font-mono text-[13px]">{node.match.result.teamBScore}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Round 3: Chung Kết */}
            <div className="flex flex-col justify-center gap-12 w-64" style={{ minHeight: '380px' }}>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center border-b border-slate-850 pb-2 flex items-center justify-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
                Chung Kết
              </div>
              {round3.map(node => (
                <div key={node.id} className="card p-4 space-y-4 bg-slate-900/60 border-slate-800 hover:border-slate-700 transition-colors shadow-lg">
                  <div className="text-[9px] text-slate-500 font-mono tracking-wider">CODE: #{node.nodeKey}</div>
                  
                  <div className="space-y-2">
                    <div className={`p-2 rounded-xl text-xs flex justify-between items-center ${node.match?.result?.winnerTeamId === node.teamAId && node.teamAId ? 'bg-emerald-500/10 text-emerald-450 font-bold border border-emerald-500/20' : 'bg-slate-800/40 text-slate-300'}`}>
                      <span className="truncate max-w-[150px]">{node.teamA?.name || `Thắng ${node.sourceA}`}</span>
                      {node.match?.result && <span className="font-mono text-[13px]">{node.match.result.teamAScore}</span>}
                    </div>
                    <div className={`p-2 rounded-xl text-xs flex justify-between items-center ${node.match?.result?.winnerTeamId === node.teamBId && node.teamBId ? 'bg-emerald-500/10 text-emerald-450 font-bold border border-emerald-500/20' : 'bg-slate-800/40 text-slate-300'}`}>
                      <span className="truncate max-w-[150px]">{node.teamB?.name || `Thắng ${node.sourceB}`}</span>
                      {node.match?.result && <span className="font-mono text-[13px]">{node.match.result.teamBScore}</span>}
                    </div>
                  </div>
                  
                  {node.match?.result?.winnerTeamId && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center text-xs text-amber-400 font-bold flex items-center justify-center gap-2 animate-glow-pulse">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      VÔ ĐỊCH: {node.match.result.winnerTeamId === node.teamAId ? node.teamA?.name : node.teamB?.name}
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        </div>
      ) : (
        <EmptyState
          icon={GitBranch}
          title="Chưa khởi tạo sơ đồ Playoffs"
          description="Vui lòng kết thúc tất cả trận đấu vòng bảng và bấm nút 'Sinh Nhánh Đấu Playoff' ở trên để tiến hành ghép cặp thi đấu loại trực tiếp."
        />
      )}

      {/* Confirm Generate Bracket Modal */}
      <ConfirmModal
        open={confirmModalOpen}
        title="Sinh sơ đồ Playoffs tự động?"
        description="Hệ thống sẽ dựa trên BXH Vòng Bảng hiện tại để tự động lập nhánh Playoffs Knockout cho 8 đội. Hãy đảm bảo mọi kết quả vòng bảng đã được BTC xác nhận chính thức!"
        confirmLabel="Sinh Bracket"
        cancelLabel="Hủy"
        variant="warning"
        loading={actionLoading}
        onConfirm={handleGenerateBracket}
        onCancel={() => setConfirmModalOpen(false)}
      />
    </div>
  );
}

