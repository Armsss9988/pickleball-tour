import { Module } from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { TournamentController } from './tournament.controller';
import { AuditModule } from '../audit/audit.module';
import { TournamentSectionValidatorService } from './tournament-section-validator.service';

@Module({
  imports: [AuditModule],
  controllers: [TournamentController],
  providers: [TournamentService, TournamentSectionValidatorService],
  exports: [TournamentService, TournamentSectionValidatorService],
})
export class TournamentModule {}
