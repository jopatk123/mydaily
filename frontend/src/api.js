const API_URL = '';
const AUTH_STORAGE_KEY = 'mydaily_auth';

export function getStoredAuth() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.token && parsed?.expiresAt && Number(parsed.expiresAt) > Date.now()) {
      return parsed;
    }
  } catch (_) {
    // Ignore corrupt cache
  }
  localStorage.removeItem(AUTH_STORAGE_KEY);
  return null;
}

function getToken() {
  return getStoredAuth()?.token ?? null;
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = body.detail || JSON.stringify(body);
    } catch (_) {
      detail = `HTTP ${response.status}`;
    }
    throw new ApiError(detail, response.status);
  }

  return response;
}

export async function get(path) {
  const res = await request(path);
  return res.json();
}

export async function post(path, data) {
  const res = await request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function put(path, data) {
  const res = await request(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function del(path) {
  const res = await request(path, { method: 'DELETE' });
  return res.json();
}

export async function patch(path) {
  const res = await request(path, { method: 'PATCH' });
  return res.json();
}

export async function pinEntry(id) {
  return patch(`/entries/${id}/pin`);
}

export async function login(password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    let detail = '登录失败';
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch (_) {
      // ignore
    }
    throw new ApiError(detail, res.status);
  }
  return res.json();
}

export function storeAuth(token, validMs = 30 * 24 * 60 * 60 * 1000) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
    token,
    expiresAt: Date.now() + validMs,
  }));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export { AUTH_STORAGE_KEY };
