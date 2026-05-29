'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading-skeleton';
import { EmptyState } from '@/components/empty-state';
import { ClipboardList, Shield, Clock, AlertTriangle, Filter } from '@/components/icons';

const SENSITIVE_ACTIONS = [
  'MATCH_RESULT_OVERRIDDEN',
  'MATCH_DELETED',
  'TEAM_MEMBER_REPLACED',
  'PLAYER_EMERGENCY_ADDED',
  'SCORE_EVENT_UNDONE',
  'TOURNAMENT_PUBLISHED',
  'TOURNAMENT_UNPUBLISHED',
];

export default function AuditPage() {
  const { tournament, loading: tLoading } = useActiveTournament();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'sensitive'>('all');

  useEffect(() => {
    async function loadLogs() {
      try {
        setLoading(true);
        const data = await apiFetch('/audit-logs');
        setLogs(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, [tournament]);

  if (tLoading || (loading && logs.length === 0)) {
    return <PageLoading />;
  }

  const filteredLogs = logs.filter(log => {
    if (filterMode === 'sensitive') {
      return SENSITIVE_ACTIONS.includes(log.action);
    }
    return true;
  });

  return (
    <div className="premium-container space-y-6 animate-scale-in">
      <PageHeader
        title="Nhật Ký Hoạt Động"
        description="Ghi nhận lịch sử thao tác hệ thống, cấu hình giải đấu và can thiệp điểm số từ ban tổ chức."
        icon={Shield}
      />
      
      <div className="card p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-amber-500" />
            Nhật ký hệ thống ({filteredLogs.length})
          </h3>

          {/* Filter Bar */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterMode === 'all'
                  ? 'bg-slate-800 text-slate-200 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-250'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilterMode('sensitive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 border ${
                filterMode === 'sensitive'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'text-slate-400 hover:text-slate-250 border-transparent'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              Thao tác nhạy cảm
            </button>
          </div>
        </div>

        {filteredLogs.length > 0 ? (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredLogs.map(log => {
              const isSensitive = SENSITIVE_ACTIONS.includes(log.action);
              return (
                <div
                  key={log.id}
                  className={`p-3.5 rounded-xl text-xs flex justify-between items-center transition-colors border ${
                    isSensitive
                      ? 'bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/8'
                      : 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                    <div className="font-bold text-slate-200 text-sm flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono ${
                        isSensitive
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-slate-850 text-amber-400 border-slate-800'
                      }`}>
                        {log.action}
                      </span>
                      <span className="text-slate-400 font-medium text-xs">
                        {log.entityType}
                      </span>
                      {isSensitive && (
                        <span className="text-[9px] bg-rose-500/20 text-rose-300 font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5 border border-rose-500/10">
                          ⚠️ Nhạy cảm
                        </span>
                      )}
                    </div>
                    
                    {/* Display message based on entity details */}
                    <div className="text-slate-450 text-[11px] font-medium leading-relaxed">
                      ID đối tượng: <span className="font-mono text-slate-300">{log.entityId}</span>
                      {log.afterData?.reason && (
                        <span className="block text-slate-350 mt-1 italic">
                          Lý do: &quot;{log.afterData.reason}&quot;
                        </span>
                      )}
                    </div>

                    {log.beforeData && (
                      <div className="text-[10px] text-slate-500 font-mono bg-slate-950 p-2 rounded-lg border border-slate-900 max-w-2xl truncate mt-1">
                        Dữ liệu: {JSON.stringify(log.afterData || log.beforeData)}
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 text-right flex items-center gap-1.5 min-w-[130px] justify-end flex-shrink-0">
                    <Clock className="w-3.5 h-3.5 text-slate-600" />
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title={filterMode === 'sensitive' ? "Không có thao tác nhạy cảm" : "Chưa ghi nhận hoạt động nào"}
            description="Mọi thao tác thay đổi trạng thái giải, bốc thăm hoặc điều khiển điểm số sẽ xuất hiện tại đây."
          />
        )}
      </div>
    </div>
  );
}
