import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TournamentService } from '../tournament/tournament.service';
import { TeamDrawService, DrawPlayerInput } from '@golab/domain';
import { TournamentStatus } from '@golab/contracts';

function normalizeGender(gender: string | null | undefined) {
  return String(gender ?? '')
    .trim()
    .toUpperCase();
}

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly tournamentService: TournamentService,
  ) {}

  /**
   * Retrieves all confirmed teams for a tournament.
   */
  async getTeams(tournamentId: string) {
    return this.prisma.team.findMany({
      where: { tournamentId },
      include: {
        captain: true,
        members: {
          include: {
            playerProfile: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Updates a team's basic details (like name and captain).
   */
  async updateTeam(
    teamId: string,
    userId: string,
    name?: string,
    captainPlayerId?: string,
  ) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { captain: true },
    });

    if (!team) {
      throw new NotFoundException(`Không tìm thấy đội.`);
    }

    const updated = await this.prisma.team.update({
      where: { id: teamId },
      data: {
        name: name !== undefined ? name : undefined,
        captainPlayerId:
          captainPlayerId !== undefined ? captainPlayerId : undefined,
      },
      include: { captain: true },
    });

    if (captainPlayerId && captainPlayerId !== team.captainPlayerId) {
      // Log captain assignment
      await this.auditService.log({
        organizationId: team.organizationId,
        tournamentId: team.tournamentId,
        actorUserId: userId,
        action: 'CAPTAIN_ASSIGNED',
        entityType: 'Team',
        entityId: teamId,
        afterData: { captainPlayerId },
      });
    }

    await this.auditService.log({
      organizationId: team.organizationId,
      tournamentId: team.tournamentId,
      actorUserId: userId,
      action: 'TEAM_MANUALLY_UPDATED',
      entityType: 'Team',
      entityId: teamId,
      beforeData: team,
      afterData: updated,
    });

    return updated;
  }

  /**
   * Retrieves the team draws history for a tournament.
   */
  async getTeamDraws(tournamentId: string) {
    return this.prisma.teamDraw.findMany({
      where: { tournamentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Creates a team draw preview based on registered players and a seed.
   */
  async createDrawPreview(
    tournamentId: string,
    seed: string | undefined,
    userId: string,
  ) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        ruleset: {
          include: {
            teamCompositionRule: true,
          },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException(`Không tìm thấy giải đấu.`);
    }

    // Verify status is valid for draw
    const allowedStates: TournamentStatus[] = [
      'DRAFT',
      'PLAYER_IMPORT',
      'PLAYERS_READY',
      'TEAM_DRAW_COMPLETED',
    ];
    if (!allowedStates.includes(tournament.status)) {
      throw new BadRequestException(
        `Không thể bốc thăm đội khi giải đấu đang ở trạng thái ${tournament.status}.`,
      );
    }

    const ruleset = tournament.ruleset;
    if (!ruleset || !ruleset.teamCompositionRule) {
      throw new BadRequestException(`Giải đấu chưa được cấu hình điều lệ.`);
    }

    const registrations = await this.prisma.tournamentRegistration.findMany({
      where: { tournamentId },
      include: { playerProfile: true },
    });

    if (registrations.length === 0) {
      throw new BadRequestException(
        `Không có vận động viên nào được đăng ký trong giải đấu.`,
      );
    }

    const playersInput: DrawPlayerInput[] = registrations.map((r) => ({
      id: r.playerProfile.id,
      fullName: r.playerProfile.fullName,
      gender: r.playerProfile.gender,
    }));

    const activeSeed =
      seed || `GOLAB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const composition = {
      teamSize: ruleset.teamCompositionRule.teamSize,
      maleCount: ruleset.teamCompositionRule.maleCount,
      femaleCount: ruleset.teamCompositionRule.femaleCount,
    };

    const requiredTotal = 8 * composition.teamSize;
    const requiredMale = 8 * composition.maleCount;
    const requiredFemale = 8 * composition.femaleCount;
    const actualMale = playersInput.filter(
      (player) => normalizeGender(player.gender) === 'MALE',
    ).length;
    const actualFemale = playersInput.filter(
      (player) => normalizeGender(player.gender) === 'FEMALE',
    ).length;

    if (
      playersInput.length !== requiredTotal ||
      actualMale !== requiredMale ||
      actualFemale !== requiredFemale
    ) {
      throw new BadRequestException(
        `Bốc thăm đang khóa vì chưa đủ vận động viên. Cần ${requiredTotal} VĐV: ${requiredMale} nam, ${requiredFemale} nữ. Hiện có ${playersInput.length} VĐV: ${actualMale} nam, ${actualFemale} nữ.`,
      );
    }

    // Execute the domain draw algorithm
    const result = TeamDrawService.draw(playersInput, composition, activeSeed);

    const draw = await this.prisma.teamDraw.create({
      data: {
        organizationId: tournament.organizationId,
        tournamentId,
        status: 'PREVIEW',
        randomSeed: activeSeed,
        algorithmVersion: 'team-draw-v1',
        inputSnapshot: playersInput as any,
        outputSnapshot: result as any,
        createdById: userId,
      },
    });

    await this.auditService.log({
      organizationId: tournament.organizationId,
      tournamentId,
      actorUserId: userId,
      action: 'TEAM_DRAW_PREVIEW_CREATED',
      entityType: 'TeamDraw',
      entityId: draw.id,
      afterData: draw,
    });

    return draw;
  }

  /**
   * Confirms a team draw preview, transactionally creating the teams and team members.
   */
  async confirmDraw(tournamentId: string, drawId: string, userId: string) {
    const draw = await this.prisma.teamDraw.findUnique({
      where: { id: drawId },
    });

    if (!draw || draw.tournamentId !== tournamentId) {
      throw new NotFoundException(`Không tìm thấy phiên bốc thăm.`);
    }

    if (draw.status !== 'PREVIEW') {
      throw new BadRequestException(
        `Phiên bốc thăm này đã ${draw.status === 'CONFIRMED' ? 'xác nhận' : 'hủy bỏ'}.`,
      );
    }

    const output = draw.outputSnapshot as any;
    if (!output || !output.teams) {
      throw new BadRequestException(`Dữ liệu bốc thăm không hợp lệ.`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Delete existing teams and memberships for this tournament to avoid duplicates
      await tx.teamMember.deleteMany({ where: { tournamentId } });
      await tx.team.deleteMany({ where: { tournamentId } });

      const confirmedTeams = [];

      // 2. Create teams and team members
      for (const t of output.teams) {
        const team = await tx.team.create({
          data: {
            organizationId: draw.organizationId,
            tournamentId,
            name: t.name,
            code: t.code,
            seedNo: t.teamNo,
          },
        });

        // Set the first male as default captain for convenience
        let captainPlayerId: string | null = null;

        for (const p of t.players) {
          await tx.teamMember.create({
            data: {
              organizationId: draw.organizationId,
              tournamentId,
              teamId: team.id,
              playerProfileId: p.id,
              role: 'MEMBER',
              joinedMethod: 'random_draw',
            },
          });

          if (p.gender === 'MALE' && !captainPlayerId) {
            captainPlayerId = p.id;
          }
        }

        // Set captain
        if (captainPlayerId) {
          await tx.team.update({
            where: { id: team.id },
            data: { captainPlayerId },
          });
        }

        confirmedTeams.push(team);
      }

      // 3. Update draw status
      await tx.teamDraw.update({
        where: { id: drawId },
        data: {
          status: 'CONFIRMED',
          confirmedById: userId,
          confirmedAt: new Date(),
        },
      });

      // 4. Update other draws to cancelled
      await tx.teamDraw.updateMany({
        where: { tournamentId, status: 'PREVIEW', NOT: { id: drawId } },
        data: { status: 'CANCELLED' },
      });

      // 5. Advance tournament status to TEAM_DRAW_COMPLETED
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: 'TEAM_DRAW_COMPLETED' },
      });

      await this.auditService.log({
        organizationId: draw.organizationId,
        tournamentId,
        actorUserId: userId,
        action: 'TEAM_DRAW_CONFIRMED',
        entityType: 'TeamDraw',
        entityId: drawId,
      });

      return confirmedTeams;
    });
  }
}
