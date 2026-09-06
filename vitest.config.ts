import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // The simulation is pure and runs in Node. Only the UI tests need a DOM,
    // and they ask for one with a `@vitest-environment jsdom` docblock.
    environment: 'node',
  },
});
