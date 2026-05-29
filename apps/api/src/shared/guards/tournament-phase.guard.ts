import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getEffectivePhase, isRulesetLocked } from '@golab/domain';

@Injectable()
export class TournamentPhaseGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tournamentId = request.params.tournamentId || request.body.tournamentId || request.query.tournamentId;

    if (!tournamentId) {
      return true;
    }

    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        sectionStatuses: true,
      },
    });

    if (!tournament) {
      return true;
    }

    // Determine if tournament is operationally ready
    const required = ['ruleset', 'players', 'teams', 'schedule'];
    const isOperationallyReady = required.every(key => {
      const s = tournament.sectionStatuses.find(ss => ss.sectionKey === key);
      return s?.status === 'VALID';
    });

    const phase = getEffectivePhase(tournament.status, tournament.openingTime, isOperationallyReady);

    // If attempting to modify ruleset after it is locked, throw ForbiddenException
    const isRulesetRoute = request.path.includes(`/tournaments/${tournamentId}/ruleset`) || request.path.includes('/ruleset');
    const isWriteMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);

    if (isRulesetRoute && isWriteMethod) {
      // Check if there are scored matches to lock the ruleset
      const hasScoredMatches = await this.checkHasScoredMatches(tournamentId);
      if (isRulesetLocked(phase, hasScoredMatches)) {
        throw new ForbiddenException('Không thể chỉnh sửa luật thi đấu (ruleset) sau khi giải đã bắt đầu và đã có điểm số.');
      }
    }

    return true;
  }

  private async checkHasScoredMatches(tournamentId: string): Promise<boolean> {
    const scoreEventsCount = await this.prisma.scoreEvent.count({
      where: { tournamentId, isUndone: false },
    });
    return scoreEventsCount > 0;
  }
}
