import { MatchStatus, SegmentStatus } from '@golab/contracts';
import { ValidationError, InvalidStateError } from '../shared/errors.base';
import { RelayScoringStrategy, SingleGameScoringStrategy, BestOfScoringStrategy, IScoringStrategy } from './scoring-strategy';

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
  matchFormat?: string | null;
  gamePointScore?: number | null;
  setsToWin?: number | null;
  lastSetPointScore?: number | null;
  deuceMaxScore?: number | null;
  noDeuce?: boolean | null;
}

export interface ReplayedMatchState {
  scoreA: number;
  scoreB: number;
  status: MatchStatus;
  winnerTeamId: string | null;
  activeSegmentIndex: number;
  activeSegmentId: string | null;
  segments: MatchSegmentDomainInput[];
  setsWonA?: number;
  setsWonB?: number;
  setScores?: Array<{ a: number; b: number }>;
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
  private static getStrategy(format?: string | null): IScoringStrategy {
    const fmt = format ?? 'relay';
    if (fmt === 'single_game') {
      return new SingleGameScoringStrategy();
    }
    if (fmt === 'best_of') {
      return new BestOfScoringStrategy();
    }
    return new RelayScoringStrategy();
  }

  /**
   * Replays all score events from scratch to calculate the current state of a match.
   */
  public static replayState(match: MatchDomainInput): ReplayedMatchState {
    const strategy = this.getStrategy(match.matchFormat);
    return strategy.replayState(match);
  }

  /**
   * Calculates the next point score event and returns the changes.
   */
  public static applyScorePoint(
    match: MatchDomainInput,
    scoringTeamId: string
  ): ScorePointResult {
    const strategy = this.getStrategy(match.matchFormat);
    return strategy.applyScorePoint(match, scoringTeamId);
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
