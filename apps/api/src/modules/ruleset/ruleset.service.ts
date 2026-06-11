import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Ruleset as DomainRuleset } from '@golab/domain';
import { CreateRulesetDto, Gender } from '@golab/contracts';

import { TournamentSectionValidatorService } from '../tournament/tournament-section-validator.service';

@Injectable()
export class RulesetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly validatorService: TournamentSectionValidatorService,
  ) {}

  /**
   * Retrieves the ruleset configuration for a specific tournament.
   */
  async getRuleset(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
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
    });

    if (!tournament) {
      throw new NotFoundException(`Không tìm thấy giải đấu.`);
    }

    if (!tournament.ruleset) {
      // If tournament has no ruleset yet, fallback to the seeded template
      const template = await this.prisma.tournamentRuleset.findUnique({
        where: { id: '00000000-0000-0000-0000-000000000010' },
        include: {
          segmentDefinitions: true,
          teamCompositionRule: true,
          playerLimitRules: true,
          overlapRules: true,
          scoringConfig: true,
        },
      });

      if (!template) {
        throw new NotFoundException(`Không tìm thấy cấu hình luật mẫu.`);
      }

      return template;
    }

    return tournament.ruleset;
  }

  /**
   * Validates a ruleset payload using pure domain logic.
   */
  validateRuleset(dto: CreateRulesetDto) {
    try {
      new DomainRuleset(dto);
      return { valid: true, errors: [] };
    } catch (err: any) {
      return { valid: false, errors: [err.message] };
    }
  }

  /**
   * Updates (or creates a tournament-specific copy of) a ruleset configuration.
   */
  async updateRuleset(tournamentId: string, dto: CreateRulesetDto, userId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException(`Không tìm thấy giải đấu.`);
    }

    // Lock check: Allow updates in DRAFT, PLAYER_IMPORT, and PLAYERS_READY statuses
    if (!['DRAFT', 'PLAYER_IMPORT', 'PLAYERS_READY'].includes(tournament.status)) {
      throw new BadRequestException(
        `Không thể sửa đổi cấu hình luật khi giải đấu đã vượt qua trạng thái chuẩn bị (đã bốc thăm hoặc xếp lịch).`
      );
    }

    // Validate using domain
    const validation = this.validateRuleset(dto);
    if (!validation.valid) {
      throw new BadRequestException(`Cấu hình luật không hợp lệ: ${validation.errors.join(', ')}`);
    }

    return this.prisma.$transaction(async (tx) => {
      let rulesetId = tournament.rulesetId;
      let isNew = false;

      // Check if we need to clone the template ruleset or create a new one
      if (!rulesetId) {
        isNew = true;
      } else {
        const existingRuleset = await tx.tournamentRuleset.findUnique({
          where: { id: rulesetId },
        });
        // If the ruleset is a shared template, we must clone it for this tournament
        if (existingRuleset?.isTemplate) {
          isNew = true;
        }
      }

      if (isNew) {
        // Create new ruleset record specific for this tournament
        const newRuleset = await tx.tournamentRuleset.create({
          data: {
            organizationId: tournament.organizationId,
            name: dto.name,
            sport: dto.sport || 'pickleball',
            matchFormat: dto.matchFormat || 'relay',
            eventType: (dto.eventType || 'TEAM_EVENT') as any,
            competitionFormat: (dto.competitionFormat || 'GROUP_STAGE_KNOCKOUT') as any,
            requireCourtConfig: dto.requireCourtConfig ?? true,
            requireScheduleConfig: dto.requireScheduleConfig ?? true,
            groupCount: dto.groupCount ?? 2,
            advancePerGroup: dto.advancePerGroup ?? 1,
            isTemplate: false,
            createdById: userId,
          },
        });
        rulesetId = newRuleset.id;

        // Associate tournament with this ruleset
        await tx.tournament.update({
          where: { id: tournamentId },
          data: { rulesetId },
        });
      } else if (rulesetId) {
        // Update ruleset name and format fields
        await tx.tournamentRuleset.update({
          where: { id: rulesetId },
          data: {
            name: dto.name,
            matchFormat: dto.matchFormat || 'relay',
            eventType: (dto.eventType || 'TEAM_EVENT') as any,
            competitionFormat: (dto.competitionFormat || 'GROUP_STAGE_KNOCKOUT') as any,
            requireCourtConfig: dto.requireCourtConfig ?? true,
            requireScheduleConfig: dto.requireScheduleConfig ?? true,
            groupCount: dto.groupCount ?? 2,
            advancePerGroup: dto.advancePerGroup ?? 1,
          },
        });

        // Delete existing nested configurations to clean and re-insert
        await tx.segmentDefinition.deleteMany({ where: { rulesetId } });
        await tx.teamCompositionRule.deleteMany({ where: { rulesetId } });
        await tx.playerLimitRule.deleteMany({ where: { rulesetId } });
        await tx.overlapRule.deleteMany({ where: { rulesetId } });
        await tx.scoringConfig.deleteMany({ where: { rulesetId } });
      }

      const activeRulesetId = rulesetId!;

      // Insert segments
      for (const seg of dto.segments) {
        await tx.segmentDefinition.create({
          data: {
            rulesetId: activeRulesetId,
            segmentKey: seg.segmentKey,
            name: seg.name,
            targetScore: seg.targetScore,
            playerCount: seg.playerCount,
            genderRule: seg.genderRule,
            orderIndex: seg.orderIndex,
            isDrawable: seg.isDrawable ?? true,
          },
        });
      }

      // Insert Team Composition (only for TEAM_EVENT)
      if (dto.teamComposition) {
        await tx.teamCompositionRule.create({
          data: {
            rulesetId: activeRulesetId,
            teamSize: dto.teamComposition.teamSize,
            maleCount: dto.teamComposition.maleCount,
            femaleCount: dto.teamComposition.femaleCount,
            allMustPlay: dto.teamComposition.allMustPlay ?? true,
          },
        });
      }

      // Insert Player Limits
      for (const limit of dto.playerLimits) {
        await tx.playerLimitRule.create({
          data: {
            rulesetId: activeRulesetId,
            gender: limit.gender,
            minSegments: limit.minSegments,
            maxSegments: limit.maxSegments,
          },
        });
      }

      // Insert Overlap Rules
      for (const rule of dto.overlapRules) {
        await tx.overlapRule.create({
          data: {
            rulesetId: activeRulesetId,
            segmentAKey: rule.segmentAKey,
            segmentBKey: rule.segmentBKey,
            gender: rule.gender,
            isForbidden: rule.isForbidden ?? true,
          },
        });
      }

      // Insert Scoring Config
      await tx.scoringConfig.create({
        data: {
          rulesetId: activeRulesetId,
          winScore: dto.scoringConfig.winScore,
          noDeuce: dto.scoringConfig.noDeuce ?? true,
          sideSwitchAfterSegments: dto.scoringConfig.sideSwitchAfterSegments ?? 0,
          pointsForWin: dto.scoringConfig.pointsForWin ?? 3,
          pointsForLoss: dto.scoringConfig.pointsForLoss ?? 0,
          gamePointScore: dto.scoringConfig.gamePointScore,
          setsToWin: dto.scoringConfig.setsToWin ?? 2,
          lastSetPointScore: dto.scoringConfig.lastSetPointScore,
          deuceMaxScore: dto.scoringConfig.deuceMaxScore,
        },
      });

      const updatedRuleset = await tx.tournamentRuleset.findUnique({
        where: { id: activeRulesetId },
        include: {
          segmentDefinitions: true,
          teamCompositionRule: true,
          playerLimitRules: true,
          overlapRules: true,
          scoringConfig: true,
        },
      });

      await this.auditService.log({
        organizationId: tournament.organizationId,
        tournamentId: tournament.id,
        actorUserId: userId,
        action: 'RULESET_UPDATED',
        entityType: 'Ruleset',
        entityId: activeRulesetId,
        afterData: updatedRuleset,
      });

      await this.validatorService.markSectionNeedsReview(tournamentId, ['players', 'teams', 'lineup'], tx);
      await this.validatorService.validateAll(tournamentId, tx);

      return updatedRuleset;
    });
  }
}
