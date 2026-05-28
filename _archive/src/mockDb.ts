/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Athlete, Team, TeamMember, Group, Match, Tournament, User, RulesetConfig, MatchSegment, ScoreEvent, SegmentKey } from './types';

export interface DatabaseState {
  users: User[];
  currentUser: User | null;
  tournaments: Tournament[];
  activeTournamentId: string;
  athletes: Athlete[];
  teams: Team[];
  teamMembers: TeamMember[];
  groups: Group[];
  matches: Match[];
}

const LOCAL_STORAGE_KEY = 'golab_pickleball_db_v1';

// Sample mock users/roles
const DEFAULT_USERS: User[] = [
  { id: 'u1', name: 'Nguyễn Minh Hùng (Super Admin)', email: 'hung.nguyen@golab.com', role: 'super_admin', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'u2', name: 'Lê Trần Linh (Organizer - Ban Tổ Chức)', email: 'linh.le@golab.com', role: 'organizer', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'u3', name: 'Trần Văn Trọng (Referee - Trọng tài)', email: 'trong.tran@golab.com', role: 'operator', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'u4', name: 'Khách vãng lai (Viewer)', email: 'vãnglai@golab.com', role: 'viewer', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }
];

// Official Golab Ruleset Config
const GOLAB_RULESET: RulesetConfig = {
  team: {
    count: 8,
    size: 5,
    composition: { male: 3, female: 2 },
    allPlayersMustPlay: true,
    playerLimits: {
      male: { min: 0, max: 1 },
      female: { min: 0, max: 2 }
    }
  },
  players: {
    requiredTotal: 40,
    requiredGenderCount: { male: 24, female: 16 }
  },
  groups: {
    count: 2,
    teamsPerGroup: 4,
    names: ["Bảng A", "Bảng B"]
  },
  stage: {
    groupStage: {
      format: 'single_round_robin',
      qualifyPerGroup: 3,
      rankingRules: ['wins', 'diff', 'headToHead', 'name']
    },
    knockout: {
      qualifiedTeams: 6,
      byeSeeds: ["A1", "B1"],
      thirdPlace: 'co_third'
    }
  },
  match: {
    type: 'relay',
    winScore: 24,
    winBy: 0,
    inheritScore: true,
    drawOrder: true,
    sideSwitchAfterSegments: [1, 2],
    contents: [
      { key: 'mens_doubles', name: 'Đôi Nam', requiredPlayers: { male: 2, female: 0 } },
      { key: 'womens_doubles', name: 'Đôi Nữ', requiredPlayers: { male: 0, female: 2 } },
      { key: 'mixed_doubles', name: 'Đôi Nam Nữ', requiredPlayers: { male: 1, female: 1 } }
    ],
    segmentTargetsByOrder: [8, 16, 24],
    forbiddenOverlap: [['mens_doubles', 'mixed_doubles']]
  }
};

// Initial Tournament
const DEFAULT_TOURNAMENTS: Tournament[] = [
  {
    id: 't1',
    name: 'Giải Pickleball Đồng Đội Cúp Golab Lần 2',
    slug: 'cup-golab-lan-2',
    location: 'Cụm sân Pickleball Hùng Hà, TP. Hồ Chí Minh',
    startDate: '2026-06-14',
    endDate: '2026-06-24',
    description: 'Giải Pickleball đồng đội Cúp Golab lần 2 - Đường đua tiếp sức đoàn kết. Thể thức tiếp sức chạm 24 liên tục cực kỳ độc đáo và gay cấn, đòi hỏi sự phối hợp chiến thuật đỉnh cao.',
    rules: 'Mỗi lượt trận đối đầu thi đấu 3 chặng tiếp sức: Đôi Nam, Đôi Nữ, Đôi Nam Nữ. Điểm số kế thừa qua các chặng chạm 8, 16, và 24. Đội đạt 24 trước sẽ giành chiến thắng chung cuộc (không cách biệt 2). VĐV Nam chỉ được đánh tối đa 1 chặng, cả 5 thành viên bắt buộc ra sân thi đấu.',
    status: 'ongoing',
    scoringConfig: {
      pointsForWin: 1,
      pointsForLoss: 0,
      pointsForDraw: 0,
      tieBreakers: ['wins', 'diff', 'headToHead', 'name']
    },
    rulesetConfig: GOLAB_RULESET,
    createdAt: '2026-05-15T08:00:00Z',
    updatedAt: '2026-05-27T16:13:20Z'
  }
];

