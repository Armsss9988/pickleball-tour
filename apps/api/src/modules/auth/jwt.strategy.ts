import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  email: string;
  displayName: string;
  roles: string[];
  orgId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-jwt-secret-change-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    // Return user context populated in request.user
    return {
      id: payload.sub,
      email: payload.email,
      displayName: payload.displayName,
      roles: payload.roles,
      orgId: payload.orgId,
    };
  }
}
