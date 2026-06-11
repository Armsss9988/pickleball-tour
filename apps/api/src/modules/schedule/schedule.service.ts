import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ScheduleGeneratorService } from '@golab/domain';
import { MatchStatus, SegmentStatus } from '@golab/contracts';
import { TournamentSectionValidatorService } from '../tournament/tournament-section-validator.service';

interface GenerateScheduleOptions {
  durationMinutes?: number;
  startTime?: string;
}

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly validatorService: TournamentSectionValidatorService,
  ) {}

  private formatCourtLabel(court: { name: string; venueName?: string | null }) {
    return court.venueName?.trim() ? `${court.venueName.trim()} - ${court.name}` : court.name;
  }

  private getDurationMinutes(value: number | undefined) {
    const duration = Number(value ?? 30);

    if (!Number.isFinite(duration) || duration < 10 || duration > 240) {
      throw new BadRequestException('Thời lượng mỗi trận phải nằm trong khoảng 10 đến 240 phút.');
    }

    return Math.trunc(duration);
  }

  private getStartDate(value: string | undefined, fallback: Date | null) {
    if (!value) {
      return fallback || new Date();
    }

    const startDate = new Date(value);
    if (Number.isNaN(startDate.getTime())) {
      throw new BadRequestException('Giờ bắt đầu sinh lịch không hợp lệ.');
    }

    return startDate;
  }

  /**
   * Generates the round-robin schedule for the group stage of a tournament.
   */
  async generateGroupStageSchedule(
    tournamentId: string,
    userId: string,
    options: GenerateScheduleOptions = {},
  ) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        ruleset: {
          include: {
            segmentDefinitions: true,
            scoringConfig: true,
          },
        },
        groups: {
          include: {
            groupTeams: true,
          },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException(`Không tìm thấy giải đấu.`);
    }

    const ruleset = tournament.ruleset;
    if (!ruleset) {
      throw new BadRequestException('Giải đấu chưa có cấu hình luật.');
    }
    if (ruleset.matchFormat === 'relay' && ruleset.segmentDefinitions.length === 0) {
      throw new BadRequestException('Giải đấu theo thể thức tiếp sức yêu cầu chặng thi đấu.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Find the group stage
      const stage = await tx.stage.findFirst({
        where: { tournamentId, type: 'GROUP' },
      });

      if (!stage) {
        throw new BadRequestException(`Không tìm thấy Vòng Bảng của giải đấu.`);
      }

      // Clear any existing matches for the group stage to allow regenerate
      // Delete segments first due to foreign keys
      await tx.matchSegment.deleteMany({
        where: { tournamentId, match: { stageId: stage.id } },
      });
      await tx.match.deleteMany({
        where: { tournamentId, stageId: stage.id },
      });

      // Default courts: fetch from DB if there are any, else default strings
      const dbCourts = await tx.court.findMany({
        where: { tournamentId, isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      const intervalMinutes = this.getDurationMinutes(options.durationMinutes);
      const startDate = this.getStartDate(options.startTime, tournament.openingTime);
      const fallbackCourts = ['Sân 1', 'Sân 2'];
      const courtCount = dbCourts.length > 0 ? dbCourts.length : fallbackCourts.length;

      let matchNoCounter = 1;
      let scheduleIndex = 0;

      for (const group of tournament.groups) {
        const teamIds = group.groupTeams.map((gt) => gt.teamId);
        if (teamIds.length < 2) continue;

        const pairings = ScheduleGeneratorService.generateRoundRobin(teamIds);

        // Create match records
        for (let idx = 0; idx < pairings.length; idx++) {
          const pair = pairings[idx];
          if (!pair) continue;

          // Assign court if courts exist in DB, otherwise use default names
          let courtId: string | null = null;
          let courtName: string | null = null;

          const courtIdx = scheduleIndex % courtCount;

          if (dbCourts.length > 0) {
            const court = dbCourts[courtIdx]!;
            courtId = court.id;
            courtName = this.formatCourtLabel(court);
          } else {
            courtName = fallbackCourts[courtIdx] || 'Sân 1';
          }

          const timeSlot = Math.floor(scheduleIndex / courtCount);
          const scheduledTime = new Date(
            startDate.getTime() + timeSlot * intervalMinutes * 60 * 1000,
          );

          const match = await tx.match.create({
            data: {
              organizationId: tournament.organizationId,
              tournamentId,
              stageId: stage.id,
              groupId: group.id,
              teamAId: pair.teamA,
              teamBId: pair.teamB,
              matchNo: matchNoCounter,
              roundNo: Math.floor(idx / 2) + 1,
              label: `${group.name} - Trận ${idx + 1}`,
              status: 'SCHEDULED' as MatchStatus,
              courtId,
              courtName,
              scheduledTime,
            },
          });

          // Create segments for this match
          const format = ruleset.matchFormat || 'relay';
          if (format === 'relay') {
            const sortedRulesetSegs = [...ruleset.segmentDefinitions].sort(
              (a, b) => a.orderIndex - b.orderIndex,
            );
            for (let segIdx = 0; segIdx < sortedRulesetSegs.length; segIdx++) {
              const rSeg = sortedRulesetSegs[segIdx];
              if (!rSeg) continue;
              await tx.matchSegment.create({
                data: {
                  organizationId: tournament.organizationId,
                  tournamentId,
                  matchId: match.id,
                  segmentOrder: segIdx,
                  segmentKey: rSeg.segmentKey,
                  name: rSeg.name,
                  targetScore: rSeg.targetScore,
                  status: 'PENDING' as SegmentStatus,
                },
              });
            }
          } else if (format === 'single_game') {
            await tx.matchSegment.create({
              data: {
                organizationId: tournament.organizationId,
                tournamentId,
                matchId: match.id,
                segmentOrder: 0,
                segmentKey: 'game',
                name: 'Trận đấu',
                targetScore: ruleset.scoringConfig?.winScore ?? 11,
                status: 'PENDING' as SegmentStatus,
              },
            });
          } else if (format === 'best_of') {
            const setsToWin = ruleset.scoringConfig?.setsToWin ?? 2;
            const maxSets = setsToWin * 2 - 1;
            const gamePointScore = ruleset.scoringConfig?.gamePointScore ?? 11;
            const lastSetPointScore = ruleset.scoringConfig?.lastSetPointScore ?? gamePointScore;

            for (let segIdx = 0; segIdx < maxSets; segIdx++) {
              const isLastSet = segIdx === maxSets - 1;
              const targetScore = isLastSet ? lastSetPointScore : gamePointScore;
              await tx.matchSegment.create({
                data: {
                  organizationId: tournament.organizationId,
                  tournamentId,
                  matchId: match.id,
                  segmentOrder: segIdx,
                  segmentKey: `set_${segIdx + 1}`,
                  name: `Set ${segIdx + 1}`,
                  targetScore,
                  status: 'PENDING' as SegmentStatus,
                },
              });
            }
          }

          matchNoCounter++;
          scheduleIndex++;
        }
      }

      await this.auditService.log({
        organizationId: tournament.organizationId,
        tournamentId,
        actorUserId: userId,
        action: 'SCHEDULE_GENERATED',
        entityType: 'Tournament',
        entityId: tournamentId,
      });

      // Trigger section validations
      await this.validatorService.validateAll(tournamentId, tx);

      return tx.match.findMany({
        where: { tournamentId, stageId: stage.id },
        include: {
          teamA: true,
          teamB: true,
          segments: true,
        },
        orderBy: { matchNo: 'asc' },
      });
    });
  }

  /**
   * Updates scheduling details for a specific match.
   */
  async updateMatchSchedule(
    matchId: string,
    scheduledTime: string | null,
    courtName: string | null,
    matchNo: number | null,
    userId: string,
    courtId?: string | null,
  ) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException(`Không tìm thấy trận đấu.`);
    }

    const updated = await this.prisma.match.update({
      where: { id: matchId },
      data: {
        scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
        courtName: courtName || null,
        courtId: courtId !== undefined ? courtId : undefined,
        matchNo: matchNo !== null ? matchNo : undefined,
      },
    });

    await this.auditService.log({
      organizationId: match.organizationId,
      tournamentId: match.tournamentId,
      actorUserId: userId,
      action: 'MATCH_SCHEDULE_UPDATED',
      entityType: 'Match',
      entityId: matchId,
      beforeData: match,
      afterData: updated,
    });

    // Re-validate scheduling and court conflicts
    await this.validatorService.validateAll(match.tournamentId);

    return updated;
  }
}
