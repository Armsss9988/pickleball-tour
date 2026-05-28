/**
 * GOLAB Tournament Platform - Client-side API fetch client
 */

export interface FetchOptions extends RequestInit {
  body?: any;
}

export async function apiFetch(endpoint: string, options: FetchOptions = {}) {
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
    localStorage.removeItem('golab_access_token');
    localStorage.removeItem('golab_refresh_token');
    localStorage.removeItem('golab_user');
    window.location.href = '/login';
    throw new Error('Phiên đăng nhập đã hết hạn.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Lỗi kết nối máy chủ (Mã: ${response.status})`);
  }

  return response.json();
}
