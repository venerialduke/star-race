// The only source of randomness in the simulation.
//
// A race is `simulate(track, build, inputs, seed)`. Every roll a hazard or a
// part makes comes from an Rng created from that seed, so a race replays
// exactly. `Math.random` is a lint error in src/sim; use this instead.
//
// The algorithm is mulberry32: 32 bits of state, one multiply-xorshift round,
// fast and good enough for gameplay variance. The hex constants below are
// part of the algorithm, not balance knobs — they never belong in tuning.ts.

/** A stream of deterministic pseudo-random values. */
export interface Rng {
  /** Next value in [0, 1). */
  nextFloat(): number;
  /** Next integer in [min, max). `max` must be greater than `min`. */
  nextInt(min: number, max: number): number;
  /**
   * A new stream, independent of this one, derived from this one's state.
   * Forking advances the parent, so two forks in a row differ, and the whole
   * tree of streams still depends only on the original seed.
   *
   * Use it to keep one system's rolls from shifting another's: give each
   * hazard its own fork and adding a roll to the asteroid field will not
   * change what the gamma burst does.
   */
  fork(): Rng;
}

const MULBERRY_INCREMENT = 0x6d2b79f5;
const FORK_MIX = 0x9e3779b9; // golden-ratio constant, decorrelates child seeds
const UINT32 = 0x100000000;

/**
 * Create a stream from a seed. Any number works; it is coerced to a 32-bit
 * unsigned integer, so seeds are effectively mod 2^32.
 */
export function makeRng(seed: number): Rng {
  if (!Number.isFinite(seed)) {
    throw new Error(`Seed must be a finite number, got ${seed}.`);
  }
  let state = seed >>> 0;

  const nextUint32 = (): number => {
    state = (state + MULBERRY_INCREMENT) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  };

  const nextFloat = (): number => nextUint32() / UINT32;

  const nextInt = (min: number, max: number): number => {
    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      throw new Error(`nextInt bounds must be integers, got [${min}, ${max}).`);
    }
    if (max <= min) {
      throw new Error(`nextInt needs max > min, got [${min}, ${max}).`);
    }
    return min + Math.floor(nextFloat() * (max - min));
  };

  const fork = (): Rng => makeRng((nextUint32() ^ MULBERRY_INCREMENT) + FORK_MIX);

  return { nextFloat, nextInt, fork };
}
