import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { PlayerService } from './player.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { CreatePlayerDto, BulkImportPlayerDto } from '@golab/contracts';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tournaments/:tournamentId/players')
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin', 'SCORER')
  async getPlayers(
    @Param('tournamentId') tournamentId: string,
    @Query('search') search?: string,
    @Query('gender') gender?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.playerService.getPlayers(tournamentId, {
      search,
      gender,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post()
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async addPlayer(
    @Param('tournamentId') tournamentId: string,
    @Request() req: any,
    @Body() dto: CreatePlayerDto
  ) {
    return this.playerService.addPlayer(tournamentId, dto, req.user.id);
  }

  @Post('import')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async importPlayers(
    @Param('tournamentId') tournamentId: string,
    @Request() req: any,
    @Body() dto: BulkImportPlayerDto,
    @Query('mode') mode?: 'append' | 'replace_all'
  ) {
    return this.playerService.importPlayers(
      tournamentId,
      dto,
      mode || 'append',
      req.user.id
    );
  }

  @Post('validate')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async validatePlayers(@Param('tournamentId') tournamentId: string, @Request() req: any) {
    return this.playerService.validatePlayers(tournamentId, req.user.id);
  }
}
