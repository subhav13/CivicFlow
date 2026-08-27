import { sites } from '@openai/sites-vite-plugin';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  build: {
    outDir: 'dist/client',
  },
  plugins: [react(), sites()],
});
