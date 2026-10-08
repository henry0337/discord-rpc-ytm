// Firefox exposes the promise-based API as `browser`; Chromium exposes it as `chrome` (MV3).
export const ext: typeof chrome =
  (globalThis as unknown as { browser?: typeof chrome }).browser ?? chrome;
