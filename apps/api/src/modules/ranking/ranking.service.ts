import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RankingMapper } from './ranking.mapper';
import { StandingCalculator } from '@golab/domain';

@Injectable()
export class RankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  @OnEvent('match.confirmed')
  async handleMatchConfirmed(payload: { matchId: string; groupId: string | null; tournamentId: string; userId: string }) {
    if (payload.groupId) {
      await this.recalculateGroupStandings(payload.groupId);
    }
  }

  /**
   * Recalculates standings for a group based on confirmed matches.
   */
  async recalculateGroupStandings(groupId: string, txContext?: any) {
    const prisma = txContext || this.prisma;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        tournament: {
          include: {
            ruleset: {
              include: { scoringConfig: true },
            },
          },
        },
        groupTeams: {
          include: { team: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Không tìm thấy Bảng đấu.`);
    }

    const ruleset = group.tournament.ruleset;
    if (!ruleset || !ruleset.scoringConfig) {
      throw new BadRequestException(`Giải đấu chưa được cấu hình điểm thắng/thua.`);
    }

    const config = ruleset.scoringConfig;

    // Load all confirmed matches in the group
    const matches = await prisma.match.findMany({
      where: {
        groupId,
        status: 'RESULT_CONFIRMED',
      },
      include: {
        result: true,
      },
    });

    const teamsInput = group.groupTeams.map((gt: any) => ({
      id: gt.team.id,
      name: gt.team.name,
      code: gt.team.code,
    }));

    const matchesInput = matches.map((m: typeof matches[0]) => ({
      teamAId: m.teamAId!,
      teamBId: m.teamBId!,
      teamAScore: m.result?.teamAScore ?? 0,
      teamBScore: m.result?.teamBScore ?? 0,
      winnerTeamId: m.result?.winnerTeamId ?? null,
      status: m.status as any,
    }));

    // Extract manual tie break override if present in tournament metadata
    const tournamentMeta = (group.tournament.metadata as any) || {};
    const manualRankingOverride = tournamentMeta.manualRankingOverrides?.[groupId] as string[] | undefined;

    // Calculate standings using domain StandingsCalculator
    const standings = StandingCalculator.calculate(
      teamsInput,
      matchesInput,
      config.pointsForWin,
      config.pointsForLoss,
      manualRankingOverride
    );

    // Save standings inside database
    await prisma.standing.deleteMany({
      where: { groupId },
    });

    for (const std of standings) {
      await prisma.standing.create({
        data: RankingMapper.toPersistence(std, group.organizationId, group.tournamentId, groupId),
      });
    }

    // Check if the group stage is completed (all 6 round robin matches confirmed)
    const totalMatchesCount = await prisma.match.count({
      where: { groupId },
    });
    const confirmedMatchesCount = matches.length;

    const isGroupDone = totalMatchesCount > 0 && confirmedMatchesCount === totalMatchesCount;

    if (isGroupDone) {
      // Check if there are any unresolved ties in this group
      const unresolvedTies = standings.some((s) => s.requiresAdminDecision);
      if (!unresolvedTies) {
        // If all groups in group stage are complete, we can transition stage status
        console.log(`Group ${group.name} completed successfully with no unresolved ties.`);
      }
    }

    return standings;
  }

  /**
   * Resolves a tie-break manually by storing the preferred team order in the group's metadata.
   */
  async resolveTieManually(groupId: string, teamIdsInRankOrder: string[], userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Không tìm thấy Bảng đấu.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.findUnique({
        where: { id: group.tournamentId },
      });
      const currentMeta = (tournament!.metadata as any) || {};
      const nextMeta = {
        ...currentMeta,
        manualRankingOverrides: {
          ...(currentMeta.manualRankingOverrides || {}),
          [groupId]: teamIdsInRankOrder,
        },
      };

      await tx.tournament.update({
        where: { id: group.tournamentId },
        data: { metadata: nextMeta },
      });

      // Recalculate standings with the manual override applied
      const standings = await this.recalculateGroupStandings(groupId, tx);

      await this.auditService.log({
        organizationId: group.organizationId,
        tournamentId: group.tournamentId,
        actorUserId: userId,
        action: 'TIE_BREAK_ADMIN_DECISION',
        entityType: 'Group',
        entityId: groupId,
        afterData: teamIdsInRankOrder,
      });

      return standings;
    });
  }

  /**
   * Retrieves standing tables for all groups in a tournament.
   */
  async getStandings(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { ruleset: true },
    });
    
    const rulesetConfig = (tournament?.ruleset as any) || {};
    const pointsForWin = rulesetConfig.pointsForWin ?? 3;
    const pointsForLoss = rulesetConfig.pointsForLoss ?? 0;

    const groups = await this.prisma.group.findMany({
      where: { tournamentId },
      include: {
        groupTeams: {
          include: {
            team: true,
          },
        },
      },
    });

    const dbStandings = await this.prisma.standing.findMany({
      where: { tournamentId },
      include: {
        team: true,
        group: true,
      },
    });

    const resultStandings = [];

    for (const group of groups) {
      const groupTeams = group.groupTeams.map(gt => gt.team);
      const groupDbStandings = dbStandings.filter(s => s.groupId === group.id);

      if (groupDbStandings.length > 0) {
        for (const std of groupDbStandings) {
          resultStandings.push({
            id: std.id,
            organizationId: std.organizationId,
            tournamentId: std.tournamentId,
            groupId: std.groupId,
            teamId: std.teamId,
            matchesPlayed: std.matchesPlayed,
            wins: std.wins,
            losses: std.losses,
            pointsFor: std.pointsFor,
            pointsAgainst: std.pointsAgainst,
            pointDiff: std.pointDiff,
            rank: std.rank ?? 0,
            tieBreakDetail: std.tieBreakDetail,
            calculatedAt: std.calculatedAt,
            team: std.team,
            group: { id: std.group.id, name: std.group.name, code: std.group.code },
            points: std.wins * pointsForWin + std.losses * pointsForLoss,
          });
        }

        const existingTeamIds = new Set(groupDbStandings.map(s => s.teamId));
        const missingTeams = groupTeams.filter(t => !existingTeamIds.has(t.id));
        if (missingTeams.length > 0) {
          const currentMaxRank = Math.max(...groupDbStandings.map(s => s.rank ?? 0), 0);
          missingTeams.forEach((team, index) => {
            resultStandings.push({
              id: `temp-${group.id}-${team.id}`,
              organizationId: group.organizationId,
              tournamentId: group.tournamentId,
              groupId: group.id,
              teamId: team.id,
              matchesPlayed: 0,
              wins: 0,
              losses: 0,
              pointsFor: 0,
              pointsAgainst: 0,
              pointDiff: 0,
              rank: currentMaxRank + index + 1,
              tieBreakDetail: { requiresAdminDecision: false, tieBreakReason: '' },
              calculatedAt: new Date(),
              team,
              group: { id: group.id, name: group.name, code: group.code },
              points: 0,
            });
          });
        }
      } else {
        const sortedTeams = [...groupTeams].sort((a, b) => a.code.localeCompare(b.code));
        sortedTeams.forEach((team, index) => {
          resultStandings.push({
            id: `temp-${group.id}-${team.id}`,
            organizationId: group.organizationId,
            tournamentId: group.tournamentId,
            groupId: group.id,
            teamId: team.id,
            matchesPlayed: 0,
            wins: 0,
            losses: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            pointDiff: 0,
            rank: index + 1,
            tieBreakDetail: { requiresAdminDecision: false, tieBreakReason: '' },
            calculatedAt: new Date(),
            team,
            group: { id: group.id, name: group.name, code: group.code },
            points: 0,
          });
        });
      }
    }

    return resultStandings;
  }

  /**
   * Recalculates standings for all groups in a tournament.
   */
  async recalculateTournamentStandings(tournamentId: string, userId: string) {
    const groups = await this.prisma.group.findMany({
      where: { tournamentId },
    });

    for (const g of groups) {
      await this.recalculateGroupStandings(g.id);
    }

    await this.auditService.log({
      tournamentId,
      actorUserId: userId,
      action: 'STANDINGS_RECALCULATED',
      entityType: 'Tournament',
      entityId: tournamentId,
    });

    return this.getStandings(tournamentId);
  }
}
