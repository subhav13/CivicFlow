import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const outputPath = resolve(process.cwd(), 'dist/server/index.js');

const workerSource = `const serveApplication = async (request, env) => {
  const assetUrl = new URL(request.url);
  const requestedPath = assetUrl.pathname;
  if (requestedPath === '/' || requestedPath === '') {
    assetUrl.pathname = '/index.html';
  }

  const asset = await env.ASSETS.fetch(new Request(assetUrl, request));
  if (asset.status !== 404) {
    return asset;
  }

  const fallbackUrl = new URL(request.url);
  fallbackUrl.pathname = '/index.html';
  return env.ASSETS.fetch(new Request(fallbackUrl, request));
};

const worker = {
  fetch(request, env) {
    return serveApplication(request, env);
  },
};

export default worker;
`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, workerSource, 'utf8');
