import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { GroupService } from './group.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tournaments/:tournamentId/groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin', 'SCORER', 'CAPTAIN')
  async getGroups(@Param('tournamentId') tournamentId: string) {
    return this.groupService.getGroupsWithTeams(tournamentId);
  }

  @Post('init')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async initGroups(@Param('tournamentId') tournamentId: string, @Request() req: any) {
    return this.groupService.initGroups(tournamentId, req.user.id);
  }

  @Put('assignment')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async assignTeams(
    @Param('tournamentId') tournamentId: string,
    @Request() req: any,
    @Body('groups') groups: { code: string; teamIds: string[] }[]
  ) {
    return this.groupService.assignTeams(tournamentId, groups, req.user.id);
  }

  @Post('random-assignment')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async randomAssign(@Param('tournamentId') tournamentId: string, @Request() req: any) {
    return this.groupService.randomAssign(tournamentId, req.user.id);
  }
}
