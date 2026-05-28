'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';

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

  if (tLoading || loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <span className="login-spinner" style={{ width: '40px', height: '40px', borderTopColor: 'var(--brand-500)' }} />
      </div>
    );
  }

  return (
    <div className="premium-container p-6 space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight">📋 Nhật Ký Hoạt Động (Audit Logs)</h1>
      
      <div className="card p-6">
        {logs.length > 0 ? (
          <div className="space-y-3">
            {logs.map(log => (
              <div key={log.id} className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl text-xs flex justify-between items-center">
                <div className="space-y-1">
                  <div className="font-bold text-slate-200">
                    Hành động: {log.action}
                  </div>
                  <div className="text-slate-400">
                    Đối tượng: {log.entityType} ({log.entityId})
                  </div>
                  {log.beforeData && (
                    <div className="text-[10px] text-slate-500 font-mono">
                      Payload: {JSON.stringify(log.afterData || log.beforeData)}
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 text-right">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted italic text-center py-6 text-sm">Chưa ghi nhận hoạt động nào.</p>
        )}
      </div>
    </div>
  );
}
