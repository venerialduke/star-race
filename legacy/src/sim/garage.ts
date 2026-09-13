// What the garage puts in front of the player between stages.
//
// Three parts, drawn from the six by the run's own dice, no two the same in one
// offer. Parts already bolted on can be offered again: taking a second Ion
// Thruster is a real choice, not a bug.

import type { Rng } from './rng';
import { ALL_PARTS, type Part } from './ship';
import { GARAGE_OFFER_SIZE } from './tuning';

/**
 * Three parts to choose between. Deterministic for a given stream, so the same
 * seed always offers the same run.
 */
export function offerParts(rng: Rng, count: number = GARAGE_OFFER_SIZE): Part[] {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error(`An offer needs a positive whole number of parts, got ${count}.`);
  }
  if (count > ALL_PARTS.length) {
    throw new Error(
      `Only ${ALL_PARTS.length} parts exist; cannot offer ${count} different ones.`,
    );
  }

  // Fisher-Yates over a copy, then take the first `count`. Shuffling rather
  // than drawing-with-retries keeps the number of rolls fixed, so an offer
  // never depends on how unlucky the previous draw was.
  const pool = [...ALL_PARTS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i + 1);
    const a = pool[i];
    const b = pool[j];
    if (a === undefined || b === undefined)
      throw new Error('unreachable: index in range');
    pool[i] = b;
    pool[j] = a;
  }
  return pool.slice(0, count);
}
