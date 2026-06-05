import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CourtService } from './court.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tournaments/:tournamentId/courts')
export class CourtController {
  constructor(private readonly courtService: CourtService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin', 'SCORER')
  async getCourts(@Param('tournamentId') tournamentId: string) {
    return this.courtService.findAll(tournamentId);
  }

  @Get('conflicts')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async getConflicts(@Param('tournamentId') tournamentId: string) {
    return this.courtService.getScheduleConflicts(tournamentId);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async createCourt(
    @Param('tournamentId') tournamentId: string,
    @Request() req: any,
    @Body('name') name: string,
    @Body('description') description?: string,
    @Body('venueName') venueName?: string,
  ) {
    return this.courtService.create(tournamentId, req.user.orgId, name, description, venueName, req.user.id);
  }

  @Patch(':courtId')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async updateCourt(
    @Param('courtId') courtId: string,
    @Request() req: any,
    @Body('name') name?: string,
    @Body('description') description?: string,
    @Body('isActive') isActive?: boolean,
    @Body('venueName') venueName?: string,
  ) {
    return this.courtService.update(courtId, name, description, isActive, venueName, req.user.id);
  }

  @Delete(':courtId')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async deleteCourt(@Param('courtId') courtId: string, @Request() req: any) {
    return this.courtService.remove(courtId, req.user.id);
  }
}
