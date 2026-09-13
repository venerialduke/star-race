// A seeded PRNG. The whole race is a function of its seed, so this is the only
// source of randomness in the simulation — `Math.random` is a lint error here.

/** mulberry32. The constants are algorithm internals, not tuning. */
export interface Rng {
  /** A float in [0, 1). */
  unitInterval(): number;
  /** An independent stream, so one ship's draws never shift another's. */
  fork(salt: number): Rng;
}

export function makeRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    unitInterval: next,
    fork: (salt: number) => makeRng((seed ^ Math.imul(salt + 1, 0x9e3779b9)) >>> 0),
  };
}

/** A seed from a string, so a race can be shared as a word. */
export function seedFrom(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
