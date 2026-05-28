import { Module } from '@nestjs/common';
import { TeamService } from './team.service';
import { TeamController } from './team.controller';
import { TournamentModule } from '../tournament/tournament.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TournamentModule, AuditModule],
  controllers: [TeamController],
  providers: [TeamService],
  exports: [TeamService],
})
export class TeamModule {}
