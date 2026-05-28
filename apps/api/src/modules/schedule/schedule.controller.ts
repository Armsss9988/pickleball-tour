import { Controller, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post('tournaments/:tournamentId/schedule/generate-group-stage')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async generateGroupStage(@Param('tournamentId') tournamentId: string, @Request() req: any) {
    return this.scheduleService.generateGroupStageSchedule(tournamentId, req.user.id);
  }

  @Patch('matches/:matchId/schedule')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async updateSchedule(
    @Param('matchId') matchId: string,
    @Request() req: any,
    @Body('scheduledTime') scheduledTime?: string,
    @Body('courtName') courtName?: string,
    @Body('matchNo') matchNo?: number
  ) {
    return this.scheduleService.updateMatchSchedule(
      matchId,
      scheduledTime || null,
      courtName || null,
      matchNo !== undefined ? matchNo : null,
      req.user.id
    );
  }
}
