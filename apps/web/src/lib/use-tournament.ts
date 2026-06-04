'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from './api-client';
import type { AppRole } from './tournament-ux-policy';

export interface Tournament {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  venueName: string | null;
  status: string;
  publicEnabled: boolean;
  rulesetId: string | null;
  openingTime: string | null;
  registrationDeadline: string | null;
  ruleset?: any;
}

async function fetchTournamentForRole(tournamentId: string, role: AppRole) {
  if (role === 'guest') {
    return apiFetch(`/public/tournaments/by-id/${tournamentId}`);
  }

  return apiFetch(`/tournaments/${tournamentId}`);
}

export function useActiveTournament(role: AppRole = 'guest') {
  const params = useParams();
  const tournamentId = params?.tournamentId as string | undefined;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrCreate = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (tournamentId) {
        // Fetch specific tournament by ID
        const fullDetails = await fetchTournamentForRole(tournamentId, role);
        setTournament(fullDetails);
      } else if (role === 'guest') {
        setTournament(null);
      } else {
        // Fallback for non-dynamic paths: Fetch first tournament or auto-create default
        const tournaments = await apiFetch('/tournaments');

        if (tournaments && tournaments.length > 0) {
          const fullDetails = await apiFetch(`/tournaments/${tournaments[0].id}`);
          setTournament(fullDetails);
        } else {
          const defaultPayload = {
            name: 'Giải Pickleball Đồng Đội Cúp GOLAB Lần 2',
            slug: 'cup-golab-lan-2',
            description: 'Giải Pickleball đồng đội Cúp Golab lần 2 - Đường đua tiếp sức đoàn kết. Thể thức tiếp tiếp sức chạm 24 liên tục cực kỳ độc đáo và gay cấn, đòi hỏi sự phối hợp chiến thuật đỉnh cao.',
            venueName: 'Cụm sân Pickleball Hùng Hà, TP. Hồ Chí Minh',
            openingTime: new Date('2026-06-14T08:00:00Z').toISOString(),
            registrationDeadline: new Date('2026-06-10T18:00:00Z').toISOString(),
            publicEnabled: true,
          };

          const created = await apiFetch('/tournaments', {
            method: 'POST',
            body: defaultPayload,
          });

          const fullDetails = await apiFetch(`/tournaments/${created.id}`);
          setTournament(fullDetails);
        }
      }
    } catch (err: any) {
      console.error('Failed to load active tournament:', err);
      setError(err.message || 'Lỗi tải thông tin giải đấu.');
    } finally {
      setLoading(false);
    }
  }, [role, tournamentId]);

  useEffect(() => {
    loadOrCreate();
  }, [loadOrCreate]);

  return { tournament, loading, error, reload: loadOrCreate, setTournament };
}