// Generate 24 Males and 16 Females
const generateAthletes = (): Athlete[] => {
  const athletes: Athlete[] = [];
  const timestamp = '2026-05-20T00:00:00Z';

  // 24 Males
  for (let i = 1; i <= 24; i++) {
    const num = i < 10 ? `0${i}` : `${i}`;
    athletes.push({
      id: `ath_m_${i}`,
      fullName: `Nguyễn Văn Nam ${num}`,
      gender: 'Nam',
      phone: `0901234${100 + i}`,
      club: i % 3 === 0 ? 'Golab Club' : i % 3 === 1 ? 'Hùng Hà PB' : 'Sài Gòn PB',
      skillLevel: (3.0 + (i % 4) * 0.5).toFixed(1),
      note: i === 1 || i === 4 || i === 7 || i === 10 || i === 13 || i === 16 || i === 19 || i === 22 ? 'Đội trưởng tiềm năng' : '',
      status: 'assigned',
      createdAt: timestamp,
      updatedAt: timestamp
    });
  }

  // 16 Females
  for (let i = 1; i <= 16; i++) {
    const num = i < 10 ? `0${i}` : `${i}`;
    athletes.push({
      id: `ath_f_${i}`,
      fullName: `Trần Thị Nữ ${num}`,
      gender: 'Nữ',
      phone: `0905555${100 + i}`,
      club: i % 2 === 0 ? 'Golab Club' : 'Hùng Hà PB',
      skillLevel: (3.0 + (i % 3) * 0.5).toFixed(1),
      note: '',
      status: 'assigned',
      createdAt: timestamp,
      updatedAt: timestamp
    });
  }

  // Add 2 backup unassigned free agents (1 Male, 1 Female)
  athletes.push({
    id: `ath_m_backup`,
    fullName: `Lê Cao Sơn (Dự bị Nam)`,
    gender: 'Nam',
    phone: '0909999111',
    club: 'Tự do',
    skillLevel: '3.5',
    note: 'Dự bị tự do',
    status: 'registered',
    createdAt: timestamp,
    updatedAt: timestamp
  });

  athletes.push({
    id: `ath_f_backup`,
    fullName: `Võ Thị Mai (Dự bị Nữ)`,
    gender: 'Nữ',
    phone: '0909999222',
    club: 'Tự do',
    skillLevel: '3.0',
    note: 'Dự bị tự do',
    status: 'registered',
    createdAt: timestamp,
    updatedAt: timestamp
  });

  return athletes;
};

const DEFAULT_ATHLETES = generateAthletes();

// Groups (Bảng đấu)
const DEFAULT_GROUPS: Group[] = [
  { id: 'g1', tournamentId: 't1', name: 'Bảng A', sortOrder: 1, createdAt: '2026-05-20T08:00:00Z', updatedAt: '2026-05-20T08:00:00Z' },
  { id: 'g2', tournamentId: 't1', name: 'Bảng B', sortOrder: 2, createdAt: '2026-05-20T08:00:00Z', updatedAt: '2026-05-20T08:00:00Z' }
];

