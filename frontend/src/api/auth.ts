const AUTH_STORAGE_KEY = 'mydaily_auth';
const DEFAULT_AUTH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type AuthListener = () => void;
const listeners = new Set<AuthListener>();

let snapshotRaw: string | null | undefined;
let snapshot: StoredAuth | null = null;

export interface StoredAuth {
  token: string;
  expiresAt: number;
}

/** Token 格式为 `{unix_seconds}.{hmac}`。无法解析时返回 null。 */
export function tokenExpiresAt(token: string): number | null {
  if (typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const expSeconds = Number(token.slice(0, dot));
  if (!Number.isFinite(expSeconds) || expSeconds <= 0) return null;
  return expSeconds * 1000;
}

export function subscribeAuth(listener: AuthListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitAuthChange() {
  snapshotRaw = undefined;
  listeners.forEach((listener) => listener());
}

function readAuth(raw: string | null): StoredAuth | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { token?: string; expiresAt?: number };
    const expiresAt = tokenExpiresAt(parsed?.token ?? '') ?? Number(parsed?.expiresAt);
    if (parsed?.token && expiresAt > Date.now()) {
      return { token: parsed.token, expiresAt };
    }
  } catch {
    // 损坏的缓存直接清掉
  }
  localStorage.removeItem(AUTH_STORAGE_KEY);
  snapshotRaw = null;
  return null;
}

export function getStoredAuth(): StoredAuth | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (raw === snapshotRaw) return snapshot;
  snapshotRaw = raw;
  snapshot = readAuth(raw);
  return snapshot;
}

export function getToken(): string | null {
  return getStoredAuth()?.token ?? null;
}

export function storeAuth(token: string, validMs = DEFAULT_AUTH_TTL_MS) {
  const expiresAt = tokenExpiresAt(token) ?? Date.now() + validMs;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, expiresAt }));
  emitAuthChange();
}

export function clearAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  emitAuthChange();
}

export { AUTH_STORAGE_KEY };
