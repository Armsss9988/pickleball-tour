import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TournamentMapper } from './tournament.mapper';
import {
  CreateTournamentDto,
  UpdateTournamentDto,
  TournamentStatus,
} from '@golab/contracts';
import { TournamentSectionValidatorService } from './tournament-section-validator.service';
import { getEffectivePhase, canUnpublish } from '@golab/domain';

@Injectable()
export class TournamentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly validatorService: TournamentSectionValidatorService,
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
        sectionStatuses: true,
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
        sectionStatuses: true,
      },
    });

    if (!tournament) {
      throw new NotFoundException(`Không tìm thấy giải đấu với ID ${id}.`);
    }

    return tournament;
  }

  /**
   * Fetches a tournament by its slug.
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
        sectionStatuses: true,
      },
    });

    if (!tournament) {
      throw new NotFoundException(
        `Không tìm thấy giải đấu với slug "${slug}".`,
      );
    }

    return tournament;
  }

  /**
   * Creates a new tournament.
   */
  async create(orgId: string, dto: CreateTournamentDto, userId: string) {
    const existing = await this.prisma.tournament.findFirst({
      where: { organizationId: orgId, slug: dto.slug },
    });

    if (existing) {
      throw new BadRequestException(
        `Slug "${dto.slug}" đã được sử dụng trong tổ chức này.`,
      );
    }

    if (dto.publicEnabled === true) {
      throw new BadRequestException(
        'Không thể công khai giải đấu khi đang ở trạng thái nháp DRAFT.',
      );
    }

    const tournament = await this.prisma.tournament.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description || null,
        venueName: dto.venueName || null,
        openingTime: dto.openingTime ? new Date(dto.openingTime) : null,
        registrationDeadline: dto.registrationDeadline
          ? new Date(dto.registrationDeadline)
          : null,
        publicEnabled: false,
        status: 'DRAFT',
        createdById: userId,
        rulesetId: '00000000-0000-0000-0000-000000000010', // Default template ruleset ID
      },
    });

    // Run initial section validation
    await this.validatorService.validateAll(tournament.id);

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

    if (dto.slug && dto.slug !== t.slug) {
      const existing = await this.prisma.tournament.findFirst({
        where: {
          organizationId: t.organizationId,
          slug: dto.slug,
          NOT: { id },
        },
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
        description:
          dto.description !== undefined ? dto.description : undefined,
        venueName: dto.venueName !== undefined ? dto.venueName : undefined,
        openingTime: dto.openingTime ? new Date(dto.openingTime) : undefined,
        registrationDeadline: dto.registrationDeadline
          ? new Date(dto.registrationDeadline)
          : undefined,
      },
    });

    // Re-validate info and related sections
    await this.validatorService.validateAll(id);

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
   * Publishes the tournament (Two-Tier).
   */
  async publish(id: string, userId: string) {
    const t = await this.findOne(id);
    const status = t.status as TournamentStatus;

    if (status === 'PUBLISHED' && t.publicEnabled) {
      return {
        published: true,
        operationallyReady: true,
        operationalWarnings: [],
      };
    }

    if (status !== 'COMPLETED' && status !== 'PUBLISHED') {
      throw new BadRequestException('Chưa thể công khai giải vì giải chưa hoàn tất.');
    }

    const { publishReady, operationalReady } = await this.validatorService.validateAll(id);

    if (!publishReady.ready) {
      throw new BadRequestException({
        message: 'Chưa đủ điều kiện công khai giải đấu.',
        missing: publishReady.missing,
      });
    }

    const updated = await this.prisma.tournament.update({
      where: { id },
      data: { status: 'PUBLISHED', publicEnabled: true },
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

    return {
      published: true,
      operationallyReady: operationalReady.ready,
      operationalWarnings: operationalReady.missing,
    };
  }

  /**
   * Unpublishes the tournament (DRAFT mode).
   */
  async unpublish(id: string, userId: string) {
    const t = await this.findOne(id);

    if (t.status !== 'PUBLISHED') {
      throw new BadRequestException('Giải đấu không ở trạng thái công khai PUBLISHED.');
    }

    const sectionStatuses = await this.prisma.tournamentSectionStatus.findMany({
      where: { tournamentId: id },
    });

    const required = ['ruleset', 'players', 'teams', 'schedule'];
    const isOperationallyReady = required.every(key => {
      const s = sectionStatuses.find(ss => ss.sectionKey === key);
      return s?.status === 'VALID';
    });

    const phase = getEffectivePhase(t.status, t.openingTime, isOperationallyReady);
    if (!canUnpublish(phase)) {
      throw new BadRequestException('Không thể hủy công khai giải đấu khi giải đã bắt đầu thi đấu.');
    }

    const updated = await this.prisma.tournament.update({
      where: { id },
      data: { status: 'DRAFT', publicEnabled: false },
    });

    await this.auditService.log({
      organizationId: t.organizationId,
      tournamentId: id,
      actorUserId: userId,
      action: 'TOURNAMENT_UNPUBLISHED',
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
  async transitionStatus(
    id: string,
    targetStatus: TournamentStatus,
    userId: string,
  ) {
    const t = await this.findOne(id);
    const domainT = TournamentMapper.toDomain(t);

    domainT.transitionTo(targetStatus);

    const updated = await this.prisma.tournament.update({
      where: { id },
      data: { status: targetStatus as any },
    });

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
