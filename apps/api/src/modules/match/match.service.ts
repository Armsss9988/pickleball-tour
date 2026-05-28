import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MatchMapper } from './match.mapper';
import { MatchStatus } from '@golab/contracts';

@Injectable()
export class MatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
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
        segments: {
          orderBy: { segmentOrder: 'asc' },
        },
        result: true,
      },
      orderBy: { matchNo: 'asc' },
    });
  }

  /**
   * Fetches full details for a match, including segments, lineups, results and active score events.
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
      },
    });

    if (!match) {
      throw new NotFoundException(`Không tìm thấy trận đấu với ID ${matchId}.`);
    }

    return match;
  }

  /**
   * Starts a match by transitioning its status to RUNNING.
   * Precondition: All 6 lineups (3 segments * 2 teams) must be locked.
   */
  async startMatch(matchId: string, userId: string) {
    const match = await this.findOne(matchId);

    const domainMatch = MatchMapper.toDomain(match);
    domainMatch.transitionTo('RUNNING');

    // Load lineups for this match
    const lineups = await this.prisma.matchLineup.findMany({
      where: { matchId },
    });

    // We must have exactly 6 lineups (3 segments * 2 teams)
    const expectedLineupCount = match.segments.length * 2;
    const allLocked = lineups.length === expectedLineupCount && lineups.every((l) => l.status === 'LOCKED');

    if (!allLocked) {
      throw new BadRequestException(
        `Đội hình (lineup) chưa sẵn sàng. Cần phải khóa (lock) đội hình cho tất cả các chặng đấu của cả 2 đội.`
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.match.update({
        where: { id: matchId },
        data: MatchMapper.toPersistence(domainMatch),
      });

      // Update the first segment to RUNNING as well
      const firstSeg = match.segments[0];
      if (firstSeg) {
        await tx.matchSegment.update({
          where: { id: firstSeg.id },
          data: { status: 'RUNNING' },
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

      return updated;
    });
  }
}