// 8 Teams
const DEFAULT_TEAMS: Team[] = [
  // Bảng A
  { id: 'team_1', tournamentId: 't1', name: 'Đội Sét Golab', code: 'GOLAB-SET', captainAthleteId: 'ath_m_1', groupId: 'g1', seed: '1', note: 'Hạt giống số 1 Bảng A', createdAt: '2026-05-20T09:00:00Z', updatedAt: '2026-05-20T09:00:00Z' },
  { id: 'team_2', tournamentId: 't1', name: 'Hỏa Long PB', code: 'HOALONG', captainAthleteId: 'ath_m_4', groupId: 'g1', seed: '2', note: 'Hạt giống số 2 Bảng A', createdAt: '2026-05-20T09:00:00Z', updatedAt: '2026-05-20T09:00:00Z' },
  { id: 'team_3', tournamentId: 't1', name: 'Phong Vân PB', code: 'PHONGVAN', captainAthleteId: 'ath_m_7', groupId: 'g1', seed: null, note: 'Khả năng lội ngược dòng tốt', createdAt: '2026-05-20T09:00:00Z', updatedAt: '2026-05-20T09:00:00Z' },
  { id: 'team_4', tournamentId: 't1', name: 'Bạch Hổ PB', code: 'BACHHO', captainAthleteId: 'ath_m_10', groupId: 'g1', seed: null, note: '', createdAt: '2026-05-20T09:00:00Z', updatedAt: '2026-05-20T09:00:00Z' },

  // Bảng B
  { id: 'team_5', tournamentId: 't1', name: 'Đại Bàng Vàng', code: 'DAIBANG', captainAthleteId: 'ath_m_13', groupId: 'g2', seed: '1', note: 'Hạt giống số 1 Bảng B', createdAt: '2026-05-20T09:00:00Z', updatedAt: '2026-05-20T09:00:00Z' },
  { id: 'team_6', tournamentId: 't1', name: 'Chiến Binh Thép', code: 'CHIENBINH', captainAthleteId: 'ath_m_16', groupId: 'g2', seed: '2', note: 'Lối đánh phòng thủ kiên cường', createdAt: '2026-05-20T09:00:00Z', updatedAt: '2026-05-20T09:00:00Z' },
  { id: 'team_7', tournamentId: 't1', name: 'Sấm Sét Q2', code: 'SAMSET', captainAthleteId: 'ath_m_19', groupId: 'g2', seed: null, note: '', createdAt: '2026-05-20T09:00:00Z', updatedAt: '2026-05-20T09:00:00Z' },
  { id: 'team_8', tournamentId: 't1', name: 'Phượng Hoàng PB', code: 'PHUONGHOANG', captainAthleteId: 'ath_m_22', groupId: 'g2', seed: null, note: '', createdAt: '2026-05-20T09:00:00Z', updatedAt: '2026-05-20T09:00:00Z' }
];

// Assign exactly 5 players (3 Male, 2 Female) per team mathematically
const generateTeamMembers = (): TeamMember[] => {
  const members: TeamMember[] = [];
  let memberIdCounter = 1;

  for (let teamIdx = 1; teamIdx <= 8; teamIdx++) {
    const teamId = `team_${teamIdx}`;
    
    // Assign 3 Males
    const m1 = `ath_m_${3 * teamIdx - 2}`;
    const m2 = `ath_m_${3 * teamIdx - 1}`;
    const m3 = `ath_m_${3 * teamIdx}`;
    
    // Assign 2 Females
    const f1 = `ath_f_${2 * teamIdx - 1}`;
    const f2 = `ath_f_${2 * teamIdx}`;

    // Push Male 1 (Captain)
    members.push({
      id: `tm_${memberIdCounter++}`,
      teamId,
      athleteId: m1,
      role: 'captain',
      createdAt: '2026-05-20T09:30:00Z'
    });

    // Push Male 2, 3
    [m2, m3].forEach(athId => {
      members.push({
        id: `tm_${memberIdCounter++}`,
        teamId,
        athleteId: athId,
        role: 'member',
        createdAt: '2026-05-20T09:30:00Z'
      });
    });

    // Push Female 1, 2
    [f1, f2].forEach(athId => {
      members.push({
        id: `tm_${memberIdCounter++}`,
        teamId,
        athleteId: athId,
        role: 'member',
        createdAt: '2026-05-20T09:30:00Z'
      });
    });
  }

  return members;
};

const DEFAULT_TEAM_MEMBERS = generateTeamMembers();

