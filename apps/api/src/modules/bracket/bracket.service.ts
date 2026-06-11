import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BracketGeneratorService, BracketNode, ManualSeedBracketOptions } from '@golab/domain';
import { StageType, MatchStatus, SegmentStatus } from '@golab/contracts';

export interface GenerateBracketOptions {
  bracketSize?: 4 | 8;
  slots?: { slotNo: number; teamId: string | null }[];
}

@Injectable()
export class BracketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  private static getMatchLabel(nodeKey: string, roundName: string): string {
    const labels: Record<string, string> = {
      SF1: 'Bán Kết - Trận 1',
      SF2: 'Bán Kết - Trận 2',
      F: 'Chung Kết',
      '3P': 'Tranh Hạng 3',
      P1: 'Vòng Nhánh - Trận 1',
      P2: 'Vòng Nhánh - Trận 2',
      QF1: 'Tứ Kết - Trận 1',
      QF2: 'Tứ Kết - Trận 2',
      QF3: 'Tứ Kết - Trận 3',
      QF4: 'Tứ Kết - Trận 4',
      'R16-1': 'Vòng 1/8 - Trận 1',
      'R16-2': 'Vòng 1/8 - Trận 2',
      'R16-3': 'Vòng 1/8 - Trận 3',
      'R16-4': 'Vòng 1/8 - Trận 4',
      'R16-5': 'Vòng 1/8 - Trận 5',
      'R16-6': 'Vòng 1/8 - Trận 6',
      'R16-7': 'Vòng 1/8 - Trận 7',
      'R16-8': 'Vòng 1/8 - Trận 8',
    };

