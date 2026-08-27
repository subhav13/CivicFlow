import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const outputPath = resolve(process.cwd(), 'dist/server/index.js');

const workerSource = `const serveApplication = async (request, env) => {
  const asset = await env.ASSETS.fetch(request);
  if (asset.status !== 404 || new URL(request.url).pathname === '/') {
    return asset;
  }

  const fallbackUrl = new URL(request.url);
  fallbackUrl.pathname = '/';
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
