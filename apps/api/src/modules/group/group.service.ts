import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StageType } from '@golab/contracts';

@Injectable()
export class GroupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
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
    userId: string
  ) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException(`Không tìm thấy giải đấu.`);
    }

    // 1. Perform validation checks
    if (assignment.length !== 2) {
      throw new BadRequestException('Bắt buộc phải phân bổ đủ 2 bảng đấu.');
    }

    const allTeamIds = new Set<string>();
    for (const group of assignment) {
      if (group.teamIds.length !== 4) {
        throw new BadRequestException(`Bảng ${group.code} phải chứa đúng 4 đội (đang có ${group.teamIds.length}).`);
      }
      for (const tid of group.teamIds) {
        if (allTeamIds.has(tid)) {
          throw new BadRequestException('Một đội không thể xuất hiện ở cả hai bảng.');
        }
        allTeamIds.add(tid);
      }
    }

    if (allTeamIds.size !== 8) {
      throw new BadRequestException(`Tổng số đội phân bổ phải bằng 8 (hiện tại có ${allTeamIds.size} đội).`);
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

      // Update tournament status to GROUP_ASSIGNED
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

      return this.getGroupsWithTeams(tournamentId);
    });
  }

  /**
   * Distributes 8 teams randomly between Bảng A and Bảng B.
   */
  async randomAssign(tournamentId: string, userId: string) {
    const teams = await this.prisma.team.findMany({
      where: { tournamentId },
    });

    if (teams.length !== 8) {
      throw new BadRequestException(`Bắt buộc phải có đúng 8 đội đã xác nhận bốc thăm (hiện tại: ${teams.length}).`);
    }

    // Shuffle teams list
    const shuffled = [...teams].sort(() => Math.random() - 0.5);

    const assignment = [
      { code: 'A', teamIds: shuffled.slice(0, 4).map((t) => t.id) },
      { code: 'B', teamIds: shuffled.slice(4, 8).map((t) => t.id) },
    ];

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
