import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { RankingService } from './ranking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get('tournaments/:tournamentId/standings')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin', 'SCORER', 'CAPTAIN')
  async getStandings(@Param('tournamentId') tournamentId: string) {
    return this.rankingService.getStandings(tournamentId);
  }

  @Post('tournaments/:tournamentId/standings/recalculate')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async recalculateStandings(@Param('tournamentId') tournamentId: string, @Request() req: any) {
    return this.rankingService.recalculateTournamentStandings(tournamentId, req.user.id);
  }

  @Post('tournaments/:tournamentId/groups/:groupId/resolve-tie')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async resolveTie(
    @Param('tournamentId') tournamentId: string,
    @Param('groupId') groupId: string,
    @Request() req: any,
    @Body('teamIdsInRankOrder') teamIdsInRankOrder: string[]
  ) {
    return this.rankingService.resolveTieManually(groupId, teamIdsInRankOrder, req.user.id);
  }
}
