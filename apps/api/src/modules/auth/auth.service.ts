import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { compareSync } from 'bcryptjs';
import { LoginDto, AuthTokens, UserProfile } from '@golab/contracts';
import { createHash, randomBytes } from 'crypto';

interface AuthRequestMetadata {
  userAgent?: string | null;
  ipAddress?: string | null;
}

interface RefreshTokenInput {
  refreshToken?: string;
}

type InternalAuthTokens = AuthTokens & { refreshToken: string };

function parseDurationMs(value: string | undefined, fallback: string) {
  const source = value || fallback;
  const match = /^(\d+)([smhd])$/.exec(source.trim());
  if (!match) return parseDurationMs(fallback, '7d');

  const amount = Number(match[1]!);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  const multipliers: Record<'s' | 'm' | 'h' | 'd', number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  /**
   * Validates user credentials.
   */
  async login(
    dto: LoginDto,
    metadata: AuthRequestMetadata = {},
  ): Promise<InternalAuthTokens & { user: UserProfile }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        userRoles: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tài khoản đã bị khóa hoặc đang chờ duyệt.');
    }

    const passwordValid = compareSync(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
    }

    // Extract roles (mapping standard Roles)
    const roles = user.userRoles.map((ur) => ur.role);

    const payload = {
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
      roles,
      orgId: user.organizationId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'your-jwt-secret-change-in-production',
      expiresIn: (process.env.JWT_EXPIRATION || '1h') as any,
    });

    const refreshToken = this.createRefreshToken();
    await this.storeRefreshSession(user.id, refreshToken, metadata);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email || '',
        displayName: user.displayName,
        roles,
      },
    };
  }

  /**
   * Refreshes access token using a valid refresh token.
   */
  async refreshTokens(
    refreshTokenDto: RefreshTokenInput,
    metadata: AuthRequestMetadata = {},
  ): Promise<InternalAuthTokens> {
    const refreshToken = refreshTokenDto.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Mã refresh đã hết hạn hoặc không hợp lệ.');
    }

    try {
      const tokenHash = this.hashRefreshToken(refreshToken);
      const session = await this.prisma.refreshSession.findFirst({
        where: { tokenHash },
        include: { user: { include: { userRoles: true } } },
      });

      if (!session) {
        throw new UnauthorizedException('Mã refresh không hợp lệ.');
      }

      const now = new Date();
      if (session.revokedAt) {
        await this.revokeActiveUserSessions(session.userId, now);
        throw new UnauthorizedException('Mã refresh đã được sử dụng lại.');
      }

      if (session.expiresAt <= now) {
        await this.prisma.refreshSession.update({
          where: { id: session.id },
          data: { revokedAt: now },
        });
        throw new UnauthorizedException('Mã refresh đã hết hạn.');
      }

      const user = session.user;
      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị khóa.');
      }

      const roles = user.userRoles.map((ur) => ur.role);
      const newPayload = {
        sub: user.id,
        email: user.email,
        displayName: user.displayName,
        roles,
        orgId: user.organizationId,
      };

      const accessToken = this.jwtService.sign(newPayload, {
        secret: process.env.JWT_SECRET || 'your-jwt-secret-change-in-production',
        expiresIn: (process.env.JWT_EXPIRATION || '1h') as any,
      });

      const nextRefreshToken = this.createRefreshToken();
      const nextSession = await this.storeRefreshSession(user.id, nextRefreshToken, metadata);
      await this.prisma.refreshSession.update({
        where: { id: session.id },
        data: {
          revokedAt: now,
          replacedBySessionId: nextSession.id,
        },
      });

      return {
        accessToken,
        refreshToken: nextRefreshToken,
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Mã refresh đã hết hạn hoặc không hợp lệ.');
    }
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return { success: true };

    const tokenHash = this.hashRefreshToken(refreshToken);
    await this.prisma.refreshSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }

  private createRefreshToken() {
    return randomBytes(48).toString('base64url');
  }

  private hashRefreshToken(refreshToken: string) {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private getRefreshExpiresAt() {
    const durationMs = parseDurationMs(process.env.JWT_REFRESH_EXPIRATION, '14d');
    return new Date(Date.now() + durationMs);
  }

  private async storeRefreshSession(
    userId: string,
    refreshToken: string,
    metadata: AuthRequestMetadata,
  ) {
    return this.prisma.refreshSession.create({
      data: {
        userId,
        tokenHash: this.hashRefreshToken(refreshToken),
        userAgent: metadata.userAgent || null,
        ipAddress: metadata.ipAddress || null,
        expiresAt: this.getRefreshExpiresAt(),
      },
    });
  }

  private async revokeActiveUserSessions(userId: string, revokedAt: Date) {
    await this.prisma.refreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    });
  }

  /**
   * Resolves a user profile by user ID.
   */
  async getUserProfile(userId: string): Promise<UserProfile & { orgId: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: true },
    });

    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại.');
    }

    return {
      id: user.id,
      email: user.email || '',
      displayName: user.displayName,
      roles: user.userRoles.map((ur) => ur.role),
      orgId: user.organizationId,
    };
  }
}
