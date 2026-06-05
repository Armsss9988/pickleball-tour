import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hashSync } from 'bcryptjs';
import { AuthService } from './auth.service';

function createUser() {
  return {
    id: 'user-1',
    organizationId: 'org-1',
    email: 'admin@golab.vn',
    passwordHash: hashSync('admin123', 4),
    displayName: 'GOLAB Admin',
    status: 'ACTIVE',
    userRoles: [{ role: 'SUPER_ADMIN' }],
  };
}

describe('AuthService refresh session security', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_EXPIRATION = '15m';
    process.env.JWT_REFRESH_EXPIRATION = '14d';
  });

  it('stores only a hash of the issued refresh token when logging in', async () => {
    const createRefreshSession = jest.fn().mockResolvedValue({});
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(createUser()),
      },
      refreshSession: {
        create: createRefreshSession,
      },
    };
    const service = new AuthService(prisma as any, new JwtService());

    const result = await service.login({ email: 'admin@golab.vn', password: 'admin123' });

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(createRefreshSession).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    });
    expect(createRefreshSession.mock.calls[0][0].data.tokenHash).not.toBe(result.refreshToken);
  });

  it('rotates refresh sessions and revokes the previous token on refresh', async () => {
    const updateSession = jest.fn().mockResolvedValue({});
    const createSession = jest.fn().mockResolvedValue({ id: 'session-2' });
    const prisma: any = {
      user: {
        findUnique: jest.fn().mockResolvedValue(createUser()),
      },
      refreshSession: {
        create: createSession,
        findFirst: jest.fn(),
        update: updateSession,
        updateMany: jest.fn(),
      },
    };
    const service = new AuthService(prisma, new JwtService());
    const login = await service.login({ email: 'admin@golab.vn', password: 'admin123' });
    const originalSession = {
      id: 'session-1',
      userId: 'user-1',
      tokenHash: createSession.mock.calls[0][0].data.tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      replacedBySessionId: null,
      user: createUser(),
    };
    prisma.refreshSession.findFirst.mockResolvedValue(originalSession);
    createSession.mockClear();

    const refreshed = await service.refreshTokens({ refreshToken: login.refreshToken });

    expect(refreshed.accessToken).toEqual(expect.any(String));
    expect(refreshed.refreshToken).toEqual(expect.any(String));
    expect(refreshed.refreshToken).not.toBe(login.refreshToken);
    expect(createSession).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        tokenHash: expect.any(String),
      }),
    });
    expect(updateSession).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: expect.objectContaining({
        revokedAt: expect.any(Date),
        replacedBySessionId: expect.any(String),
      }),
    });
  });

  it('rejects reuse of a revoked refresh token and revokes active user sessions', async () => {
    const prisma = {
      refreshSession: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'session-1',
          userId: 'user-1',
          expiresAt: new Date(Date.now() + 60_000),
          revokedAt: new Date(),
          user: createUser(),
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    const service = new AuthService(prisma as any, new JwtService());

    await expect(
      service.refreshTokens({ refreshToken: 'reused-token' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.refreshSession.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
