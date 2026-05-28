export interface TeamRankingInput {
  id: string;
  name: string;
  code: string;
}

export interface MatchResultRankingInput {
  teamAId: string;
  teamBId: string;
  teamAScore: number;
  teamBScore: number;
  winnerTeamId: string | null;
  status: string; // e.g. "COMPLETED" or "RESULT_CONFIRMED"
}

export interface StandingRow {
  teamId: string;
  teamName: string;
  teamCode: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  points: number; // Standing table points (e.g. 3 for win)
  rank: number | null;
  requiresAdminDecision: boolean;
  tieBreakReason?: string;
  headToHeadHistory: Record<string, 'win' | 'loss' | 'none'>;
}

export class StandingCalculator {
  /**
   * Calculates standings for a group.
   * 
   * @param teams List of teams in the group
   * @param matches List of matches played by these teams
   * @param pointsForWin Points awarded for a win (typically 3)
   * @param pointsForLoss Points awarded for a loss (typically 0)
   * @param manualRankingOverride Optional list of team IDs in preferred rank order
   */
  public static calculate(
    teams: TeamRankingInput[],
    matches: MatchResultRankingInput[],
    pointsForWin: number,
    pointsForLoss: number,
    manualRankingOverride?: string[]
  ): StandingRow[] {
    const rowsMap = new Map<string, StandingRow>();

    // 1. Initialize standing rows
    for (const team of teams) {
      rowsMap.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        teamCode: team.code,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointDiff: 0,
        points: 0,
        rank: null,
        requiresAdminDecision: false,
        headToHeadHistory: {},
      });
    }

    // 2. Accumulate match statistics
    const completedMatches = matches.filter(
      (m) => m.status === 'COMPLETED' || m.status === 'RESULT_CONFIRMED'
    );

    for (const match of completedMatches) {
      const rowA = rowsMap.get(match.teamAId);
      const rowB = rowsMap.get(match.teamBId);

      if (!rowA || !rowB) continue;

      rowA.matchesPlayed++;
      rowB.matchesPlayed++;

      rowA.pointsFor += match.teamAScore;
      rowA.pointsAgainst += match.teamBScore;
      rowB.pointsFor += match.teamBScore;
      rowB.pointsAgainst += match.teamAScore;

      if (match.winnerTeamId === match.teamAId) {
        rowA.wins++;
        rowA.points += pointsForWin;
        rowB.losses++;
        rowB.points += pointsForLoss;
        rowA.headToHeadHistory[match.teamBId] = 'win';
        rowB.headToHeadHistory[match.teamAId] = 'loss';
      } else if (match.winnerTeamId === match.teamBId) {
        rowB.wins++;
        rowB.points += pointsForWin;
        rowA.losses++;
        rowA.points += pointsForLoss;
        rowB.headToHeadHistory[match.teamAId] = 'win';
        rowA.headToHeadHistory[match.teamBId] = 'loss';
      }
    }

    const rows = Array.from(rowsMap.values()).map((row) => {
      row.pointDiff = row.pointsFor - row.pointsAgainst;
      return row;
    });

    // 3. Define sorting logic
    const standardSort = (a: StandingRow, b: StandingRow): number => {
      // Rule 1: Wins (most wins first)
      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }
      // Rule 2: Point difference (highest point diff first)
      if (b.pointDiff !== a.pointDiff) {
        return b.pointDiff - a.pointDiff;
      }
      // Rule 3: Direct head-to-head
      const direct = a.headToHeadHistory[b.teamId];
      if (direct === 'win') return -1;
      if (direct === 'loss') return 1;
      
      // Rule 4: Default alphabetically by code/name
      return a.teamCode.localeCompare(b.teamCode);
    };

    // Sort using standard rules
    rows.sort(standardSort);

    // 4. Check for ties and identify unresolved ones
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const a = rows[i];
        const b = rows[j];

        if (a.wins === b.wins && a.pointDiff === b.pointDiff) {
          const h2h = a.headToHeadHistory[b.teamId];
          if (!h2h || h2h === 'none') {
            // No direct match occurred yet or tie
            a.requiresAdminDecision = true;
            b.requiresAdminDecision = true;
            a.tieBreakReason = 'Hòa chỉ số phụ & Chưa đối đầu trực tiếp';
            b.tieBreakReason = 'Hòa chỉ số phụ & Chưa đối đầu trực tiếp';
          }
        }
      }
    }

    // Detect 3+ way circular ties (same wins and point diff)
    const tiedGroups = new Map<string, StandingRow[]>();
    for (const r of rows) {
      const key = `${r.wins}_${r.pointDiff}`;
      if (!tiedGroups.has(key)) {
        tiedGroups.set(key, []);
      }
      tiedGroups.get(key)!.push(r);
    }

    for (const [key, group] of tiedGroups.entries()) {
      if (group.length >= 3) {
        for (const r of group) {
          r.requiresAdminDecision = true;
          r.tieBreakReason = `Hòa ${group.length} bên (cùng ${r.wins} thắng, hiệu số ${r.pointDiff}). Cần BTC phân định thủ công.`;
        }
      }
    }

    // 5. Apply manual ranking override if present
    if (manualRankingOverride && manualRankingOverride.length > 0) {
      rows.sort((a, b) => {
        const idxA = manualRankingOverride.indexOf(a.teamId);
        const idxB = manualRankingOverride.indexOf(b.teamId);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return standardSort(a, b);
      });
    }

    // 6. Assign final ranks
    rows.forEach((row, index) => {
      row.rank = index + 1;
    });

    return rows;
  }
}
