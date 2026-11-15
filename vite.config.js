import { defineConfig } from 'vite';

export default defineConfig({
  base: './',          // relative links, so the built page works from any folder or web address
  build: { chunkSizeWarningLimit: 1000 },   // three.js alone is about 600 kB
});
