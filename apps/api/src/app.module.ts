import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './shared/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TournamentModule } from './modules/tournament/tournament.module';
import { RulesetModule } from './modules/ruleset/ruleset.module';
import { PlayerModule } from './modules/player/player.module';
import { TeamModule } from './modules/team/team.module';
import { GroupModule } from './modules/group/group.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { MatchModule } from './modules/match/match.module';
import { LineupModule } from './modules/lineup/lineup.module';
import { ScoringModule } from './modules/scoring/scoring.module';
import { RankingModule } from './modules/ranking/ranking.module';
import { BracketModule } from './modules/bracket/bracket.module';
import { AuditModule } from './modules/audit/audit.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { RegistrationModule } from './modules/registration/registration.module';
import { AwardModule } from './modules/award/award.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    TournamentModule,
    RulesetModule,
    PlayerModule,
    TeamModule,
    GroupModule,
    ScheduleModule,
    MatchModule,
    LineupModule,
    ScoringModule,
    RankingModule,
    BracketModule,
    AuditModule,
    OrganizationModule,
    RegistrationModule,
    AwardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
