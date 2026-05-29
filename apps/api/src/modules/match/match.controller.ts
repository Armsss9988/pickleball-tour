import { Controller, Get, Post, Delete, Param, Query, UseGuards, Request } from '@nestjs/common';
import { MatchService } from './match.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { MatchStatus } from '@golab/contracts';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Get('tournaments/:tournamentId/matches')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin', 'SCORER', 'CAPTAIN')
  async getMatches(
    @Param('tournamentId') tournamentId: string,
    @Query('stageId') stageId?: string,
    @Query('groupId') groupId?: string,
    @Query('status') status?: MatchStatus
  ) {
    return this.playerControllerGetMatches(tournamentId, stageId, groupId, status);
  }

  private async playerControllerGetMatches(
    tournamentId: string,
    stageId?: string,
    groupId?: string,
    status?: MatchStatus
  ) {
    return this.matchService.getMatches(tournamentId, { stageId, groupId, status });
  }

  @Get('matches/:matchId')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin', 'SCORER', 'CAPTAIN')
  async getMatch(@Param('matchId') matchId: string) {
    return this.matchService.findOne(matchId);
  }

  @Post('matches/:matchId/start')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin', 'SCORER')
  async startMatch(@Param('matchId') matchId: string, @Request() req: any) {
    return this.matchService.startMatch(matchId, req.user.id);
  }

  @Delete('matches/:matchId')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async deleteMatch(@Param('matchId') matchId: string, @Request() req: any) {
    return this.matchService.deleteMatch(matchId, req.user.id);
  }
}
