import { Module } from '@nestjs/common';
import { PlayerService } from './player.service';
import { PlayerController } from './player.controller';
import { AuditModule } from '../audit/audit.module';
import { TournamentModule } from '../tournament/tournament.module';

@Module({
  imports: [AuditModule, TournamentModule],
  controllers: [PlayerController],
  providers: [PlayerService],
  exports: [PlayerService],
})
export class PlayerModule {}
