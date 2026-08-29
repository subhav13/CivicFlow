import '@testing-library/jest-dom/vitest';

afterEach(() => {
  try {
    globalThis.localStorage?.clear();
    globalThis.sessionStorage?.clear();
  } catch {
    // Some non-browser test environments expose a partial storage shim.
  }
});
