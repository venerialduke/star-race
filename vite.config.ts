import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// GitHub Pages serves the site from https://<user>.github.io/star-race/, so
// every asset URL must be prefixed with the repo name.
//
// `BASE_PATH` overrides it, which is what lets a branch be built into a
// subfolder of the same site — `/star-race/preview/68/` and so on. Vite bakes
// the base into every asset URL at build time, so a preview has to be *built*
// for where it will be served from; it cannot be moved afterwards.
export default defineConfig({
  base: process.env['BASE_PATH'] ?? '/star-race/',
  build: {
    target: 'es2022',
    rollupOptions: {
      // Three pages: the game, the track builder that makes tracks for it, and
      // the feel lab where how a ship drives is worked out before it reaches
      // either. They ship with the site rather than living somewhere else,
      // because a tool you have to set up is a tool you stop using.
      input: {
        main: resolve(__dirname, 'index.html'),
        builder: resolve(__dirname, 'builder.html'),
        lab: resolve(__dirname, 'lab.html'),
      },
    },
  },
});
