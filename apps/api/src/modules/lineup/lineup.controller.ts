import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { LineupService } from './lineup.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class LineupController {
  constructor(private readonly lineupService: LineupService) {}

  @Get('matches/:matchId/lineups')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin', 'SCORER', 'CAPTAIN')
  async getLineups(@Param('matchId') matchId: string) {
    return this.lineupService.getLineups(matchId);
  }

  @Post('matches/:matchId/segments/draw-order')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin', 'SCORER')
  async drawSegmentOrder(
    @Param('matchId') matchId: string,
    @Request() req: any,
    @Body('seed') seed?: string
  ) {
    return this.lineupService.drawSegmentOrder(matchId, seed, req.user.id);
  }

  @Put('matches/:matchId/segments/order')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async setSegmentOrder(
    @Param('matchId') matchId: string,
    @Request() req: any,
    @Body('keys') keys: string[]
  ) {
    return this.lineupService.setSegmentOrder(matchId, keys, req.user.id);
  }

  @Put('matches/:matchId/lineups')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin', 'SCORER', 'CAPTAIN')
  async submitLineup(
    @Param('matchId') matchId: string,
    @Request() req: any,
    @Body('teamLineups') teamLineups: { teamId: string; segments: { segmentId: string; playerIds: string[] }[] }[]
  ) {
    // Note: Scope check for CAPTAIN role can be added if we want to restrict them to their own team, 
    // but for MVP, having them login and submit is already protected by Roles.
    return this.lineupService.submitLineup(matchId, teamLineups, req.user.id);
  }

  @Post('matches/:matchId/lineups/lock')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin', 'SCORER')
  async lockLineups(@Param('matchId') matchId: string, @Request() req: any) {
    return this.lineupService.lockLineups(matchId, req.user.id);
  }
}