// Seed Event Logs and Segments for completed/ongoing matches in relay format
const seedRelaySegments = (
  matchId: string,
  teamAId: string,
  teamBId: string,
  status: Match['status'],
  scoreA: number | null,
  scoreB: number | null,
  order: SegmentKey[] = ['mixed_doubles', 'mens_doubles', 'womens_doubles']
): { segments: MatchSegment[]; events: ScoreEvent[]; activeIndex: number } => {
  
  const segments: MatchSegment[] = [
    {
      id: `seg_${matchId}_1`,
      segmentKey: order[0],
      name: order[0] === 'mens_doubles' ? 'Đôi Nam' : order[0] === 'womens_doubles' ? 'Đôi Nữ' : 'Đôi Nam Nữ',
      segmentOrder: 1,
      targetScore: 8,
      status: status === 'completed' ? 'completed' : 'pending',
      playerIdsA: order[0] === 'mens_doubles' ? [`ath_m_1`, `ath_m_2`] : order[0] === 'womens_doubles' ? [`ath_f_1`, `ath_f_2`] : [`ath_m_1`, `ath_f_1`],
      playerIdsB: order[0] === 'mens_doubles' ? [`ath_m_4`, `ath_m_5`] : order[0] === 'womens_doubles' ? [`ath_f_3`, `ath_f_4`] : [`ath_m_4`, `ath_f_3`],
    },
    {
      id: `seg_${matchId}_2`,
      segmentKey: order[1],
      name: order[1] === 'mens_doubles' ? 'Đôi Nam' : order[1] === 'womens_doubles' ? 'Đôi Nữ' : 'Đôi Nam Nữ',
      segmentOrder: 2,
      targetScore: 16,
      status: status === 'completed' ? 'completed' : 'pending',
      playerIdsA: order[1] === 'mens_doubles' ? [`ath_m_2`, `ath_m_3`] : order[1] === 'womens_doubles' ? [`ath_f_1`, `ath_f_2`] : [`ath_m_2`, `ath_f_2`],
      playerIdsB: order[1] === 'mens_doubles' ? [`ath_m_5`, `ath_m_6`] : order[1] === 'womens_doubles' ? [`ath_f_3`, `ath_f_4`] : [`ath_m_5`, `ath_f_4`],
    },
    {
      id: `seg_${matchId}_3`,
      segmentKey: order[2],
      name: order[2] === 'mens_doubles' ? 'Đôi Nam' : order[2] === 'womens_doubles' ? 'Đôi Nữ' : 'Đôi Nam Nữ',
      segmentOrder: 3,
      targetScore: 24,
      status: status === 'completed' ? 'completed' : 'pending',
      playerIdsA: order[2] === 'mens_doubles' ? [`ath_m_1`, `ath_m_3`] : order[2] === 'womens_doubles' ? [`ath_f_1`, `ath_f_2`] : [`ath_m_3`, `ath_f_1`],
      playerIdsB: order[2] === 'mens_doubles' ? [`ath_m_4`, `ath_m_6`] : order[2] === 'womens_doubles' ? [`ath_f_3`, `ath_f_4`] : [`ath_m_6`, `ath_f_3`],
    }
  ];

  const events: ScoreEvent[] = [];
  let currentA = 0;
  let currentB = 0;
  let eventNo = 1;

  if (status === 'completed' && scoreA !== null && scoreB !== null) {
    // Generate simulated score event log that ends up at the scoreA and scoreB
    // Chặng 1: to 8
    const winnerSeg1 = scoreA >= 8 ? 'A' : 'B';
    if (winnerSeg1 === 'A') {
      while (currentA < 8) {
        currentA++;
        if (Math.random() > 0.4 && currentB < 6) currentB++;
        events.push({ id: `ev_${matchId}_${eventNo}`, eventNo: eventNo++, scoringTeamId: teamAId, scoreAAfter: currentA, scoreBAfter: currentB, isUndone: false, timestamp: new Date().toISOString() });
      }
    } else {
      while (currentB < 8) {
        currentB++;
        if (Math.random() > 0.4 && currentA < 6) currentA++;
        events.push({ id: `ev_${matchId}_${eventNo}`, eventNo: eventNo++, scoringTeamId: teamBId, scoreAAfter: currentA, scoreBAfter: currentB, isUndone: false, timestamp: new Date().toISOString() });
      }
    }
    segments[0].scoreAAtEnd = currentA;
    segments[0].scoreBAtEnd = currentB;

    // Chặng 2: to 16
    const winnerSeg2 = scoreA >= 16 ? 'A' : 'B';
    if (winnerSeg2 === 'A') {
      while (currentA < 16) {
        currentA++;
        if (Math.random() > 0.5 && currentB < 12) currentB++;
        events.push({ id: `ev_${matchId}_${eventNo}`, eventNo: eventNo++, scoringTeamId: teamAId, scoreAAfter: currentA, scoreBAfter: currentB, isUndone: false, timestamp: new Date().toISOString() });
      }
    } else {
      while (currentB < 16) {
        currentB++;
        if (Math.random() > 0.5 && currentA < 12) currentA++;
        events.push({ id: `ev_${matchId}_${eventNo}`, eventNo: eventNo++, scoringTeamId: teamBId, scoreAAfter: currentA, scoreBAfter: currentB, isUndone: false, timestamp: new Date().toISOString() });
      }
    }
    segments[1].scoreAAtEnd = currentA;
    segments[1].scoreBAtEnd = currentB;

    // Chặng 3: to final scores (winScore = 24)
    const winnerFinal = scoreA === 24 ? 'A' : 'B';
    if (winnerFinal === 'A') {
      // Step to A=24 and B=scoreB
      while (currentB < scoreB) {
        currentB++;
        events.push({ id: `ev_${matchId}_${eventNo}`, eventNo: eventNo++, scoringTeamId: teamBId, scoreAAfter: currentA, scoreBAfter: currentB, isUndone: false, timestamp: new Date().toISOString() });
      }
      while (currentA < 24) {
        currentA++;
        events.push({ id: `ev_${matchId}_${eventNo}`, eventNo: eventNo++, scoringTeamId: teamAId, scoreAAfter: currentA, scoreBAfter: currentB, isUndone: false, timestamp: new Date().toISOString() });
      }
    } else {
      // Step to B=24 and A=scoreA
      while (currentA < scoreA) {
        currentA++;
        events.push({ id: `ev_${matchId}_${eventNo}`, eventNo: eventNo++, scoringTeamId: teamAId, scoreAAfter: currentA, scoreBAfter: currentB, isUndone: false, timestamp: new Date().toISOString() });
      }
      while (currentB < 24) {
        currentB++;
        events.push({ id: `ev_${matchId}_${eventNo}`, eventNo: eventNo++, scoringTeamId: teamBId, scoreAAfter: currentA, scoreBAfter: currentB, isUndone: false, timestamp: new Date().toISOString() });
      }
    }
    segments[2].scoreAAtEnd = currentA;
    segments[2].scoreBAtEnd = currentB;
  } else if (status === 'ongoing' && scoreA !== null && scoreB !== null) {
    // Ongoing match at segment index 0 (e.g. 6-4)
    currentA = scoreA;
    currentB = scoreB;
    segments[0].status = 'running';
    for (let i = 1; i <= scoreA; i++) {
      events.push({ id: `ev_${matchId}_${eventNo}`, eventNo: eventNo++, scoringTeamId: teamAId, scoreAAfter: i, scoreBAfter: Math.min(scoreB, Math.max(0, i - 2)), isUndone: false, timestamp: new Date().toISOString() });
    }
    for (let j = Math.max(0, scoreA - 2) + 1; j <= scoreB; j++) {
      events.push({ id: `ev_${matchId}_${eventNo}`, eventNo: eventNo++, scoringTeamId: teamBId, scoreAAfter: scoreA, scoreBAfter: j, isUndone: false, timestamp: new Date().toISOString() });
    }
  }

  return {
    segments,
    events,
    activeIndex: status === 'completed' ? 2 : 0
  };
};

