import { CreateRulesetDto } from '@golab/contracts';
import { Ruleset as DomainRuleset } from '@golab/domain';

export class RulesetMapper {
  /**
   * Maps rich raw Ruleset with relations loaded from Prisma to Domain ruleset VO.
   */
  public static toDomain(raw: any): DomainRuleset {
    const dto: CreateRulesetDto = {
      name: raw.name,
      sport: raw.sport || 'pickleball',
      isTemplate: raw.isTemplate ?? false,
      matchFormat: raw.matchFormat || 'relay',
      eventType: raw.eventType || 'TEAM_EVENT',
      competitionFormat: raw.competitionFormat || 'GROUP_STAGE_KNOCKOUT',
      requireCourtConfig: raw.requireCourtConfig ?? true,
      requireScheduleConfig: raw.requireScheduleConfig ?? true,
      groupCount: raw.groupCount ?? 2,
      advancePerGroup: raw.advancePerGroup ?? 1,
      segments: (raw.segmentDefinitions || []).map((s: any) => ({
        segmentKey: s.segmentKey,
        name: s.name,
        targetScore: s.targetScore,
        playerCount: s.playerCount,
        genderRule: s.genderRule,
        orderIndex: s.orderIndex,
        isDrawable: s.isDrawable ?? true,
      })),
      // teamComposition optional for SINGLES/DOUBLES
      teamComposition: raw.teamCompositionRule
        ? {
            teamSize: raw.teamCompositionRule.teamSize,
            maleCount: raw.teamCompositionRule.maleCount,
            femaleCount: raw.teamCompositionRule.femaleCount,
            allMustPlay: raw.teamCompositionRule.allMustPlay ?? true,
          }
        : undefined,
      playerLimits: (raw.playerLimitRules || []).map((l: any) => ({
        gender: l.gender,
        minSegments: l.minSegments,
        maxSegments: l.maxSegments,
      })),
      overlapRules: (raw.overlapRules || []).map((o: any) => ({
        segmentAKey: o.segmentAKey,
        segmentBKey: o.segmentBKey,
        gender: o.gender,
        isForbidden: o.isForbidden ?? true,
      })),
      scoringConfig: {
        winScore: raw.scoringConfig.winScore,
        noDeuce: raw.scoringConfig.noDeuce ?? true,
        sideSwitchAfterSegments: raw.scoringConfig.sideSwitchAfterSegments ?? 0,
        pointsForWin: raw.scoringConfig.pointsForWin ?? 3,
        pointsForLoss: raw.scoringConfig.pointsForLoss ?? 0,
        gamePointScore: raw.scoringConfig.gamePointScore,
        setsToWin: raw.scoringConfig.setsToWin ?? 2,
        lastSetPointScore: raw.scoringConfig.lastSetPointScore,
        deuceMaxScore: raw.scoringConfig.deuceMaxScore,
      },
    };
    return new DomainRuleset(dto);
  }
}
