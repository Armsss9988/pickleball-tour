import { Controller, Get, Param } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('public/tournaments')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get()
  async getPublicTournaments() {
    return this.publicService.getPublicTournaments();
  }

  @Get('by-id/:tournamentId')
  async getTournamentSummaryById(@Param('tournamentId') tournamentId: string) {
    return this.publicService.getPublicTournamentSummaryById(tournamentId);
  }

  @Get(':slug')
  async getTournamentCenter(@Param('slug') slug: string) {
    return this.publicService.getTournamentCenter(slug);
  }
}
