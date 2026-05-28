import { MatchStatus, SegmentStatus } from '@golab/contracts';
import { ValidationError, InvalidStateError } from '../shared/errors.base';

export interface ScoreEventDomainInput {
  id: string;
  scoringTeamId: string;
  scoreAAfter: number;
  scoreBAfter: number;
  eventNo: number;
  isUndone: boolean;
  segmentId: string;
}

export interface MatchSegmentDomainInput {
  id: string;
  segmentOrder: number;
  segmentKey: string;
  name: string;
  targetScore: number;
  status: SegmentStatus;
}

export interface MatchDomainInput {
  id: string;
  teamAId: string;
  teamBId: string;
  status: MatchStatus;
  winnerTeamId: string | null;
  winScore: number; // e.g. 24
  segments: MatchSegmentDomainInput[];
  scoreEvents: ScoreEventDomainInput[];
  lineupLocked: boolean;
}

export interface ReplayedMatchState {
  scoreA: number;
  scoreB: number;
  status: MatchStatus;
  winnerTeamId: string | null;
  activeSegmentIndex: number;
  activeSegmentId: string | null;
  segments: MatchSegmentDomainInput[];
}

export interface ScorePointResult {
  newEventPayload: {
    scoringTeamId: string;
    scoreAAfter: number;
    scoreBAfter: number;
    eventNo: number;
    segmentId: string;
  };
  transitions: string[];
}

export class ScoringEngine {
  /**
   * Replays all score events from scratch to calculate the current state of a match.
   */
  public static replayState(match: MatchDomainInput): ReplayedMatchState {
    const sortedEvents = [...match.scoreEvents]
      .filter((e) => !e.isUndone)
      .sort((a, b) => a.eventNo - b.eventNo);

    // Deep copy segments to replay their status
    const replayedSegments: MatchSegmentDomainInput[] = match.segments
      .map((s) => ({ ...s, status: 'PENDING' as SegmentStatus }))
      .sort((a, b) => a.segmentOrder - b.segmentOrder);

    let scoreA = 0;
    let scoreB = 0;
    let activeIdx = 0;

    for (const ev of sortedEvents) {
      if (activeIdx >= replayedSegments.length) {
        break; // Guard against events after match completes
      }

      scoreA = ev.scoreAAfter;
      scoreB = ev.scoreBAfter;

      const currentSeg = replayedSegments[activeIdx];
      
      // If either team reaches the target score of the current segment, it completes
      if (scoreA >= currentSeg.targetScore || scoreB >= currentSeg.targetScore) {
        currentSeg.status = 'COMPLETED';
        if (activeIdx < replayedSegments.length - 1) {
          activeIdx++;
        }
      } else {
        currentSeg.status = 'RUNNING';
      }
    }

    // Set current active segment status to RUNNING if we have points in it
    const activeSeg = replayedSegments[activeIdx];
    if (activeSeg && activeSeg.status === 'PENDING' && sortedEvents.length > 0) {
      // Find if there are points for the current segment
      const hasPointsInActive = sortedEvents.some(e => e.segmentId === activeSeg.id);
      if (hasPointsInActive) {
        activeSeg.status = 'RUNNING';
      }
    }

    // Determine match status and active segment index/ID
    let status = match.status;
    let winnerTeamId = match.winnerTeamId;

    // Check if the last segment is completed
    const lastSeg = replayedSegments[replayedSegments.length - 1];
    const isLastSegCompleted = lastSeg && lastSeg.status === 'COMPLETED';

    if (isLastSegCompleted) {
      status = 'COMPLETED';
      winnerTeamId = scoreA > scoreB ? match.teamAId : match.teamBId;
    } else {
      // Check if we are in a segment break (i.e. previous segment completed, but current active one is still PENDING)
      const prevSeg = activeIdx > 0 ? replayedSegments[activeIdx - 1] : null;
      const isPrevSegCompleted = prevSeg && prevSeg.status === 'COMPLETED';
      const isActiveSegPending = activeSeg && activeSeg.status === 'PENDING';

      if (isPrevSegCompleted && isActiveSegPending) {
        status = 'SEGMENT_BREAK';
      } else {
        if (sortedEvents.length > 0) {
          status = 'RUNNING';
          if (activeSeg) activeSeg.status = 'RUNNING';
        } else {
          // No events recorded yet
          status = match.lineupLocked ? 'READY' : 'LINEUP_READY';
        }
      }
    }

    // If the match status was already result confirmed, preserve it
    if (match.status === 'RESULT_CONFIRMED') {
      status = 'RESULT_CONFIRMED';
    } else if (match.status === 'CANCELLED') {
      status = 'CANCELLED';
    }

    return {
      scoreA,
      scoreB,
      status,
      winnerTeamId,
      activeSegmentIndex: activeIdx,
      activeSegmentId: activeSeg ? activeSeg.id : null,
      segments: replayedSegments,
    };
  }

