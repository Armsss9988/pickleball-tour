'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/components/toast';
import { PageLoading } from '@/components/loading-skeleton';
import { Settings, Save } from '@/components/icons';

export default function TournamentSettingsPage() {
  const { tournament, loading: tLoading, reload } = useActiveTournament();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [venueName, setVenueName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tournament) {
      setName(tournament.name);
      setVenueName(tournament.venueName || '');
    }
  }, [tournament]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournament) return;
    setLoading(true);

    try {
      await apiFetch(`/tournaments/${tournament.id}`, {
        method: 'PATCH',
        body: {
          name,
          venueName: venueName || undefined,
        },
      });
      toast('Cập nhật thông tin giải đấu thành công!', 'success');
      reload();
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Lỗi cập nhật thiết lập.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (tLoading || !tournament) {
    return <PageLoading />;
  }

  return (
    <div className="premium-container">
      <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader
          title="Thiết Lập Giải Đấu"
          description="Thay đổi các thông tin cơ bản của giải đấu hiện tại."
          icon={Settings}
        />

        <div className="card p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tên giải đấu</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full premium-input"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Địa điểm tổ chức</label>
              <input
                type="text"
                placeholder="VD: Sân Pickleball GOLAB"
                value={venueName}
                onChange={e => setVenueName(e.target.value)}
                className="w-full premium-input"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary py-2.5 w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Lưu cài đặt
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

