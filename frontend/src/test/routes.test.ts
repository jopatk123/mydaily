import { describe, expect, it } from 'vitest';
import { APP_ROUTE_PATHS } from '../router';

const RESERVED = ['entries', 'todos', 'auth', 'health', 'docs', 'redoc', 'openapi.json'];

describe('frontend routes', () => {
  it('does not shadow backend API prefixes', () => {
    for (const path of APP_ROUTE_PATHS) {
      const segment = path.split('/').filter(Boolean)[0];
      expect(RESERVED).not.toContain(segment);
    }
  });
});
