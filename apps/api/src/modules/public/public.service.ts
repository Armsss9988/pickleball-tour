import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicTournaments() {
    return this.prisma.tournament.findMany({
      where: {
        publicEnabled: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        venueName: true,
        openingTime: true,
        status: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getPublicTournamentSummaryById(tournamentId: string) {
    const tournaments = await this.prisma.tournament.findMany({
      where: {
        id: tournamentId,
        publicEnabled: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        venueName: true,
        openingTime: true,
        registrationDeadline: true,
        status: true,
        publicEnabled: true,
        rulesetId: true,
        updatedAt: true,
      },
      take: 2,
      orderBy: { updatedAt: 'desc' },
    });

    if (tournaments.length === 0) {
      throw new NotFoundException(
        `Không tìm thấy giải đấu công khai với id "${tournamentId}".`,
      );
    }

    if (tournaments.length > 1) {
      throw new BadRequestException(
        `Id công khai "${tournamentId}" đang bị trùng giữa nhiều tổ chức.`,
      );
    }

    const tournament = tournaments[0]!;

    return {
      id: tournament.id,
      name: tournament.name,
      slug: tournament.slug,
      description: tournament.description,
      venueName: tournament.venueName,
      openingTime: tournament.openingTime,
      registrationDeadline: tournament.registrationDeadline,
      status: tournament.status,
      publicEnabled: tournament.publicEnabled,
      rulesetId: tournament.rulesetId ?? null,
    };
  }

  async getTournamentCenter(slug: string) {
    const tournaments = await this.prisma.tournament.findMany({
      where: {
        slug,
        publicEnabled: true,
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
        slug: true,
        description: true,
        venueName: true,
        openingTime: true,
        registrationDeadline: true,
        status: true,
        publicEnabled: true,
        createdAt: true,
        updatedAt: true,
        ruleset: {
          select: {
            scoringConfig: {
              select: {
                pointsForWin: true,
                pointsForLoss: true,
              },
            },
          },
        },
      },
      take: 2,
      orderBy: { updatedAt: 'desc' },
    });

    if (tournaments.length === 0) {
      throw new NotFoundException(
        `Không tìm thấy giải đấu công khai với slug "${slug}".`,
      );
    }

    if (tournaments.length > 1) {
      throw new BadRequestException(
        `Slug công khai "${slug}" đang bị trùng giữa nhiều tổ chức.`,
      );
    }

    const tournament = tournaments[0]!;
    const pointsForWin = tournament.ruleset?.scoringConfig?.pointsForWin ?? 3;
    const pointsForLoss = tournament.ruleset?.scoringConfig?.pointsForLoss ?? 0;

    const [matches, groups, standings, teams, bracket] =
      await this.prisma.$transaction([
        this.prisma.match.findMany({
          where: { tournamentId: tournament.id },
          include: {
            teamA: true,
            teamB: true,
            group: true,
            segments: {
              orderBy: { segmentOrder: 'asc' },
            },
            scoreEvents: {
              where: { isUndone: false },
              orderBy: { eventNo: 'asc' },
            },
            result: true,
          },
          orderBy: { matchNo: 'asc' },
        }),
        this.prisma.group.findMany({
          where: { tournamentId: tournament.id },
          include: {
            groupTeams: {
              include: {
                team: {
                  include: {
                    captain: true,
                    members: {
                      include: {
                        playerProfile: true,
                      },
                    },
                  },
                },
              },
              orderBy: { seedOrder: 'asc' },
            },
          },
          orderBy: { code: 'asc' },
        }),
        this.prisma.standing.findMany({
          where: { tournamentId: tournament.id },
          include: {
            team: true,
            group: {
              include: {
                groupTeams: {
                  include: { team: true },
                },
              },
            },
          },
          orderBy: [{ groupId: 'asc' }, { rank: 'asc' }],
        }),
        this.prisma.team.findMany({
          where: { tournamentId: tournament.id },
          include: {
            captain: true,
            members: {
              include: {
                playerProfile: true,
              },
            },
          },
          orderBy: { code: 'asc' },
        }),
        this.prisma.bracketNode.findMany({
          where: { tournamentId: tournament.id },
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
        }),
      ]);

    // Strip the ruleset from the tournament object before returning to keep response lean
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ruleset: _ruleset, ...tournamentData } = tournament as typeof tournament & { ruleset?: unknown };

    return {
      tournament: tournamentData,
      matches,
      groups,
      standings: this.mapStandings(standings, pointsForWin, pointsForLoss),
      teams,
      bracket,
    };
  }

  private mapStandings(
    standings: Array<{
      id: string;
      groupId: string;
      teamId: string;
      group: {
        id: string;
        code: string;
        name: string;
        groupTeams: Array<{ team: { id: string; name: string; code: string } }>;
      };
      team: { id: string; name: string; code: string };
      matchesPlayed: number;
      wins: number;
      losses: number;
      pointsFor: number;
      pointsAgainst: number;
      pointDiff: number;
      rank: number | null;
      tieBreakDetail: unknown;
    }>,
    pointsForWin: number,
    pointsForLoss: number,
  ) {
    const result: Array<{
      id: string;
      groupId: string;
      teamId: string;
      team: { id: string; name: string; code: string };
      group: { id: string; name: string; code: string };
      matchesPlayed: number;
      wins: number;
      losses: number;
      pointsFor: number;
      pointsAgainst: number;
      pointDiff: number;
      rank: number;
      points: number;
      requiresAdminDecision: boolean;
      tieBreakReason: string | null;
    }> = [];

    // Track which teams already have a standing row per group (for placeholder logic)
    const groupTeamsSeen = new Map<string, Set<string>>();

    for (const s of standings) {
      if (!groupTeamsSeen.has(s.groupId)) {
        groupTeamsSeen.set(s.groupId, new Set());
      }
      groupTeamsSeen.get(s.groupId)!.add(s.teamId);

      result.push({
        id: s.id,
        groupId: s.groupId,
        teamId: s.teamId,
        team: s.team,
        group: { id: s.group.id, name: s.group.name, code: s.group.code },
        matchesPlayed: s.matchesPlayed,
        wins: s.wins,
        losses: s.losses,
        pointsFor: s.pointsFor,
        pointsAgainst: s.pointsAgainst,
        pointDiff: s.pointDiff,
        rank: s.rank ?? 0,
        points: s.wins * pointsForWin + s.losses * pointsForLoss,
        ...this.getTieBreakMeta(s.tieBreakDetail),
      });
    }

    // Add placeholder rows for teams that have no standing record yet (pre-match state)
    for (const s of standings) {
      const seenTeams = groupTeamsSeen.get(s.groupId)!;
      const groupResults = result.filter((r) => r.groupId === s.groupId);
      const maxRank = groupResults.length > 0 ? Math.max(...groupResults.map((r) => r.rank)) : 0;
      let offset = 0;

      for (const gt of s.group.groupTeams) {
        const team = gt.team;
        if (!seenTeams.has(team.id)) {
          seenTeams.add(team.id);
          result.push({
            id: `placeholder-${s.groupId}-${team.id}`,
            groupId: s.groupId,
            teamId: team.id,
            team,
            group: { id: s.group.id, name: s.group.name, code: s.group.code },
            matchesPlayed: 0,
            wins: 0,
            losses: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            pointDiff: 0,
            rank: maxRank + offset + 1,
            points: 0,
            requiresAdminDecision: false,
            tieBreakReason: null,
          });
          offset++;
        }
      }
    }

    return result;
  }


  private getTieBreakMeta(tieBreakDetail: unknown) {
    if (!tieBreakDetail || typeof tieBreakDetail !== 'object') {
      return {
        requiresAdminDecision: false,
        tieBreakReason: null,
      };
    }

    const detail = tieBreakDetail as {
      requiresAdminDecision?: boolean;
      tieBreakReason?: string | null;
    };

    return {
      requiresAdminDecision: detail.requiresAdminDecision ?? false,
      tieBreakReason: detail.tieBreakReason ?? null,
    };
  }
}
