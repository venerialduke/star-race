import { defineConfig } from 'vite';

// GitHub Pages serves the site from https://<user>.github.io/star-race/,
// so every asset URL must be prefixed with the repo name.
export default defineConfig({
  base: '/star-race/',
  build: {
    target: 'es2022',
  },
});
