import { describe, expect, it } from 'vitest';
import { isUsableJwtAccessToken } from './current-user';

function jwtWithPayload(payload: Record<string, unknown>) {
  const encode = (value: unknown) => Buffer
    .from(JSON.stringify(value))
    .toString('base64url');

  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`;
}

describe('current user auth helpers', () => {
  it('accepts access tokens that expire in the future', () => {
    const token = jwtWithPayload({ exp: 2_000 });

    expect(isUsableJwtAccessToken(token, 1_000_000)).toBe(true);
  });

  it('rejects expired, malformed, and non-expiring access tokens', () => {
    expect(isUsableJwtAccessToken(jwtWithPayload({ exp: 1_000 }), 1_001_000)).toBe(false);
    expect(isUsableJwtAccessToken('not-a-jwt', 1_000_000)).toBe(false);
    expect(isUsableJwtAccessToken(jwtWithPayload({ sub: 'user-1' }), 1_000_000)).toBe(false);
    expect(isUsableJwtAccessToken(null, 1_000_000)).toBe(false);
  });
});
