import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { TeamService } from './team.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get('tournaments/:tournamentId/teams')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin', 'SCORER', 'CAPTAIN')
  async getTeams(@Param('tournamentId') tournamentId: string) {
    return this.teamService.getTeams(tournamentId);
  }

  @Patch('teams/:teamId')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async updateTeam(
    @Param('teamId') teamId: string,
    @Request() req: any,
    @Body('name') name?: string,
    @Body('captainPlayerId') captainPlayerId?: string
  ) {
    return this.teamService.updateTeam(teamId, req.user.id, name, captainPlayerId);
  }

  @Get('tournaments/:tournamentId/team-draws')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async getTeamDraws(@Param('tournamentId') tournamentId: string) {
    return this.teamService.getTeamDraws(tournamentId);
  }

  @Post('tournaments/:tournamentId/team-draws/preview')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async createDrawPreview(
    @Param('tournamentId') tournamentId: string,
    @Request() req: any,
    @Body('seed') seed?: string
  ) {
    return this.teamService.createDrawPreview(tournamentId, seed, req.user.id);
  }

  @Post('tournaments/:tournamentId/team-draws/:drawId/confirm')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async confirmDraw(
    @Param('tournamentId') tournamentId: string,
    @Param('drawId') drawId: string,
    @Request() req: any
  ) {
    return this.teamService.confirmDraw(tournamentId, drawId, req.user.id);
  }

  @Post('tournaments/:tournamentId/teams/manual-assignment')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async saveManualAssignment(
    @Param('tournamentId') tournamentId: string,
    @Request() req: any,
    @Body() body: { teams: { code: string; name?: string; playerIds: string[] }[] }
  ) {
    return this.teamService.saveManualAssignment(tournamentId, body, req.user.id);
  }

  @Post('tournaments/:tournamentId/teams/:teamId/replace-member')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async replaceMember(
    @Param('tournamentId') tournamentId: string,
    @Param('teamId') teamId: string,
    @Request() req: any,
    @Body('oldPlayerId') oldPlayerId: string,
    @Body('newPlayerId') newPlayerId: string
  ) {
    return this.teamService.replaceMember(tournamentId, teamId, oldPlayerId, newPlayerId, req.user.id);
  }

  @Post('tournaments/:tournamentId/teams/swap-players')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async swapPlayers(
    @Param('tournamentId') tournamentId: string,
    @Request() req: any,
    @Body('playerAId') playerAId: string,
    @Body('playerBId') playerBId: string
  ) {
    return this.teamService.swapPlayers(tournamentId, playerAId, playerBId, req.user.id);
  }
}
