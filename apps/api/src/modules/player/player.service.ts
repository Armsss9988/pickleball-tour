import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePlayerDto, BulkImportPlayerDto, Gender } from '@golab/contracts';

import { TournamentSectionValidatorService } from '../tournament/tournament-section-validator.service';
import { getEffectivePhase } from '@golab/domain';

@Injectable()
export class PlayerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly validatorService: TournamentSectionValidatorService,
  ) {}

  /**
   * Retrieves registered players for a tournament with filters.
   */
  async getPlayers(
    tournamentId: string,
    filter: { search?: string; gender?: string; page?: number; limit?: number }
  ) {
    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      tournamentId,
    };

    if (filter.gender) {
      whereClause.playerProfile = {
        gender: filter.gender as Gender,
      };
    }

    if (filter.search) {
      whereClause.playerProfile = {
        ...whereClause.playerProfile,
        fullName: {
          contains: filter.search,
          mode: 'insensitive',
        },
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.tournamentRegistration.findMany({
        where: whereClause,
        include: {
          playerProfile: true,
        },
        skip,
        take: limit,
        orderBy: { playerProfile: { fullName: 'asc' } },
      }),
      this.prisma.tournamentRegistration.count({
        where: whereClause,
      }),
    ]);

    return {
      items: items.map((reg) => ({
        id: reg.playerProfile.id,
        fullName: reg.playerProfile.fullName,
        gender: reg.playerProfile.gender,
        phone: reg.playerProfile.phone,
        registrationStatus: reg.status.toLowerCase(),
        claimStatus: reg.playerProfile.claimStatus.toLowerCase(),
        note: reg.playerProfile.note,
      })),
      total,
    };
  }

  /**
   * Adds a single player manually.
   */
  async addPlayer(tournamentId: string, dto: CreatePlayerDto, userId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException(`Không tìm thấy giải đấu.`);
    }

    const normalized = dto.fullName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    return this.prisma.$transaction(async (tx) => {
      // 1. Create or retrieve PlayerProfile in Organization
      let profile = await tx.playerProfile.findFirst({
        where: {
          organizationId: tournament.organizationId,
          normalizedName: normalized,
        },
      });

      if (!profile) {
        profile = await tx.playerProfile.create({
          data: {
            organizationId: tournament.organizationId,
            fullName: dto.fullName,
            normalizedName: normalized,
            gender: dto.gender,
            phone: dto.phone || null,
            note: dto.note || null,
            source: 'manual_admin',
            claimStatus: 'UNCLAIMED',
          },
        });
      } else {
        // Update details if profile already exists
        profile = await tx.playerProfile.update({
          where: { id: profile.id },
          data: {
            gender: dto.gender,
            phone: dto.phone || profile.phone,
            note: dto.note || profile.note,
          },
        });
      }

      // 2. Check if already registered
      const existingReg = await tx.tournamentRegistration.findUnique({
        where: {
          tournamentId_playerProfileId: {
            tournamentId,
            playerProfileId: profile.id,
          },
        },
      });

      if (existingReg) {
        throw new BadRequestException(`Vận động viên này đã được đăng ký trong giải đấu.`);
      }

      // 3. Create registration
      const reg = await tx.tournamentRegistration.create({
        data: {
          organizationId: tournament.organizationId,
          tournamentId,
          playerProfileId: profile.id,
          status: 'APPROVED',
          source: 'MANUAL_ADMIN',
          note: dto.note || null,
        },
        include: { playerProfile: true },
      });

      const sectionStatuses = await tx.tournamentSectionStatus.findMany({
        where: { tournamentId },
      });
      const required = ['ruleset', 'players', 'teams', 'schedule'];
      const isOperationallyReady = required.every(key => {
        const s = sectionStatuses.find(ss => ss.sectionKey === key);
        return s?.status === 'VALID';
      });
      const phase = getEffectivePhase(tournament.status, tournament.openingTime, isOperationallyReady);
      const action = phase === 'PUBLISHED_RUNNING' ? 'PLAYER_ADDED_EMERGENCY' : 'PLAYER_CREATED';

      await this.auditService.log({
        organizationId: tournament.organizationId,
        tournamentId,
        actorUserId: userId,
        action,
        entityType: 'PlayerProfile',
        entityId: profile.id,
        afterData: reg,
      });

      await this.validatorService.markSectionNeedsReview(tournamentId, ['teams']);
      await this.validatorService.validateAll(tournamentId);

      return reg;
    });
  }

  /**
   * Imports multiple players in bulk.
   */
  async importPlayers(
    tournamentId: string,
    dto: BulkImportPlayerDto,
    mode: 'append' | 'replace_all',
    userId: string
  ) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException(`Không tìm thấy giải đấu.`);
    }

    return this.prisma.$transaction(async (tx) => {
      if (mode === 'replace_all') {
        // Delete all registrations for this tournament
        // But keep player profiles to preserve historical club profiles
        await tx.tournamentRegistration.deleteMany({
          where: { tournamentId },
        });
      }

      let created = 0;
      let updated = 0;
      const warnings: string[] = [];

      for (const p of dto.players) {
        const normalized = p.fullName
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();

        if (!p.fullName) {
          warnings.push(`Dòng VĐV bị bỏ qua do thiếu họ tên.`);
          continue;
        }

        // Upsert PlayerProfile in Organization
        let profile = await tx.playerProfile.findFirst({
          where: {
            organizationId: tournament.organizationId,
            normalizedName: normalized,
          },
        });

        if (!profile) {
          profile = await tx.playerProfile.create({
            data: {
              organizationId: tournament.organizationId,
              fullName: p.fullName,
              normalizedName: normalized,
              gender: p.gender,
              phone: p.phone || null,
              note: p.note || null,
              source: 'admin_import',
              claimStatus: 'UNCLAIMED',
            },
          });
          created++;
        } else {
          profile = await tx.playerProfile.update({
            where: { id: profile.id },
            data: {
              gender: p.gender,
              phone: p.phone || profile.phone,
              note: p.note || profile.note,
            },
          });
          updated++;
        }

        // Upsert Registration
        const existingReg = await tx.tournamentRegistration.findUnique({
          where: {
            tournamentId_playerProfileId: {
              tournamentId,
              playerProfileId: profile.id,
            },
          },
        });

        if (!existingReg) {
          await tx.tournamentRegistration.create({
            data: {
              organizationId: tournament.organizationId,
              tournamentId,
              playerProfileId: profile.id,
              status: 'APPROVED',
              source: 'ADMIN_IMPORT',
            },
          });
        }
      }

      await this.auditService.log({
        organizationId: tournament.organizationId,
        tournamentId,
        actorUserId: userId,
        action: 'PLAYERS_IMPORTED',
        entityType: 'Tournament',
        entityId: tournamentId,
        afterData: { created, updated, mode },
      });

      await this.validatorService.markSectionNeedsReview(tournamentId, ['teams']);
      await this.validatorService.validateAll(tournamentId);

      return { created, updated, warnings };
    });
  }

  /**
   * Validates registered players against ruleset requirements.
   */
  async validatePlayers(tournamentId: string, userId: string) {
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

    const ruleset = tournament.ruleset;
    if (!ruleset || !ruleset.teamCompositionRule) {
      throw new BadRequestException(`Giải đấu chưa cấu hình điều lệ (ruleset/team composition).`);
    }

    const registrations = await this.prisma.tournamentRegistration.findMany({
      where: { tournamentId },
      include: { playerProfile: true },
    });

    const totalActual = registrations.length;
    const maleActual = registrations.filter((r) => r.playerProfile.gender?.toUpperCase() === 'MALE').length;
    const femaleActual = registrations.filter((r) => r.playerProfile.gender?.toUpperCase() === 'FEMALE').length;

    // Standard GOLAB format requires exactly 8 teams
    const teamCount = 8;
    const comp = ruleset.teamCompositionRule;
    const requiredTotal = teamCount * comp.teamSize;
    const requiredMale = teamCount * comp.maleCount;
    const requiredFemale = teamCount * comp.femaleCount;

    const errors: string[] = [];
    const warnings: string[] = [];

    if (totalActual !== requiredTotal) {
      errors.push(`Số lượng VĐV đăng ký (${totalActual}) khác so với yêu cầu (${requiredTotal}).`);
    }
    if (maleActual !== requiredMale) {
      errors.push(`Số lượng VĐV Nam (${maleActual}) khác so với yêu cầu (${requiredMale}).`);
    }
    if (femaleActual !== requiredFemale) {
      errors.push(`Số lượng VĐV Nữ (${femaleActual}) khác so với yêu cầu (${requiredFemale}).`);
    }

    // Check for duplicate profiles
    const seenNames = new Set<string>();
    for (const reg of registrations) {
      const name = reg.playerProfile.normalizedName;
      if (seenNames.has(name)) {
        warnings.push(`Phát hiện VĐV trùng lặp tên: "${reg.playerProfile.fullName}".`);
      }
      seenNames.add(name);
    }

    const valid = errors.length === 0;

    await this.auditService.log({
      organizationId: tournament.organizationId,
      tournamentId,
      actorUserId: userId,
      action: 'PLAYERS_VALIDATED',
      entityType: 'Tournament',
      entityId: tournamentId,
      afterData: { valid, errors, warnings },
    });

    return {
      valid,
      summary: {
        total: { actual: totalActual, required: requiredTotal },
        male: { actual: maleActual, required: requiredMale },
        female: { actual: femaleActual, required: requiredFemale },
      },
      errors,
      warnings,
    };
  }

  /**
   * Removes a single player from the tournament registration.
   */
  async removePlayer(tournamentId: string, playerId: string, userId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException(`Không tìm thấy giải đấu.`);
    }

    // 1. Check if the player is registered
    const reg = await this.prisma.tournamentRegistration.findUnique({
      where: {
        tournamentId_playerProfileId: {
          tournamentId,
          playerProfileId: playerId,
        },
      },
      include: {
        playerProfile: true,
      },
    });

    if (!reg) {
      throw new NotFoundException(`Vận động viên chưa đăng ký tham gia giải đấu này.`);
    }

    // 2. Check if the player is assigned to any team in this tournament
    const isAssigned = await this.prisma.teamMember.findFirst({
      where: {
        tournamentId,
        playerProfileId: playerId,
      },
    });

    if (isAssigned) {
      throw new BadRequestException(
        `Không thể xóa vận động viên "${reg.playerProfile.fullName}" vì họ đã được phân phối vào một đội tuyển. Vui lòng rút đội hình hoặc thay thế nhân sự.`
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 3. Delete the registration
      await tx.tournamentRegistration.delete({
        where: {
          tournamentId_playerProfileId: {
            tournamentId,
            playerProfileId: playerId,
          },
        },
      });

      // 4. Log the action
      await this.auditService.log({
        organizationId: tournament.organizationId,
        tournamentId,
        actorUserId: userId,
        action: 'PLAYER_REMOVED',
        entityType: 'PlayerProfile',
        entityId: playerId,
        beforeData: reg,
      });

      // 5. Update validation section statuses
      await this.validatorService.markSectionNeedsReview(tournamentId, ['players', 'teams']);
      await this.validatorService.validateAll(tournamentId);

      return { success: true };
    });
  }
}
