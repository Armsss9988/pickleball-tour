/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'super_admin' | 'organizer' | 'operator' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Athlete {
  id: string;
  fullName: string;
  gender?: 'Nam' | 'Nữ' | 'Khác' | '';
  phone?: string;
  club?: string;
  skillLevel?: string;
  note?: string;
  status: 'registered' | 'assigned' | 'inactive';
  futureUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RulesetConfig {
  team: {
    count: number;             // e.g. 8 teams
    size: number;              // e.g. 5 members per team
    composition: {
      male: number;            // e.g. 3 males (0 to skip check)
      female: number;          // e.g. 2 females (0 to skip check)
    };
    allPlayersMustPlay: boolean; // e.g. true (TẤT CẢ thành viên phải ra sân ít nhất 1 lần)
    playerLimits: {
      male: { min: number; max: number }; // e.g. { min: 0, max: 1 } (Nam max 1 chặng)
      female: { min: number; max: number }; // e.g. { min: 0, max: 2 } (Nữ max 2 chặng)
    };
  };
  players: {
    requiredTotal: number;     // e.g. 40 players
    requiredGenderCount: {
      male: number;            // e.g. 24 males (0 to skip check)
      female: number;          // e.g. 16 females (0 to skip check)
    };
  };
  groups: {
    count: number;             // e.g. 2 groups
    teamsPerGroup: number;     // e.g. 4 teams per group
    names: string[];           // e.g. ["Bảng A", "Bảng B"]
  };
  stage: {
    groupStage: {
      format: 'single_round_robin';
      qualifyPerGroup: number; // e.g. 3 teams
      rankingRules: ('wins' | 'diff' | 'headToHead' | 'name')[]; // Tie-breaker ordering
    };
    knockout: {
      qualifiedTeams: number;  // e.g. 6 qualified teams
      byeSeeds: string[];      // e.g. ["A1", "B1"] (Get direct entry to semi-finals)
      thirdPlace: 'co_third' | 'play_off';
    };
  };
  match: {
    type: 'relay' | 'standard';
    winScore: number;          // e.g. 24 points to win
    winBy: number;             // e.g. 0 (no win by two)
    inheritScore: boolean;     // e.g. true (score inherits from previous chặng)
    drawOrder: boolean;        // e.g. true (cho phép bốc thăm thứ tự chặng)
    sideSwitchAfterSegments: number[]; // e.g. [1, 2] (Switch sides after segment 1 and 2)
    contents: {
      key: SegmentKey;
      name: string;
      requiredPlayers: {
        male: number;
        female: number;
      };
    }[];
    segmentTargetsByOrder: number[]; // e.g. [8, 16, 24]
    forbiddenOverlap: SegmentKey[][]; // e.g. [['mens_doubles', 'mixed_doubles']] (Cấm trùng Nam chặng đôi nam & nam nữ)
  };
}

export interface ScoringConfig {
  pointsForWin: number;
  pointsForLoss: number;
  pointsForDraw: number;
  tieBreakers: ('wins' | 'diff' | 'for' | 'headToHead' | 'name')[];
}

export interface Tournament {
  id: string;
  name: string;
  slug: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
  rules: string;
  status: 'draft' | 'published' | 'ongoing' | 'completed';
  scoringConfig: ScoringConfig;
  rulesetConfig: RulesetConfig; // Flex system ruleset
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  tournamentId: string;
  name: string;
  code: string;
  captainAthleteId?: string | null;
  groupId?: string | null;
  seed?: string | null;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  athleteId: string;
  role: 'captain' | 'member';
  createdAt: string;
}

export interface Group {
  id: string;
  tournamentId: string;
  name: string; // e.g. "Bảng A", "Bảng B"
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  manualRanking?: string[];
  manualRankingReason?: string;
}

export type SegmentKey = 'mens_doubles' | 'womens_doubles' | 'mixed_doubles';

export interface MatchSegment {
  id: string;
  segmentKey: SegmentKey;
  name: string;            // "Đôi Nam", "Đôi Nữ", "Đôi Nam Nữ"
  segmentOrder: number;    // 1, 2, 3
  targetScore: number;     // 8, 16, 24
  status: 'pending' | 'running' | 'completed';
  playerIdsA: string[];   // Assigned VĐV ids from Team A
  playerIdsB: string[];   // Assigned VĐV ids from Team B
  scoreAAtEnd?: number;
  scoreBAtEnd?: number;
}

export interface ScoreEvent {
  id: string;
  eventNo: number;
  scoringTeamId: string;
  scoreAAfter: number;
  scoreBAfter: number;
  isUndone: boolean;
  undoneReason?: string;
  timestamp: string;
}

export interface Match {
  id: string;
  tournamentId: string;
  groupId: string | null;
  stage: 'group' | 'knockout' | 'playoff' | 'final' | 'third_place' | 'friendly';
  teamAId: string;
  teamBId: string;
  court?: string;
  scheduledAt?: string;
  status: 'scheduled' | 'lineup_pending' | 'lineup_ready' | 'ready' | 'ongoing' | 'segment_break' | 'completed' | 'cancelled';
  scoreA?: number | null; // Final score A
  scoreB?: number | null; // Final score B
  winnerTeamId?: string | null;
  
  // Ruleset-driven tiếp sức fields
  segmentsOrder?: SegmentKey[];   // e.g. ['mixed_doubles', 'mens_doubles', 'womens_doubles']
  segments?: MatchSegment[];      // Detail chặng thi đấu
  scoreEvents?: ScoreEvent[];     // Lịch sử ghi điểm quả bóng (Source of truth)
  activeSegmentIndex?: number;    // Chỉ số chặng đang hoạt động (0, 1, 2)
  lineupLocked?: boolean;         // Đã khóa đội hình để thi đấu
  
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StandingRow {
  rank: number;
  teamId: string;
  teamName: string;
  teamCode: string;
  played: number;
  won: number;
  lost: number;
  points: number; // calculated based on wins (1 win = 1 point or customized)
  scoreFor: number;
  scoreAgainst: number;
  scoreDifference: number;
  headToHeadHistory: Record<string, 'win' | 'loss'>; // opponents to result
  requiresAdminDecision?: boolean; // Cờ hòa 3 bên cần BTC quyết định
  tieBreakReason?: string;
}
