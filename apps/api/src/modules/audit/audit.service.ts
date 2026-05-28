import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

export interface AuditLogData {
  organizationId?: string;
  tournamentId?: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  beforeData?: any;
  afterData?: any;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records a mutation to the audit logs.
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: data.organizationId || null,
          tournamentId: data.tournamentId || null,
          actorUserId: data.actorUserId || null,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId || null,
          beforeData: data.beforeData || undefined,
          afterData: data.afterData || undefined,
          reason: data.reason || null,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
        },
      });
    } catch (err) {
      // Fail silently to avoid breaking the main transaction, but log the error
      console.error('Failed to write audit log:', err);
    }
  }

  /**
   * Retrieves all audit logs for a specific tournament.
   */
  async findByTournament(tournamentId: string) {
    return this.prisma.auditLog.findMany({
      where: { tournamentId },
      include: {
        actor: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
