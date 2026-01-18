import '@testing-library/jest-dom';

if (!globalThis.localStorage || typeof globalThis.localStorage.setItem !== 'function') {
	let store = {};
	globalThis.localStorage = {
		getItem: (key) => (key in store ? store[key] : null),
		setItem: (key, value) => {
			store[key] = String(value);
		},
		removeItem: (key) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
	};
}
