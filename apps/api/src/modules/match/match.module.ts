import { Module } from '@nestjs/common';
import { MatchService } from './match.service';
import { MatchController } from './match.controller';
import { AuditModule } from '../audit/audit.module';
import { TournamentModule } from '../tournament/tournament.module';

@Module({
  imports: [AuditModule, TournamentModule],
  controllers: [MatchController],
  providers: [MatchService],
  exports: [MatchService],
})
export class MatchModule {}
