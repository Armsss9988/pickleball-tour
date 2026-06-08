import { describe, expect, it } from 'vitest';
import {
  getAssignedGroupCount,
  getLineupMatches,
  getMatchOperationCounts,
  getVenueSummary,
  groupStandingsByGroup,
} from './control-room-utils';

describe('control room utilities', () => {
  it('filters matches that need lineup operations', () => {
    const matches = [
      { id: 'm1', status: 'SCHEDULED' },
      { id: 'm2', status: 'LINEUP_PENDING' },
      { id: 'm3', status: 'LINEUP_READY' },
      { id: 'm4', status: 'READY' },
      { id: 'm5', status: 'RUNNING' },
      { id: 'm6', status: 'RESULT_CONFIRMED' },
    ];

    expect(getLineupMatches(matches).map((match) => match.id)).toEqual(['m1', 'm2', 'm3', 'm4']);
  });

  it('counts match operation states', () => {
    const counts = getMatchOperationCounts([
      { id: 'm1', status: 'LINEUP_READY' },
      { id: 'm2', status: 'READY' },
      { id: 'm3', status: 'RUNNING' },
      { id: 'm4', status: 'COMPLETED' },
      { id: 'm5', status: 'RESULT_CONFIRMED' },
    ]);

    expect(counts.total).toBe(5);
    expect(counts.lineupReady).toBe(4);
    expect(counts.scoringReady).toBe(2);
    expect(counts.completed).toBe(2);
    expect(counts.resultConfirmed).toBe(1);
  });

  it('counts persisted group assignments', () => {
    expect(getAssignedGroupCount([
      { id: 'g1', groupTeams: [{ id: 'gt1' }, { id: 'gt2' }] },
      { id: 'g2', groupTeams: [{ id: 'gt3' }] },
      { id: 'g3', groupTeams: null },
    ])).toBe(3);
  });

  it('groups standings by group id and sorts by rank', () => {
    const grouped = groupStandingsByGroup([
      { id: 's2', groupId: 'g1', rank: 2 },
      { id: 's1', groupId: 'g1', rank: 1 },
      { id: 's3', groupId: 'g2', rank: 1 },
      { id: 'sx', groupId: null, rank: 1 },
    ]);

    expect(grouped.g1.map((standing) => standing.id)).toEqual(['s1', 's2']);
    expect(grouped.g2.map((standing) => standing.id)).toEqual(['s3']);
    expect(grouped.ungrouped.map((standing) => standing.id)).toEqual(['sx']);
  });

  it('normalizes venue summary text', () => {
    expect(getVenueSummary('  Sân A,   Sân B  ')).toBe('Sân A, Sân B');
    expect(getVenueSummary(null)).toBe('Chưa thiết lập địa điểm');
    expect(getVenueSummary('')).toBe('Chưa thiết lập địa điểm');
  });
});
