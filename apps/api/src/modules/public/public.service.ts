import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async getTournamentCenter(slug: string) {
    const publicStatuses = ['COMPLETED', 'PUBLISHED'] as const;

    const tournaments = await this.prisma.tournament.findMany({
      where: {
        slug,
        publicEnabled: true,
        status: { in: publicStatuses as any },
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
            group: true,
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

    return {
      tournament,
      matches,
      groups,
      standings: this.mapStandings(standings),
      teams,
      bracket,
    };
  }

  private mapStandings(
    standings: Array<{
      group: { code: string };
      team: { id: string; name: string; code: string };
      teamId: string;
      matchesPlayed: number;
      wins: number;
      losses: number;
      pointsFor: number;
      pointsAgainst: number;
      pointDiff: number;
      rank: number | null;
      tieBreakDetail: unknown;
    }>,
  ) {
    const groupsMap = new Map<string, any[]>();

    for (const standing of standings) {
      const groupCode = standing.group.code;
      if (!groupsMap.has(groupCode)) {
        groupsMap.set(groupCode, []);
      }

      groupsMap.get(groupCode)!.push({
        ...this.getTieBreakMeta(standing.tieBreakDetail),
        teamId: standing.teamId,
        teamName: standing.team.name,
        teamCode: standing.team.code,
        matchesPlayed: standing.matchesPlayed,
        wins: standing.wins,
        losses: standing.losses,
        pointsFor: standing.pointsFor,
        pointsAgainst: standing.pointsAgainst,
        pointDiff: standing.pointDiff,
        rank: standing.rank,
      });
    }

    return Array.from(groupsMap.entries()).map(([groupCode, items]) => ({
      groupCode,
      items,
    }));
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
