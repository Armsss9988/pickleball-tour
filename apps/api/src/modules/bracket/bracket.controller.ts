import { Body, Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { BracketService } from './bracket.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tournaments/:tournamentId/bracket')
export class BracketController {
  constructor(private readonly bracketService: BracketService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin', 'SCORER', 'CAPTAIN')
  async getBracket(@Param('tournamentId') tournamentId: string) {
    return this.bracketService.getBracket(tournamentId);
  }

  @Get('seed-candidates')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async getSeedCandidates(@Param('tournamentId') tournamentId: string) {
    return this.bracketService.getSeedCandidates(tournamentId);
  }

  @Post('generate')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async generateBracket(
    @Param('tournamentId') tournamentId: string,
    @Request() req: any,
    @Body() body?: { bracketSize?: 4 | 8; slots?: { slotNo: number; teamId: string | null }[] }
  ) {
    return this.bracketService.generateBracket(tournamentId, req.user.id, body);
  }
}
