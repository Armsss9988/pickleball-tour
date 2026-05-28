import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { CreateTournamentDto, UpdateTournamentDto, TournamentStatus } from '@golab/contracts';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tournaments')
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin', 'SCORER')
  async getTournaments(@Request() req: any) {
    // Return all tournaments in the user's organization
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
