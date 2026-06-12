import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MatchMapper } from './match.mapper';
import { MatchStatus } from '@golab/contracts';
import { TournamentSectionValidatorService } from '../tournament/tournament-section-validator.service';
import { ScoreGateway } from '../../gateways/score.gateway';

@Injectable()
export class MatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly validatorService: TournamentSectionValidatorService,
    private readonly scoreGateway: ScoreGateway,
  ) {}

  /**
   * Retrieves matches for a tournament based on filters.
   */
  async getMatches(
    tournamentId: string,
    filter: { stageId?: string; groupId?: string; status?: MatchStatus }
  ) {
    const whereClause: any = {
      tournamentId,
    };

    if (filter.stageId) {
      whereClause.stageId = filter.stageId;
    }
    if (filter.groupId) {
      whereClause.groupId = filter.groupId;
    }
    if (filter.status) {
      whereClause.status = filter.status;
    }

    return this.prisma.match.findMany({
      where: whereClause,
      include: {
        teamA: true,
        teamB: true,
        group: true,
        segments: {
          orderBy: { segmentOrder: 'asc' },
        },
        result: true,
        court: true,
      },
      orderBy: { matchNo: 'asc' },
    });
  }

  /**
   * Fetches full details for a match.
   */
  async findOne(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: {
          include: {
            members: {
              include: { playerProfile: true },
            },
          },
        },
        teamB: {
          include: {
            members: {
              include: { playerProfile: true },
            },
          },
        },
        segments: {
          orderBy: { segmentOrder: 'asc' },
        },
        lineups: {
          include: {
            players: {
              include: { playerProfile: true },
            },
          },
        },
        scoreEvents: {
          where: { isUndone: false },
          orderBy: { eventNo: 'asc' },
        },
        result: true,
        court: true,
        tournament: {
          include: {
            ruleset: true,
          },
        },
      },
    });

    if (!match) {
      throw new NotFoundException(`Không tìm thấy trận đấu với ID ${matchId}.`);
    }

    return match;
  }

  /**
   * Starts a match by transitioning its status to RUNNING.
   */
  async startMatch(matchId: string, userId: string) {
    const match = await this.findOne(matchId);

    const lineups = await this.prisma.matchLineup.findMany({
      where: { matchId },
    });

    const format = match.tournament?.ruleset?.matchFormat || 'relay';
    const expectedLineupCount = format === 'relay' ? match.segments.length * 2 : 2;
    const allLocked = lineups.length === expectedLineupCount && lineups.every((l) => l.status === 'LOCKED');
    const requireLineup = match.tournament?.ruleset?.requireLineup ?? true;

    if (requireLineup && !allLocked) {
      throw new BadRequestException(
        `Đội hình (lineup) chưa sẵn sàng. Cần phải khóa (lock) đội hình của cả 2 đội.`
      );
    }

    const domainMatch = MatchMapper.toDomain(match);
    
    if (
      domainMatch.status === 'SCHEDULED' ||
      domainMatch.status === 'LINEUP_PENDING' ||
      domainMatch.status === 'LINEUP_READY'
    ) {
      domainMatch.transitionTo('READY');
    }
    
    domainMatch.transitionTo('RUNNING');

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.match.update({
        where: { id: matchId },
        data: MatchMapper.toPersistence(domainMatch),
      });

      const firstSeg = match.segments[0];
      if (firstSeg) {
        await tx.matchSegment.update({
          where: { id: firstSeg.id },
          data: { status: 'RUNNING' },
        });
      }

      // Auto-transition tournament → RUNNING when the first match starts
      const preOngoingStatuses = ['GROUP_ASSIGNED', 'SCHEDULE_GENERATED', 'TEAM_DRAW_COMPLETED', 'PUBLISHED'];
      if (preOngoingStatuses.includes(match.tournament?.status ?? '')) {
        await tx.tournament.update({
          where: { id: match.tournamentId },
          data: { status: 'RUNNING' as any },
        });
      }

      await this.auditService.log({
        organizationId: match.organizationId,
        tournamentId: match.tournamentId,
        actorUserId: userId,
        action: 'MATCH_STARTED',
        entityType: 'Match',
        entityId: matchId,
        beforeData: { status: match.status },
        afterData: { status: 'RUNNING' },
      });

      return u;
    });

    // Broadcast WebSocket update so that clients/spectators know the match started in real-time!
    const firstSeg = match.segments[0];
    this.scoreGateway.broadcastScoreUpdate(matchId, match.tournamentId, {
      matchId,
      tournamentId: match.tournamentId,
      scoreA: 0,
      scoreB: 0,
      matchStatus: 'RUNNING',
      activeSegment: firstSeg
        ? {
            id: firstSeg.id,
            order: firstSeg.segmentOrder,
            name: firstSeg.name,
            targetScore: firstSeg.targetScore,
            status: 'RUNNING',
          }
        : null,
    });

    return updated;
  }

  /**
   * Deletes a match manually.
   */
  async deleteMatch(matchId: string, userId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });
    if (!match) {
      throw new NotFoundException('Không tìm thấy trận đấu.');
    }

    if (match.status !== 'SCHEDULED') {
      throw new BadRequestException('Chỉ có thể xóa trận đấu ở trạng thái SCHEDULED.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.matchSegment.deleteMany({ where: { matchId } });
      await tx.matchLineupPlayer.deleteMany({ where: { matchLineup: { matchId } } });
      await tx.matchLineup.deleteMany({ where: { matchId } });
      await tx.match.delete({ where: { id: matchId } });
    });

    await this.auditService.log({
      organizationId: match.organizationId,
      tournamentId: match.tournamentId,
      actorUserId: userId,
      action: 'MATCH_DELETED',
      entityType: 'Match',
      entityId: matchId,
      beforeData: match,
    });

    await this.validatorService.validateAll(match.tournamentId);

    return { deleted: true };
  }
}
