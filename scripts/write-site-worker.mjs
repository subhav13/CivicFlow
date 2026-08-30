import { build } from 'vite';

await build({
  configFile: false,
  root: process.cwd(),
  build: {
    ssr: 'server/sites-worker.ts',
    outDir: 'dist/server',
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        codeSplitting: false,
        entryFileNames: 'index.js',
        format: 'es',
      },
    },
  },
});
