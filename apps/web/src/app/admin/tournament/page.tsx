'use client';

import { useActiveTournament } from '@/lib/use-tournament';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';

export default function TournamentSettingsPage() {
  const { tournament, loading: tLoading, reload } = useActiveTournament();
  const [name, setName] = useState('');
  const [venueName, setVenueName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

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
    setSuccess('');

    try {
      await apiFetch(`/tournaments/${tournament.id}`, {
        method: 'PATCH',
        body: {
          name,
          venueName: venueName || undefined,
        },
      });
      setSuccess('Cập nhật thông tin thành công!');
      reload();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (tLoading || !tournament) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <span className="login-spinner" style={{ width: '40px', height: '40px', borderTopColor: 'var(--brand-500)' }} />
      </div>
    );
  }

  return (
    <div className="premium-container p-6 space-y-6 max-w-2xl">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight">🏆 Thiết Lập Giải Đấu</h1>

      {success && <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">✓ {success}</div>}

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Tên giải đấu</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full premium-input"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Địa điểm tổ chức</label>
            <input
              type="text"
              value={venueName}
              onChange={e => setVenueName(e.target.value)}
              className="w-full premium-input"
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary py-2.5 w-full">
            Lưu cài đặt
          </button>
        </form>
      </div>
    </div>
  );
}
