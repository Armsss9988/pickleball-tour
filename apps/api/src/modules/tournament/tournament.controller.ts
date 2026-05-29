import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { CreateTournamentDto, UpdateTournamentDto, TournamentStatus } from '@golab/contracts';
import { TournamentSectionValidatorService } from './tournament-section-validator.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tournaments')
export class TournamentController {
  constructor(
    private readonly tournamentService: TournamentService,
    private readonly validatorService: TournamentSectionValidatorService,
  ) {}

  @Get()
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin', 'SCORER')
  async getTournaments(@Request() req: any) {
    return this.tournamentService.findAll(req.user.orgId);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin')
  async createTournament(@Request() req: any, @Body() dto: CreateTournamentDto) {
    return this.tournamentService.create(req.user.orgId, dto, req.user.id);
  }

  @Get(':tournamentId')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin', 'SCORER', 'CAPTAIN')
  async getTournament(@Param('tournamentId') tournamentId: string) {
    return this.tournamentService.findOne(tournamentId);
  }

  @Patch(':tournamentId')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async updateTournament(
    @Param('tournamentId') tournamentId: string,
    @Request() req: any,
    @Body() dto: UpdateTournamentDto
  ) {
    return this.tournamentService.update(tournamentId, dto, req.user.id);
  }

  @Post(':tournamentId/publish')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async publishTournament(@Param('tournamentId') tournamentId: string, @Request() req: any) {
    return this.tournamentService.publish(tournamentId, req.user.id);
  }

  @Post(':tournamentId/unpublish')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async unpublishTournament(@Param('tournamentId') tournamentId: string, @Request() req: any) {
    return this.tournamentService.unpublish(tournamentId, req.user.id);
  }

  @Post(':tournamentId/validate')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async validateTournament(@Param('tournamentId') tournamentId: string) {
    return this.validatorService.validateAll(tournamentId);
  }

  @Post(':tournamentId/status')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async transitionTournamentStatus(
    @Param('tournamentId') tournamentId: string,
    @Request() req: any,
    @Body('status') status: TournamentStatus
  ) {
    return this.tournamentService.transitionStatus(tournamentId, status, req.user.id);
  }
}