  /**
   * Calculates the next point score event and returns the changes.
   */
  public static applyScorePoint(
    match: MatchDomainInput,
    scoringTeamId: string
  ): ScorePointResult {
    // 1. Guard matches
    if (
      match.status !== 'RUNNING' &&
      match.status !== 'READY' &&
      match.status !== 'LINEUP_READY' // Some flexibility in dev or scorer bypass
    ) {
      // If we are scheduled, let's start it.
      if (match.status === 'SCHEDULED' || match.status === 'LINEUP_PENDING') {
        throw new InvalidStateError('Trận đấu chưa sẵn sàng. Lineup cần được khóa trước.');
      }
      if (match.status === 'COMPLETED' || match.status === 'RESULT_CONFIRMED') {
        throw new InvalidStateError('Trận đấu đã kết thúc hoặc kết quả đã được xác nhận.');
      }
      if (match.status === 'SEGMENT_BREAK') {
        throw new InvalidStateError('Trận đấu đang ở chặng nghỉ. Bấm Bắt đầu chặng tiếp theo.');
      }
    }

    // 2. Validate scoring team ID
    if (scoringTeamId !== match.teamAId && scoringTeamId !== match.teamBId) {
      throw new ValidationError('Đội ghi điểm không thuộc trận đấu này.');
    }

    // 3. Replay current state
    const currentState = this.replayState(match);

    const activeSeg = currentState.segments[currentState.activeSegmentIndex];
    if (!activeSeg) {
      throw new InvalidStateError('Không tìm thấy chặng đấu kích hoạt.');
    }

    // If the active segment is already completed, score cannot be added
    if (activeSeg.status === 'COMPLETED') {
      throw new InvalidStateError('Chặng thi đấu hiện tại đã hoàn thành.');
    }

    // Calculate next score
    let nextA = currentState.scoreA;
    let nextB = currentState.scoreB;

    if (scoringTeamId === match.teamAId) {
      nextA++;
    } else {
      nextB++;
    }

    const nextEventNo = match.scoreEvents.filter((e) => !e.isUndone).length + 1;

    const transitions: string[] = ['SCORE_UPDATED'];

    // Check if segment targets met
    if (nextA >= activeSeg.targetScore || nextB >= activeSeg.targetScore) {
      transitions.push('SEGMENT_COMPLETED');
      if (activeSeg.targetScore === match.winScore) {
        transitions.push('MATCH_COMPLETED');
      } else {
        transitions.push('SEGMENT_BREAK_REQUIRED');
      }
    }

    return {
      newEventPayload: {
        scoringTeamId,
        scoreAAfter: nextA,
        scoreBAfter: nextB,
        eventNo: nextEventNo,
        segmentId: activeSeg.id,
      },
      transitions,
    };
  }

  /**
   * Verifies if the latest score event can be undone.
   */
  public static canUndo(match: MatchDomainInput): boolean {
    if (match.status === 'RESULT_CONFIRMED') {
      return false; // Cannot undo confirmed results
    }
    const activeEvents = match.scoreEvents.filter((e) => !e.isUndone);
    return activeEvents.length > 0;
  }
}
