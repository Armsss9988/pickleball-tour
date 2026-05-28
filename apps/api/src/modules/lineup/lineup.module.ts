import { Module } from '@nestjs/common';
import { LineupService } from './lineup.service';
import { LineupController } from './lineup.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [LineupController],
  providers: [LineupService],
  exports: [LineupService],
})
export class LineupModule {}
