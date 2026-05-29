import { Module } from '@nestjs/common';
import { CourtService } from './court.service';
import { CourtController } from './court.controller';
import { AuditModule } from '../audit/audit.module';
import { TournamentModule } from '../tournament/tournament.module';

@Module({
  imports: [AuditModule, TournamentModule],
  controllers: [CourtController],
  providers: [CourtService],
  exports: [CourtService],
})
export class CourtModule {}
