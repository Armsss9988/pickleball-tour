import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ScoreGateway } from '../../gateways/score.gateway';
import { ScoringEngine, MatchDomainInput } from '@golab/domain';
import { MatchStatus, SegmentStatus } from '@golab/contracts';

@Injectable()
export class ScoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly scoreGateway: ScoreGateway,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Loads match details and maps them to the domain model format.
   */
  private async loadDomainMatchInput(matchId: string): Promise<MatchDomainInput> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        segments: { orderBy: { segmentOrder: 'asc' } },
        scoreEvents: { orderBy: { eventNo: 'asc' } },
        tournament: {
          include: {
            ruleset: {
              include: { scoringConfig: true },
            },
          },
        },
      },
    });

    if (!match) {
      throw new NotFoundException(`Không tìm thấy trận đấu.`);
    }

    const ruleset = match.tournament.ruleset;
    if (!ruleset || !ruleset.scoringConfig) {
      throw new BadRequestException(`Trận đấu chưa cấu hình luật tính điểm.`);
    }

    // Check if lineups are locked
    const lineupCount = await this.prisma.matchLineup.count({
      where: { matchId, status: 'LOCKED' },
    });
    const format = ruleset.matchFormat || 'relay';
    const expectedLineupCount = format === 'relay' ? match.segments.length * 2 : 2;

    return {
      id: match.id,
      teamAId: match.teamAId!,
      teamBId: match.teamBId!,
      status: match.status,
      winnerTeamId: match.winnerTeamId,
      winScore: ruleset.scoringConfig.winScore,
      segments: match.segments.map((s) => ({
        id: s.id,
        segmentOrder: s.segmentOrder,
        segmentKey: s.segmentKey,
        name: s.name,
        targetScore: s.targetScore,
        status: s.status,
      })),
      scoreEvents: match.scoreEvents.map((e) => ({
        id: e.id,
        scoringTeamId: e.scoringTeamId,
        scoreAAfter: e.scoreAAfter,
        scoreBAfter: e.scoreBAfter,
        eventNo: e.eventNo,
        isUndone: e.isUndone,
        segmentId: e.segmentId,
      })),
      lineupLocked: lineupCount === expectedLineupCount,
      matchFormat: format,
      gamePointScore: ruleset.scoringConfig.gamePointScore,
      setsToWin: ruleset.scoringConfig.setsToWin,
      lastSetPointScore: ruleset.scoringConfig.lastSetPointScore,
      deuceMaxScore: ruleset.scoringConfig.deuceMaxScore,
      noDeuce: ruleset.scoringConfig.noDeuce,
    };
  }

  /**
   * Adds a score event point to a match.
   */
  async addScoreEvent(matchId: string, scoringTeamId: string, userId: string) {
    const domainInput = await this.loadDomainMatchInput(matchId);

    const matchObj = await this.prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!matchObj) {
      throw new NotFoundException('Không tìm thấy trận đấu.');
    }

    // Scoring depends on operational readiness, not public/publish phase.
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: matchObj.tournamentId },
      include: { sectionStatuses: true },
    });

    if (!tournament) {
      throw new NotFoundException('Không tìm thấy giải đấu.');
    }

    const required = ['ruleset', 'players', 'teams', 'schedule'];
    const isOperationallyReady = required.every(key => {
      const s = tournament.sectionStatuses.find(ss => ss.sectionKey === key);
      return s?.status === 'VALID';
    });

    if (!isOperationallyReady) {
      throw new BadRequestException('Giải đấu chưa đủ điều kiện vận hành để chấm điểm (kiểm tra các thiết lập thiếu).');
    }

    // Apply point using pure domain ScoringEngine
    const result = ScoringEngine.applyScorePoint(domainInput, scoringTeamId);

    return this.prisma.$transaction(async (tx) => {
      // 1. Save Score Event
      const newEvent = await tx.scoreEvent.create({
        data: {
          organizationId: matchObj.organizationId,
          tournamentId: matchObj.tournamentId,
          matchId,
          segmentId: result.newEventPayload.segmentId,
          scoringTeamId: result.newEventPayload.scoringTeamId,
          scoreAAfter: result.newEventPayload.scoreAAfter,
          scoreBAfter: result.newEventPayload.scoreBAfter,
          eventNo: result.newEventPayload.eventNo,
          createdById: userId,
        },
      });

      // 2. Replay match events to compute updated statuses
      const updatedEvents = await tx.scoreEvent.findMany({
        where: { matchId },
        orderBy: { eventNo: 'asc' },
      });

      const replayedInput = {
        ...domainInput,
        scoreEvents: updatedEvents,
      };

      const state = ScoringEngine.replayState(replayedInput);

      // 3. Update Match
      await tx.match.update({
        where: { id: matchId },
        data: {
          status: state.status,
          winnerTeamId: state.winnerTeamId,
        },
      });

      // 4. Update Match Segments
      for (const seg of state.segments) {
        await tx.matchSegment.update({
          where: { id: seg.id },
          data: {
            status: seg.status,
            completedAt: seg.status === 'COMPLETED' ? new Date() : null,
          },
        });
      }

      // 5. Create draft Match Result if completed
      if (state.status === 'COMPLETED') {
        await tx.matchResult.upsert({
          where: { matchId },
          update: {
            teamAScore: state.scoreA,
            teamBScore: state.scoreB,
            winnerTeamId: state.winnerTeamId!,
            setsWonA: state.setsWonA ?? null,
            setsWonB: state.setsWonB ?? null,
            setScores: state.setScores ? (state.setScores as any) : null,
          },
          create: {
            organizationId: matchObj.organizationId,
            tournamentId: matchObj.tournamentId,
            matchId,
            teamAId: matchObj.teamAId!,
            teamBId: matchObj.teamBId!,
            teamAScore: state.scoreA,
            teamBScore: state.scoreB,
            winnerTeamId: state.winnerTeamId!,
            setsWonA: state.setsWonA ?? null,
            setsWonB: state.setsWonB ?? null,
            setScores: state.setScores ? (state.setScores as any) : null,
          },
        });
      }

      await this.auditService.log({
        organizationId: matchObj.organizationId,
        tournamentId: matchObj.tournamentId,
        actorUserId: userId,
        action: 'SCORE_EVENT_CREATED',
        entityType: 'Match',
        entityId: matchId,
        afterData: {
          scoreA: state.scoreA,
          scoreB: state.scoreB,
          matchStatus: state.status,
        },
      });

      // 6. Broadcast WebSocket update
      const activeSeg = state.segments[state.activeSegmentIndex];
      this.scoreGateway.broadcastScoreUpdate(matchId, matchObj.tournamentId, {
        matchId,
        tournamentId: matchObj.tournamentId,
        scoreA: state.scoreA,
        scoreB: state.scoreB,
        matchStatus: state.status,
        activeSegment: activeSeg
          ? {
              id: activeSeg.id,
              order: activeSeg.segmentOrder,
              name: activeSeg.name,
              targetScore: activeSeg.targetScore,
              status: activeSeg.status,
            }
          : null,
      });

      return {
        eventId: newEvent.id,
        score: { teamA: state.scoreA, teamB: state.scoreB },
        segmentStatus: activeSeg ? activeSeg.status.toLowerCase() : null,
        matchStatus: state.status.toLowerCase(),
        transitions: result.transitions,
      };
    });
  }

  /**
   * Undoes the latest score event in a match.
   */
  async undoLatestScore(matchId: string, reason: string, userId: string) {
    const domainInput = await this.loadDomainMatchInput(matchId);

    if (!ScoringEngine.canUndo(domainInput)) {
      throw new BadRequestException('Không có điểm số nào để hoàn tác hoặc kết quả đã được xác nhận.');
    }

    const matchObj = await this.prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!matchObj) {
      throw new NotFoundException('Không tìm thấy trận đấu.');
    }

    const activeEvents = domainInput.scoreEvents.filter((e) => !e.isUndone);
    const lastActiveEvent = activeEvents[activeEvents.length - 1];

    return this.prisma.$transaction(async (tx) => {
      // 1. Mark latest event as undone
      await tx.scoreEvent.update({
        where: { id: lastActiveEvent!.id },
        data: {
          isUndone: true,
          undonById: userId,
          undoneAt: new Date(),
          undoReason: reason,
        },
      });

      // 2. Re-fetch all events and replay
      const updatedEvents = await tx.scoreEvent.findMany({
        where: { matchId },
        orderBy: { eventNo: 'asc' },
      });

      const replayedInput = {
        ...domainInput,
        scoreEvents: updatedEvents,
        status: 'RUNNING' as MatchStatus,
      };

      const state = ScoringEngine.replayState(replayedInput);

      // 3. Update Match
      await tx.match.update({
        where: { id: matchId },
        data: {
          status: state.status,
          winnerTeamId: state.winnerTeamId,
        },
      });

      // 4. Update Match Segments
      for (const seg of state.segments) {
        await tx.matchSegment.update({
          where: { id: seg.id },
          data: {
            status: seg.status,
            completedAt: seg.status === 'COMPLETED' ? new Date() : null,
          },
        });
      }

      // 5. Delete draft Match Result if it was completed
      if (state.status !== 'COMPLETED') {
        await tx.matchResult.deleteMany({
          where: { matchId },
        });
      }

      await this.auditService.log({
        organizationId: matchObj.organizationId,
        tournamentId: matchObj.tournamentId,
        actorUserId: userId,
        action: 'SCORE_EVENT_UNDONE',
        entityType: 'Match',
        entityId: matchId,
        reason,
        afterData: {
          scoreA: state.scoreA,
          scoreB: state.scoreB,
          matchStatus: state.status,
        },
      });

      // 6. Broadcast WebSocket update
      const activeSeg = state.segments[state.activeSegmentIndex];
      this.scoreGateway.broadcastScoreUpdate(matchId, matchObj.tournamentId, {
        matchId,
        tournamentId: matchObj.tournamentId,
        scoreA: state.scoreA,
        scoreB: state.scoreB,
        matchStatus: state.status,
        activeSegment: activeSeg
          ? {
              id: activeSeg.id,
              order: activeSeg.segmentOrder,
              name: activeSeg.name,
              targetScore: activeSeg.targetScore,
              status: activeSeg.status,
            }
          : null,
      });

      return {
        score: { teamA: state.scoreA, teamB: state.scoreB },
        matchStatus: state.status.toLowerCase(),
      };
    });
  }

  /**
   * Resumes a match after a segment break by starting the next segment.
   */
  async startNextSegment(matchId: string, segmentId: string, userId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { segments: true },
    });

    if (!match) {
      throw new NotFoundException(`Không tìm thấy trận đấu.`);
    }

    if (match.status !== 'SEGMENT_BREAK') {
      throw new BadRequestException(`Trận đấu không ở trạng thái nghỉ chặng (đang ở ${match.status}).`);
    }

    const seg = match.segments.find((s) => s.id === segmentId);
    if (!seg) {
      throw new NotFoundException(`Không tìm thấy chặng đấu.`);
    }

    if (seg.status !== 'PENDING') {
      throw new BadRequestException(`Chặng đấu này đã bắt đầu hoặc hoàn thành.`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Start segment
      await tx.matchSegment.update({
        where: { id: segmentId },
        data: {
          status: 'RUNNING' as SegmentStatus,
          startedAt: new Date(),
        },
      });

      // Resume match status
      await tx.match.update({
        where: { id: matchId },
        data: { status: 'RUNNING' as MatchStatus },
      });

      await this.auditService.log({
        organizationId: match.organizationId,
        tournamentId: match.tournamentId,
        actorUserId: userId,
        action: 'SEGMENT_STARTED',
        entityType: 'MatchSegment',
        entityId: segmentId,
      });

      // Re-fetch score events to broadcast
      const state = await this.loadDomainMatchInput(matchId);
      const replayed = ScoringEngine.replayState(state);
      const activeSeg = replayed.segments[replayed.activeSegmentIndex];

      this.scoreGateway.broadcastScoreUpdate(matchId, match.tournamentId, {
        matchId,
        tournamentId: match.tournamentId,
        scoreA: replayed.scoreA,
        scoreB: replayed.scoreB,
        matchStatus: 'RUNNING' as MatchStatus,
        activeSegment: activeSeg
          ? {
              id: activeSeg.id,
              order: activeSeg.segmentOrder,
              name: activeSeg.name,
              targetScore: activeSeg.targetScore,
              status: 'RUNNING' as SegmentStatus,
            }
          : null,
      });

      return { success: true };
    });
  }

  /**
   * Confirms the final completed match result and updates standings/bracket structures.
   */
  async confirmResult(matchId: string, userId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { result: true },
    });

    if (!match) {
      throw new NotFoundException(`Không tìm thấy trận đấu.`);
    }

    if (match.status !== 'COMPLETED') {
      throw new BadRequestException(`Không thể xác nhận kết quả khi trận đấu chưa hoàn thành.`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Confirm Match
      await tx.match.update({
        where: { id: matchId },
        data: { status: 'RESULT_CONFIRMED' as MatchStatus },
      });

      // 2. Confirm Match Result
      const result = await tx.matchResult.update({
        where: { matchId },
        data: {
          confirmedById: userId,
          confirmedAt: new Date(),
        },
      });

      await this.auditService.log({
        organizationId: match.organizationId,
        tournamentId: match.tournamentId,
        actorUserId: userId,
        action: 'MATCH_RESULT_CONFIRMED',
        entityType: 'Match',
        entityId: matchId,
        afterData: result,
      });

      return result;
    });

    this.eventEmitter.emit('match.confirmed', {
      matchId,
      groupId: match.groupId,
      tournamentId: match.tournamentId,
      userId,
    });

    return result;
  }

  /**
   * Super Admin only result override mechanism.
   */
  async overrideResult(
    matchId: string,
    dto: { teamAScore: number; teamBScore: number; winnerTeamId: string; reason: string },
    userId: string,
    userRoles: string[]
  ) {
    const isAuthorized = userRoles.some(role =>
      ['SUPER_ADMIN', 'platform_owner', 'organization_admin', 'tournament_admin'].includes(role)
    );
    if (!isAuthorized) {
      throw new ForbiddenException('Bạn không có quyền ghi đè (override) kết quả trận đấu.');
    }

    if (!dto.reason || dto.reason.trim() === '') {
      throw new BadRequestException('Phải cung cấp lý do ghi đè kết quả.');
    }

    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        result: true,
        stage: true,
        bracketNode: true,
        tournament: {
          include: {
            ruleset: true,
          },
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Không tìm thấy trận đấu.');
    }

    // Lock check for group stage matches
    const isGroupMatch = match.groupId !== null || match.stage?.type === 'GROUP';
    if (isGroupMatch) {
      const lockedStatuses = ['KNOCKOUT_GENERATED', 'KNOCKOUT_RUNNING', 'COMPLETED'];
      if (lockedStatuses.includes(match.tournament.status)) {
        throw new BadRequestException(
          'Không thể chỉnh sửa kết quả vòng bảng khi giải đấu đã tiến vào vòng Knockout hoặc hoàn thành.'
        );
      }
    }

    // Lock check for playoff/knockout matches (if next match has started/completed)
    if (match.bracketNode && match.bracketNode.winnerToNodeKey) {
      const nextNode = await this.prisma.bracketNode.findUnique({
        where: {
          tournamentId_nodeKey: {
            tournamentId: match.tournamentId,
            nodeKey: match.bracketNode.winnerToNodeKey,
          },
        },
        include: {
          match: true,
        },
      });

      if (nextNode && nextNode.match) {
        const activeStatuses: MatchStatus[] = ['RUNNING', 'COMPLETED', 'RESULT_CONFIRMED'];
        if (activeStatuses.includes(nextNode.match.status)) {
          throw new BadRequestException(
            `Không thể ghi đè kết quả trận đấu này vì trận đấu tiếp theo ở vòng trong (${nextNode.nodeKey}) đã bắt đầu hoặc hoàn tất.`
          );
        }
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.match.update({
        where: { id: matchId },
        data: {
          status: 'RESULT_CONFIRMED' as MatchStatus,
          winnerTeamId: dto.winnerTeamId,
        },
      });

      const format = match.tournament?.ruleset?.matchFormat || 'relay';

      const beforeData = match.result;
      const updatedResult = await tx.matchResult.upsert({
        where: { matchId },
        update: {
          teamAScore: dto.teamAScore,
          teamBScore: dto.teamBScore,
          winnerTeamId: dto.winnerTeamId,
          setsWonA: format === 'best_of' ? dto.teamAScore : null,
          setsWonB: format === 'best_of' ? dto.teamBScore : null,
          confirmedById: userId,
          confirmedAt: new Date(),
        },
        create: {
          organizationId: match.organizationId,
          tournamentId: match.tournamentId,
          matchId,
          teamAId: match.teamAId!,
          teamBId: match.teamBId!,
          teamAScore: dto.teamAScore,
          teamBScore: dto.teamBScore,
          winnerTeamId: dto.winnerTeamId,
          setsWonA: format === 'best_of' ? dto.teamAScore : null,
          setsWonB: format === 'best_of' ? dto.teamBScore : null,
          confirmedById: userId,
          confirmedAt: new Date(),
        },
      });

      await this.auditService.log({
        organizationId: match.organizationId,
        tournamentId: match.tournamentId,
        actorUserId: userId,
        action: 'RESULT_OVERRIDDEN',
        entityType: 'Match',
        entityId: matchId,
        beforeData,
        afterData: updatedResult,
        reason: dto.reason,
      });

      return updatedResult;
    });

    this.eventEmitter.emit('match.confirmed', {
      matchId,
      groupId: match.groupId,
      tournamentId: match.tournamentId,
      userId,
    });

    return result;
  }
}
