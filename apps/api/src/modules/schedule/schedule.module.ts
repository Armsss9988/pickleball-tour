import { Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { AuditModule } from '../audit/audit.module';
import { TournamentModule } from '../tournament/tournament.module';

@Module({
  imports: [AuditModule, TournamentModule],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
