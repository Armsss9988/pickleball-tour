import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  validateAllSections,
  TournamentSectionData,
  SectionValidationResult,
  getPublishReadiness,
  getOperationalReadiness,
} from '@golab/domain';
import { SectionStatusEnum } from '@golab/db';

@Injectable()
export class TournamentSectionValidatorService {
  constructor(private readonly prisma: PrismaService) {}

  async validateAll(tournamentId: string, tx?: any) {
    const client = tx || this.prisma;
    const data = await this.getTournamentSectionData(tournamentId, client);
    const results = validateAllSections(data);

    // Save each status to DB
    await this.persistSectionStatuses(tournamentId, results, client);

    return {
      results,
      publishReady: getPublishReadiness(results),
      operationalReady: getOperationalReadiness(results),
    };
  }

  async getTournamentSectionData(tournamentId: string, tx?: any): Promise<TournamentSectionData> {
    const client = tx || this.prisma;
    const tournament = await client.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      include: {
        ruleset: {
          include: {
            segmentDefinitions: true,
            teamCompositionRule: true,
            scoringConfig: true,
          },
        },
      },
    });

    // 1. Tournament Info
    const tournamentInfo = {
      name: tournament.name,
      openingTime: tournament.openingTime,
      venueName: tournament.venueName,
    };

    // 2. Ruleset
    const ruleset = tournament.ruleset
      ? {
          exists: true,
          hasSegments: tournament.ruleset.segmentDefinitions.length > 0,
          hasScoringConfig: !!tournament.ruleset.scoringConfig,
          teamSize: tournament.ruleset.teamCompositionRule?.teamSize ?? 0,
          maleCount: tournament.ruleset.teamCompositionRule?.maleCount ?? 0,
          femaleCount: tournament.ruleset.teamCompositionRule?.femaleCount ?? 0,
          matchFormat: tournament.ruleset.matchFormat,
          requireCourtConfig: tournament.ruleset.requireCourtConfig,
          requireScheduleConfig: tournament.ruleset.requireScheduleConfig,
        }
      : null;

    // 3. Players
    // Count players registered for this tournament
    const registrations = await client.tournamentRegistration.findMany({
      where: { tournamentId, status: 'APPROVED' },
      include: { playerProfile: true },
    });
    const players = {
      total: registrations.length,
      males: registrations.filter((r: any) => r.playerProfile.gender?.toUpperCase() === 'MALE').length,
      females: registrations.filter((r: any) => r.playerProfile.gender?.toUpperCase() === 'FEMALE').length,
    };

    // 4. Teams
    const dbTeams = await client.team.findMany({
      where: { tournamentId },
      include: {
        members: {
          include: { playerProfile: true },
        },
      },
    });

    const membersCounts = dbTeams.map((t: any) => t.members.length);
    const membersGenders = dbTeams.map((t: any) => ({
      teamId: t.id,
      males: t.members.filter((m: any) => m.playerProfile.gender?.toUpperCase() === 'MALE').length,
      females: t.members.filter((m: any) => m.playerProfile.gender?.toUpperCase() === 'FEMALE').length,
    }));

    const teams = {
      count: dbTeams.length,
      membersCounts,
      membersGenders,
    };

    // 5. Schedule
    const matches = await client.match.findMany({
      where: { tournamentId },
    });

    // Check conflict
    const hasCourtConflicts = await this.checkCourtConflicts(tournamentId, matches);

    const schedule = {
      matchCount: matches.length,
      allMatchesHaveTime: matches.length > 0 && matches.every((m: any) => !!m.scheduledTime),
      allMatchesHaveCourt: matches.length > 0 && matches.every((m: any) => !!m.courtId || !!m.courtName),
      hasCourtConflicts,
    };

    return {
      tournamentInfo,
      ruleset,
      players,
      teams,
      schedule,
    };
  }

  private async checkCourtConflicts(tournamentId: string, matches: any[]): Promise<boolean> {
    // A conflict is when two matches are scheduled on the same court at the same time.
    const courtTimeMap = new Map<string, string[]>();
    for (const match of matches) {
      if (!match.scheduledTime) continue;
      const courtKey = match.courtId || match.courtName;
      if (!courtKey) continue;
      const timeStr = new Date(match.scheduledTime).toISOString();
      const key = `${courtKey}_${timeStr}`;
      if (!courtTimeMap.has(key)) {
        courtTimeMap.set(key, []);
      }
      courtTimeMap.get(key)!.push(match.id);
    }

    for (const [_, matchIds] of courtTimeMap.entries()) {
      if (matchIds.length > 1) {
        return true;
      }
    }
    return false;
  }

  private async persistSectionStatuses(tournamentId: string, results: SectionValidationResult[], tx?: any) {
    const client = tx || this.prisma;
    for (const res of results) {
      const dbStatus = res.valid ? SectionStatusEnum.VALID : SectionStatusEnum.INVALID;
      await client.tournamentSectionStatus.upsert({
        where: {
          tournamentId_sectionKey: {
            tournamentId,
            sectionKey: res.section,
          },
        },
        create: {
          tournamentId,
          sectionKey: res.section,
          status: dbStatus,
          validatedAt: new Date(),
          errorDetails: res.errors,
        },
        update: {
          status: dbStatus,
          validatedAt: new Date(),
          errorDetails: res.errors,
        },
      });
    }
  }

  async markSectionNeedsReview(tournamentId: string, sectionKeys: string[], tx?: any) {
    const client = tx || this.prisma;
    for (const key of sectionKeys) {
      await client.tournamentSectionStatus.upsert({
        where: {
          tournamentId_sectionKey: {
            tournamentId,
            sectionKey: key,
          },
        },
        create: {
          tournamentId,
          sectionKey: key,
          status: SectionStatusEnum.NEEDS_REVIEW,
          validatedAt: new Date(),
          errorDetails: ['Cần được đánh giá lại sau thay đổi phụ thuộc'],
        },
        update: {
          status: SectionStatusEnum.NEEDS_REVIEW,
          validatedAt: new Date(),
          errorDetails: ['Cần được đánh giá lại sau thay đổi phụ thuộc'],
        },
      });
    }
  }
}
