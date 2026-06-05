import type { UserProfile } from '@golab/contracts';
import { getPrimaryRole, type AppRole } from './tournament-ux-policy';

const USER_STORAGE_KEY = 'golab_user';
const ACCESS_TOKEN_STORAGE_KEY = 'golab_access_token';
const TOKEN_EXPIRY_SKEW_MS = 30_000;

export type StoredUser = UserProfile;

export interface CurrentUserState {
  user: StoredUser | null;
  role: AppRole;
  authenticated: boolean;
}

const guestState: CurrentUserState = {
  user: null,
  role: 'guest',
  authenticated: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isStoredUser(value: unknown): value is StoredUser {
  if (!isRecord(value)) return false;

  return typeof value.id === 'string'
    && typeof value.email === 'string'
    && typeof value.displayName === 'string'
    && isStringArray(value.roles);
}

let cachedRaw: string | null = null;
let cachedState: CurrentUserState = guestState;

export function clearStoredAuth() {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem('golab_refresh_token');
    window.localStorage.removeItem(USER_STORAGE_KEY);
    cachedRaw = null;
    cachedState = guestState;
  } catch {
    // Ignore storage errors and fall back to guest.
  }
}

function decodeBase64UrlJson(value: string): unknown {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=');
  const decoded = globalThis.atob(padded);

  return JSON.parse(decoded);
}

export function isUsableJwtAccessToken(token: string | null, nowMs = Date.now()): boolean {
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) return false;

  try {
    const payload = decodeBase64UrlJson(parts[1]);
    if (!isRecord(payload) || typeof payload.exp !== 'number') {
      return false;
    }

    return payload.exp * 1000 > nowMs + TOKEN_EXPIRY_SKEW_MS;
  } catch {
    return false;
  }
}

export function hasUsableAccessToken(nowMs = Date.now()): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const token = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    return isUsableJwtAccessToken(token, nowMs);
  } catch {
    return false;
  }
}

export function hasStoredUser(): boolean {
  return getCurrentUser().authenticated;
}

export function getCurrentUser(): CurrentUserState {
  if (typeof window === 'undefined') {
    return guestState;
  }

  let raw: string | null = null;

  try {
    raw = window.localStorage.getItem(USER_STORAGE_KEY);
  } catch {
    return guestState;
  }

  if (raw === cachedRaw) {
    return cachedState;
  }

  cachedRaw = raw;

  if (!raw) {
    cachedState = guestState;
    return cachedState;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!isStoredUser(parsed)) {
      clearStoredAuth();
      cachedState = guestState;
      return cachedState;
    }

    cachedState = {
      user: parsed,
      role: getPrimaryRole(parsed.roles),
      authenticated: true,
    };
    return cachedState;
  } catch {
    clearStoredAuth();
    cachedState = guestState;
    return cachedState;
  }
}
