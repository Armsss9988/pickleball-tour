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
          include: {
            segmentDefinitions: true,
            scoringConfig: true,
          },
        },
        stages: true,
      },
    });

    if (!tournament) {
      throw new NotFoundException(`Không tìm thấy giải đấu.`);
    }

    const ruleset = tournament.ruleset;
    if (!ruleset) {
      throw new BadRequestException(`Giải đấu chưa cấu hình luật.`);
    }
    if (ruleset.matchFormat === 'relay' && ruleset.segmentDefinitions.length === 0) {
      throw new BadRequestException('Giải đấu theo thể thức tiếp sức yêu cầu chặng thi đấu.');
    }

    // 1. Fetch group standings
    const standings = await this.prisma.standing.findMany({
      where: { tournamentId },
      include: { group: true },
      orderBy: { rank: 'asc' },
    });

    const groups = await this.prisma.group.findMany({
      where: { tournamentId },
    });
    const groupsCount = groups.length;

    const advancePerGroup = ruleset.advancePerGroup ?? 1;

    let seeds: any = {};

    if (groupsCount === 4) {
      const groupAStandings = standings.filter((s) => s.group.code === 'A');
      const groupBStandings = standings.filter((s) => s.group.code === 'B');
      const groupCStandings = standings.filter((s) => s.group.code === 'C');
      const groupDStandings = standings.filter((s) => s.group.code === 'D');

      if (
        groupAStandings.length < advancePerGroup ||
        groupBStandings.length < advancePerGroup ||
        groupCStandings.length < advancePerGroup ||
        groupDStandings.length < advancePerGroup
      ) {
        throw new BadRequestException(
          `Vòng bảng chưa hoàn thành hoặc chưa có đủ bảng xếp hạng. Cần ít nhất ${advancePerGroup} đội mỗi bảng (A, B, C, D).`
        );
      }

      // Check ties in top advancePerGroup
      const hasTiesA = groupAStandings.slice(0, advancePerGroup).some((s) => (s.tieBreakDetail as any)?.requiresAdminDecision);
      const hasTiesB = groupBStandings.slice(0, advancePerGroup).some((s) => (s.tieBreakDetail as any)?.requiresAdminDecision);
      const hasTiesC = groupCStandings.slice(0, advancePerGroup).some((s) => (s.tieBreakDetail as any)?.requiresAdminDecision);
      const hasTiesD = groupDStandings.slice(0, advancePerGroup).some((s) => (s.tieBreakDetail as any)?.requiresAdminDecision);

      if (hasTiesA || hasTiesB || hasTiesC || hasTiesD) {
        throw new BadRequestException(
          `Có đội đang hòa chỉ số xếp hạng ở Top ${advancePerGroup} của các bảng. Vui lòng giải quyết phân hạng thủ công trước.`
        );
      }

      seeds.A1 = groupAStandings[0]!.teamId;
      seeds.B1 = groupBStandings[0]!.teamId;
      seeds.C1 = groupCStandings[0]!.teamId;
      seeds.D1 = groupDStandings[0]!.teamId;

      if (advancePerGroup >= 2) {
        seeds.A2 = groupAStandings[1]!.teamId;
        seeds.B2 = groupBStandings[1]!.teamId;
        seeds.C2 = groupCStandings[1]!.teamId;
        seeds.D2 = groupDStandings[1]!.teamId;
      }
    } else if (groupsCount === 2) {
      const groupAStandings = standings.filter((s) => s.group.code === 'A');
      const groupBStandings = standings.filter((s) => s.group.code === 'B');

      if (groupAStandings.length < advancePerGroup || groupBStandings.length < advancePerGroup) {
        throw new BadRequestException(
          `Vòng bảng chưa hoàn thành hoặc chưa có đủ bảng xếp hạng. Cần ít nhất ${advancePerGroup} đội mỗi bảng.`
        );
      }

      const hasTiesA = groupAStandings.slice(0, advancePerGroup).some((s) => (s.tieBreakDetail as any)?.requiresAdminDecision);
      const hasTiesB = groupBStandings.slice(0, advancePerGroup).some((s) => (s.tieBreakDetail as any)?.requiresAdminDecision);

      if (hasTiesA || hasTiesB) {
        throw new BadRequestException(
          `Có đội đang hòa chỉ số xếp hạng ở Top ${advancePerGroup}. Vui lòng giải quyết phân hạng thủ công trước.`
        );
      }

      seeds.A1 = groupAStandings[0]!.teamId;
      seeds.B1 = groupBStandings[0]!.teamId;

      if (advancePerGroup >= 2) {
        seeds.A2 = groupAStandings[1]!.teamId;
        seeds.B2 = groupBStandings[1]!.teamId;
      }
      if (advancePerGroup >= 3) {
        seeds.A3 = groupAStandings[2]!.teamId;
        seeds.B3 = groupBStandings[2]!.teamId;
      }
      if (advancePerGroup >= 4) {
        seeds.A4 = groupAStandings[3]!.teamId;
        seeds.B4 = groupBStandings[3]!.teamId;
      }
    } else {
      // groupsCount === 1
      const groupCode = groups[0]?.code || 'A';
      const singleGroupStandings = standings.filter((s) => s.group.code === groupCode);

      if (singleGroupStandings.length < advancePerGroup) {
        throw new BadRequestException(
          `Vòng bảng chưa hoàn thành hoặc chưa có đủ bảng xếp hạng. Cần ít nhất ${advancePerGroup} đội ở bảng ${groupCode}.`
        );
      }

      const hasTies = singleGroupStandings.slice(0, advancePerGroup).some((s) => (s.tieBreakDetail as any)?.requiresAdminDecision);

      if (hasTies) {
        throw new BadRequestException(
          `Có đội đang hòa chỉ số xếp hạng ở Top ${advancePerGroup}. Vui lòng giải quyết phân hạng thủ công trước.`
        );
      }

      for (let i = 0; i < advancePerGroup; i++) {
        seeds[`T${i + 1}`] = singleGroupStandings[i]!.teamId;
      }
    }

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
        seeds,
        groupsCount,
        advancePerGroup
      );

      const createdNodes = [];

      for (const node of domainNodes) {
        let matchId: string | null = null;

        // If both teams are resolved, we can create the match record right away!
        if (node.teamAId && node.teamBId) {
          let matchLabel = '';
          if (node.nodeKey === 'SF1') {
            matchLabel = 'Bán Kết - Trận 1';
          } else if (node.nodeKey === 'SF2') {
            matchLabel = 'Bán Kết - Trận 2';
          } else if (node.nodeKey === 'F') {
            matchLabel = 'Chung Kết';
          } else if (node.nodeKey === 'P1') {
            matchLabel = 'Vòng Nhánh - Trận 1';
          } else if (node.nodeKey === 'P2') {
            matchLabel = 'Vòng Nhánh - Trận 2';
          } else if (node.nodeKey === 'QF1') {
            matchLabel = 'Tứ Kết - Trận 1';
          } else if (node.nodeKey === 'QF2') {
            matchLabel = 'Tứ Kết - Trận 2';
          } else if (node.nodeKey === 'QF3') {
            matchLabel = 'Tứ Kết - Trận 3';
          } else if (node.nodeKey === 'QF4') {
            matchLabel = 'Tứ Kết - Trận 4';
          } else {
            matchLabel = `${node.roundName} - ${node.nodeKey}`;
          }

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
          const format = ruleset.matchFormat || 'relay';
          if (format === 'relay') {
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
          } else if (format === 'single_game') {
            await tx.matchSegment.create({
              data: {
                organizationId: tournament.organizationId,
                tournamentId,
                matchId: match.id,
                segmentOrder: 0,
                segmentKey: 'game',
                name: 'Trận đấu',
                targetScore: ruleset.scoringConfig?.winScore ?? 11,
                status: 'PENDING' as SegmentStatus,
              },
            });
          } else if (format === 'best_of') {
            const setsToWin = ruleset.scoringConfig?.setsToWin ?? 2;
            const maxSets = setsToWin * 2 - 1;
            const gamePointScore = ruleset.scoringConfig?.gamePointScore ?? 11;
            const lastSetPointScore = ruleset.scoringConfig?.lastSetPointScore ?? gamePointScore;

            for (let segIdx = 0; segIdx < maxSets; segIdx++) {
              const isLastSet = segIdx === maxSets - 1;
              const targetScore = isLastSet ? lastSetPointScore : gamePointScore;
              await tx.matchSegment.create({
                data: {
                  organizationId: tournament.organizationId,
                  tournamentId,
                  matchId: match.id,
                  segmentOrder: segIdx,
                  segmentKey: `set_${segIdx + 1}`,
                  name: `Set ${segIdx + 1}`,
                  targetScore,
                  status: 'PENDING' as SegmentStatus,
                },
              });
            }
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

    // Sync match team IDs if the match is already created
    if (targetNode.matchId) {
      await prisma.match.update({
        where: { id: targetNode.matchId },
        data: {
          teamAId: advanceResult.teamAId,
          teamBId: advanceResult.teamBId,
        },
      });
    }

    // 3. If both team slots are now filled on the target node, initialize its match!
    if (advanceResult.teamAId && advanceResult.teamBId && !targetNode.matchId) {
      const tournament = await prisma.tournament.findUnique({
        where: { id: node.tournamentId },
        include: {
          ruleset: {
            include: {
              segmentDefinitions: true,
              scoringConfig: true,
            },
          },
        },
      });

      const ruleset = tournament?.ruleset;

      if (ruleset) {
        let matchLabel = '';
        if (targetNode.nodeKey === 'SF1') {
          matchLabel = 'Bán Kết - Trận 1';
        } else if (targetNode.nodeKey === 'SF2') {
          matchLabel = 'Bán Kết - Trận 2';
        } else if (targetNode.nodeKey === 'F') {
          matchLabel = 'Chung Kết';
        } else if (targetNode.nodeKey === 'P1') {
          matchLabel = 'Vòng Nhánh - Trận 1';
        } else if (targetNode.nodeKey === 'P2') {
          matchLabel = 'Vòng Nhánh - Trận 2';
        } else if (targetNode.nodeKey === 'QF1') {
          matchLabel = 'Tứ Kết - Trận 1';
        } else if (targetNode.nodeKey === 'QF2') {
          matchLabel = 'Tứ Kết - Trận 2';
        } else if (targetNode.nodeKey === 'QF3') {
          matchLabel = 'Tứ Kết - Trận 3';
        } else if (targetNode.nodeKey === 'QF4') {
          matchLabel = 'Tứ Kết - Trận 4';
        } else {
          matchLabel = `${targetNode.roundName} - ${targetNode.nodeKey}`;
        }

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
        const format = ruleset.matchFormat || 'relay';
        if (format === 'relay') {
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
        } else if (format === 'single_game') {
          await prisma.matchSegment.create({
            data: {
              organizationId: node.organizationId,
              tournamentId: node.tournamentId,
              matchId: match.id,
              segmentOrder: 0,
              segmentKey: 'game',
              name: 'Trận đấu',
              targetScore: ruleset.scoringConfig?.winScore ?? 11,
              status: 'PENDING' as SegmentStatus,
            },
          });
        } else if (format === 'best_of') {
          const setsToWin = ruleset.scoringConfig?.setsToWin ?? 2;
          const maxSets = setsToWin * 2 - 1;
          const gamePointScore = ruleset.scoringConfig?.gamePointScore ?? 11;
          const lastSetPointScore = ruleset.scoringConfig?.lastSetPointScore ?? gamePointScore;

          for (let segIdx = 0; segIdx < maxSets; segIdx++) {
            const isLastSet = segIdx === maxSets - 1;
            const targetScore = isLastSet ? lastSetPointScore : gamePointScore;
            await prisma.matchSegment.create({
              data: {
                organizationId: node.organizationId,
                tournamentId: node.tournamentId,
                matchId: match.id,
                segmentOrder: segIdx,
                segmentKey: `set_${segIdx + 1}`,
                name: `Set ${segIdx + 1}`,
                targetScore,
                status: 'PENDING' as SegmentStatus,
              },
            });
          }
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
