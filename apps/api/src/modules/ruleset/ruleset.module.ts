import { Module } from '@nestjs/common';
import { RulesetService } from './ruleset.service';
import { RulesetController } from './ruleset.controller';
import { AuditModule } from '../audit/audit.module';
import { TournamentModule } from '../tournament/tournament.module';

@Module({
  imports: [AuditModule, TournamentModule],
  controllers: [RulesetController],
  providers: [RulesetService],
  exports: [RulesetService],
})
export class RulesetModule {}
