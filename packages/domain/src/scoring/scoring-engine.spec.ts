import { describe, it, expect } from 'vitest';
import { ScoringEngine, MatchDomainInput, MatchSegmentDomainInput, ScoreEventDomainInput } from './scoring-engine';

describe('ScoringEngine', () => {
  const createMockMatch = (overrides?: Partial<MatchDomainInput>): MatchDomainInput => {
    const segments: MatchSegmentDomainInput[] = [
      { id: 'seg-1', segmentOrder: 0, segmentKey: 'mixed_doubles', name: 'Đôi Nam Nữ', targetScore: 8, status: 'PENDING' },
      { id: 'seg-2', segmentOrder: 1, segmentKey: 'mens_doubles', name: 'Đôi Nam', targetScore: 16, status: 'PENDING' },
      { id: 'seg-3', segmentOrder: 2, segmentKey: 'womens_doubles', name: 'Đôi Nữ', targetScore: 24, status: 'PENDING' },
    ];
    return {
      id: 'match-1',
      teamAId: 'team-a',
      teamBId: 'team-b',
      status: 'READY',
      winnerTeamId: null,
      winScore: 24,
      segments,
      scoreEvents: [],
      lineupLocked: true,
      ...overrides,
    };
  };

  it('should start with 0-0 score and LINEUP_READY or READY status depending on lock', () => {
    const match = createMockMatch({ lineupLocked: false, status: 'LINEUP_READY' });
    const state = ScoringEngine.replayState(match);
    expect(state.scoreA).toBe(0);
    expect(state.scoreB).toBe(0);
    expect(state.status).toBe('LINEUP_READY');
    expect(state.activeSegmentIndex).toBe(0);
  });

  it('should complete segment 1 when a team reaches 8, transitioning to SEGMENT_BREAK', () => {
    const match = createMockMatch();
    const events: ScoreEventDomainInput[] = [];
    
    // Simulate scoring up to 8 points for team-a
    for (let i = 1; i <= 8; i++) {
      events.push({
        id: `ev-${i}`,
        scoringTeamId: 'team-a',
        scoreAAfter: i,
        scoreBAfter: 0,
        eventNo: i,
        isUndone: false,
        segmentId: 'seg-1',
      });
    }

    match.scoreEvents = events;
    const state = ScoringEngine.replayState(match);

    expect(state.scoreA).toBe(8);
    expect(state.scoreB).toBe(0);
    expect(state.status).toBe('SEGMENT_BREAK');
    expect(state.segments[0].status).toBe('COMPLETED');
    expect(state.activeSegmentIndex).toBe(1); // Active segment is now segment 2
  });

  it('should carry over points to segment 2, ending at target 16', () => {
    const match = createMockMatch();
    const events: ScoreEventDomainInput[] = [];

    // Segment 1: Team A reaches 8, Team B has 3
    // Team A points: 1 to 8. Team B points: 3 points interspersed
    events.push(
      { id: 'e1', scoringTeamId: 'team-a', scoreAAfter: 1, scoreBAfter: 0, eventNo: 1, isUndone: false, segmentId: 'seg-1' },
      { id: 'e2', scoringTeamId: 'team-b', scoreAAfter: 1, scoreBAfter: 1, eventNo: 2, isUndone: false, segmentId: 'seg-1' },
      { id: 'e3', scoringTeamId: 'team-a', scoreAAfter: 2, scoreBAfter: 1, eventNo: 3, isUndone: false, segmentId: 'seg-1' },
      { id: 'e4', scoringTeamId: 'team-b', scoreAAfter: 2, scoreBAfter: 2, eventNo: 4, isUndone: false, segmentId: 'seg-1' },
      { id: 'e5', scoringTeamId: 'team-a', scoreAAfter: 3, scoreBAfter: 2, eventNo: 5, isUndone: false, segmentId: 'seg-1' },
      { id: 'e6', scoringTeamId: 'team-b', scoreAAfter: 3, scoreBAfter: 3, eventNo: 6, isUndone: false, segmentId: 'seg-1' },
      { id: 'e7', scoringTeamId: 'team-a', scoreAAfter: 4, scoreBAfter: 3, eventNo: 7, isUndone: false, segmentId: 'seg-1' },
      { id: 'e8', scoringTeamId: 'team-a', scoreAAfter: 5, scoreBAfter: 3, eventNo: 8, isUndone: false, segmentId: 'seg-1' },
      { id: 'e9', scoringTeamId: 'team-a', scoreAAfter: 6, scoreBAfter: 3, eventNo: 9, isUndone: false, segmentId: 'seg-1' },
      { id: 'e10', scoringTeamId: 'team-a', scoreAAfter: 7, scoreBAfter: 3, eventNo: 10, isUndone: false, segmentId: 'seg-1' },
      { id: 'e11', scoringTeamId: 'team-a', scoreAAfter: 8, scoreBAfter: 3, eventNo: 11, isUndone: false, segmentId: 'seg-1' }
    );

    // Segment 2: Starts from 8-3. Ends when either team reaches 16.
    // Team B makes a comeback and reaches 16 first!
    events.push(
      { id: 'e12', scoringTeamId: 'team-b', scoreAAfter: 8, scoreBAfter: 4, eventNo: 12, isUndone: false, segmentId: 'seg-2' },
      { id: 'e13', scoringTeamId: 'team-b', scoreAAfter: 8, scoreBAfter: 5, eventNo: 13, isUndone: false, segmentId: 'seg-2' },
      { id: 'e14', scoringTeamId: 'team-b', scoreAAfter: 8, scoreBAfter: 6, eventNo: 14, isUndone: false, segmentId: 'seg-2' },
      { id: 'e15', scoringTeamId: 'team-b', scoreAAfter: 8, scoreBAfter: 7, eventNo: 15, isUndone: false, segmentId: 'seg-2' },
      { id: 'e16', scoringTeamId: 'team-b', scoreAAfter: 8, scoreBAfter: 8, eventNo: 16, isUndone: false, segmentId: 'seg-2' },
      { id: 'e17', scoringTeamId: 'team-b', scoreAAfter: 8, scoreBAfter: 9, eventNo: 17, isUndone: false, segmentId: 'seg-2' },
      { id: 'e18', scoringTeamId: 'team-b', scoreAAfter: 8, scoreBAfter: 10, eventNo: 18, isUndone: false, segmentId: 'seg-2' },
      { id: 'e19', scoringTeamId: 'team-b', scoreAAfter: 8, scoreBAfter: 11, eventNo: 19, isUndone: false, segmentId: 'seg-2' },
      { id: 'e20', scoringTeamId: 'team-b', scoreAAfter: 8, scoreBAfter: 12, eventNo: 20, isUndone: false, segmentId: 'seg-2' },
      { id: 'e21', scoringTeamId: 'team-b', scoreAAfter: 8, scoreBAfter: 13, eventNo: 21, isUndone: false, segmentId: 'seg-2' },
      { id: 'e22', scoringTeamId: 'team-b', scoreAAfter: 8, scoreBAfter: 14, eventNo: 22, isUndone: false, segmentId: 'seg-2' },
      { id: 'e23', scoringTeamId: 'team-b', scoreAAfter: 8, scoreBAfter: 15, eventNo: 23, isUndone: false, segmentId: 'seg-2' },
      { id: 'e24', scoringTeamId: 'team-b', scoreAAfter: 8, scoreBAfter: 16, eventNo: 24, isUndone: false, segmentId: 'seg-2' }
    );

    match.scoreEvents = events;
    const state = ScoringEngine.replayState(match);

    expect(state.scoreA).toBe(8);
    expect(state.scoreB).toBe(16);
    expect(state.status).toBe('SEGMENT_BREAK');
    expect(state.segments[0].status).toBe('COMPLETED');
    expect(state.segments[1].status).toBe('COMPLETED');
    expect(state.activeSegmentIndex).toBe(2); // Next is segment 3 (activeSegmentIndex = 2)
  });

  it('should complete the match immediately when a team reaches 24', () => {
    const match = createMockMatch();
    const events: ScoreEventDomainInput[] = [];

    // Skip directly to segment 3 beginning at 8-16
    // Segment 3: starts at 8-16, Team A catches up to 24 first!
    for (let score = 9; score <= 24; score++) {
      events.push({
        id: `e3-${score}`,
        scoringTeamId: 'team-a',
        scoreAAfter: score,
        scoreBAfter: 16,
        eventNo: score,
        isUndone: false,
        segmentId: 'seg-3',
      });
    }

    match.scoreEvents = events;
    const state = ScoringEngine.replayState(match);

    expect(state.scoreA).toBe(24);
    expect(state.scoreB).toBe(16);
    expect(state.status).toBe('COMPLETED');
    expect(state.winnerTeamId).toBe('team-a');
    expect(state.segments[0].status).toBe('COMPLETED');
    expect(state.segments[1].status).toBe('COMPLETED');
    expect(state.segments[2].status).toBe('COMPLETED');
  });

  it('should rollback score and status when latest events are marked undone', () => {
    const match = createMockMatch();
    const events: ScoreEventDomainInput[] = [
      { id: 'e1', scoringTeamId: 'team-a', scoreAAfter: 1, scoreBAfter: 0, eventNo: 1, isUndone: false, segmentId: 'seg-1' },
      { id: 'e2', scoringTeamId: 'team-b', scoreAAfter: 1, scoreBAfter: 1, eventNo: 2, isUndone: false, segmentId: 'seg-1' },
      { id: 'e3', scoringTeamId: 'team-a', scoreAAfter: 2, scoreBAfter: 1, eventNo: 3, isUndone: false, segmentId: 'seg-1' },
    ];

    match.scoreEvents = events;
    let state = ScoringEngine.replayState(match);
    expect(state.scoreA).toBe(2);
    expect(state.scoreB).toBe(1);

    // Undoing event 3
    events[2].isUndone = true;
    state = ScoringEngine.replayState(match);
    expect(state.scoreA).toBe(1);
    expect(state.scoreB).toBe(1);
  });
});
