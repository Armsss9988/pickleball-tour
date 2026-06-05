import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TournamentSectionValidatorService } from '../tournament/tournament-section-validator.service';

@Injectable()
export class CourtService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly validatorService: TournamentSectionValidatorService,
  ) {}

  async findAll(tournamentId: string) {
    return this.prisma.court.findMany({
      where: { tournamentId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  private formatCourtLabel(court?: { name: string; venueName?: string | null } | null) {
    if (!court) return null;
    return court.venueName?.trim() ? `${court.venueName.trim()} - ${court.name}` : court.name;
  }

  async create(
    tournamentId: string,
    orgId: string,
    name: string,
    description?: string,
    venueName?: string,
    userId?: string,
  ) {
    const normalizedName = name.trim();
    const normalizedVenueName = venueName?.trim() || null;
    const existing = await this.prisma.court.findFirst({
      where: {
        tournamentId,
        name: normalizedName,
        venueName: normalizedVenueName,
      },
    });

    if (existing) {
      throw new BadRequestException(`Sân "${normalizedName}" đã tồn tại tại địa điểm này.`);
    }

    const court = await this.prisma.court.create({
      data: {
        organizationId: orgId,
        tournamentId,
        venueName: normalizedVenueName,
        name: normalizedName,
        description,
      },
    });

    // Re-validate tournament schedule section since courts list changed
    await this.validatorService.validateAll(tournamentId);

    return court;
  }

  async update(
    id: string,
    name?: string,
    description?: string,
    isActive?: boolean,
    venueName?: string,
    userId?: string,
  ) {
    const court = await this.prisma.court.findUnique({ where: { id } });
    if (!court) {
      throw new NotFoundException(`Không tìm thấy sân đấu.`);
    }

    const normalizedName = name?.trim();
    const normalizedVenueName = venueName !== undefined ? venueName.trim() || null : court.venueName;

    if ((normalizedName && normalizedName !== court.name) || normalizedVenueName !== court.venueName) {
      const existing = await this.prisma.court.findFirst({
        where: {
          tournamentId: court.tournamentId,
          name: normalizedName ?? court.name,
          venueName: normalizedVenueName,
          NOT: { id },
        },
      });
      if (existing) {
        throw new BadRequestException(`Sân "${normalizedName ?? court.name}" đã tồn tại tại địa điểm này.`);
      }
    }

    const updated = await this.prisma.court.update({
      where: { id },
      data: {
        name: normalizedName !== undefined ? normalizedName : undefined,
        venueName: venueName !== undefined ? normalizedVenueName : undefined,
        description: description !== undefined ? description : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    // Re-validate
    await this.validatorService.validateAll(court.tournamentId);

    return updated;
  }

  async remove(id: string, userId?: string) {
    const court = await this.prisma.court.findUnique({ where: { id } });
    if (!court) {
      throw new NotFoundException(`Không tìm thấy sân đấu.`);
    }

    // Check if there are matches scheduled on this court
    const matchCount = await this.prisma.match.count({
      where: { courtId: id },
    });

    if (matchCount > 0) {
      throw new BadRequestException(`Không thể xóa sân đấu này vì đã có ${matchCount} trận đấu được lên lịch trên sân.`);
    }

    await this.prisma.court.delete({ where: { id } });

    // Re-validate
    await this.validatorService.validateAll(court.tournamentId);

    return { deleted: true };
  }

  async getScheduleConflicts(tournamentId: string) {
    const matches = await this.prisma.match.findMany({
      where: {
        tournamentId,
        scheduledTime: { not: null },
        OR: [
          { courtId: { not: null } },
          { courtName: { not: null } },
        ],
      },
      include: {
        teamA: true,
        teamB: true,
        court: true,
      },
    });

    const courtTimeMap = new Map<string, typeof matches>();
    for (const match of matches) {
      const courtKey = match.courtId || match.courtName;
      if (!courtKey || !match.scheduledTime) continue;
      const timeStr = new Date(match.scheduledTime).toISOString();
      const key = `${courtKey}_${timeStr}`;

      if (!courtTimeMap.has(key)) {
        courtTimeMap.set(key, []);
      }
      courtTimeMap.get(key)!.push(match);
    }

    const conflicts: any[] = [];
    for (const [key, conflictMatches] of courtTimeMap.entries()) {
      if (conflictMatches.length > 1) {
        const parts = key.split('_');
        const timeStr = parts[1];
        if (!timeStr) continue;

        const firstMatch = conflictMatches[0]!;
        const courtName = this.formatCourtLabel(firstMatch.court) || firstMatch.courtName || 'Chưa rõ';

        conflicts.push({
          courtId: firstMatch.courtId,
          courtName,
          venueName: firstMatch.court?.venueName || null,
          scheduledTime: new Date(timeStr),
          matchIds: conflictMatches.map(m => m.id),
          matches: conflictMatches.map(m => ({
            id: m.id,
            label: m.label || `Trận đấu #${m.matchNo}`,
            teamAName: m.teamA?.name || 'Chưa rõ',
            teamBName: m.teamB?.name || 'Chưa rõ',
          })),
        });
      }
    }

    return conflicts;
  }
}
