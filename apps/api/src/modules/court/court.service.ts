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

  async create(tournamentId: string, orgId: string, name: string, description?: string, userId?: string) {
    // Check if court name already exists in this tournament
    const existing = await this.prisma.court.findUnique({
      where: {
        tournamentId_name: {
          tournamentId,
          name,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`Sân với tên "${name}" đã tồn tại trong giải đấu này.`);
    }

    const court = await this.prisma.court.create({
      data: {
        organizationId: orgId,
        tournamentId,
        name,
        description,
      },
    });

    // Re-validate tournament schedule section since courts list changed
    await this.validatorService.validateAll(tournamentId);

    return court;
  }

  async update(id: string, name?: string, description?: string, isActive?: boolean, userId?: string) {
    const court = await this.prisma.court.findUnique({ where: { id } });
    if (!court) {
      throw new NotFoundException(`Không tìm thấy sân đấu.`);
    }

    if (name && name !== court.name) {
      const existing = await this.prisma.court.findFirst({
        where: {
          tournamentId: court.tournamentId,
          name,
          NOT: { id },
        },
      });
      if (existing) {
        throw new BadRequestException(`Sân với tên "${name}" đã tồn tại.`);
      }
    }

    const updated = await this.prisma.court.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
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
        const courtName = firstMatch.court?.name || firstMatch.courtName || 'Chưa rõ';

        conflicts.push({
          courtId: firstMatch.courtId,
          courtName,
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
