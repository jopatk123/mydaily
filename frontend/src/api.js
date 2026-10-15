const API_URL = '';
const AUTH_STORAGE_KEY = 'mydaily_auth';
const DEFAULT_AUTH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Token 格式为 `{unix_seconds}.{hmac}`。无法解析时返回 null。 */
export function tokenExpiresAt(token) {
  if (typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const expSeconds = Number(token.slice(0, dot));
  if (!Number.isFinite(expSeconds) || expSeconds <= 0) return null;
  return expSeconds * 1000;
}

export function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
  } catch (_) {
    return 'Asia/Shanghai';
  }
}

/** 给日记日期接口带上浏览器时区，和日历上的本地日期对齐。 */
export function withTimeZone(path) {
  const tz = encodeURIComponent(browserTimeZone());
  return `${path}${path.includes('?') ? '&' : '?'}tz=${tz}`;
}

export function getStoredAuth() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const expiresAt = tokenExpiresAt(parsed?.token) ?? Number(parsed?.expiresAt);
    if (parsed?.token && expiresAt > Date.now()) {
      return { ...parsed, expiresAt };
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

async function sendJson(method, path, data) {
  const res = await request(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  return res.json();
}

export async function get(path) {
  const res = await request(path);
  return res.json();
}

export async function post(path, data) {
  return sendJson('POST', path, data);
}

export async function put(path, data) {
  return sendJson('PUT', path, data);
}

export async function patch(path, data) {
  return sendJson('PATCH', path, data);
}

export async function del(path) {
  const res = await request(path, { method: 'DELETE' });
  return res.json();
}

export async function pinEntry(id) {
  return patch(`/entries/${id}/pin`);
}

export async function login(password) {
  // 登录走统一的 request 通道，便于未来加全局超时/CSRF/重试等机制
  return sendJson('POST', '/auth/login', { password });
}

export function storeAuth(token, validMs = DEFAULT_AUTH_TTL_MS) {
  const expiresAt = tokenExpiresAt(token) ?? Date.now() + validMs;
  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      token,
      expiresAt,
    }),
  );
}

export function clearAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export { AUTH_STORAGE_KEY };
