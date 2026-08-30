import type { GeminiSessionHandler } from './gemini-session-core.ts';

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

function jsonNotFoundResponse(): Response {
  return new Response(JSON.stringify({ error: 'Not found.' }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function isApiPath(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/');
}

async function fetchApplicationAsset(
  request: Request,
  assets: SitesAssetBinding,
): Promise<Response> {
  const assetUrl = new URL(request.url);
  if (assetUrl.pathname === '/' || assetUrl.pathname === '') {
    assetUrl.pathname = '/index.html';
  }

  const asset = await assets.fetch(new Request(assetUrl, request));
  if (asset.status !== 404 || !['GET', 'HEAD'].includes(request.method)) {
    return asset;
  }

  const fallbackUrl = new URL(request.url);
  fallbackUrl.pathname = '/index.html';
  return assets.fetch(new Request(fallbackUrl, request));
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
      if (isApiPath(url.pathname)) {
        return jsonNotFoundResponse();
      }
      return fetchApplicationAsset(request, dependencies.assets);
    },
  };
}
