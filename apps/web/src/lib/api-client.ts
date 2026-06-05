/**
 * GOLAB Tournament Platform - Client-side API fetch client
 */
import { clearStoredAuth } from './current-user';

export interface FetchOptions extends RequestInit {
  body?: any;
}

export async function apiFetch<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('golab_access_token') : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config: RequestInit = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`/api${endpoint}`, config);

  if (response.status === 401 && typeof window !== 'undefined') {
    // Session expired, redirect to login
    clearStoredAuth();
    window.location.href = '/login';
    throw new Error('Phiên đăng nhập đã hết hạn.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Lỗi kết nối máy chủ (Mã: ${response.status})`);
  }

  return response.json();
}
