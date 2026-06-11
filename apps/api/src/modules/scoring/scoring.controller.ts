import { Controller, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Post('matches/:matchId/score-events')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin', 'SCORER')
  async addScoreEvent(
    @Param('matchId') matchId: string,
    @Request() req: any,
    @Body('scoringTeamId') scoringTeamId: string
  ) {
    return this.scoringService.addScoreEvent(matchId, scoringTeamId, req.user.id);
  }

  @Post('matches/:matchId/score-events/undo-latest')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin', 'SCORER')
  async undoLatestScore(
    @Param('matchId') matchId: string,
    @Request() req: any,
    @Body('reason') reason?: string
  ) {
    return this.scoringService.undoLatestScore(matchId, reason || 'Trọng tài sửa điểm', req.user.id);
  }

  @Post('matches/:matchId/score-events/undo-team')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin', 'SCORER')
  async undoTeamScore(
    @Param('matchId') matchId: string,
    @Request() req: any,
    @Body('teamId') teamId: string,
    @Body('reason') reason?: string
  ) {
    return this.scoringService.undoTeamScore(matchId, teamId, reason || 'Trọng tài giảm điểm', req.user.id);
  }

  @Post('matches/:matchId/segments/:segmentId/start-next')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin', 'SCORER')
  async startNextSegment(
    @Param('matchId') matchId: string,
    @Param('segmentId') segmentId: string,
    @Request() req: any
  ) {
    return this.scoringService.startNextSegment(matchId, segmentId, req.user.id);
  }

  @Post('matches/:matchId/confirm-result')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin', 'SCORER')
  async confirmResult(@Param('matchId') matchId: string, @Request() req: any) {
    return this.scoringService.confirmResult(matchId, req.user.id);
  }

  @Post('matches/:matchId/quick-result')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin', 'SCORER')
  async quickResult(
    @Param('matchId') matchId: string,
    @Request() req: any,
    @Body('teamAScore') teamAScore: number,
    @Body('teamBScore') teamBScore: number
  ) {
    return this.scoringService.quickResult(
      matchId,
      { teamAScore, teamBScore },
      req.user.id
    );
  }

  @Post('matches/:matchId/override-result')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin')
  async overrideResult(
    @Param('matchId') matchId: string,
    @Request() req: any,
    @Body('teamAScore') teamAScore: number,
    @Body('teamBScore') teamBScore: number,
    @Body('winnerTeamId') winnerTeamId: string,
    @Body('reason') reason: string
  ) {
    return this.scoringService.overrideResult(
      matchId,
      { teamAScore, teamBScore, winnerTeamId, reason },
      req.user.id,
      req.user.roles
    );
  }

  @Post('matches/:matchId/segments/:segmentId/override-score')
  @Roles('SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin', 'SCORER')
  async overrideSegmentScore(
    @Param('matchId') matchId: string,
    @Param('segmentId') segmentId: string,
    @Request() req: any,
    @Body('teamASegmentScore') teamASegmentScore: number,
    @Body('teamBSegmentScore') teamBSegmentScore: number,
    @Body('reason') reason: string
  ) {
    return this.scoringService.overrideSegmentScore(
      matchId,
      segmentId,
      { teamASegmentScore, teamBSegmentScore, reason },
      req.user.id,
      req.user.roles
    );
  }
}
