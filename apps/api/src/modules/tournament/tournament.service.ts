import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TournamentMapper } from './tournament.mapper';
import { CreateTournamentDto, UpdateTournamentDto, TournamentStatus } from '@golab/contracts';

@Injectable()
export class TournamentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  /**
   * Lists all tournaments for a given organization.
   */
  async findAll(orgId: string) {
    return this.prisma.tournament.findMany({
      where: { organizationId: orgId },
      include: {
        ruleset: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Fetches a tournament by its unique identifier.
   */
  async findOne(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        ruleset: {
          include: {
            segmentDefinitions: true,
            teamCompositionRule: true,
            playerLimitRules: true,
            overlapRules: true,
            scoringConfig: true,
          },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException(`Không tìm thấy giải đấu với ID ${id}.`);
    }

    return tournament;
  }

  /**
   * Fetches a tournament by its slug (useful for public APIs).
   */
  async findBySlug(orgId: string, slug: string) {
    const tournament = await this.prisma.tournament.findFirst({
      where: { organizationId: orgId, slug },
      include: {
        ruleset: {
          include: {
            segmentDefinitions: true,
            teamCompositionRule: true,
            playerLimitRules: true,
            overlapRules: true,
            scoringConfig: true,
          },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException(`Không tìm thấy giải đấu với slug "${slug}".`);
    }

    return tournament;
  }

  /**
   * Creates a new tournament.
   */
  async create(orgId: string, dto: CreateTournamentDto, userId: string) {
    // Check if slug is unique inside organization
    const existing = await this.prisma.tournament.findFirst({
      where: { organizationId: orgId, slug: dto.slug },
    });

    if (existing) {
      throw new BadRequestException(`Slug "${dto.slug}" đã được sử dụng trong tổ chức này.`);
    }

    const tournament = await this.prisma.tournament.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description || null,
        venueName: dto.venueName || null,
        openingTime: dto.openingTime ? new Date(dto.openingTime) : null,
        registrationDeadline: dto.registrationDeadline ? new Date(dto.registrationDeadline) : null,
        publicEnabled: dto.publicEnabled ?? false,
        status: 'DRAFT',
        createdById: userId,
      },
    });

    await this.auditService.log({
      organizationId: orgId,
      tournamentId: tournament.id,
      actorUserId: userId,
      action: 'TOURNAMENT_CREATED',
      entityType: 'Tournament',
      entityId: tournament.id,
      afterData: tournament,
    });

    return tournament;
  }

  /**
   * Updates tournament settings.
   */
  async update(id: string, dto: UpdateTournamentDto, userId: string) {
    const t = await this.findOne(id);

    // If ruleset is being updated, verify lock rules
    if (dto.slug && dto.slug !== t.slug) {
      const existing = await this.prisma.tournament.findFirst({
        where: { organizationId: t.organizationId, slug: dto.slug, NOT: { id } },
      });
      if (existing) {
        throw new BadRequestException(`Slug "${dto.slug}" đã được sử dụng.`);
      }
    }

    const updated = await this.prisma.tournament.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description !== undefined ? dto.description : undefined,
        venueName: dto.venueName !== undefined ? dto.venueName : undefined,
        openingTime: dto.openingTime ? new Date(dto.openingTime) : undefined,
        registrationDeadline: dto.registrationDeadline ? new Date(dto.registrationDeadline) : undefined,
        publicEnabled: dto.publicEnabled !== undefined ? dto.publicEnabled : undefined,
      },
    });

    await this.auditService.log({
      organizationId: t.organizationId,
      tournamentId: id,
      actorUserId: userId,
      action: 'TOURNAMENT_UPDATED',
      entityType: 'Tournament',
      entityId: id,
      beforeData: t,
      afterData: updated,
    });

    return updated;
  }

  /**
   * Publishes the tournament public landing page.
   */
  async publish(id: string, userId: string) {
    const t = await this.findOne(id);
    const updated = await this.prisma.tournament.update({
      where: { id },
      data: { publicEnabled: true },
    });

    await this.auditService.log({
      organizationId: t.organizationId,
      tournamentId: id,
      actorUserId: userId,
      action: 'TOURNAMENT_PUBLISHED',
      entityType: 'Tournament',
      entityId: id,
      beforeData: t,
      afterData: updated,
    });

    return updated;
  }

  /**
   * Transitions the status of a tournament using the pure Domain rules.
   */
  async transitionStatus(id: string, targetStatus: TournamentStatus, userId: string) {
    const t = await this.findOne(id);
    const domainT = TournamentMapper.toDomain(t);

    domainT.transitionTo(targetStatus);

    const updated = await this.prisma.tournament.update({
      where: { id },
      data: { status: targetStatus },
    });

    // Write matching audit log action
    await this.auditService.log({
      organizationId: t.organizationId,
      tournamentId: id,
      actorUserId: userId,
      action: `TOURNAMENT_STATUS_${targetStatus}`,
      entityType: 'Tournament',
      entityId: id,
      beforeData: { status: t.status },
      afterData: { status: targetStatus },
    });

    return updated;
  }
}