// 12 round robin matches in relay format
const generateDefaultMatches = (): Match[] => {
  const matches: Match[] = [];
  const timestamp = '2026-05-27T08:00:00Z';

  // Match 1: Completed, Bảng A. Đội 1 vs Đội 2. Tỉ số 24-20
  const m1Data = seedRelaySegments('match_1', 'team_1', 'team_2', 'completed', 24, 20);
  matches.push({
    id: 'match_1',
    tournamentId: 't1',
    groupId: 'g1',
    stage: 'group',
    teamAId: 'team_1',
    teamBId: 'team_2',
    court: 'Sân Trung Tâm',
    scheduledAt: '2026-06-14T08:00',
    status: 'completed',
    scoreA: 24,
    scoreB: 20,
    winnerTeamId: 'team_1',
    segmentsOrder: ['mixed_doubles', 'mens_doubles', 'womens_doubles'],
    segments: m1Data.segments,
    scoreEvents: m1Data.events,
    activeSegmentIndex: m1Data.activeIndex,
    lineupLocked: true,
    note: 'Đôi Nam Nữ phối hợp mở màn chặng 1 tạo lợi thế lớn cho Đội Sét.',
    createdAt: timestamp,
    updatedAt: timestamp
  });

  // Match 2: Completed, Bảng A. Đội 3 vs Đội 4. Tỉ số 18-24
  const m2Data = seedRelaySegments('match_2', 'team_3', 'team_4', 'completed', 18, 24);
  matches.push({
    id: 'match_2',
    tournamentId: 't1',
    groupId: 'g1',
    stage: 'group',
    teamAId: 'team_3',
    teamBId: 'team_4',
    court: 'Sân Số 2',
    scheduledAt: '2026-06-14T08:00',
    status: 'completed',
    scoreA: 18,
    scoreB: 24,
    winnerTeamId: 'team_4',
    segmentsOrder: ['mixed_doubles', 'mens_doubles', 'womens_doubles'],
    segments: m2Data.segments,
    scoreEvents: m2Data.events,
    activeSegmentIndex: m2Data.activeIndex,
    lineupLocked: true,
    note: 'Bạch Hổ bám đuổi tỉ số ngoạn mục ở chặng đôi nam nữ cuối cùng.',
    createdAt: timestamp,
    updatedAt: timestamp
  });

  // Match 3: Completed, Bảng A. Đội 1 vs Đội 3. Tỉ số 24-12
  const m3Data = seedRelaySegments('match_3', 'team_1', 'team_3', 'completed', 24, 12);
  matches.push({
    id: 'match_3',
    tournamentId: 't1',
    groupId: 'g1',
    stage: 'group',
    teamAId: 'team_1',
    teamBId: 'team_3',
    court: 'Sân Trung Tâm',
    scheduledAt: '2026-06-14T10:00',
    status: 'completed',
    scoreA: 24,
    scoreB: 12,
    winnerTeamId: 'team_1',
    segmentsOrder: ['mixed_doubles', 'mens_doubles', 'womens_doubles'],
    segments: m3Data.segments,
    scoreEvents: m3Data.events,
    activeSegmentIndex: m3Data.activeIndex,
    lineupLocked: true,
    note: 'Đội Sét Golab thể hiện sức mạnh áp đảo ở cả 3 nội dung.',
    createdAt: timestamp,
    updatedAt: timestamp
  });

  // Match 4: Scheduled, Bảng A. Đội 2 vs Đội 4
  const m4Data = seedRelaySegments('match_4', 'team_2', 'team_4', 'scheduled', null, null);
  matches.push({
    id: 'match_4',
    tournamentId: 't1',
    groupId: 'g1',
    stage: 'group',
    teamAId: 'team_2',
    teamBId: 'team_4',
    court: 'Sân Số 2',
    scheduledAt: '2026-06-14T10:00',
    status: 'scheduled',
    scoreA: null,
    scoreB: null,
    winnerTeamId: null,
    segmentsOrder: ['mixed_doubles', 'mens_doubles', 'womens_doubles'],
    segments: m4Data.segments,
    scoreEvents: [],
    activeSegmentIndex: 0,
    lineupLocked: false,
    note: '',
    createdAt: timestamp,
    updatedAt: timestamp
  });

  // Match 5: Ongoing, Bảng A. Đội 1 vs Đội 4. Tỉ số hiện tại 6-4 chặng 1
  const m5Data = seedRelaySegments('match_5', 'team_1', 'team_4', 'ongoing', 6, 4);
  matches.push({
    id: 'match_5',
    tournamentId: 't1',
    groupId: 'g1',
    stage: 'group',
    teamAId: 'team_1',
    teamBId: 'team_4',
    court: 'Sân Trung Tâm',
    scheduledAt: '2026-06-15T08:00',
    status: 'ongoing',
    scoreA: 6,
    scoreB: 4,
    winnerTeamId: null,
    segmentsOrder: ['mixed_doubles', 'mens_doubles', 'womens_doubles'],
    segments: m5Data.segments,
    scoreEvents: m5Data.events,
    activeSegmentIndex: 0,
    lineupLocked: true,
    note: 'Trận đấu đang diễn ra cực kỳ căng thẳng.',
    createdAt: timestamp,
    updatedAt: timestamp
  });

  // Match 6: Scheduled, Bảng A. Đội 2 vs Đội 3
  const m6Data = seedRelaySegments('match_6', 'team_2', 'team_3', 'scheduled', null, null);
  matches.push({
    id: 'match_6',
    tournamentId: 't1',
    groupId: 'g1',
    stage: 'group',
    teamAId: 'team_2',
    teamBId: 'team_3',
    court: 'Sân Số 2',
    scheduledAt: '2026-06-15T08:00',
    status: 'scheduled',
    scoreA: null,
    scoreB: null,
    winnerTeamId: null,
    segmentsOrder: ['mixed_doubles', 'mens_doubles', 'womens_doubles'],
    segments: m6Data.segments,
    scoreEvents: [],
    activeSegmentIndex: 0,
    lineupLocked: false,
    note: '',
    createdAt: timestamp,
    updatedAt: timestamp
  });

  // Match 7: Completed, Bảng B. Đội 5 vs Đội 6. Tỉ số 19-24
  const m7Data = seedRelaySegments('match_7', 'team_5', 'team_6', 'completed', 19, 24);
  matches.push({
    id: 'match_7',
    tournamentId: 't1',
    groupId: 'g2',
    stage: 'group',
    teamAId: 'team_5',
    teamBId: 'team_6',
    court: 'Sân Trung Tâm',
    scheduledAt: '2026-06-14T09:00',
    status: 'completed',
    scoreA: 19,
    scoreB: 24,
    winnerTeamId: 'team_6',
    segmentsOrder: ['mixed_doubles', 'mens_doubles', 'womens_doubles'],
    segments: m7Data.segments,
    scoreEvents: m7Data.events,
    activeSegmentIndex: m7Data.activeIndex,
    lineupLocked: true,
    note: 'Chiến Binh Thép phòng thủ kiên cường chặng 2 đôi nam.',
    createdAt: timestamp,
    updatedAt: timestamp
  });

  // Match 8: Completed, Bảng B. Đội 7 vs Đội 8. Tỉ số 24-21
  const m8Data = seedRelaySegments('match_8', 'team_7', 'team_8', 'completed', 24, 21);
  matches.push({
    id: 'match_8',
    tournamentId: 't1',
    groupId: 'g2',
    stage: 'group',
    teamAId: 'team_7',
    teamBId: 'team_8',
    court: 'Sân Số 3',
    scheduledAt: '2026-06-14T09:00',
    status: 'completed',
    scoreA: 24,
    scoreB: 21,
    winnerTeamId: 'team_7',
    segmentsOrder: ['mixed_doubles', 'mens_doubles', 'womens_doubles'],
    segments: m8Data.segments,
    scoreEvents: m8Data.events,
    activeSegmentIndex: m8Data.activeIndex,
    lineupLocked: true,
    note: 'Trận đấu rượt đuổi nghẹt thở từng điểm một ở chặng cuối.',
    createdAt: timestamp,
    updatedAt: timestamp
  });

  // Matches 9, 10, 11, 12 Scheduled for Bảng B
  for (let idx = 9; idx <= 12; idx++) {
    const teamAId = idx === 9 ? 'team_5' : idx === 10 ? 'team_6' : idx === 11 ? 'team_5' : 'team_6';
    const teamBId = idx === 9 ? 'team_7' : idx === 10 ? 'team_8' : idx === 11 ? 'team_8' : 'team_7';
    const court = idx % 2 === 0 ? 'Sân Số 3' : 'Sân Trung Tâm';
    const scheduledAt = idx < 11 ? '2026-06-14T11:00' : '2026-06-15T09:00';
    const mData = seedRelaySegments(`match_${idx}`, teamAId, teamBId, 'scheduled', null, null);

    matches.push({
      id: `match_${idx}`,
      tournamentId: 't1',
      groupId: 'g2',
      stage: 'group',
      teamAId,
      teamBId,
      court,
      scheduledAt,
      status: 'scheduled',
      scoreA: null,
      scoreB: null,
      winnerTeamId: null,
      segmentsOrder: ['mixed_doubles', 'mens_doubles', 'womens_doubles'],
      segments: mData.segments,
      scoreEvents: [],
      activeSegmentIndex: 0,
      lineupLocked: false,
      note: '',
      createdAt: timestamp,
      updatedAt: timestamp
    });
  }

  // Knockout playoffs placeholders (Tứ kết)
  const p1Data = seedRelaySegments('match_playoff_1', 'team_2', 'team_7', 'scheduled', null, null);
  matches.push({
    id: 'match_playoff_1',
    tournamentId: 't1',
    groupId: null,
    stage: 'playoff',
    teamAId: 'team_2', // A2 placeholder
    teamBId: 'team_7', // B3 placeholder
    court: 'Sân Trung Tâm',
    scheduledAt: '2026-06-20T08:00',
    status: 'scheduled',
    scoreA: null,
    scoreB: null,
    winnerTeamId: null,
    segmentsOrder: ['mixed_doubles', 'mens_doubles', 'womens_doubles'],
    segments: p1Data.segments,
    scoreEvents: [],
    activeSegmentIndex: 0,
    lineupLocked: false,
    note: 'Tứ Kết 1 (Nhì Bảng A vs Ba Bảng B)',
    createdAt: timestamp,
    updatedAt: timestamp
  });

  const p2Data = seedRelaySegments('match_playoff_2', 'team_6', 'team_3', 'scheduled', null, null);
  matches.push({
    id: 'match_playoff_2',
    tournamentId: 't1',
    groupId: null,
    stage: 'playoff',
    teamAId: 'team_6', // B2 placeholder
    teamBId: 'team_3', // A3 placeholder
    court: 'Sân Số 2',
    scheduledAt: '2026-06-20T09:30',
    status: 'scheduled',
    scoreA: null,
    scoreB: null,
    winnerTeamId: null,
    segmentsOrder: ['mixed_doubles', 'mens_doubles', 'womens_doubles'],
    segments: p2Data.segments,
    scoreEvents: [],
    activeSegmentIndex: 0,
    lineupLocked: false,
    note: 'Tứ Kết 2 (Nhì Bảng B vs Ba Bảng A)',
    createdAt: timestamp,
    updatedAt: timestamp
  });

  // Semi-finals (Knockout) bye setups
  const s1Data = seedRelaySegments('match_semi_1', 'team_1', 'team_6', 'scheduled', null, null);
  matches.push({
    id: 'match_semi_1',
    tournamentId: 't1',
    groupId: null,
    stage: 'knockout',
    teamAId: 'team_1', // A1 seeds
    teamBId: 'team_6', // Winner P2 placeholder
    court: 'Sân Trung Tâm',
    scheduledAt: '2026-06-24T08:00',
    status: 'scheduled',
    scoreA: null,
    scoreB: null,
    winnerTeamId: null,
    segmentsOrder: ['mixed_doubles', 'mens_doubles', 'womens_doubles'],
    segments: s1Data.segments,
    scoreEvents: [],
    activeSegmentIndex: 0,
    lineupLocked: false,
    note: 'Bán Kết 1 (Hạt giống A1 vs Thắng Tứ Kết 2)',
    createdAt: timestamp,
    updatedAt: timestamp
  });

  const s2Data = seedRelaySegments('match_semi_2', 'team_5', 'team_2', 'scheduled', null, null);
  matches.push({
    id: 'match_semi_2',
    tournamentId: 't1',
    groupId: null,
    stage: 'knockout',
    teamAId: 'team_5', // B1 seeds
    teamBId: 'team_2', // Winner P1 placeholder
    court: 'Sân Số 2',
    scheduledAt: '2026-06-24T09:30',
    status: 'scheduled',
    scoreA: null,
    scoreB: null,
    winnerTeamId: null,
    segmentsOrder: ['mixed_doubles', 'mens_doubles', 'womens_doubles'],
    segments: s2Data.segments,
    scoreEvents: [],
    activeSegmentIndex: 0,
    lineupLocked: false,
    note: 'Bán Kết 2 (Hạt giống B1 vs Thắng Tứ Kết 1)',
    createdAt: timestamp,
    updatedAt: timestamp
  });

  return matches;
};

const DEFAULT_MATCHES = generateDefaultMatches();

export function getInitialState(): DatabaseState {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.tournaments) && parsed.tournaments.length > 0) {
          // Verify rulesetConfig and segment mappings exist
          const tourney = parsed.tournaments[0];
          if (tourney && tourney.rulesetConfig && parsed.athletes.length >= 40) {
            return parsed as DatabaseState;
          }
        }
      } catch (e) {
        console.error('Failed to parse saved tournament database, restoring defaults', e);
      }
    }
  }

  // Set default initial state
  const state: DatabaseState = {
    users: DEFAULT_USERS,
    currentUser: DEFAULT_USERS[1], // Defaulting to Organizer role for rich initial usability
    tournaments: DEFAULT_TOURNAMENTS,
    activeTournamentId: DEFAULT_TOURNAMENTS[0].id,
    athletes: DEFAULT_ATHLETES,
    teams: DEFAULT_TEAMS,
    teamMembers: DEFAULT_TEAM_MEMBERS,
    groups: DEFAULT_GROUPS,
    matches: DEFAULT_MATCHES
  };

  saveState(state);
  return state;
}

export function saveState(state: DatabaseState): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }
}
