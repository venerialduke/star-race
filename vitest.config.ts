import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // The simulation is pure and runs in Node. Only the UI tests need a DOM,
    // and they ask for one with a `@vitest-environment jsdom` docblock.
    environment: 'node',
    /**
     * Longer than the 5s default, because a race is longer than it was.
     *
     * The flight model made a lap two to three times as many ticks for a ship
     * with no navigation system, and the heaviest tests fly whole seasons of
     * them. They finished in about half the budget locally and timed out on
     * CI's slower runner, which is a real cost of the change rather than a
     * flake — so the budget moves rather than the claims being trimmed.
     *
     * If a test ever needs the whole of this, that is worth looking at.
     */
    testTimeout: 30_000,
  },
});
