'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api-client';

export interface ControlRoomData {
  teamDraws: any[];
  teams: any[];
  groups: any[];
  matches: any[];
  courts: any[];
  conflicts: any[];
  standings: any[];
  bracketNodes: any[];
}

const emptyData: ControlRoomData = {
  teamDraws: [],
  teams: [],
  groups: [],
  matches: [],
  courts: [],
  conflicts: [],
  standings: [],
  bracketNodes: [],
};

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Không thể tải dữ liệu bàn điều phối.';
}

export function useControlRoomData(
  tournamentId: string | null | undefined,
  reloadTournament: () => Promise<void> | void,
) {
  const [data, setData] = useState<ControlRoomData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const refreshAll = useCallback(async () => {
    if (!tournamentId) {
      setData(emptyData);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const requestId = requestSeq.current + 1;
    requestSeq.current = requestId;
    setRefreshing(true);
    setError(null);

    try {
      const [
        teamDraws,
        teams,
        groups,
        matches,
        courts,
        conflicts,
        standings,
        bracketNodes,
      ] = await Promise.all([
        apiFetch(`/tournaments/${tournamentId}/team-draws`).catch(() => []),
        apiFetch(`/tournaments/${tournamentId}/teams`).catch(() => []),
        apiFetch(`/tournaments/${tournamentId}/groups`).catch(() => []),
        apiFetch(`/tournaments/${tournamentId}/matches`).catch(() => []),
        apiFetch(`/tournaments/${tournamentId}/courts`).catch(() => []),
        apiFetch(`/tournaments/${tournamentId}/courts/conflicts`).catch(() => []),
        apiFetch(`/tournaments/${tournamentId}/standings`).catch(() => []),
        apiFetch(`/tournaments/${tournamentId}/bracket`).catch(() => []),
      ]);

      if (requestSeq.current !== requestId) {
        return;
      }

      setData({
        teamDraws: asArray(teamDraws),
        teams: asArray(teams),
        groups: asArray(groups),
        matches: asArray(matches),
        courts: asArray(courts),
        conflicts: asArray(conflicts),
        standings: asArray(standings),
        bracketNodes: asArray(bracketNodes),
      });

      await reloadTournament();
    } catch (loadError) {
      if (requestSeq.current === requestId) {
        setError(getErrorMessage(loadError));
      }
    } finally {
      if (requestSeq.current === requestId) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [reloadTournament, tournamentId]);

  useEffect(() => {
    setLoading(true);
    void refreshAll();
  }, [refreshAll]);

  return {
    data,
    loading,
    refreshing,
    error,
    refreshAll,
  };
}
