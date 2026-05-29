import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BracketGeneratorService, BracketNode } from '@golab/domain';
import { StageType, MatchStatus, SegmentStatus } from '@golab/contracts';

@Injectable()
export class BracketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  @OnEvent('match.confirmed')
  async handleMatchConfirmed(payload: { matchId: string; groupId: string | null; tournamentId: string; userId: string }) {
    if (!payload.groupId) {
      await this.advanceBracketNode(payload.matchId);
    }
  }

  /**
   * Generates the knockout stage bracket and playoff matches based on group standings.
   */
  async generateBracket(tournamentId: string, userId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        ruleset: {
          include: { segmentDefinitions: true },
        },
        stages: true,
      },
    });

    if (!tournament) {
      throw new NotFoundException(`Không tìm thấy giải đấu.`);
    }

    const ruleset = tournament.ruleset;
    if (!ruleset || ruleset.segmentDefinitions.length === 0) {
      throw new BadRequestException(`Giải đấu chưa cấu hình luật.`);
    }

    // 1. Fetch group standings
    const standings = await this.prisma.standing.findMany({
      where: { tournamentId },
      include: { group: true },
      orderBy: { rank: 'asc' },
    });

    const groupAStandings = standings.filter((s) => s.group.code === 'A');
    const groupBStandings = standings.filter((s) => s.group.code === 'B');

    // Verify group stage is complete (at least 3 teams in each group have standing rows)
    if (groupAStandings.length < 3 || groupBStandings.length < 3) {
      throw new BadRequestException(
        `Vòng bảng chưa hoàn thành hoặc chưa có đủ bảng xếp hạng. Cần ít nhất 3 đội mỗi bảng.`
      );
    }

    // Check for any unresolved ties in top 3
    const hasTiesA = groupAStandings.slice(0, 3).some((s) => (s.tieBreakDetail as any)?.requiresAdminDecision);
    const hasTiesB = groupBStandings.slice(0, 3).some((s) => (s.tieBreakDetail as any)?.requiresAdminDecision);

    if (hasTiesA || hasTiesB) {
      throw new BadRequestException(
        `Có đội đang hòa chỉ số xếp hạng ở Top 3. Vui lòng giải quyết phân hạng thủ công trước.`
      );
    }

    const seeds = {
      A1: groupAStandings[0]!.teamId,
      A2: groupAStandings[1]!.teamId,
      A3: groupAStandings[2]!.teamId,
      B1: groupBStandings[0]!.teamId,
      B2: groupBStandings[1]!.teamId,
      B3: groupBStandings[2]!.teamId,
    };

    return this.prisma.$transaction(async (tx) => {
      // 2. Initialize Knockout Stage
      let stage = await tx.stage.findFirst({
        where: { tournamentId, type: 'PLAYOFF' as StageType },
      });

      if (!stage) {
        stage = await tx.stage.create({
          data: {
            organizationId: tournament.organizationId,
            tournamentId,
            name: 'Vòng Loại Trực Tiếp',
            type: 'PLAYOFF' as StageType,
            orderNo: 2,
            status: 'running',
          },
        });
      }

      // Clear existing bracket nodes and knockout matches to allow regeneration
      // Deleting segments and lineups first
      const existingKnockoutMatches = await tx.match.findMany({
        where: { tournamentId, stageId: stage.id },
      });
      const matchIds = existingKnockoutMatches.map((m) => m.id);

      await tx.matchLineupPlayer.deleteMany({
        where: { tournamentId, matchLineup: { matchId: { in: matchIds } } },
      });
      await tx.matchLineup.deleteMany({
        where: { tournamentId, matchId: { in: matchIds } },
      });
      await tx.matchSegment.deleteMany({
        where: { tournamentId, matchId: { in: matchIds } },
      });
      await tx.matchResult.deleteMany({
        where: { tournamentId, matchId: { in: matchIds } },
      });
      await tx.match.deleteMany({
        where: { tournamentId, stageId: stage.id },
      });
      await tx.bracketNode.deleteMany({
        where: { tournamentId },
      });

      // 3. Generate Bracket Nodes using Domain Service
      const domainNodes = BracketGeneratorService.generateInitialNodes(
        tournament.organizationId,
        tournamentId,
        stage.id,
        seeds
      );

      const createdNodes = [];

      for (const node of domainNodes) {
        let matchId: string | null = null;

        // If both teams are resolved, we can create the match record right away!
        if (node.teamAId && node.teamBId) {
          const matchLabel = `${node.roundName} - ${node.nodeKey === 'P1' ? 'Trận 1' : 'Trận 2'}`;

          const match = await tx.match.create({
            data: {
              organizationId: tournament.organizationId,
              tournamentId,
              stageId: stage.id,
              teamAId: node.teamAId,
              teamBId: node.teamBId,
              label: matchLabel,
              status: 'SCHEDULED' as MatchStatus,
              courtName: 'Sân 1',
              scheduledTime: new Date(),
            },
          });
          matchId = match.id;

          // Create segments for this match
          const sortedRulesetSegs = [...ruleset.segmentDefinitions].sort(
            (a, b) => a.orderIndex - b.orderIndex
          );

          for (const [segIdx, rSeg] of sortedRulesetSegs.entries()) {
            await tx.matchSegment.create({
              data: {
                organizationId: tournament.organizationId,
                tournamentId,
                matchId: match.id,
                segmentOrder: segIdx,
                segmentKey: rSeg.segmentKey,
                name: rSeg.name,
                targetScore: rSeg.targetScore,
                status: 'PENDING' as SegmentStatus,
              },
            });
          }
        }

        const bNode = await tx.bracketNode.create({
          data: {
            organizationId: tournament.organizationId,
            tournamentId,
            stageId: stage.id,
            nodeKey: node.nodeKey,
            roundName: node.roundName,
            sourceA: node.sourceA || null,
            sourceB: node.sourceB || null,
            teamAId: node.teamAId || null,
            teamBId: node.teamBId || null,
            winnerToNodeKey: node.winnerToNodeKey || null,
            loserAwardKey: node.loserAwardKey || null,
            orderNo: node.orderNo,
            matchId,
          },
        });

        createdNodes.push(bNode);
      }

      // Removed deprecated status update for KNOCKOUT_GENERATED

      await this.auditService.log({
        organizationId: tournament.organizationId,
        tournamentId,
        actorUserId: userId,
        action: 'BRACKET_GENERATED',
        entityType: 'Tournament',
        entityId: tournamentId,
      });

      return this.getBracket(tournamentId);
    });
  }

  /**
   * Advances the winner of a confirmed match to the next bracket node.
   */
  async advanceBracketNode(matchId: string, txContext?: any) {
    const prisma = txContext || this.prisma;

    // 1. Find the bracket node associated with this match
    const node = await prisma.bracketNode.findFirst({
      where: { matchId },
      include: { match: { include: { result: true } } },
    });

    if (!node || !node.match || !node.match.result) {
      return; // Not a bracket node match, or result not confirmed yet
    }

    const winnerId = node.match.result.winnerTeamId;
    if (!winnerId) return;

    const winnerToKey = node.winnerToNodeKey;

    await this.auditService.log({
      organizationId: node.organizationId,
      tournamentId: node.tournamentId,
      action: 'BRACKET_ADVANCED',
      entityType: 'BracketNode',
      entityId: node.id,
      afterData: { winnerTeamId: winnerId, nextNodeKey: winnerToKey },
    });

    if (!winnerToKey) {
      // If no next node key, this was the Final match!
      // Tournament is complete!
      // Removed deprecated status update for COMPLETED
      return;
    }

    // 2. Find and update the target node
    const targetNode = await prisma.bracketNode.findFirst({
      where: { tournamentId: node.tournamentId, nodeKey: winnerToKey },
    });

    if (!targetNode) return;

    // Map to domain to calculate advance
    const completedDomainNode = new BracketNode(node.id, {
      organizationId: node.organizationId,
      tournamentId: node.tournamentId,
      stageId: node.stageId,
      nodeKey: node.nodeKey,
      roundName: node.roundName,
      winnerToNodeKey: node.winnerToNodeKey,
    });

    const targetDomainNode = new BracketNode(targetNode.id, {
      organizationId: targetNode.organizationId,
      tournamentId: targetNode.tournamentId,
      stageId: targetNode.stageId,
      nodeKey: targetNode.nodeKey,
      roundName: targetNode.roundName,
      sourceA: targetNode.sourceA || null,
      sourceB: targetNode.sourceB || null,
      teamAId: targetNode.teamAId || null,
      teamBId: targetNode.teamBId || null,
    });

    const advanceResult = BracketGeneratorService.calculateAdvance(
      completedDomainNode,
      winnerId,
      targetDomainNode
    );

    if (!advanceResult) return;

    // Update target node with the winner team ID
    const updatedTargetNode = await prisma.bracketNode.update({
      where: { id: targetNode.id },
      data: {
        teamAId: advanceResult.teamAId,
        teamBId: advanceResult.teamBId,
      },
    });

    // 3. If both team slots are now filled on the target node, initialize its match!
    if (advanceResult.teamAId && advanceResult.teamBId && !targetNode.matchId) {
      const tournament = await prisma.tournament.findUnique({
        where: { id: node.tournamentId },
        include: { ruleset: { include: { segmentDefinitions: true } } },
      });

      const ruleset = tournament?.ruleset;

      if (ruleset) {
        const matchLabel = `${targetNode.roundName} - ${targetNode.nodeKey === 'F' ? 'Chung Kết' : 'Bán Kết'}`;

        const match = await prisma.match.create({
          data: {
            organizationId: node.organizationId,
            tournamentId: node.tournamentId,
            stageId: targetNode.stageId,
            teamAId: advanceResult.teamAId,
            teamBId: advanceResult.teamBId,
            label: matchLabel,
            status: 'SCHEDULED' as MatchStatus,
            courtName: 'Sân 1',
            scheduledTime: new Date(),
          },
        });

        await prisma.bracketNode.update({
          where: { id: targetNode.id },
          data: { matchId: match.id },
        });

        // Create segments for the match
        const sortedRulesetSegs = [...ruleset.segmentDefinitions].sort(
          (a, b) => a.orderIndex - b.orderIndex
        );

        for (const [segIdx, rSeg] of sortedRulesetSegs.entries()) {
          await prisma.matchSegment.create({
            data: {
              organizationId: node.organizationId,
              tournamentId: node.tournamentId,
              matchId: match.id,
              segmentOrder: segIdx,
              segmentKey: rSeg.segmentKey,
              name: rSeg.name,
              targetScore: rSeg.targetScore,
              status: 'PENDING' as SegmentStatus,
            },
          });
        }
      }
    }
  }

  /**
   * Retrieves the visual bracket structure with nodes and matches.
   */
  async getBracket(tournamentId: string) {
    return this.prisma.bracketNode.findMany({
      where: { tournamentId },
      include: {
        teamA: true,
        teamB: true,
        match: {
          include: {
            result: true,
          },
        },
      },
      orderBy: { orderNo: 'asc' },
    });
  }
}
