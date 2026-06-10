import { MatchStatus, SegmentStatus } from '@golab/contracts';
import { ValidationError, InvalidStateError } from '../shared/errors.base';
import { MatchDomainInput, ReplayedMatchState, ScorePointResult, MatchSegmentDomainInput, ScoreEventDomainInput } from './scoring-engine';

export interface IScoringStrategy {
  replayState(match: MatchDomainInput): ReplayedMatchState;
  applyScorePoint(match: MatchDomainInput, scoringTeamId: string): ScorePointResult;
}

export class RelayScoringStrategy implements IScoringStrategy {
  public replayState(match: MatchDomainInput): ReplayedMatchState {
    const sortedEvents = [...match.scoreEvents]
      .filter((e) => !e.isUndone)
      .sort((a, b) => a.eventNo - b.eventNo);

    const replayedSegments: MatchSegmentDomainInput[] = match.segments
      .map((s) => ({ ...s, status: 'PENDING' as SegmentStatus }))
      .sort((a, b) => a.segmentOrder - b.segmentOrder);

    let scoreA = 0;
    let scoreB = 0;
    let activeIdx = 0;

    for (const ev of sortedEvents) {
      if (activeIdx >= replayedSegments.length) {
        break;
      }

      scoreA = ev.scoreAAfter;
      scoreB = ev.scoreBAfter;

      const currentSeg = replayedSegments[activeIdx];
      if (scoreA >= currentSeg.targetScore || scoreB >= currentSeg.targetScore) {
        currentSeg.status = 'COMPLETED';
        if (activeIdx < replayedSegments.length - 1) {
          activeIdx++;
        }
      } else {
        currentSeg.status = 'RUNNING';
      }
    }

    const activeSeg = replayedSegments[activeIdx];
    if (activeSeg && activeSeg.status === 'PENDING' && sortedEvents.length > 0) {
      const hasPointsInActive = sortedEvents.some((e) => e.segmentId === activeSeg.id);
      if (hasPointsInActive) {
        activeSeg.status = 'RUNNING';
      }
    }

    let status = match.status;
    let winnerTeamId = match.winnerTeamId;

    const lastSeg = replayedSegments[replayedSegments.length - 1];
    const isLastSegCompleted = lastSeg && lastSeg.status === 'COMPLETED';

    if (isLastSegCompleted) {
      status = 'COMPLETED';
      winnerTeamId = scoreA > scoreB ? match.teamAId : match.teamBId;
    } else {
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
          status = match.lineupLocked ? 'READY' : 'LINEUP_READY';
        }
      }
    }

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

  public applyScorePoint(match: MatchDomainInput, scoringTeamId: string): ScorePointResult {
    if (
      match.status !== 'RUNNING' &&
      match.status !== 'READY' &&
      match.status !== 'LINEUP_READY'
    ) {
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

    if (scoringTeamId !== match.teamAId && scoringTeamId !== match.teamBId) {
      throw new ValidationError('Đội ghi điểm không thuộc trận đấu này.');
    }

    const currentState = this.replayState(match);
    const activeSeg = currentState.segments[currentState.activeSegmentIndex];
    if (!activeSeg) {
      throw new InvalidStateError('Không tìm thấy chặng đấu kích hoạt.');
    }

    if (activeSeg.status === 'COMPLETED') {
      throw new InvalidStateError('Chặng thi đấu hiện tại đã hoàn thành.');
    }

    let nextA = currentState.scoreA;
    let nextB = currentState.scoreB;

    if (scoringTeamId === match.teamAId) {
      nextA++;
    } else {
      nextB++;
    }

    const nextEventNo = match.scoreEvents.length + 1;
    const transitions: string[] = ['SCORE_UPDATED'];

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
}

export class SingleGameScoringStrategy implements IScoringStrategy {
  private isSetCompleted(scoreA: number, scoreB: number, targetScore: number, noDeuce: boolean, deuceMaxScore?: number | null): boolean {
    if (noDeuce) {
      return scoreA >= targetScore || scoreB >= targetScore;
    }
    const reachedTarget = scoreA >= targetScore || scoreB >= targetScore;
    const hasTwoPointsLead = Math.abs(scoreA - scoreB) >= 2;
    const reachedMaxCap = deuceMaxScore ? (scoreA >= deuceMaxScore || scoreB >= deuceMaxScore) : false;
    return (reachedTarget && hasTwoPointsLead) || reachedMaxCap;
  }

  public replayState(match: MatchDomainInput): ReplayedMatchState {
    const sortedEvents = [...match.scoreEvents]
      .filter((e) => !e.isUndone)
      .sort((a, b) => a.eventNo - b.eventNo);

    const replayedSegments: MatchSegmentDomainInput[] = match.segments
      .map((s) => ({ ...s, status: 'PENDING' as SegmentStatus }))
      .sort((a, b) => a.segmentOrder - b.segmentOrder);

    if (replayedSegments.length === 0) {
      throw new ValidationError('Không có segment nào được cấu hình cho trận đấu.');
    }

    let scoreA = 0;
    let scoreB = 0;

    for (const ev of sortedEvents) {
      scoreA = ev.scoreAAfter;
      scoreB = ev.scoreBAfter;
    }

    const singleSeg = replayedSegments[0];
    const winScore = match.winScore;
    const noDeuce = match.noDeuce ?? true;
    const deuceMaxScore = match.deuceMaxScore;

    const isCompleted = this.isSetCompleted(scoreA, scoreB, winScore, noDeuce, deuceMaxScore);

    if (isCompleted) {
      singleSeg.status = 'COMPLETED';
    } else if (sortedEvents.length > 0) {
      singleSeg.status = 'RUNNING';
    } else {
      singleSeg.status = 'PENDING';
    }

    let status = match.status;
    let winnerTeamId = match.winnerTeamId;

    if (singleSeg.status === 'COMPLETED') {
      status = 'COMPLETED';
      winnerTeamId = scoreA > scoreB ? match.teamAId : match.teamBId;
    } else {
      if (sortedEvents.length > 0) {
        status = 'RUNNING';
      } else {
        status = match.lineupLocked ? 'READY' : 'LINEUP_READY';
      }
    }

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
      activeSegmentIndex: 0,
      activeSegmentId: singleSeg.id,
      segments: replayedSegments,
    };
  }

  public applyScorePoint(match: MatchDomainInput, scoringTeamId: string): ScorePointResult {
    if (
      match.status !== 'RUNNING' &&
      match.status !== 'READY' &&
      match.status !== 'LINEUP_READY'
    ) {
      if (match.status === 'SCHEDULED' || match.status === 'LINEUP_PENDING') {
        throw new InvalidStateError('Trận đấu chưa sẵn sàng. Lineup cần được khóa trước.');
      }
      if (match.status === 'COMPLETED' || match.status === 'RESULT_CONFIRMED') {
        throw new InvalidStateError('Trận đấu đã kết thúc hoặc kết quả đã được xác nhận.');
      }
    }

    if (scoringTeamId !== match.teamAId && scoringTeamId !== match.teamBId) {
      throw new ValidationError('Đội ghi điểm không thuộc trận đấu này.');
    }

    const currentState = this.replayState(match);
    const activeSeg = currentState.segments[0];

    if (activeSeg.status === 'COMPLETED') {
      throw new InvalidStateError('Trận đấu đã hoàn thành.');
    }

    let nextA = currentState.scoreA;
    let nextB = currentState.scoreB;

    if (scoringTeamId === match.teamAId) {
      nextA++;
    } else {
      nextB++;
    }

    const nextEventNo = match.scoreEvents.length + 1;
    const transitions: string[] = ['SCORE_UPDATED'];

    const winScore = match.winScore;
    const noDeuce = match.noDeuce ?? true;
    const deuceMaxScore = match.deuceMaxScore;

    if (this.isSetCompleted(nextA, nextB, winScore, noDeuce, deuceMaxScore)) {
      transitions.push('SEGMENT_COMPLETED');
      transitions.push('MATCH_COMPLETED');
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
}

export class BestOfScoringStrategy implements IScoringStrategy {
  private isSetCompleted(scoreA: number, scoreB: number, targetScore: number, noDeuce: boolean, deuceMaxScore?: number | null): boolean {
    if (noDeuce) {
      return scoreA >= targetScore || scoreB >= targetScore;
    }
    const reachedTarget = scoreA >= targetScore || scoreB >= targetScore;
    const hasTwoPointsLead = Math.abs(scoreA - scoreB) >= 2;
    const reachedMaxCap = deuceMaxScore ? (scoreA >= deuceMaxScore || scoreB >= deuceMaxScore) : false;
    return (reachedTarget && hasTwoPointsLead) || reachedMaxCap;
  }

  public replayState(match: MatchDomainInput): ReplayedMatchState {
    const sortedEvents = [...match.scoreEvents]
      .filter((e) => !e.isUndone)
      .sort((a, b) => a.eventNo - b.eventNo);

    const replayedSegments: MatchSegmentDomainInput[] = match.segments
      .map((s) => ({ ...s, status: 'PENDING' as SegmentStatus }))
      .sort((a, b) => a.segmentOrder - b.segmentOrder);

    if (replayedSegments.length === 0) {
      throw new ValidationError('Không có set đấu nào được cấu hình cho trận đấu.');
    }

    const setsToWin = match.setsToWin ?? 2;
    const maxSets = setsToWin * 2 - 1;
    const gamePointScore = match.gamePointScore ?? 11;
    const lastSetPointScore = match.lastSetPointScore ?? gamePointScore;
    const noDeuce = match.noDeuce ?? true;
    const deuceMaxScore = match.deuceMaxScore;

    // Track state set by set
    let setsWonA = 0;
    let setsWonB = 0;
    const setScores: Array<{ a: number; b: number }> = [];

    // Helper map of segment ID to its index in replayedSegments
    const segMap = new Map<string, number>();
    replayedSegments.forEach((s, idx) => segMap.set(s.id, idx));

    // Initialize temporary scores for each set
    const tempScores = replayedSegments.map(() => ({ a: 0, b: 0 }));

    let activeIdx = 0;

    for (const ev of sortedEvents) {
      const segIdx = segMap.get(ev.segmentId);
      if (segIdx === undefined) continue;

      // Ensure we only process events for sets up to the match completion
      if (setsWonA >= setsToWin || setsWonB >= setsToWin) {
        break; 
      }

      // Ensure the events are applied to the active set or any past set
      // (sometimes in recovery or weird orders, but we assume chronological events order indexes)
      tempScores[segIdx] = { a: ev.scoreAAfter, b: ev.scoreBAfter };
      
      // Update active segment index to current segment if it's ahead
      if (segIdx > activeIdx) {
        activeIdx = segIdx;
      }

      const scoreA = tempScores[segIdx].a;
      const scoreB = tempScores[segIdx].b;

      // Determine target score for this set
      const isDecidingSet = segIdx === maxSets - 1;
      const targetScore = isDecidingSet ? lastSetPointScore : gamePointScore;

      const completed = this.isSetCompleted(scoreA, scoreB, targetScore, noDeuce, deuceMaxScore);
      if (completed) {
        replayedSegments[segIdx].status = 'COMPLETED';
        if (scoreA > scoreB) {
          setsWonA++;
        } else {
          setsWonB++;
        }
        
        // Move activeIdx forward if there is another set
        if (activeIdx === segIdx && activeIdx < replayedSegments.length - 1) {
          activeIdx++;
        }
      } else {
        replayedSegments[segIdx].status = 'RUNNING';
      }
    }

    // Set segment statuses for pending sets if we have events
    const activeSeg = replayedSegments[activeIdx];
    if (activeSeg && activeSeg.status === 'PENDING' && sortedEvents.length > 0) {
      const hasPointsInActive = sortedEvents.some((e) => e.segmentId === activeSeg.id);
      if (hasPointsInActive) {
        activeSeg.status = 'RUNNING';
      }
    }

    // Build setScores array up to active segment
    for (let i = 0; i < replayedSegments.length; i++) {
      if (replayedSegments[i].status === 'COMPLETED' || replayedSegments[i].status === 'RUNNING') {
        setScores.push({ a: tempScores[i].a, b: tempScores[i].b });
      }
    }

    let status = match.status;
    let winnerTeamId = match.winnerTeamId;

    const matchWon = setsWonA >= setsToWin || setsWonB >= setsToWin;

    if (matchWon) {
      status = 'COMPLETED';
      winnerTeamId = setsWonA > setsWonB ? match.teamAId : match.teamBId;
    } else {
      // Check segment break
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
          status = match.lineupLocked ? 'READY' : 'LINEUP_READY';
        }
      }
    }

    if (match.status === 'RESULT_CONFIRMED') {
      status = 'RESULT_CONFIRMED';
    } else if (match.status === 'CANCELLED') {
      status = 'CANCELLED';
    }

    return {
      scoreA: setsWonA,
      scoreB: setsWonB,
      status,
      winnerTeamId,
      activeSegmentIndex: activeIdx,
      activeSegmentId: activeSeg ? activeSeg.id : null,
      segments: replayedSegments,
      setsWonA,
      setsWonB,
      setScores,
    };
  }

  public applyScorePoint(match: MatchDomainInput, scoringTeamId: string): ScorePointResult {
    if (
      match.status !== 'RUNNING' &&
      match.status !== 'READY' &&
      match.status !== 'LINEUP_READY'
    ) {
      if (match.status === 'SCHEDULED' || match.status === 'LINEUP_PENDING') {
        throw new InvalidStateError('Trận đấu chưa sẵn sàng. Lineup cần được khóa trước.');
      }
      if (match.status === 'COMPLETED' || match.status === 'RESULT_CONFIRMED') {
        throw new InvalidStateError('Trận đấu đã kết thúc hoặc kết quả đã được xác nhận.');
      }
      if (match.status === 'SEGMENT_BREAK') {
        throw new InvalidStateError('Trận đấu đang ở chặng nghỉ. Bấm Bắt đầu set tiếp theo.');
      }
    }

    if (scoringTeamId !== match.teamAId && scoringTeamId !== match.teamBId) {
      throw new ValidationError('Đội ghi điểm không thuộc trận đấu này.');
    }

    const currentState = this.replayState(match);
    const activeSeg = currentState.segments[currentState.activeSegmentIndex];
    if (!activeSeg) {
      throw new InvalidStateError('Không tìm thấy set đấu kích hoạt.');
    }

    if (activeSeg.status === 'COMPLETED') {
      throw new InvalidStateError('Set đấu hiện tại đã hoàn thành.');
    }

    const setsToWin = match.setsToWin ?? 2;
    const maxSets = setsToWin * 2 - 1;
    const gamePointScore = match.gamePointScore ?? 11;
    const lastSetPointScore = match.lastSetPointScore ?? gamePointScore;
    const noDeuce = match.noDeuce ?? true;
    const deuceMaxScore = match.deuceMaxScore;

    // Find the score in the active segment
    const activeEvents = match.scoreEvents.filter(
      (e) => !e.isUndone && e.segmentId === activeSeg.id
    );
    const sortedActive = [...activeEvents].sort((a, b) => a.eventNo - b.eventNo);

    let curA = 0;
    let curB = 0;
    if (sortedActive.length > 0) {
      const lastAct = sortedActive[sortedActive.length - 1];
      curA = lastAct.scoreAAfter;
      curB = lastAct.scoreBAfter;
    }

    if (scoringTeamId === match.teamAId) {
      curA++;
    } else {
      curB++;
    }

    const nextEventNo = match.scoreEvents.length + 1;
    const transitions: string[] = ['SCORE_UPDATED'];

    const isDecidingSet = currentState.activeSegmentIndex === maxSets - 1;
    const targetScore = isDecidingSet ? lastSetPointScore : gamePointScore;

    if (this.isSetCompleted(curA, curB, targetScore, noDeuce, deuceMaxScore)) {
      transitions.push('SEGMENT_COMPLETED');
      
      // Check if match is won
      let nextSetsWonA = currentState.setsWonA ?? 0;
      let nextSetsWonB = currentState.setsWonB ?? 0;
      if (curA > curB) {
        nextSetsWonA++;
      } else {
        nextSetsWonB++;
      }

      if (nextSetsWonA >= setsToWin || nextSetsWonB >= setsToWin) {
        transitions.push('MATCH_COMPLETED');
      } else {
        transitions.push('SEGMENT_BREAK_REQUIRED');
      }
    }

    return {
      newEventPayload: {
        scoringTeamId,
        scoreAAfter: curA,
        scoreBAfter: curB,
        eventNo: nextEventNo,
        segmentId: activeSeg.id,
      },
      transitions,
    };
  }
}
