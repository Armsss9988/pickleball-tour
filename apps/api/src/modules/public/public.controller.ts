import { Controller, Get, Param } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('public/tournaments')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get(':slug')
  async getTournamentCenter(@Param('slug') slug: string) {
    return this.publicService.getTournamentCenter(slug);
  }
}
