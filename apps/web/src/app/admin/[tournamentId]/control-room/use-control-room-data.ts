'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api-client';

export interface ControlRoomMatch {
  id: string;
  status: string;
  groupId?: string | null;
  matchNo?: number | null;
  roundNo?: number | null;
  label?: string | null;
  teamA?: { name: string } | null;
  teamB?: { name: string } | null;
  group?: { code: string } | null;
}

export interface ControlRoomTeam {
  id: string;
  name?: string | null;
  code?: string | null;
  members?: unknown[] | null;
}

export interface ControlRoomGroupTeam {
  id: string;
  teamId: string;
  seedOrder?: number | null;
  team?: { name: string } | null;
}

export interface ControlRoomGroup {
  id: string;
  name?: string | null;
  code?: string | null;
  groupTeams?: ControlRoomGroupTeam[] | null;
}

export interface ControlRoomStanding {
  id?: string;
  groupId?: string | null;
  teamId?: string | null;
  rank?: number | null;
  wins?: number | null;
  losses?: number | null;
  points?: number | null;
  team?: { name: string } | null;
}

export interface ControlRoomBracketNode {
  id: string;
  roundName?: string | null;
  nodeKey?: string | null;
  sourceA?: string | null;
  sourceB?: string | null;
  teamAId?: string | null;
  teamBId?: string | null;
  teamA?: { name: string } | null;
  teamB?: { name: string } | null;
  match?: {
    status: string;
  } | null;
}

export interface ControlRoomDraw {
  id: string;
  status: string;
}

export interface ControlRoomData {
  teamDraws: ControlRoomDraw[];
  teams: ControlRoomTeam[];
  groups: ControlRoomGroup[];
  matches: ControlRoomMatch[];
  courts: unknown[];
  conflicts: unknown[];
  standings: ControlRoomStanding[];
  bracketNodes: ControlRoomBracketNode[];
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

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
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

  const [prevTournamentId, setPrevTournamentId] = useState(tournamentId);
  if (tournamentId !== prevTournamentId) {
    setPrevTournamentId(tournamentId);
    setLoading(true);
  }

  const refreshAll = useCallback(async () => {
    if (!tournamentId) {
      setData(emptyData);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const requestId = requestSeq.current + 1;
    requestSeq.current = requestId;

    // Defer state updates to avoid synchronous setState inside useEffect warning
    await Promise.resolve();

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
        teamDraws: asArray<ControlRoomDraw>(teamDraws),
        teams: asArray<ControlRoomTeam>(teams),
        groups: asArray<ControlRoomGroup>(groups),
        matches: asArray<ControlRoomMatch>(matches),
        courts: asArray<unknown>(courts),
        conflicts: asArray<unknown>(conflicts),
        standings: asArray<ControlRoomStanding>(standings),
        bracketNodes: asArray<ControlRoomBracketNode>(bracketNodes),
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
    let active = true;
    const run = async () => {
      await Promise.resolve();
      if (active) {
        void refreshAll();
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [refreshAll]);

  return {
    data,
    loading,
    refreshing,
    error,
    refreshAll,
  };
}
