/**
 * GOLAB Tournament Platform - Client-side API fetch client
 */
import { clearStoredAuth } from './current-user';

export interface FetchOptions extends RequestInit {
  body?: any;
}

let refreshPromise: Promise<string | null> | null = null;

function getStoredAccessToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('golab_access_token') : null;
}

function storeAccessToken(accessToken: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('golab_access_token', accessToken);
}

async function refreshAccessToken() {
  if (typeof window === 'undefined') return null;

  refreshPromise ??= (async () => {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) return null;

    const data = await response.json().catch(() => null);
    if (!data?.accessToken || typeof data.accessToken !== 'string') {
      return null;
    }

    storeAccessToken(data.accessToken);
    return data.accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function executeApiFetch<T>(endpoint: string, options: FetchOptions, token: string | null): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config: RequestInit = {
    ...options,
    credentials: 'include',
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  return fetch(`/api${endpoint}`, config);
}

export async function apiFetch<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const token = getStoredAccessToken();

  let response = await executeApiFetch<T>(endpoint, options, token);

  if (response.status === 401 && typeof window !== 'undefined') {
    const nextToken = await refreshAccessToken();
    if (nextToken) {
      response = await executeApiFetch<T>(endpoint, options, nextToken);
    }

    if (response.status === 401) {
      clearStoredAuth();
      window.location.href = '/login';
      throw new Error('Phiên đăng nhập đã hết hạn.');
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Lỗi kết nối máy chủ (Mã: ${response.status})`);
  }

  return response.json();
}

export async function logout() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } finally {
    clearStoredAuth();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
}
