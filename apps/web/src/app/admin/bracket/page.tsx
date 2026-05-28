'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';

export default function BracketPage() {
  const { tournament, loading: tLoading, error: tError, reload: reloadTournament } = useActiveTournament();
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadBracket = async () => {
    if (!tournament) return;
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const data = await apiFetch(`/tournaments/${tournament.id}/bracket`);
      setNodes(data);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Lỗi tải thông tin nhánh đấu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBracket();
  }, [tournament]);

  const handleGenerateBracket = async () => {
    if (!tournament) return;
    if (!confirm('Tạo nhánh đấu loại trực tiếp tự động dựa trên kết quả BXH Vòng Bảng?')) return;
    
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await apiFetch(`/tournaments/${tournament.id}/bracket/generate`, {
        method: 'POST',
      });

      setSuccess('Đã sinh thành công nhánh đấu loại trực tiếp Playoffs!');
      loadBracket();
      reloadTournament(); // Reload tournament state to sync status
    } catch (err: any) {
      setError(err.message || 'Lỗi tạo nhánh đấu.');
    } finally {
      setLoading(false);
    }
  };

  if (tLoading || loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <span className="login-spinner" style={{ width: '40px', height: '40px', borderTopColor: 'var(--brand-500)' }} />
      </div>
    );
  }

  // Group bracket nodes by roundName (Vòng Nhánh, Bán Kết, Chung Kết)
  const round1 = nodes.filter(n => n.roundName === 'Vòng Nhánh');
  const round2 = nodes.filter(n => n.roundName === 'Bán Kết');
  const round3 = nodes.filter(n => n.roundName === 'Chung Kết');

  return (
    <div className="premium-container p-6 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">🔱 Nhánh Đấu Loại Trực Tiếp</h1>
          <p className="text-xs text-slate-400 mt-1">
            Theo dõi sơ đồ thi đấu Playoffs Knockout bắt đầu từ lượt Tứ Kết/Vòng Nhánh dựa trên thứ hạng bảng.
          </p>
        </div>
        {nodes.length === 0 && (
          <button
            onClick={handleGenerateBracket}
            className="btn btn-primary"
          >
            🔱 Sinh Nhánh Đấu Playoff
          </button>
        )}
      </div>

      {error && <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">⚠️ {error}</div>}
      {success && <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">✓ {success}</div>}

      {nodes.length > 0 ? (
        <div className="overflow-x-auto py-8">
          <div className="flex items-center justify-start gap-12" style={{ minWidth: '800px' }}>
            
            {/* Round 1: Vòng Nhánh */}
            <div className="flex flex-col gap-12 w-64">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Vòng Nhánh (Tứ kết)</div>
              {round1.map(node => (
                <div key={node.id} className="card p-4 space-y-3 border-brand-500/20 bg-slate-900/40">
                  <div className="text-[10px] text-slate-500 font-mono">Node Key: {node.nodeKey}</div>
                  
                  <div className="space-y-2">
                    <div className={`p-2 rounded text-xs flex justify-between items-center ${node.match?.result?.winnerTeamId === node.teamAId && node.teamAId ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'bg-slate-850'}`}>
                      <span>{node.teamA?.name || `Nhì Bảng A (${node.sourceA})`}</span>
                      {node.match?.result && <span className="font-mono">{node.match.result.teamAScore}</span>}
                    </div>
                    <div className={`p-2 rounded text-xs flex justify-between items-center ${node.match?.result?.winnerTeamId === node.teamBId && node.teamBId ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'bg-slate-850'}`}>
                      <span>{node.teamB?.name || `Ba Bảng B (${node.sourceB})`}</span>
                      {node.match?.result && <span className="font-mono">{node.match.result.teamBScore}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Round 2: Bán Kết */}
            <div className="flex flex-col justify-around gap-16 w-64" style={{ minHeight: '350px' }}>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Bán Kết</div>
              {round2.map(node => (
                <div key={node.id} className="card p-4 space-y-3 border-brand-500/20 bg-slate-900/40">
                  <div className="text-[10px] text-slate-500 font-mono">Node Key: {node.nodeKey}</div>
                  
                  <div className="space-y-2">
                    <div className={`p-2 rounded text-xs flex justify-between items-center ${node.match?.result?.winnerTeamId === node.teamAId && node.teamAId ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'bg-slate-850'}`}>
                      <span>{node.teamA?.name || `Hạt giống (${node.sourceA})`}</span>
                      {node.match?.result && <span className="font-mono">{node.match.result.teamAScore}</span>}
                    </div>
                    <div className={`p-2 rounded text-xs flex justify-between items-center ${node.match?.result?.winnerTeamId === node.teamBId && node.teamBId ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'bg-slate-850'}`}>
                      <span>{node.teamB?.name || `Thắng ${node.sourceB}`}</span>
                      {node.match?.result && <span className="font-mono">{node.match.result.teamBScore}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Round 3: Chung Kết */}
            <div className="flex flex-col justify-center gap-12 w-64" style={{ minHeight: '350px' }}>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Chung Kết</div>
              {round3.map(node => (
                <div key={node.id} className="card p-4 space-y-3 border-brand-500/20 bg-slate-900/40">
                  <div className="text-[10px] text-slate-500 font-mono">Node Key: {node.nodeKey}</div>
                  
                  <div className="space-y-2">
                    <div className={`p-2 rounded text-xs flex justify-between items-center ${node.match?.result?.winnerTeamId === node.teamAId && node.teamAId ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'bg-slate-850'}`}>
                      <span>{node.teamA?.name || `Thắng ${node.sourceA}`}</span>
                      {node.match?.result && <span className="font-mono">{node.match.result.teamAScore}</span>}
                    </div>
                    <div className={`p-2 rounded text-xs flex justify-between items-center ${node.match?.result?.winnerTeamId === node.teamBId && node.teamBId ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'bg-slate-850'}`}>
                      <span>{node.teamB?.name || `Thắng ${node.sourceB}`}</span>
                      {node.match?.result && <span className="font-mono">{node.match.result.teamBScore}</span>}
                    </div>
                  </div>
                  
                  {node.match?.result?.winnerTeamId && (
                    <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded text-center text-xs text-amber-400 font-bold">
                      🏆 VÔ ĐỊCH: {node.match.result.winnerTeamId === node.teamAId ? node.teamA?.name : node.teamB?.name}
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        </div>
      ) : (
        <div className="card p-10 text-center text-muted italic text-sm">
          Chưa khởi tạo nhánh loại trực tiếp. Vui lòng kết thúc tất cả trận vòng bảng và bấm "Sinh Nhánh Đấu Playoff" để bắt đầu.
        </div>
      )}
    </div>
  );
}
