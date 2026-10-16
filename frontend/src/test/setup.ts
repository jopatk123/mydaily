import '@testing-library/jest-dom/vitest';

if (!globalThis.localStorage || typeof globalThis.localStorage.setItem !== 'function') {
  let store: Record<string, string> = {};
  const memoryStorage: Storage = {
    get length() {
      return Object.keys(store).length;
    },
    clear: () => {
      store = {};
    },
    getItem: (key) => (key in store ? store[key] : null),
    key: (index) => Object.keys(store)[index] ?? null,
    removeItem: (key) => {
      delete store[key];
    },
    setItem: (key, value) => {
      store[key] = String(value);
    },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true });
}

window.scrollTo = () => {};

if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

if (typeof HTMLAnchorElement !== 'undefined') {
  HTMLAnchorElement.prototype.click = () => {};
}

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});
