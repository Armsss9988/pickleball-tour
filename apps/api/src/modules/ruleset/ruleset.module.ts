import { Module } from '@nestjs/common';
import { RulesetService } from './ruleset.service';
import { RulesetController } from './ruleset.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [RulesetController],
  providers: [RulesetService],
  exports: [RulesetService],
})
export class RulesetModule {}