    return labels[nodeKey] ?? `${roundName} - ${nodeKey}`;
  }

  private static getSingleResolvedTeam(node: BracketNode): string | null {
    const teamAId = node.teamAId ?? null;
    const teamBId = node.teamBId ?? null;
    if (teamAId && !teamBId) return teamAId;
    if (!teamAId && teamBId) return teamBId;
    return null;
  }

  private static applyByeAdvancements(nodes: BracketNode[]): void {
    let changed = true;
    while (changed) {
      changed = false;

      for (const node of nodes) {
        const autoWinnerId = BracketService.getSingleResolvedTeam(node);
        if (!autoWinnerId || !node.winnerToNodeKey) continue;

        const targetNode = nodes.find((n) => n.nodeKey === node.winnerToNodeKey);
        if (!targetNode) continue;

        const sourceKey = `W:${node.nodeKey}`;
        const targetTeamAId = targetNode.teamAId ?? null;
        const targetTeamBId = targetNode.teamBId ?? null;

        if (targetNode.sourceA === sourceKey && targetTeamAId !== autoWinnerId) {
          targetNode.setTeams(autoWinnerId, targetTeamBId);
          changed = true;
        } else if (targetNode.sourceB === sourceKey && targetTeamBId !== autoWinnerId) {
          targetNode.setTeams(targetTeamAId, autoWinnerId);
          changed = true;
        }
      }
    }
  }

  private async createSegmentsForMatch(
    prisma: any,
    ruleset: any,
    matchId: string,
    organizationId: string,
    tournamentId: string
  ) {
    const format = ruleset.matchFormat || 'relay';
    if (format === 'relay') {
      const sortedRulesetSegs = [...ruleset.segmentDefinitions].sort(
        (a, b) => a.orderIndex - b.orderIndex
      );
      for (const [segIdx, rSeg] of sortedRulesetSegs.entries()) {
        await prisma.matchSegment.create({
          data: {
            organizationId,
            tournamentId,
            matchId,
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
          organizationId,
          tournamentId,
          matchId,
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
            organizationId,
            tournamentId,
            matchId,
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

  private async createMatchForResolvedNode(
    prisma: any,
    node: any,
    teamAId: string,
    teamBId: string
  ) {
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
    if (!ruleset) return null;

    const match = await prisma.match.create({
      data: {
        organizationId: node.organizationId,
        tournamentId: node.tournamentId,
        stageId: node.stageId,
        teamAId,
        teamBId,
        label: BracketService.getMatchLabel(node.nodeKey, node.roundName),
        status: (ruleset.requireLineup === false ? 'READY' : 'SCHEDULED') as MatchStatus,
        courtName: 'Sân 1',
        scheduledTime: new Date(),
      },
    });

    await prisma.bracketNode.update({
      where: { id: node.id },
      data: { matchId: match.id },
    });

    await this.createSegmentsForMatch(
      prisma,
      ruleset,
      match.id,
      node.organizationId,
      node.tournamentId
    );

    return match;
  }

  private async autoAdvanceByeNode(node: any, winnerTeamId: string, prisma: any) {
    if (!node.winnerToNodeKey || node.matchId) return;

    const targetNode = await prisma.bracketNode.findFirst({
      where: { tournamentId: node.tournamentId, nodeKey: node.winnerToNodeKey },
    });

    if (!targetNode) return;

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
      winnerTeamId,
      targetDomainNode
    );

    if (!advanceResult) return;

    const updatedTargetNode = await prisma.bracketNode.update({
      where: { id: targetNode.id },
      data: {
        teamAId: advanceResult.teamAId,
        teamBId: advanceResult.teamBId,
      },
    });

    if (targetNode.matchId) {
      await prisma.match.update({
        where: { id: targetNode.matchId },
        data: {
          teamAId: advanceResult.teamAId,
          teamBId: advanceResult.teamBId,
        },
      });
      return;
    }

    if (advanceResult.teamAId && advanceResult.teamBId) {
      await this.createMatchForResolvedNode(
        prisma,
        updatedTargetNode,
        advanceResult.teamAId,
        advanceResult.teamBId
      );
      return;
    }

    const autoWinnerId =
      advanceResult.teamAId && !advanceResult.teamBId
        ? advanceResult.teamAId
        : !advanceResult.teamAId && advanceResult.teamBId
          ? advanceResult.teamBId
          : null;

    if (autoWinnerId) {
      await this.autoAdvanceByeNode(updatedTargetNode, autoWinnerId, prisma);
    }
  }

  async getSeedCandidates(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { ruleset: true },
    });

    if (!tournament) {
      throw new NotFoundException(`Không tìm thấy giải đấu.`);
    }

    const advancePerGroup = tournament.ruleset?.advancePerGroup ?? 1;
    const standings = await this.prisma.standing.findMany({
      where: { tournamentId },
      include: {
        group: true,
        team: true,
      },
    });

    const candidates = standings
      .slice()
      .sort((a, b) => {
        const groupCompare = String(a.group?.code ?? '').localeCompare(String(b.group?.code ?? ''));
        if (groupCompare !== 0) return groupCompare;
        return (a.rank ?? 999) - (b.rank ?? 999);
      })
      .map((standing) => {
        const groupCode = standing.group?.code ?? '';
        const rank = standing.rank ?? 0;
        return {
          teamId: standing.teamId,
          teamName: standing.team?.name ?? null,
          teamCode: standing.team?.code ?? null,
          groupId: standing.groupId,
          groupCode,
          groupName: standing.group?.name ?? null,
          rank,
          sourceLabel: `${groupCode}${rank}`,
          qualifiedByRule: rank > 0 && rank <= advancePerGroup,
          requiresAdminDecision: Boolean((standing.tieBreakDetail as any)?.requiresAdminDecision),
        };
      });

    return {
      advancePerGroup,
      candidates,
    };
  }

  @OnEvent('match.confirmed')
  async handleMatchConfirmed(payload: { matchId: string; groupId: string | null; tournamentId: string; userId: string }) {
    if (!payload.groupId) {
      await this.advanceBracketNode(payload.matchId);
    }
  }

  /**
   * Generates the knockout stage bracket and playoff matches based on group standings.
   */
  async generateBracket(tournamentId: string, userId: string, options?: GenerateBracketOptions) {
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

    const useManualSeeds = !!(options?.bracketSize && options.slots);
    const hasRulesetKnockout = !useManualSeeds && ruleset.knockoutBracketSize !== null;
    let manualOptions: ManualSeedBracketOptions | null = null;
    const advancePerGroup = ruleset.advancePerGroup ?? 1;
    let seeds: any = {};
    let groupsCount = 0;

    if (useManualSeeds) {
      manualOptions = {
        bracketSize: options!.bracketSize! as 4 | 8 | 16,
        slots: options!.slots!,
        thirdPlaceMatchEnabled: ruleset.thirdPlaceMatchEnabled ?? false,
      };
    } else if (hasRulesetKnockout) {
      const standings = await this.prisma.standing.findMany({
        where: { tournamentId },
        include: { group: true },
        orderBy: { rank: 'asc' },
      });

      const slots: { slotNo: number; teamId: string | null; sourceKey: string | null }[] = [];
      const knockoutSeedSlots = (ruleset.knockoutSeedSlots as any[]) || [];

      for (const slot of knockoutSeedSlots) {
        const sourceKey = slot.sourceKey;
        let teamId: string | null = null;

        if (sourceKey && sourceKey !== 'Bye' && sourceKey !== 'Miễn đấu') {
          const match = sourceKey.match(/^([A-H])(\d+)$/);
          if (match) {
            const groupCode = match[1];
            const rank = parseInt(match[2], 10);
            const standing = standings.find(
              (s) => s.group?.code === groupCode && s.rank === rank
            );
            if (!standing) {
              throw new BadRequestException(
                `Chưa có kết quả xếp hạng cho vị trí ${sourceKey}. Vui lòng hoàn thành vòng bảng trước.`
              );
            }
            if (
              standing.rank !== null &&
              standing.rank > 0 &&
              (standing.tieBreakDetail as any)?.requiresAdminDecision
            ) {
              throw new BadRequestException(
                `Vị trí ${sourceKey} đang bị hòa chỉ số và cần phân hạng thủ công.`
              );
            }
            teamId = standing.teamId;
          } else {
            throw new BadRequestException(`Định dạng nguồn hạt giống không hợp lệ: ${sourceKey}`);
          }
        }

        slots.push({
          slotNo: slot.slotNo,
          teamId,
          sourceKey,
        });
      }

      manualOptions = {
        bracketSize: ruleset.knockoutBracketSize as 4 | 8 | 16,
        slots,
        thirdPlaceMatchEnabled: ruleset.thirdPlaceMatchEnabled ?? false,
      };
    } else {
      // 1. Fetch group standings
      const standings = await this.prisma.standing.findMany({
        where: { tournamentId },
        include: { group: true },
        orderBy: { rank: 'asc' },
      });

      const groups = await this.prisma.group.findMany({
        where: { tournamentId },
      });
      groupsCount = groups.length;

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
      const domainNodes = manualOptions
        ? BracketGeneratorService.generateManualSeedNodes(
            tournament.organizationId,
            tournamentId,
            stage.id,
            manualOptions
          )
        : BracketGeneratorService.generateInitialNodes(
            tournament.organizationId,
            tournamentId,
            stage.id,
            seeds,
            groupsCount,
            advancePerGroup
          );

      BracketService.applyByeAdvancements(domainNodes);

      const createdNodes = [];

      for (const node of domainNodes) {
        let matchId: string | null = null;

        // If both teams are resolved, we can create the match record right away!
        if (node.teamAId && node.teamBId) {
          const matchLabel = BracketService.getMatchLabel(node.nodeKey, node.roundName);

          const match = await tx.match.create({
            data: {
              organizationId: tournament.organizationId,
              tournamentId,
              stageId: stage.id,
              teamAId: node.teamAId,
              teamBId: node.teamBId,
              label: matchLabel,
              status: (ruleset.requireLineup === false ? 'READY' : 'SCHEDULED') as MatchStatus,
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
    const loserId = winnerId === node.teamAId ? node.teamBId : winnerId === node.teamBId ? node.teamAId : null;

    const winnerToKey = node.winnerToNodeKey;

    await this.auditService.log({
      organizationId: node.organizationId,
      tournamentId: node.tournamentId,
      action: 'BRACKET_ADVANCED',
      entityType: 'BracketNode',
      entityId: node.id,
      afterData: { winnerTeamId: winnerId, nextNodeKey: winnerToKey },
    });

    await this.advanceLoserToThirdPlace(node, loserId, prisma);

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

    // 3. If both team slots are now filled on the target node, initialize its match.
    // If the other side of the target was an empty bye branch, keep auto-advancing.
    if (advanceResult.teamAId && advanceResult.teamBId && !targetNode.matchId) {
      await this.createMatchForResolvedNode(
        prisma,
        updatedTargetNode,
        advanceResult.teamAId,
        advanceResult.teamBId
      );
    } else if (!targetNode.matchId) {
      const autoWinnerId =
        advanceResult.teamAId && !advanceResult.teamBId
          ? advanceResult.teamAId
          : !advanceResult.teamAId && advanceResult.teamBId
            ? advanceResult.teamBId
            : null;

      if (autoWinnerId) {
        await this.autoAdvanceByeNode(updatedTargetNode, autoWinnerId, prisma);
      }
    }
  }

  private async advanceLoserToThirdPlace(node: any, loserTeamId: string | null, prisma: any) {
    if (!loserTeamId) return;

    const thirdPlaceNode = await prisma.bracketNode.findFirst({
      where: { tournamentId: node.tournamentId, nodeKey: '3P' },
      include: { match: true },
    });

    if (!thirdPlaceNode) return;

    const sourceKey = `L:${node.nodeKey}`;
    let teamAId = thirdPlaceNode.teamAId ?? null;
    let teamBId = thirdPlaceNode.teamBId ?? null;

    if (thirdPlaceNode.sourceA === sourceKey) {
      teamAId = loserTeamId;
    } else if (thirdPlaceNode.sourceB === sourceKey) {
      teamBId = loserTeamId;
    } else {
      return;
    }

    const updatedThirdPlaceNode = await prisma.bracketNode.update({
      where: { id: thirdPlaceNode.id },
      data: { teamAId, teamBId },
    });

    if (thirdPlaceNode.matchId) {
      await prisma.match.update({
        where: { id: thirdPlaceNode.matchId },
        data: { teamAId, teamBId },
      });
      return;
    }

    if (!teamAId || !teamBId) return;

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
    if (!ruleset) return;

    const match = await prisma.match.create({
      data: {
        organizationId: node.organizationId,
        tournamentId: node.tournamentId,
        stageId: thirdPlaceNode.stageId,
        teamAId,
        teamBId,
        label: BracketService.getMatchLabel(thirdPlaceNode.nodeKey, thirdPlaceNode.roundName),
        status: (ruleset.requireLineup === false ? 'READY' : 'SCHEDULED') as MatchStatus,
        courtName: 'Sân 1',
        scheduledTime: new Date(),
      },
    });

    await prisma.bracketNode.update({
      where: { id: updatedThirdPlaceNode.id },
      data: { matchId: match.id },
    });

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
