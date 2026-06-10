import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StageType } from '@golab/contracts';

import { TournamentSectionValidatorService } from '../tournament/tournament-section-validator.service';

@Injectable()
export class GroupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly validatorService: TournamentSectionValidatorService,
  ) {}

  /**
   * Initializes the group stage (Vòng Bảng) and the two standard groups (Bảng A and B).
   */
  async initGroups(tournamentId: string, userId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException(`Không tìm thấy giải đấu.`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Create Stage
      let stage = await tx.stage.findFirst({
        where: { tournamentId, type: 'GROUP' as StageType },
      });

      if (!stage) {
        stage = await tx.stage.create({
          data: {
            organizationId: tournament.organizationId,
            tournamentId,
            name: 'Vòng Bảng',
            type: 'GROUP' as StageType,
            orderNo: 1,
            status: 'running',
          },
        });
      }

      // Create Group A
      let groupA = await tx.group.findFirst({
        where: { tournamentId, stageId: stage.id, code: 'A' },
      });
      if (!groupA) {
        groupA = await tx.group.create({
          data: {
            organizationId: tournament.organizationId,
            tournamentId,
            stageId: stage.id,
            name: 'Bảng A',
            code: 'A',
          },
        });
      }

      // Create Group B
      let groupB = await tx.group.findFirst({
        where: { tournamentId, stageId: stage.id, code: 'B' },
      });
      if (!groupB) {
        groupB = await tx.group.create({
          data: {
            organizationId: tournament.organizationId,
            tournamentId,
            stageId: stage.id,
            name: 'Bảng B',
            code: 'B',
          },
        });
      }

      await this.auditService.log({
        organizationId: tournament.organizationId,
        tournamentId,
        actorUserId: userId,
        action: 'GROUPS_INITIALIZED',
        entityType: 'Stage',
        entityId: stage.id,
      });

      return { stage, groups: [groupA, groupB] };
    });
  }

  /**
   * Assigns teams manually to groups A and B.
   */
  async assignTeams(
    tournamentId: string,
    assignment: { code: string; teamIds: string[] }[],
    userId: string,
  ) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException(`Không tìm thấy giải đấu.`);
    }

    const teamsCount = await this.prisma.team.count({
      where: { tournamentId },
    });

    if (teamsCount < 2) {
      throw new BadRequestException(
        `Phân bảng yêu cầu ít nhất 2 đội/entry. Hiện có ${teamsCount}.`,
      );
    }

    // 1. Perform validation checks
    if (assignment.length < 1) {
      throw new BadRequestException('Phải có ít nhất 1 bảng đấu.');
    }

    const allTeamIds = new Set<string>();
    for (const group of assignment) {
      if (group.teamIds.length < 2) {
        throw new BadRequestException(
          `Bảng ${group.code} phải có ít nhất 2 đội/entry (đang có ${group.teamIds.length}).`,
        );
      }
      for (const tid of group.teamIds) {
        if (allTeamIds.has(tid)) {
          throw new BadRequestException(
            'Một đội/entry không thể xuất hiện ở cả hai bảng.',
          );
        }
        allTeamIds.add(tid);
      }
    }

    if (allTeamIds.size !== teamsCount) {
      throw new BadRequestException(
        `Tổng số đội/entry phân bổ (${allTeamIds.size}) không khớp với số đội trong giải (${teamsCount}).`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Ensure stage and groups are initialized
      let stage = await tx.stage.findFirst({
        where: { tournamentId, type: 'GROUP' as StageType },
      });
      if (!stage) {
        stage = await tx.stage.create({
          data: {
            organizationId: tournament.organizationId,
            tournamentId,
            name: 'Vòng Bảng',
            type: 'GROUP' as StageType,
            orderNo: 1,
            status: 'running',
          },
        });
      }

      // Delete existing assignments for this stage
      await tx.groupTeam.deleteMany({
        where: { tournamentId },
      });

      for (const groupAssign of assignment) {
        let group = await tx.group.findFirst({
          where: { tournamentId, stageId: stage.id, code: groupAssign.code },
        });

        if (!group) {
          group = await tx.group.create({
            data: {
              organizationId: tournament.organizationId,
              tournamentId,
              stageId: stage.id,
              name: `Bảng ${groupAssign.code}`,
              code: groupAssign.code,
            },
          });
        }

        // Create group team assignments
        for (let idx = 0; idx < groupAssign.teamIds.length; idx++) {
          await tx.groupTeam.create({
            data: {
              organizationId: tournament.organizationId,
              tournamentId,
              groupId: group.id,
              teamId: groupAssign.teamIds[idx]!,
              seedOrder: idx + 1,
            },
          });
        }
      }

      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: 'GROUP_ASSIGNED' },
      });

      await this.auditService.log({
        organizationId: tournament.organizationId,
        tournamentId,
        actorUserId: userId,
        action: 'GROUP_ASSIGNMENT_CONFIRMED',
        entityType: 'Tournament',
        entityId: tournamentId,
        afterData: assignment,
      });

      // Trigger section validations
      await this.validatorService.validateAll(tournamentId);

      return this.getGroupsWithTeams(tournamentId);
    });
  }

  /**
   * Distributes teams/entries randomly into groups.
   * TEAM_EVENT default: 8 teams → 2 groups (A, B) of 4.
   * SINGLES/DOUBLES: flexible — divides N entries evenly into ceil(N/4) groups.
   */
  async randomAssign(tournamentId: string, userId: string) {
    const teams = await this.prisma.team.findMany({
      where: { tournamentId },
    });

    if (teams.length < 2) {
      throw new BadRequestException(
        `Cần ít nhất 2 đội/entry để phân bảng (hiện tại: ${teams.length}).`,
      );
    }

    // Shuffle entries
    const shuffled = [...teams].sort(() => Math.random() - 0.5);

    // Determine number of groups: default 2 groups, min 2 entries per group
    // For 2-7 entries: 1 group; 8+: ceil(N/4) groups up to max 8 groups
    const n = shuffled.length;
    let numGroups: number;
    if (n <= 7) {
      numGroups = 1;
    } else {
      numGroups = Math.min(8, Math.ceil(n / 4));
    }

    const groupCodes = 'ABCDEFGH'.split('').slice(0, numGroups);
    const assignment = groupCodes.map((code, i) => ({
      code,
      teamIds: shuffled
        .filter((_, idx) => idx % numGroups === i)
        .map((t) => t.id),
    }));

    return this.assignTeams(tournamentId, assignment, userId);
  }

  /**
   * Returns all groups in a tournament with their assigned teams and players.
   */
  async getGroupsWithTeams(tournamentId: string) {
    return this.prisma.group.findMany({
      where: { tournamentId },
      include: {
        groupTeams: {
          include: {
            team: {
              include: {
                captain: true,
                members: {
                  include: {
                    playerProfile: true,
                  },
                },
              },
            },
          },
          orderBy: { seedOrder: 'asc' },
        },
      },
      orderBy: { code: 'asc' },
    });
  }
}
