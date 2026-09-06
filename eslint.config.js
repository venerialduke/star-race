import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

// Globals that only exist in a browser (or are nondeterministic). The
// simulation in src/sim must never touch these: a race must be reproducible
// from (track, build, inputs, seed) alone, and it must run headless in tests.
const BROWSER_OR_NONDETERMINISTIC_GLOBALS = [
  'window',
  'document',
  'navigator',
  'location',
  'history',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval',
  'performance',
  'Date',
  'HTMLElement',
  'HTMLCanvasElement',
  'CanvasRenderingContext2D',
  'Image',
  'Audio',
  'AudioContext',
  'Worker',
  'console',
];

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2022 },
    },
  },
  {
    // ---------------------------------------------------------------------
    // The simulation boundary.
    //
    // src/sim is PURE. It may import only from within src/sim. Anything that
    // reaches out to render/, ui/, main.ts, the DOM, timers, Date or
    // Math.random is a lint error, not a review comment.
    // ---------------------------------------------------------------------
    files: ['src/sim/**/*.ts'],
    languageOptions: {
      // Only ES globals are declared here; browser globals are undefined, so
      // `no-undef` also fires if anything slips past the restricted list.
      globals: { ...globals.es2022 },
    },
    rules: {
      'no-undef': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/render', '**/render/**', '**/ui', '**/ui/**', '**/main'],
              message:
                'src/sim is pure: it must not import from render/, ui/ or main.ts.',
            },
            {
              group: ['vite', 'vite/*'],
              message: 'src/sim must not depend on the build tool.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        ...BROWSER_OR_NONDETERMINISTIC_GLOBALS.map((name) => ({
          name,
          message: `'${name}' is browser-only or nondeterministic; src/sim is pure. Use rng.ts for randomness and pass time in as ticks.`,
        })),
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use the seeded RNG in src/sim/rng.ts instead of Math.random.',
        },
        {
          object: 'globalThis',
          message: 'src/sim must not reach for host globals.',
        },
      ],
    },
  },
);
