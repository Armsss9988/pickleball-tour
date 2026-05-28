'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading-skeleton';
import { EmptyState } from '@/components/empty-state';
import { ClipboardList, Shield, Clock } from '@/components/icons';

export default function AuditPage() {
  const { tournament, loading: tLoading } = useActiveTournament();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="premium-container space-y-6 animate-scale-in">
      <PageHeader
        title="Nhật Ký Hoạt Động"
        description="Ghi nhận lịch sử thao tác hệ thống, cấu hình giải đấu và can thiệp điểm số từ ban tổ chức."
        icon={Shield}
      />
      
      <div className="card p-6 shadow-xl">
        <h3 className="font-bold text-base text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
          <ClipboardList className="w-5 h-5 text-amber-500" />
          Nhật ký hệ thống ({logs.length})
        </h3>

        {logs.length > 0 ? (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {logs.map(log => (
              <div key={log.id} className="p-3.5 bg-slate-900/40 border border-slate-800 rounded-xl text-xs flex justify-between items-center hover:bg-slate-900/60 transition-colors">
                <div className="space-y-1.5 flex-1">
                  <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-slate-850 text-amber-400 border border-slate-800 text-[10px] font-mono">
                      {log.action}
                    </span>
                    <span className="text-slate-405 font-medium text-xs">
                      {log.entityType}
                    </span>
                  </div>
                  <div className="text-slate-450 text-[11px]">
                    ID đối tượng: <span className="font-mono text-slate-350">{log.entityId}</span>
                  </div>
                  {log.beforeData && (
                    <div className="text-[10px] text-slate-500 font-mono bg-slate-950 p-2 rounded-lg border border-slate-900 max-w-2xl truncate mt-1">
                      Payload: {JSON.stringify(log.afterData || log.beforeData)}
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 text-right flex items-center gap-1.5 min-w-[130px] justify-end">
                  <Clock className="w-3.5 h-3.5 text-slate-600" />
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="Chưa ghi nhận hoạt động nào"
            description="Mọi thao tác thay đổi trạng thái giải, bốc thăm hoặc điều khiển điểm số sẽ xuất hiện tại đây."
          />
        )}
      </div>
    </div>
  );
}

