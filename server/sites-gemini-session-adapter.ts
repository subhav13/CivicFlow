import type { GeminiSessionHandler } from './gemini-session-core';

export interface SitesAssetBinding {
  fetch(request: Request): Promise<Response>;
}

export interface SitesGeminiSessionAdapterDependencies {
  sessionPath?: string;
  sessionHandler: GeminiSessionHandler;
  assets: SitesAssetBinding;
}

export interface SitesGeminiSessionAdapter {
  fetch(request: Request): Promise<Response>;
}

export function createSitesGeminiSessionAdapter(
  dependencies: SitesGeminiSessionAdapterDependencies,
): SitesGeminiSessionAdapter {
  const targetPath = dependencies.sessionPath ?? '/api/gemini/session';

  return {
    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url);
      if (url.pathname === targetPath) {
        return dependencies.sessionHandler(request);
      }
      return dependencies.assets.fetch(request);
    },
  };
}
