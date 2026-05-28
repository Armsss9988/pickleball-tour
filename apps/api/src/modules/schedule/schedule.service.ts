import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ScheduleGeneratorService } from '@golab/domain';
import { MatchStatus, SegmentStatus } from '@golab/contracts';

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  /**
   * Generates the round-robin schedule for the group stage of a tournament.
   */
  async generateGroupStageSchedule(tournamentId: string, userId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        ruleset: {
          include: {
            segmentDefinitions: true,
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

    if (tournament.status !== 'GROUP_ASSIGNED') {
      throw new BadRequestException(
        `Không thể tạo lịch thi đấu ở trạng thái ${tournament.status}. Hãy hoàn thành phân bảng trước.`
      );
    }

    const ruleset = tournament.ruleset;
    if (!ruleset || ruleset.segmentDefinitions.length === 0) {
      throw new BadRequestException(`Giải đấu chưa có cấu hình luật hoặc chặng thi đấu.`);
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

      const courts = ['Sân 1', 'Sân 2']; // Default courts
      const intervalMinutes = 45; // Default match duration slot
      const startDate = tournament.openingTime || new Date();

      let matchNoCounter = 1;

      for (const group of tournament.groups) {
        const teamIds = group.groupTeams.map((gt) => gt.teamId);
        if (teamIds.length < 2) continue;

        const pairings = ScheduleGeneratorService.generateRoundRobin(teamIds);

        // Create match records
        for (let idx = 0; idx < pairings.length; idx++) {
          const pair = pairings[idx];
          if (!pair) continue;

          const courtIdx = idx % courts.length;
          const timeSlot = Math.floor(idx / courts.length);
          const scheduledTime = new Date(startDate.getTime() + timeSlot * intervalMinutes * 60 * 1000);

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
              courtName: courts[courtIdx],
              scheduledTime,
            },
          });

          // Create segments for this match
          const sortedRulesetSegs = [...ruleset.segmentDefinitions].sort(
            (a, b) => a.orderIndex - b.orderIndex
          );

          for (let segIdx = 0; segIdx < sortedRulesetSegs.length; segIdx++) {
            const rSeg = sortedRulesetSegs[segIdx];
            if (!rSeg) continue;
            await tx.matchSegment.create({
              data: {
                organizationId: tournament.organizationId,
                tournamentId,
                matchId: match.id,
                segmentOrder: segIdx, // 0-indexed for consistency
                segmentKey: rSeg.segmentKey,
                name: rSeg.name,
                targetScore: rSeg.targetScore,
                status: 'PENDING' as SegmentStatus,
              },
            });
          }

          matchNoCounter++;
        }
      }

      // Transition tournament status to SCHEDULE_GENERATED
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: 'SCHEDULE_GENERATED' },
      });

      await this.auditService.log({
        organizationId: tournament.organizationId,
        tournamentId,
        actorUserId: userId,
        action: 'SCHEDULE_GENERATED',
        entityType: 'Tournament',
        entityId: tournamentId,
      });

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
   * Updates scheduling details for a specific match (e.g. court and start time).
   */
  async updateMatchSchedule(
    matchId: string,
    scheduledTime: string | null,
    courtName: string | null,
    matchNo: number | null,
    userId: string
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

    return updated;
  }
}
