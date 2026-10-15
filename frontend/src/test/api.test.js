import { afterEach, describe, expect, it } from 'vitest';
import { clearAuth, getStoredAuth, storeAuth, tokenExpiresAt, withTimeZone } from '../api';

describe('api auth expiry', () => {
  afterEach(() => {
    clearAuth();
  });

  it('reads expiry seconds from the token', () => {
    expect(tokenExpiresAt('1700000000.abcdef')).toBe(1700000000 * 1000);
    expect(tokenExpiresAt('test-token')).toBeNull();
  });

  it('stores the token expiry instead of a fixed 30 days', () => {
    const expSeconds = Math.floor(Date.now() / 1000) + 3600;
    storeAuth(`${expSeconds}.signature`);
    expect(getStoredAuth().expiresAt).toBe(expSeconds * 1000);
  });

  it('drops a token that is already expired', () => {
    const expSeconds = Math.floor(Date.now() / 1000) - 10;
    storeAuth(`${expSeconds}.signature`);
    expect(getStoredAuth()).toBeNull();
  });

  it('keeps a legacy token that has no expiry payload', () => {
    storeAuth('test-token', 60_000);
    const auth = getStoredAuth();
    expect(auth.token).toBe('test-token');
    expect(auth.expiresAt).toBeGreaterThan(Date.now());
  });
});

describe('withTimeZone', () => {
  it('appends the browser timezone to diary date requests', () => {
    expect(withTimeZone('/entries/')).toMatch(/^\/entries\/\?tz=/);
    const filtered = withTimeZone('/entries/?date=2024-01-02');
    expect(filtered).toContain('date=2024-01-02');
    expect(filtered).toContain('&tz=');
  });
});
