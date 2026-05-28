import { Module } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { ScoringController } from './scoring.controller';
import { ScoreGateway } from '../../gateways/score.gateway';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ScoringController],
  providers: [ScoringService, ScoreGateway],
  exports: [ScoringService, ScoreGateway],
})
export class ScoringModule {}
