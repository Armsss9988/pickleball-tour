import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { LoginDto, RefreshTokenDto } from '@golab/contracts';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getRequestMetadata(req: ExpressRequest) {
    return {
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || req.socket.remoteAddress || null,
    };
  }

  private getCookie(req: ExpressRequest, name: string) {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return undefined;

    return cookieHeader
      .split(';')
      .map((entry) => entry.trim())
      .map((entry) => {
        const separatorIndex = entry.indexOf('=');
        return separatorIndex >= 0
          ? [entry.slice(0, separatorIndex), entry.slice(separatorIndex + 1)]
          : [entry, ''];
      })
      .find(([key]) => key === name)?.[1];
  }

  private setRefreshCookie(res: ExpressResponse, refreshToken: string) {
    res.cookie('golab_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 14 * 24 * 60 * 60 * 1000,
    });
  }

  private clearRefreshCookie(res: ExpressResponse) {
    res.clearCookie('golab_refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const result = await this.authService.login(loginDto, this.getRequestMetadata(req));
    this.setRefreshCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() refreshDto: Partial<RefreshTokenDto> = {},
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const refreshToken = this.getCookie(req, 'golab_refresh_token') || refreshDto.refreshToken;
    const result = await this.authService.refreshTokens(
      { refreshToken },
      this.getRequestMetadata(req),
    );
    this.setRefreshCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() refreshDto: Partial<RefreshTokenDto> = {},
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const refreshToken = this.getCookie(req, 'golab_refresh_token') || refreshDto.refreshToken;
    await this.authService.logout(refreshToken);
    this.clearRefreshCookie(res);

    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Request() req: any) {
    return this.authService.getUserProfile(req.user.id);
  }
}
