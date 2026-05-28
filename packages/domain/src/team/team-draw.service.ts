import { Gender } from '@golab/contracts';

export interface DrawPlayerInput {
  id: string;
  fullName: string;
  gender: Gender;
}

export interface DrawTeamCompositionInput {
  teamSize: number;
  maleCount: number;
  femaleCount: number;
}

export interface DrawnTeamResult {
  teamNo: number;
  name: string;
  code: string;
  players: DrawPlayerInput[];
}

export interface DrawTeamsResult {
  teams: DrawnTeamResult[];
  backups: DrawPlayerInput[];
}

export class TeamDrawService {
  /**
   * Deterministic seed-based pseudorandom number generator.
   */
  public static seededRandom(seed: string): () => number {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
  }

  /**
   * Fisher-Yates shuffle utilizing a custom random number generator.
   */
  public static shuffle<T>(array: T[], randomFn: () => number): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(randomFn() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Performs the team draw by distributing players into balanced teams based on gender rules.
   */
  public static draw(
    players: DrawPlayerInput[],
    composition: DrawTeamCompositionInput,
    seed: string,
    requestedTeamCount?: number
  ): DrawTeamsResult {
    const rand = this.seededRandom(seed);

    // 1. Separate and shuffle by gender
    const males = this.shuffle(
      players.filter((p) => p.gender === 'MALE'),
      rand
    );
    const females = this.shuffle(
      players.filter((p) => p.gender === 'FEMALE'),
      rand
    );

    // 2. Determine number of teams
    // If not requested, auto-calculate based on limits and player pool
    const maxTeamsByMales = composition.maleCount > 0 ? Math.floor(males.length / composition.maleCount) : 999;
    const maxTeamsByFemales = composition.femaleCount > 0 ? Math.floor(females.length / composition.femaleCount) : 999;
    
    let teamCount = Math.min(maxTeamsByMales, maxTeamsByFemales);
    if (requestedTeamCount !== undefined && requestedTeamCount > 0) {
      teamCount = Math.min(teamCount, requestedTeamCount);
    }

    if (teamCount <= 0) {
      return { teams: [], backups: players };
    }

    // 3. Initialize teams
    const teams: DrawnTeamResult[] = [];
    for (let i = 1; i <= teamCount; i++) {
      // Standard naming "Đội 1", "Đội 2", code "A", "B", ...
      const code = String.fromCharCode(64 + i); // A, B, C...
      teams.push({
        teamNo: i,
        name: `Đội ${i}`,
        code,
        players: [],
      });
    }

    let malePtr = 0;
    let femalePtr = 0;

    // 4. Distribute gender-balanced players to teams
    for (const team of teams) {
      // Add males
      for (let m = 0; m < composition.maleCount; m++) {
        if (malePtr < males.length) {
          team.players.push(males[malePtr]);
          malePtr++;
        }
      }
      // Add females
      for (let f = 0; f < composition.femaleCount; f++) {
        if (femalePtr < females.length) {
          team.players.push(females[femalePtr]);
          femalePtr++;
        }
      }
    }

    // 5. Unassigned players become backups
    const backups: DrawPlayerInput[] = [];
    while (malePtr < males.length) {
      backups.push(males[malePtr]);
      malePtr++;
    }
    while (femalePtr < females.length) {
      backups.push(females[femalePtr]);
      femalePtr++;
    }

    return { teams, backups };
  }
}
