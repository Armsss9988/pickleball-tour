import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LineupValidator } from '@golab/domain';
import { TeamDrawService } from '@golab/domain';
import { RulesetMapper } from '../ruleset/ruleset.mapper';
import { LineupStatus } from '@golab/contracts';

function toValidationPayload(value: unknown) {
  const source =
    typeof value === 'object' && value !== null
      ? (value as { valid?: unknown; errors?: unknown })
      : {};

  return {
    valid: source.valid === true,
    errors: Array.isArray(source.errors)
      ? source.errors.map((error) => String(error))
      : [],
  };
}

@Injectable()
export class LineupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Retrieves all segments and lineups for a specific match.
   */
  async getLineups(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
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
      },
    });

    if (!match) {
      throw new NotFoundException(`Không tìm thấy trận đấu.`);
    }

    return match;
  }

  /**
   * Draws a random play order for segments using a seed.
   */
  async drawSegmentOrder(
    matchId: string,
    seed: string | undefined,
    userId: string,
  ) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: {
          include: {
            ruleset: {
              include: { segmentDefinitions: true },
            },
          },
        },
        segments: true,
      },
    });

    if (!match) {
      throw new NotFoundException(`Không tìm thấy trận đấu.`);
    }

    const ruleset = match.tournament.ruleset;
    if (!ruleset) {
      throw new BadRequestException(`Trận đấu chưa có cấu hình luật.`);
    }

    if (match.status !== 'SCHEDULED' && match.status !== 'LINEUP_PENDING') {
      throw new BadRequestException(
        `Không thể xáo trộn thứ tự chặng đấu khi trận đấu ở trạng thái ${match.status}.`,
      );
    }

    const activeSeed = seed || `SEG-ORDER-${matchId}-${Date.now()}`;
    const rand = TeamDrawService.seededRandom(activeSeed);

    // Filter segments that are marked as drawable
    const drawableDefs = ruleset.segmentDefinitions.filter((s) => s.isDrawable);
    const nonDrawableDefs = ruleset.segmentDefinitions.filter(
      (s) => !s.isDrawable,
    );

    const shuffledKeys = TeamDrawService.shuffle(
      drawableDefs.map((d) => d.segmentKey),
      rand,
    );

    // Merge them back keeping non-drawable at their places or at the end
    const finalOrderKeys = [...shuffledKeys];
    for (const nonDrawable of nonDrawableDefs) {
      // Insert non-drawable at their original orderIndex if within bounds
      if (nonDrawable.orderIndex < finalOrderKeys.length) {
        finalOrderKeys.splice(
          nonDrawable.orderIndex,
          0,
          nonDrawable.segmentKey,
        );
      } else {
        finalOrderKeys.push(nonDrawable.segmentKey);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      for (const [idx, key] of finalOrderKeys.entries()) {
        await tx.matchSegment.update({
          where: { matchId_segmentKey: { matchId, segmentKey: key } },
          data: { segmentOrder: idx },
        });
      }

      // Also set match status to LINEUP_PENDING
      await tx.match.update({
        where: { id: matchId },
        data: { status: 'LINEUP_PENDING' },
      });

      await this.auditService.log({
        organizationId: match.organizationId,
        tournamentId: match.tournamentId,
        actorUserId: userId,
        action: 'MATCH_SEGMENT_ORDER_DRAWN',
        entityType: 'Match',
        entityId: matchId,
        afterData: { order: finalOrderKeys, seed: activeSeed },
      });

      return tx.matchSegment.findMany({
        where: { matchId },
        orderBy: { segmentOrder: 'asc' },
      });
    });
  }

  /**
   * Manually sets the play order of segments.
   */
  async setSegmentOrder(matchId: string, keys: string[], userId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { segments: true },
    });

    if (!match) {
      throw new NotFoundException(`Không tìm thấy trận đấu.`);
    }

    if (match.status !== 'SCHEDULED' && match.status !== 'LINEUP_PENDING') {
      throw new BadRequestException(`Không thể thay đổi thứ tự chặng đấu.`);
    }

    const matchSegKeys = match.segments.map((s) => s.segmentKey);
    const allMatchKeysPresent =
      keys.length === matchSegKeys.length &&
      keys.every((k) => matchSegKeys.includes(k));

    if (!allMatchKeysPresent) {
      throw new BadRequestException(
        `Danh sách chặng cung cấp không khớp với chặng cấu hình của trận đấu.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      for (const [idx, key] of keys.entries()) {
        await tx.matchSegment.update({
          where: { matchId_segmentKey: { matchId, segmentKey: key } },
          data: { segmentOrder: idx },
        });
      }

      await tx.match.update({
        where: { id: matchId },
        data: { status: 'LINEUP_PENDING' },
      });

      await this.auditService.log({
        organizationId: match.organizationId,
        tournamentId: match.tournamentId,
        actorUserId: userId,
        action: 'MATCH_SEGMENT_ORDER_MANUALLY_SET',
        entityType: 'Match',
        entityId: matchId,
        afterData: { order: keys },
      });

      return tx.matchSegment.findMany({
        where: { matchId },
        orderBy: { segmentOrder: 'asc' },
      });
    });
  }

  /**
   * Submits (and validates) lineups for Team A and/or Team B in a match.
   */
  async submitLineup(
    matchId: string,
    teamLineups: {
      teamId: string;
      segments: { segmentId: string; playerIds: string[] }[];
    }[],
    userId: string,
    roles: string[] = [],
  ) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: {
          include: {
            ruleset: {
              include: {
                segmentDefinitions: true,
                teamCompositionRule: true,
                playerLimitRules: true,
                overlapRules: true,
                scoringConfig: true,
              },
            },
          },
        },
        segments: true,
      },
    });

    if (!match) {
      throw new NotFoundException(`Không tìm thấy trận đấu.`);
    }

    const ruleset = match.tournament.ruleset;
    if (!ruleset) {
      throw new BadRequestException(`Giải đấu chưa cấu hình luật.`);
    }

    const rulesetVO = RulesetMapper.toDomain(ruleset);
    const isCaptain =
      roles.includes('CAPTAIN') &&
      !roles.includes('SUPER_ADMIN') &&
      !roles.includes('platform_owner') &&
      !roles.includes('organization_admin') &&
      !roles.includes('tournament_admin');

    if (isCaptain && teamLineups.length !== 1) {
      throw new ForbiddenException(
        'Đội trưởng chỉ được gửi lineup cho một đội của mình trong mỗi lần thao tác.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      for (const tLineup of teamLineups) {
        const team = await tx.team.findUnique({
          where: { id: tLineup.teamId },
          include: {
            captain: true,
            members: {
              include: { playerProfile: true },
            },
          },
        });

        if (!team) {
          throw new NotFoundException(
            `Không tìm thấy Đội với ID ${tLineup.teamId}.`,
          );
        }

        if (team.tournamentId !== match.tournamentId) {
          throw new BadRequestException(
            `Đội ${team.name} không thuộc giải đấu của trận này.`,
          );
        }

        if (
          tLineup.teamId !== match.teamAId &&
          tLineup.teamId !== match.teamBId
        ) {
          throw new BadRequestException(
            `Đội ${team.name} không tham gia trận đấu này.`,
          );
        }

        if (isCaptain && team.captain?.userId !== userId) {
          throw new ForbiddenException(
            'Bạn chỉ được gửi lineup cho đội mà mình đang phụ trách.',
          );
        }

        // Validate lineup against ruleset using the domain LineupValidator
        const validatorSegments = tLineup.segments.map((s) => {
          const matchSeg = match.segments.find((ms) => ms.id === s.segmentId);
          if (!matchSeg) {
            throw new BadRequestException(
              `Chặng đấu ID ${s.segmentId} không thuộc trận đấu này.`,
            );
          }
          return {
            segmentKey: matchSeg.segmentKey,
            playerIds: s.playerIds,
          };
        });

        const validatorMembers = team.members.map((m) => ({
          id: m.playerProfile.id,
          fullName: m.playerProfile.fullName,
          gender: m.playerProfile.gender,
        }));

        const validationResult = LineupValidator.validate(
          validatorSegments,
          validatorMembers,
          team.name,
          rulesetVO,
        );

        const status = validationResult.valid
          ? ('VALID' as LineupStatus)
          : ('INVALID' as LineupStatus);
        const validationPayload = toValidationPayload(validationResult);

        // Process segment by segment in database
        for (const s of tLineup.segments) {
          // Upsert MatchLineup record
          const lineup = await tx.matchLineup.upsert({
            where: {
              segmentId_teamId: {
                segmentId: s.segmentId,
                teamId: tLineup.teamId,
              },
            },
            update: {
              status,
              validationResult: validationPayload,
              submittedById: userId,
              submittedAt: new Date(),
            },
            create: {
              organizationId: match.organizationId,
              tournamentId: match.tournamentId,
              matchId,
              segmentId: s.segmentId,
              teamId: tLineup.teamId,
              status,
              validationResult: validationPayload,
              submittedById: userId,
            },
          });

          // Delete existing players for this lineup
          await tx.matchLineupPlayer.deleteMany({
            where: { matchLineupId: lineup.id },
          });

          // Create new players
          for (const [slot, playerProfileId] of s.playerIds.entries()) {
            await tx.matchLineupPlayer.create({
              data: {
                organizationId: match.organizationId,
                tournamentId: match.tournamentId,
                matchLineupId: lineup.id,
                playerProfileId,
                slotNo: slot + 1,
              },
            });
          }
        }

        await this.auditService.log({
          organizationId: match.organizationId,
          tournamentId: match.tournamentId,
          actorUserId: userId,
          action: 'LINEUP_SUBMITTED',
          entityType: 'Team',
          entityId: tLineup.teamId,
          afterData: {
            valid: validationResult.valid,
            errors: validationResult.errors,
          },
        });
      }

      // Re-fetch match to check if all lineups are submitted and valid
      const matchLineups = await tx.matchLineup.findMany({
        where: { matchId },
      });

      const expectedCount = match.segments.length * 2;
      const allValid =
        matchLineups.length === expectedCount &&
        matchLineups.every(
          (l) => l.status === 'VALID' || l.status === 'LOCKED',
        );

      if (allValid) {
        await tx.match.update({
          where: { id: matchId },
          data: { status: 'LINEUP_READY' },
        });
      } else {
        await tx.match.update({
          where: { id: matchId },
          data: { status: 'LINEUP_PENDING' },
        });
      }

      return this.getLineups(matchId);
    });
  }

  /**
   * Locks the lineups for both teams in a match.
   */
  async lockLineups(matchId: string, userId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { segments: true },
    });

    if (!match) {
      throw new NotFoundException(`Không tìm thấy trận đấu.`);
    }

    const lineups = await this.prisma.matchLineup.findMany({
      where: { matchId },
    });

    const expectedCount = match.segments.length * 2;
    const canLock =
      lineups.length === expectedCount &&
      lineups.every((l) => l.status === 'VALID');

    if (!canLock) {
      throw new BadRequestException(
        `Không thể khóa đội hình. Vui lòng đảm bảo rằng cả hai đội đã nhập đầy đủ và hợp lệ đội hình cho cả 3 chặng.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.matchLineup.updateMany({
        where: { matchId },
        data: {
          status: 'LOCKED',
          lockedAt: new Date(),
        },
      });

      // Update match to READY state
      await tx.match.update({
        where: { id: matchId },
        data: { status: 'READY' },
      });

      await this.auditService.log({
        organizationId: match.organizationId,
        tournamentId: match.tournamentId,
        actorUserId: userId,
        action: 'LINEUP_LOCKED',
        entityType: 'Match',
        entityId: matchId,
      });

      return this.getLineups(matchId);
    });
  }
}
