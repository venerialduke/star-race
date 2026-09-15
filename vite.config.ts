import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// GitHub Pages serves the site from https://<user>.github.io/star-race/,
// so every asset URL must be prefixed with the repo name.
export default defineConfig({
  base: '/star-race/',
  build: {
    target: 'es2022',
    rollupOptions: {
      // Two pages: the game, and the track builder that makes tracks for it.
      // The builder ships with the site rather than living somewhere else,
      // because a tool you have to set up is a tool you stop using.
      input: {
        main: resolve(__dirname, 'index.html'),
        builder: resolve(__dirname, 'builder.html'),
      },
    },
  },
});
