import { Match, Team, StandingRow, Athlete, ScoringConfig, RulesetConfig, SegmentKey, MatchSegment, ScoreEvent } from '../types';

/**
 * Determines the winner of a match based on scores.
 */
export function determineWinner(scoreA: number | null | undefined, scoreB: number | null | undefined, teamAId: string, teamBId: string): string | null {
  if (scoreA === undefined || scoreA === null || scoreB === undefined || scoreB === null) {
    return null;
  }
  if (scoreA > scoreB) return teamAId;
  if (scoreB > scoreA) return teamBId;
  return null; // Draw
}

/**
 * Generates round robin matches for a given list of teams in a group.
 * Using standard Circle Method scheduler so rounds are nicely balanced.
 */
export function generateRoundRobinMatches(
  tournamentId: string,
  groupId: string,
  teams: Team[],
  rulesetConfig: RulesetConfig,
  config: {
    startDateTime?: string;
    intervalMinutes?: number;
    courts?: string[];
  } = {}
): Match[] {
  const teamIds = teams.map(t => t.id);
  if (teamIds.length < 2) return [];

  const tempTeamIds = [...teamIds];
  const isOdd = tempTeamIds.length % 2 !== 0;
  if (isOdd) {
    tempTeamIds.push('BYE'); // Virtual team to balance odd numbers
  }

  const numTeams = tempTeamIds.length;
  const numRounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;
  const matches: { teamA: string; teamB: string }[] = [];

  for (let round = 0; round < numRounds; round++) {
    for (let matchIdx = 0; matchIdx < matchesPerRound; matchIdx++) {
      const home = (round + matchIdx) % (numTeams - 1);
      let away = (numTeams - 1 - matchIdx + round) % (numTeams - 1);

      if (matchIdx === 0) {
        away = numTeams - 1;
      }

      const teamA = tempTeamIds[home];
      const teamB = tempTeamIds[away];

      if (teamA !== 'BYE' && teamB !== 'BYE') {
        // To randomize home/away somewhat based on round
        if (round % 2 === 0) {
          matches.push({ teamA, teamB });
        } else {
          matches.push({ teamA: teamB, teamB: teamA });
        }
      }
    }
  }

  // Map to full Match interface and assign court / scheduling times
  const startDate = config.startDateTime ? new Date(config.startDateTime) : new Date();
  const interval = config.intervalMinutes || 30;
  const courts = config.courts && config.courts.length > 0 ? config.courts : ['Sân 1'];

  return matches.map((pair, index) => {
    // Schedule courts sequentially
    const courtIdx = index % courts.length;
    const matchTimeOffsetSlot = Math.floor(index / courts.length);
    const scheduledTime = new Date(startDate.getTime() + matchTimeOffsetSlot * interval * 60 * 1000);

    const segments: MatchSegment[] = rulesetConfig.match.contents.map((content, idx) => {
      const targetScore = rulesetConfig.match.segmentTargetsByOrder[idx] || rulesetConfig.match.winScore;
      return {
        id: `seg_${pair.teamA}_${pair.teamB}_${idx + 1}`,
        segmentKey: content.key,
        name: content.name,
        segmentOrder: idx + 1,
        targetScore,
        status: 'pending',
        playerIdsA: [],
        playerIdsB: []
      };
    });

    const defaultOrder = rulesetConfig.match.contents.map(c => c.key);

    return {
      id: `match_${groupId}_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      tournamentId,
      groupId,
      stage: 'group',
      teamAId: pair.teamA,
      teamBId: pair.teamB,
      court: courts[courtIdx],
      scheduledAt: scheduledTime.toISOString().slice(0, 16), // Format for input datetime-local
      status: 'scheduled',
      scoreA: null,
      scoreB: null,
      winnerTeamId: null,
      segmentsOrder: defaultOrder,
      segments,
      scoreEvents: [],
      activeSegmentIndex: 0,
      lineupLocked: false,
      note: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

/**
 * Deterministic seed-based random number generator.
 */
export function seededRandom(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates Shuffle utilizing deterministic seeded PRNG.
 */
function shuffle<T>(array: T[], randomFn: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Performs democratic seeded automated team draw mapping exactly 40 athletes to 8 teams.
 */
export function drawTeams(
  athletes: Athlete[],
  seed: string,
  config: RulesetConfig
): { teamAssignments: Record<string, string[]>; unassignedIds: string[] } {
  const rand = seededRandom(seed);
  
  // Filter registered/eligible athletes
  const males = shuffle(athletes.filter(a => a.gender === 'Nam'), rand);
  const females = shuffle(athletes.filter(a => a.gender === 'Nữ'), rand);

  const teamCount = config.team.count;
  const mPerTeam = config.team.composition.male;
  const fPerTeam = config.team.composition.female;

  const teamAssignments: Record<string, string[]> = {};
  
  // Initialize teams
  for (let i = 1; i <= teamCount; i++) {
    teamAssignments[`team_${i}`] = [];
  }

  let malePtr = 0;
  let femalePtr = 0;

  for (let i = 1; i <= teamCount; i++) {
    const teamId = `team_${i}`;
    
    // Assign males
    for (let m = 0; m < mPerTeam; m++) {
      if (malePtr < males.length) {
        teamAssignments[teamId].push(males[malePtr].id);
        malePtr++;
      }
    }

    // Assign females
    for (let f = 0; f < fPerTeam; f++) {
      if (femalePtr < females.length) {
        teamAssignments[teamId].push(females[femalePtr].id);
        femalePtr++;
      }
    }
  }

  // Get unassigned backups
  const unassignedIds: string[] = [];
  while (malePtr < males.length) {
    unassignedIds.push(males[malePtr].id);
    malePtr++;
  }
  while (femalePtr < females.length) {
    unassignedIds.push(females[femalePtr].id);
    femalePtr++;
  }

  return { teamAssignments, unassignedIds };
}

/**
 * Validates a single team lineup for the 3 segments of a relay-24 match.
 * Returns valid status and descriptive errors if rules are violated.
 */
export function validateTeamLineup(
  segments: { segmentKey: SegmentKey; playerIds: string[] }[],
  teamMembers: Athlete[],
  teamName: string,
  rulesetConfig: RulesetConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const teamMemberIds = teamMembers.map(m => m.id);
  const males = teamMembers.filter(m => m.gender === 'Nam');
  const females = teamMembers.filter(m => m.gender === 'Nữ');

  // Validate segment-by-segment sizes and genders based on rulesetConfig
  segments.forEach(seg => {
    const segConfig = rulesetConfig.match.contents.find(c => c.key === seg.segmentKey);
    if (!segConfig) {
      errors.push(`Chặng thi đấu với key "${seg.segmentKey}" không tồn tại trong cấu hình giải đấu.`);
      return;
    }

    const expectedPlayerCount = segConfig.requiredPlayers.male + segConfig.requiredPlayers.female;
    if (seg.playerIds.length !== expectedPlayerCount) {
      errors.push(`Chặng ${segConfig.name} của Đội ${teamName} phải đăng ký đúng ${expectedPlayerCount} vận động viên.`);
      return;
    }

    // Check member membership
    seg.playerIds.forEach(pid => {
      if (!teamMemberIds.includes(pid)) {
        const athName = teamMembers.find(m => m.id === pid)?.fullName || pid;
        errors.push(`VĐV ${athName} không thuộc danh sách Đội ${teamName}.`);
      }
    });

    const playersInSeg = teamMembers.filter(m => seg.playerIds.includes(m.id));
    const maleCount = playersInSeg.filter(p => p.gender === 'Nam').length;
    const femaleCount = playersInSeg.filter(p => p.gender === 'Nữ').length;

    // Validate expected male/female counts if composition checks are active (i.e. if composition male/female > 0)
    if (rulesetConfig.team.composition.male > 0 || rulesetConfig.team.composition.female > 0) {
      if (maleCount !== segConfig.requiredPlayers.male || femaleCount !== segConfig.requiredPlayers.female) {
        errors.push(`Chặng ${segConfig.name} của Đội ${teamName} phải gồm đúng ${segConfig.requiredPlayers.male} Nam và ${segConfig.requiredPlayers.female} Nữ.`);
      }
    }
  });

  // Roster usage constraints (only if all segments have valid number of players registered)
  const allFilled = segments.every(seg => {
    const segConfig = rulesetConfig.match.contents.find(c => c.key === seg.segmentKey);
    return segConfig && seg.playerIds.length === (segConfig.requiredPlayers.male + segConfig.requiredPlayers.female);
  });

  if (allFilled && segments.length === rulesetConfig.match.contents.length) {
    const appearances: Record<string, number> = {};
    teamMembers.forEach(m => {
      appearances[m.id] = 0;
    });

    segments.forEach(seg => {
      seg.playerIds.forEach(pid => {
        if (appearances[pid] !== undefined) {
          appearances[pid]++;
        }
      });
    });

    // Rule 1: Every team member must play at least once if allPlayersMustPlay is active
    if (rulesetConfig.team.allPlayersMustPlay) {
      const idlePlayers = teamMembers.filter(m => appearances[m.id] === 0);
      if (idlePlayers.length > 0) {
        const idleNames = idlePlayers.map(p => p.fullName).join(', ');
        errors.push(`Đội ${teamName} vi phạm: Tất cả thành viên bắt buộc phải ra sân ít nhất một lần. Thành viên chưa ra sân: ${idleNames}.`);
      }
    }

    // Rule 2: Gender-based limits from playerLimits
    males.forEach(m => {
      const count = appearances[m.id];
      const limit = rulesetConfig.team.playerLimits.male;
      if (count < limit.min || count > limit.max) {
        errors.push(`VĐV Nam "${m.fullName}" của Đội ${teamName} vi phạm số chặng thi đấu: đăng ký ${count} chặng (yêu cầu từ ${limit.min} đến ${limit.max}).`);
      }
    });

    females.forEach(f => {
      const count = appearances[f.id];
      const limit = rulesetConfig.team.playerLimits.female;
      if (count < limit.min || count > limit.max) {
        errors.push(`VĐV Nữ "${f.fullName}" của Đội ${teamName} vi phạm số chặng thi đấu: đăng ký ${count} chặng (yêu cầu từ ${limit.min} đến ${limit.max}).`);
      }
    });

    // Rule 3: Forbidden overlap checking
    if (rulesetConfig.match.forbiddenOverlap) {
      rulesetConfig.match.forbiddenOverlap.forEach(group => {
        teamMembers.forEach(member => {
          let countInGroup = 0;
          group.forEach(segKey => {
            const seg = segments.find(s => s.segmentKey === segKey);
            if (seg && seg.playerIds.includes(member.id)) {
              countInGroup++;
            }
          });
          if (countInGroup > 1) {
            const groupNames = group.map(k => rulesetConfig.match.contents.find(c => c.key === k)?.name || k).join(' và ');
            errors.push(`VĐV "${member.fullName}" của Đội ${teamName} vi phạm: Không được thi đấu trùng lặp ở cả hai chặng trong nhóm cấm trùng (${groupNames}).`);
          }
        });
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function getSegmentName(key: SegmentKey): string {
  if (key === 'mens_doubles') return 'Đôi Nam';
  if (key === 'womens_doubles') return 'Đôi Nữ';
  return 'Đôi Nam Nữ';
}

/**
 * Calculates standings inside a group. Supports manual head-to-head tie-breaker override.
 */
export function calculateStandings(
  teams: Team[],
  matches: Match[],
  scoringConfig: ScoringConfig,
  manualRanking?: string[]
): StandingRow[] {
  // Initialize row for each team
  const rowsMap: Record<string, StandingRow> = {};
  teams.forEach(team => {
    rowsMap[team.id] = {
      rank: 1,
      teamId: team.id,
      teamName: team.name,
      teamCode: team.code,
      played: 0,
      won: 0,
      lost: 0,
      points: 0,
      scoreFor: 0,
      scoreAgainst: 0,
      scoreDifference: 0,
      headToHeadHistory: {}
    };
  });

  const completedMatches = matches.filter(m => m.status === 'completed');

  completedMatches.forEach(match => {
    const rowA = rowsMap[match.teamAId];
    const rowB = rowsMap[match.teamBId];

    if (!rowA || !rowB) return;

    rowA.played += 1;
    rowB.played += 1;

    const sA = match.scoreA || 0;
    const sB = match.scoreB || 0;

    rowA.scoreFor += sA;
    rowA.scoreAgainst += sB;
    rowB.scoreFor += sB;
    rowB.scoreAgainst += sA;

    if (sA > sB) {
      rowA.won += 1;
      rowA.points += scoringConfig.pointsForWin;
      rowB.lost += 1;
      rowB.points += scoringConfig.pointsForLoss;
      rowA.headToHeadHistory[match.teamBId] = 'win';
      rowB.headToHeadHistory[match.teamAId] = 'loss';
    } else if (sB > sA) {
      rowB.won += 1;
      rowB.points += scoringConfig.pointsForWin;
      rowA.lost += 1;
      rowA.points += scoringConfig.pointsForLoss;
      rowB.headToHeadHistory[match.teamAId] = 'win';
      rowA.headToHeadHistory[match.teamBId] = 'loss';
    }
  });

  const rows = Object.values(rowsMap).map(row => {
    row.scoreDifference = row.scoreFor - row.scoreAgainst;
    return row;
  });

  // Standard comparison function
  const standardSort = (a: StandingRow, b: StandingRow): number => {
    // 1. Wins
    if (b.won !== a.won) return b.won - a.won;
    // 2. Score Difference
    if (b.scoreDifference !== a.scoreDifference) return b.scoreDifference - a.scoreDifference;
    // 3. Head to Head
    const directResult = a.headToHeadHistory[b.teamId];
    if (directResult === 'win') return -1;
    if (directResult === 'loss') return 1;
    // 4. Default to name alphabetical
    return a.teamName.localeCompare(b.teamName, 'vi');
  };

  // Sort rows based on standard criteria first
  rows.sort(standardSort);

  // Detect 2-way and 3-way ties
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i];
      const b = rows[j];
      
      if (a.won === b.won && a.scoreDifference === b.scoreDifference) {
        const h2h = a.headToHeadHistory[b.teamId];
        if (!h2h) {
          a.requiresAdminDecision = true;
          b.requiresAdminDecision = true;
          a.tieBreakReason = 'Hòa chỉ số phụ & Chưa đối đầu trực tiếp';
          b.tieBreakReason = 'Hòa chỉ số phụ & Chưa đối đầu trực tiếp';
        }
      }
    }
  }

  // Detect 3+ way circular tie loops
  const tiedGroups: Record<string, StandingRow[]> = {};
  rows.forEach(r => {
    const key = `${r.won}_${r.scoreDifference}`;
    if (!tiedGroups[key]) {
      tiedGroups[key] = [];
    }
    tiedGroups[key].push(r);
  });

  Object.values(tiedGroups).forEach(group => {
    if (group.length >= 3) {
      group.forEach(r => {
        r.requiresAdminDecision = true;
        r.tieBreakReason = `Hòa ${group.length} bên (cùng ${r.won} thắng, hiệu số ${r.scoreDifference}). Cần BTC phân định thủ công.`;
      });
    }
  });

  // Apply manual override ranking if defined
  if (manualRanking && manualRanking.length > 0) {
    rows.sort((a, b) => {
      const idxA = manualRanking.indexOf(a.teamId);
      const idxB = manualRanking.indexOf(b.teamId);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return standardSort(a, b);
    });
  }

  // Assign final rank placement
  rows.forEach((row, index) => {
    row.rank = index + 1;
  });

  return rows;
}

/**
 * Validates if an athlete can be assigned to a team.
 */
export function validateTeamAssignment(
  athlete: Athlete,
  assignedAthleteIds: Set<string>,
  teamMap: Record<string, string>
): { valid: boolean; warning?: string } {
  if (assignedAthleteIds.has(athlete.id)) {
    const existingTeamName = teamMap[athlete.id] || 'một đội khác';
    return {
      valid: false,
      warning: `Vận động viên "${athlete.fullName}" đã được gán vào đội "${existingTeamName}".`
    };
  }
  return { valid: true };
}

/**
 * Parses user bulk pasting text and returns athletes.
 */
export function parseAthleteBulkInput(inputText: string): Partial<Athlete>[] {
  if (!inputText || !inputText.trim()) return [];

  const lines = inputText.split(/\r?\n/);
  const parsedAthletes: Partial<Athlete>[] = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    let parts: string[] = [];
    if (line.includes('|')) {
      parts = line.split('|');
    } else if (line.includes('\t')) {
      parts = line.split('\t');
    } else if (line.includes(',')) {
      parts = line.split(',');
    } else {
      parts = [line];
    }

    parts = parts.map(p => p.trim());

    const fullName = parts[0] || '';
    if (!fullName) continue;

    const genderRaw = parts[1] || '';
    let gender: 'Nam' | 'Nữ' | 'Khác' | '' = '';
    const cleanGender = genderRaw.toLowerCase();
    if (cleanGender.startsWith('na') || cleanGender === 'm') {
      gender = 'Nam';
    } else if (cleanGender.startsWith('n') || cleanGender === 'f') {
      gender = 'Nữ';
    } else if (cleanGender) {
      gender = 'Khác';
    }

    const phone = parts[2] || '';
    const club = parts[3] || '';
    const skillLevel = parts[4] || '';
    const note = parts[5] || '';

    parsedAthletes.push({
      fullName,
      gender,
      phone,
      club,
      skillLevel,
      note,
      status: 'registered'
    });
  }

  return parsedAthletes;
}

/**
 * Replays all active Score Events for a match to compute accurate current scores,
 * active segments, and statuses. Source-of-truth based event replay.
 */
export function replayMatchEvents(match: Match): Match {
  const updatedMatch = { ...match };
  const events = (updatedMatch.scoreEvents || []).filter(e => !e.isUndone);
  const segments = (updatedMatch.segments || []).map(s => ({
    ...s,
    status: 'pending' as 'pending' | 'running' | 'completed',
    scoreAAtEnd: undefined,
    scoreBAtEnd: undefined
  }));

  let currentA = 0;
  let currentB = 0;
  let activeIdx = 0;

  // Replay score point events
  events.forEach((ev) => {
    if (activeIdx > 2) return;
    
    currentA = ev.scoreAAfter;
    currentB = ev.scoreBAfter;

    const currentSeg = segments[activeIdx];
    const target = currentSeg.targetScore;

    if (currentA === target || currentB === target) {
      currentSeg.status = 'completed';
      currentSeg.scoreAAtEnd = currentA;
      currentSeg.scoreBAtEnd = currentB;

      if (activeIdx < 2) {
        activeIdx++;
      }
    } else {
      currentSeg.status = 'running';
    }
  });

  // Calculate overall match status
  updatedMatch.scoreA = currentA;
  updatedMatch.scoreB = currentB;
  updatedMatch.segments = segments;
  updatedMatch.activeSegmentIndex = activeIdx;

  const currentSeg = segments[activeIdx];
  const isSegmentEnd = currentSeg && (currentA === currentSeg.targetScore || currentB === currentSeg.targetScore);

  if (isSegmentEnd) {
    if (activeIdx === 2) {
      updatedMatch.status = 'completed';
      updatedMatch.winnerTeamId = currentA > currentB ? updatedMatch.teamAId : updatedMatch.teamBId;
    } else {
      updatedMatch.status = 'segment_break';
    }
  } else {
    if (events.length > 0) {
      updatedMatch.status = 'ongoing';
      if (currentSeg) currentSeg.status = 'running';
    } else {
      updatedMatch.status = updatedMatch.lineupLocked ? 'ready' : 'lineup_ready';
    }
  }

  return updatedMatch;
}

/**
 * Adds a new score event point to a match.
 */
export function applyScoreEvent(match: Match, scoringTeamId: string): Match {
  const updatedMatch = { ...match };
  if (!updatedMatch.scoreEvents) updatedMatch.scoreEvents = [];
  
  // Calculate scores before this point
  const replayBefore = replayMatchEvents(updatedMatch);
  let nextA = replayBefore.scoreA || 0;
  let nextB = replayBefore.scoreB || 0;

  if (scoringTeamId === updatedMatch.teamAId) {
    nextA++;
  } else if (scoringTeamId === updatedMatch.teamBId) {
    nextB++;
  }

  const newEvent: ScoreEvent = {
    id: `ev_${updatedMatch.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    eventNo: updatedMatch.scoreEvents.filter(e => !e.isUndone).length + 1,
    scoringTeamId,
    scoreAAfter: nextA,
    scoreBAfter: nextB,
    isUndone: false,
    timestamp: new Date().toISOString()
  };

  updatedMatch.scoreEvents = [...updatedMatch.scoreEvents, newEvent];

  // Replay events to update state
  return replayMatchEvents(updatedMatch);
}

/**
 * Undoes the latest active score event in a match.
 */
export function undoLatestScorePoint(match: Match): Match {
  const updatedMatch = { ...match };
  if (!updatedMatch.scoreEvents || updatedMatch.scoreEvents.length === 0) return updatedMatch;

  // Find last active event and mark as undone
  const activeEvents = updatedMatch.scoreEvents.filter(e => !e.isUndone);
  if (activeEvents.length === 0) return updatedMatch;

  const lastActive = activeEvents[activeEvents.length - 1];
  
  updatedMatch.scoreEvents = updatedMatch.scoreEvents.map(e => 
    e.id === lastActive.id ? { ...e, isUndone: true, undoneReason: 'Referee Undo Action' } : e
  );

  // Replay events to compute corrected scores/states
  return replayMatchEvents(updatedMatch);
}

