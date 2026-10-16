import { clearAuth, getToken } from './auth';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
  } catch {
    return 'Asia/Shanghai';
  }
}

/** 给日记日期接口带上浏览器时区，和日历上的本地日期对齐。 */
export function withTimeZone(path: string) {
  const tz = encodeURIComponent(browserTimeZone());
  return `${path}${path.includes('?') ? '&' : '?'}tz=${tz}`;
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(path, { ...options, headers });
  if (!response.ok) {
    let detail = '';
    try {
      const body = (await response.json()) as { detail?: string };
      detail = body.detail || JSON.stringify(body);
    } catch {
      detail = `HTTP ${response.status}`;
    }
    if (response.status === 401 && token) {
      clearAuth();
    }
    throw new ApiError(detail, response.status);
  }
  return response;
}

async function sendJson<T>(method: string, path: string, data?: unknown): Promise<T> {
  const response = await request(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  return response.json() as Promise<T>;
}

export function get<T>(path: string): Promise<T> {
  return request(path).then((response) => response.json() as Promise<T>);
}

export function post<T>(path: string, data?: unknown): Promise<T> {
  return sendJson<T>('POST', path, data);
}

export function put<T>(path: string, data?: unknown): Promise<T> {
  return sendJson<T>('PUT', path, data);
}

export function patch<T>(path: string, data?: unknown): Promise<T> {
  return sendJson<T>('PATCH', path, data);
}

export function del<T>(path: string): Promise<T> {
  return request(path, { method: 'DELETE' }).then((response) => response.json() as Promise<T>);
}
