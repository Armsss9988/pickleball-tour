import { Module } from '@nestjs/common';
import { BracketService } from './bracket.service';
import { BracketController } from './bracket.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [BracketController],
  providers: [BracketService],
  exports: [BracketService],
})
export class BracketModule {}
