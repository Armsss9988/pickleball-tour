import { ValidationError } from '../shared/errors.base';

export interface SchedulePairing {
  teamA: string;
  teamB: string;
}

export class ScheduleGeneratorService {
  /**
   * Generates round-robin matchups for a list of team IDs using the Circle Method.
   */
  public static generateRoundRobin(teamIds: string[]): SchedulePairing[] {
    if (teamIds.length < 2) {
      return [];
    }

    const tempTeamIds = [...teamIds];
    const isOdd = tempTeamIds.length % 2 !== 0;
    if (isOdd) {
      tempTeamIds.push('BYE'); // Balance odd numbers
    }

    const numTeams = tempTeamIds.length;
    const numRounds = numTeams - 1;
    const matchesPerRound = numTeams / 2;
    const pairings: SchedulePairing[] = [];

    for (let round = 0; round < numRounds; round++) {
      for (let matchIdx = 0; matchIdx < matchesPerRound; matchIdx++) {
        const home = (round + matchIdx) % (numTeams - 1);
        let away = (numTeams - 1 - matchIdx + round) % (numTeams - 1);

        if (matchIdx === 0) {
          away = numTeams - 1;
        }

        const teamA = tempTeamIds[home];
        const teamB = tempTeamIds[away];

        if (teamA && teamB && teamA !== 'BYE' && teamB !== 'BYE') {
          if (round % 2 === 0) {
            pairings.push({ teamA, teamB });
          } else {
            pairings.push({ teamA: teamB, teamB: teamA });
          }
        }
      }
    }

    return pairings;
  }
}
