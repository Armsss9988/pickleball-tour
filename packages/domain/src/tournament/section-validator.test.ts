import { describe, it, expect } from 'vitest';
import {
  validateTournamentInfo,
  validateRuleset,
  validatePlayers,
  validateTeams,
  validateSchedule,
  validateAllSections,
  getPublishReadiness,
  getOperationalReadiness,
  TournamentSectionData,
} from './section-validator';

const mockValidData: TournamentSectionData = {
  tournamentInfo: {
    name: 'Giải Pickleball GOLAB Cúp',
    openingTime: new Date('2026-06-01T08:00:00Z'),
    venueName: 'Sân Pickleball GOLAB',
  },
  ruleset: {
    exists: true,
    hasSegments: true,
    hasScoringConfig: true,
    teamSize: 5,
    maleCount: 3,
    femaleCount: 2,
  },
  players: {
    total: 10,
    males: 6,
    females: 4,
  },
  teams: {
    count: 2,
    membersCounts: [5, 5],
    membersGenders: [
      { teamId: 'team-1', males: 3, females: 2 },
      { teamId: 'team-2', males: 3, females: 2 },
    ],
  },
  schedule: {
    matchCount: 1,
    allMatchesHaveTime: true,
    allMatchesHaveCourt: true,
    hasCourtConflicts: false,
  },
};

describe('section-validator', () => {
  it('passes validateTournamentInfo when all info present', () => {
    const res = validateTournamentInfo(mockValidData);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('fails validateTournamentInfo when missing name', () => {
    const data = {
      ...mockValidData,
      tournamentInfo: { ...mockValidData.tournamentInfo, name: '' },
    };
    const res = validateTournamentInfo(data);
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('Tên giải đấu không được để trống');
  });

  it('fails validateTournamentInfo when missing openingTime and requireScheduleConfig is true', () => {
    const data = {
      ...mockValidData,
      ruleset: { ...mockValidData.ruleset!, requireScheduleConfig: true },
      tournamentInfo: { ...mockValidData.tournamentInfo, openingTime: null },
    };
    const res = validateTournamentInfo(data);
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('Thời gian khai mạc/bắt đầu giải đấu không được để trống');
  });

  it('passes validateTournamentInfo when missing openingTime and requireScheduleConfig is false', () => {
    const data = {
      ...mockValidData,
      ruleset: { ...mockValidData.ruleset!, requireScheduleConfig: false },
      tournamentInfo: { ...mockValidData.tournamentInfo, openingTime: null },
    };
    const res = validateTournamentInfo(data);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('passes validateRuleset when ruleset is complete', () => {
    const res = validateRuleset(mockValidData);
    expect(res.valid).toBe(true);
  });

  it('fails validateRuleset when no ruleset exists', () => {
    const data = { ...mockValidData, ruleset: null };
    const res = validateRuleset(data);
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('Chưa cấu hình luật thi đấu (ruleset)');
  });

  it('passes validatePlayers when enough players exist', () => {
    const res = validatePlayers(mockValidData);
    expect(res.valid).toBe(true);
  });

  it('fails validatePlayers when not enough female players', () => {
    const data = {
      ...mockValidData,
      players: { total: 10, males: 8, females: 2 },
    };
    const res = validatePlayers(data);
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('VĐV Nữ (2) không đủ');
  });

  it('passes validateTeams when team sizes and genders match requirements', () => {
    const res = validateTeams(mockValidData);
    expect(res.valid).toBe(true);
  });

  it('fails validateTeams when a team has wrong member count', () => {
    const data = {
      ...mockValidData,
      teams: {
        ...mockValidData.teams,
        membersCounts: [4, 5],
      },
    };
    const res = validateTeams(data);
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('thành viên (yêu cầu chính xác 5 thành viên)');
  });

  it('passes validateSchedule when matches are scheduled without conflict', () => {
    const res = validateSchedule(mockValidData);
    expect(res.valid).toBe(true);
  });

  it('fails validateSchedule when there is a court conflict', () => {
    const data = {
      ...mockValidData,
      schedule: {
        ...mockValidData.schedule,
        hasCourtConflicts: true,
      },
    };
    const res = validateSchedule(data);
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('Có xung đột trùng lịch thi đấu trên cùng một sân');
  });

  it('passes validateRuleset when matchFormat is single_game and hasSegments is false', () => {
    const data: TournamentSectionData = {
      ...mockValidData,
      ruleset: {
        ...mockValidData.ruleset!,
        matchFormat: 'single_game',
        hasSegments: false,
      },
    };
    const res = validateRuleset(data);
    expect(res.valid).toBe(true);
  });

  it('passes validateSchedule when requireCourtConfig is false and matches lack courts or have conflicts', () => {
    const data: TournamentSectionData = {
      ...mockValidData,
      ruleset: {
        ...mockValidData.ruleset!,
        requireCourtConfig: false,
        requireScheduleConfig: true,
      },
      schedule: {
        ...mockValidData.schedule,
        allMatchesHaveCourt: false,
        hasCourtConflicts: true,
      },
    };
    const res = validateSchedule(data);
    expect(res.valid).toBe(true);
  });

  it('passes validateSchedule when requireScheduleConfig is false and matches lack time', () => {
    const data: TournamentSectionData = {
      ...mockValidData,
      ruleset: {
        ...mockValidData.ruleset!,
        requireCourtConfig: true,
        requireScheduleConfig: false,
      },
      schedule: {
        ...mockValidData.schedule,
        allMatchesHaveTime: false,
      },
    };
    const res = validateSchedule(data);
    expect(res.valid).toBe(true);
  });

  it('calculates getPublishReadiness and getOperationalReadiness correctly', () => {
    const results = validateAllSections(mockValidData);
    const pubReady = getPublishReadiness(results);
    const opReady = getOperationalReadiness(results);

    expect(pubReady.ready).toBe(true);
    expect(opReady.ready).toBe(true);
  });
});
