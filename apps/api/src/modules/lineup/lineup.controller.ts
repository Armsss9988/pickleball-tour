import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { LineupService } from './lineup.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class LineupController {
  constructor(private readonly lineupService: LineupService) {}

  private getRequestUser(req: { user: { id: string; roles?: string[] } }) {
    return req.user;
  }

  @Get('matches/:matchId/lineups')
  @Roles(
    'SUPER_ADMIN',
    'platform_owner',
    'organization_admin',
    'tournament_admin',
    'SCORER',
    'CAPTAIN',
  )
  async getLineups(@Param('matchId') matchId: string) {
    return this.lineupService.getLineups(matchId);
  }

  @Post('matches/:matchId/segments/draw-order')
  @Roles(
    'SUPER_ADMIN',
    'platform_owner',
    'organization_admin',
    'tournament_admin',
    'SCORER',
  )
  async drawSegmentOrder(
    @Param('matchId') matchId: string,
    @Request() req: { user: { id: string; roles?: string[] } },
    @Body('seed') seed?: string,
  ) {
    return this.lineupService.drawSegmentOrder(
      matchId,
      seed,
      this.getRequestUser(req).id,
    );
  }

  @Put('matches/:matchId/segments/order')
  @Roles(
    'SUPER_ADMIN',
    'platform_owner',
    'organization_admin',
    'tournament_admin',
  )
  async setSegmentOrder(
    @Param('matchId') matchId: string,
    @Request() req: { user: { id: string; roles?: string[] } },
    @Body('keys') keys: string[],
  ) {
    return this.lineupService.setSegmentOrder(
      matchId,
      keys,
      this.getRequestUser(req).id,
    );
  }

  @Put('matches/:matchId/lineups')
  @Roles(
    'SUPER_ADMIN',
    'platform_owner',
    'organization_admin',
    'tournament_admin',
    'SCORER',
    'CAPTAIN',
  )
  async submitLineup(
    @Param('matchId') matchId: string,
    @Request() req: { user: { id: string; roles?: string[] } },
    @Body('teamLineups')
    teamLineups: {
      teamId: string;
      segments: { segmentId: string; playerIds: string[] }[];
    }[],
  ) {
    const user = this.getRequestUser(req);

    return this.lineupService.submitLineup(
      matchId,
      teamLineups,
      user.id,
      user.roles ?? [],
    );
  }

  @Post('matches/:matchId/lineups/lock')
  @Roles(
    'SUPER_ADMIN',
    'platform_owner',
    'organization_admin',
    'tournament_admin',
    'SCORER',
  )
  async lockLineups(
    @Param('matchId') matchId: string,
    @Request() req: { user: { id: string; roles?: string[] } },
  ) {
    return this.lineupService.lockLineups(matchId, this.getRequestUser(req).id);
  }
}
