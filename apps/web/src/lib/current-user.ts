import type { UserProfile } from '@golab/contracts';
import { getPrimaryRole, type AppRole } from './tournament-ux-policy';

const USER_STORAGE_KEY = 'golab_user';

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

function clearStoredUser() {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(USER_STORAGE_KEY);
    cachedRaw = null;
    cachedState = guestState;
  } catch {
    // Ignore storage errors and fall back to guest.
  }
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
      clearStoredUser();
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
    clearStoredUser();
    cachedState = guestState;
    return cachedState;
  }
}
