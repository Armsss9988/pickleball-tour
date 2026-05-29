export interface SectionValidationResult {
  section: 'tournamentInfo' | 'ruleset' | 'players' | 'teams' | 'schedule';
  valid: boolean;
  errors: string[];
}

export interface TournamentSectionData {
  tournamentInfo: {
    name?: string | null;
    openingTime?: Date | null;
    venueName?: string | null;
  };
  ruleset: {
    exists: boolean;
    hasSegments: boolean;
    hasScoringConfig: boolean;
    teamSize: number;
    maleCount: number;
    femaleCount: number;
  } | null;
  players: {
    total: number;
    males: number;
    females: number;
  };
  teams: {
    count: number;
    membersCounts: number[]; // Number of members in each team
    membersGenders: { teamId: string; males: number; females: number }[];
  };
  schedule: {
    matchCount: number;
    allMatchesHaveTime: boolean;
    allMatchesHaveCourt: boolean;
    hasCourtConflicts: boolean;
  };
}

export function validateTournamentInfo(data: TournamentSectionData): SectionValidationResult {
  const errors: string[] = [];
  const info = data.tournamentInfo;
  if (!info.name || info.name.trim() === '') {
    errors.push('Tên giải đấu không được để trống');
  }
  if (!info.openingTime) {
    errors.push('Thời gian khai mạc/bắt đầu giải đấu không được để trống');
  }
  if (!info.venueName || info.venueName.trim() === '') {
    errors.push('Địa điểm thi đấu không được để trống');
  }

  return {
    section: 'tournamentInfo',
    valid: errors.length === 0,
    errors,
  };
}

export function validateRuleset(data: TournamentSectionData): SectionValidationResult {
  const errors: string[] = [];
  const ruleset = data.ruleset;
  if (!ruleset || !ruleset.exists) {
    errors.push('Chưa cấu hình luật thi đấu (ruleset)');
  } else {
    if (!ruleset.hasSegments) {
      errors.push('Luật thi đấu chưa cấu hình các chặng thi đấu');
    }
    if (!ruleset.hasScoringConfig) {
      errors.push('Luật thi đấu chưa cấu hình điểm chiến thắng/cách tính điểm');
    }
  }

  return {
    section: 'ruleset',
    valid: errors.length === 0,
    errors,
  };
}

export function validatePlayers(data: TournamentSectionData): SectionValidationResult {
  const errors: string[] = [];
  const ruleset = data.ruleset;
  const players = data.players;

  if (players.total === 0) {
    errors.push('Chưa nhập danh sách vận động viên');
  } else if (ruleset && ruleset.exists) {
    // Check if we have enough players to form at least 2 teams of ruleset size
    const minRequired = ruleset.teamSize * 2;
    if (players.total < minRequired) {
      errors.push(`Số lượng VĐV (${players.total}) không đủ để lập tối thiểu 2 đội (yêu cầu tối thiểu ${minRequired} VĐV)`);
    }
    if (ruleset.maleCount > 0 && players.males < ruleset.maleCount * 2) {
      errors.push(`Số lượng VĐV Nam (${players.males}) không đủ cho 2 đội (yêu cầu tối thiểu ${ruleset.maleCount * 2})`);
    }
    if (ruleset.femaleCount > 0 && players.females < ruleset.femaleCount * 2) {
      errors.push(`Số lượng VĐV Nữ (${players.females}) không đủ cho 2 đội (yêu cầu tối thiểu ${ruleset.femaleCount * 2})`);
    }
  }

  return {
    section: 'players',
    valid: errors.length === 0,
    errors,
  };
}

export function validateTeams(data: TournamentSectionData): SectionValidationResult {
  const errors: string[] = [];
  const ruleset = data.ruleset;
  const teams = data.teams;

  if (teams.count < 2) {
    errors.push('Giải đấu phải có tối thiểu 2 đội thi đấu');
  }

  if (ruleset && ruleset.exists) {
    teams.membersCounts.forEach((count, idx) => {
      if (count !== ruleset.teamSize) {
        errors.push(`Đội thứ ${idx + 1} có ${count} thành viên (yêu cầu chính xác ${ruleset.teamSize} thành viên)`);
      }
    });

    teams.membersGenders.forEach((g, idx) => {
      if (ruleset.maleCount > 0 && g.males < ruleset.maleCount) {
        errors.push(`Đội thứ ${idx + 1} không đủ VĐV Nam (có ${g.males}/${ruleset.maleCount} Nam)`);
      }
      if (ruleset.femaleCount > 0 && g.females < ruleset.femaleCount) {
        errors.push(`Đội thứ ${idx + 1} không đủ VĐV Nữ (có ${g.females}/${ruleset.femaleCount} Nữ)`);
      }
    });
  }

  return {
    section: 'teams',
    valid: errors.length === 0,
    errors,
  };
}

export function validateSchedule(data: TournamentSectionData): SectionValidationResult {
  const errors: string[] = [];
  const schedule = data.schedule;

  if (schedule.matchCount === 0) {
    errors.push('Chưa tạo lịch thi đấu (chưa sinh các trận đấu)');
  } else {
    if (!schedule.allMatchesHaveTime) {
      errors.push('Có trận đấu chưa được xếp giờ thi đấu');
    }
    if (!schedule.allMatchesHaveCourt) {
      errors.push('Có trận đấu chưa được xếp sân thi đấu');
    }
    if (schedule.hasCourtConflicts) {
      errors.push('Có xung đột trùng lịch thi đấu trên cùng một sân');
    }
  }

  return {
    section: 'schedule',
    valid: errors.length === 0,
    errors,
  };
}

export function validateAllSections(data: TournamentSectionData): SectionValidationResult[] {
  return [
    validateTournamentInfo(data),
    validateRuleset(data),
    validatePlayers(data),
    validateTeams(data),
    validateSchedule(data),
  ];
}

export function getPublishReadiness(results: SectionValidationResult[]): {
  ready: boolean;
  missing: string[];
} {
  // Publish readiness chỉ cần TournamentInfo valid và Ruleset tồn tại (chỉ cần ruleset valid ở mức cơ bản)
  const infoResult = results.find(r => r.section === 'tournamentInfo');
  const rulesetResult = results.find(r => r.section === 'ruleset');

  const missing: string[] = [];
  if (!infoResult || !infoResult.valid) {
    missing.push(...(infoResult?.errors || ['Thiếu thông tin giải đấu']));
  }
  if (!rulesetResult || !rulesetResult.valid) {
    missing.push(...(rulesetResult?.errors || ['Chưa cấu hình luật thi đấu']));
  }

  return {
    ready: missing.length === 0,
    missing,
  };
}

export function getOperationalReadiness(results: SectionValidationResult[]): {
  ready: boolean;
  missing: string[];
} {
  // Operational readiness yêu cầu TẤT CẢ các section đều valid
  const missing: string[] = [];
  results.forEach(r => {
    if (!r.valid) {
      missing.push(...r.errors);
    }
  });

  return {
    ready: missing.length === 0,
    missing,
  };
}
