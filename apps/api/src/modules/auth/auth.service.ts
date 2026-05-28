import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { compareSync } from 'bcryptjs';
import { LoginDto, AuthTokens, UserProfile } from '@golab/contracts';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  /**
   * Validates user credentials.
   */
  async login(dto: LoginDto): Promise<AuthTokens & { user: UserProfile }> {
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

    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      {
        secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production',
        expiresIn: (process.env.JWT_REFRESH_EXPIRATION || '7d') as any,
      }
    );

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
  async refreshTokens(refreshTokenDto: { refreshToken: string }): Promise<AuthTokens> {
    try {
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production',
      });

      if (!payload || payload.type !== 'refresh') {
        throw new UnauthorizedException('Mã refresh không hợp lệ.');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { userRoles: true },
      });

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

      const nextRefreshToken = this.jwtService.sign(
        { sub: user.id, type: 'refresh' },
        {
          secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production',
          expiresIn: (process.env.JWT_REFRESH_EXPIRATION || '7d') as any,
        }
      );

      return {
        accessToken,
        refreshToken: nextRefreshToken,
      };
    } catch (err) {
      throw new UnauthorizedException('Mã refresh đã hết hạn hoặc không hợp lệ.');
    }
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
