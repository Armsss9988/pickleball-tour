import { Controller, Get, Put, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { RulesetService } from './ruleset.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { CreateRulesetDto } from '@golab/contracts';

import { TournamentPhaseGuard } from '../../shared/guards/tournament-phase.guard';

@UseGuards(JwtAuthGuard, RolesGuard, TournamentPhaseGuard)
@Controller('tournaments/:tournamentId/ruleset')
export class RulesetController {
  constructor(private readonly rulesetService: RulesetService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin', 'SCORER', 'CAPTAIN')
  async getRuleset(@Param('tournamentId') tournamentId: string) {
    return this.rulesetService.getRuleset(tournamentId);
  }

  @Put()
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async updateRuleset(
    @Param('tournamentId') tournamentId: string,
    @Request() req: any,
    @Body() dto: CreateRulesetDto
  ) {
    return this.rulesetService.updateRuleset(tournamentId, dto, req.user.id);
  }

  @Post('validate')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async validateRuleset(
    @Param('tournamentId') tournamentId: string,
    @Body() dto: CreateRulesetDto
  ) {
    return this.rulesetService.validateRuleset(tournamentId, dto);
  }
}
