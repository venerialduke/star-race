// One function per hazard. Each takes what the ship looks like this tick and
// returns what the hazard does to it — it never mutates anything, and the race
// loop decides how to apply the result.
//
// Every hazard that rolls dice draws from its own Rng stream, forked per
// placement in race.ts, so adding a roll to one hazard cannot change what a
// different hazard on the same track does.

import type { Rng } from './rng';
import type { DerivedStats } from './ship';
import type { HazardKind } from './track';
import {
  ASTEROID_DAMAGE_PER_TICK,
  ASTEROID_DAMAGE_VARIANCE,
  GAMMA_BURST_DAMAGE,
} from './tuning';

/** What the ship looks like to a hazard on the tick it is being applied. */
export interface HazardContext {
  /** The ship's resolved stats. */
  readonly stats: DerivedStats;
  /** Current speed, in track-ticks per tick, before this tick's movement. */
  readonly speed: number;
  /** Heat carried right now. */
  readonly heat: number;
  /** Hull left right now. */
  readonly hull: number;
  /** Are shields up this tick? Always false until actives land in S2.10. */
  readonly shieldsUp: boolean;
  /** This placement's own stream. */
  readonly rng: Rng;
}

/** What a hazard does on one tick. The race loop applies it. */
export interface HazardEffect {
  /** Hull damage before shields. */
  readonly hullDamage: number;
  /** Heat added this tick. */
  readonly heat: number;
  /** Multiplier on the ship's top speed this tick. 1 is no change. */
  readonly speedMultiplier: number;
  /** The ship is lost outright, whatever its hull says. */
  readonly destroyed: boolean;
}

/** A hazard that does nothing this tick. Hazards start from this and change what they need. */
export const NO_EFFECT: HazardEffect = {
  hullDamage: 0,
  heat: 0,
  speedMultiplier: 1,
  destroyed: false,
};

/**
 * Asteroid field. Rock chews on the hull for every tick the ship is inside,
 * scaled by the square of its speed: crossing fast means fewer ticks in the
 * field but much worse ticks, and costs more damage overall than picking a way
 * through slowly. Each tick rolls a variance band around the base figure.
 */
export function asteroidField(context: HazardContext): HazardEffect {
  const swing = (context.rng.nextFloat() * 2 - 1) * ASTEROID_DAMAGE_VARIANCE;
  const damage = ASTEROID_DAMAGE_PER_TICK * context.speed * context.speed * (1 + swing);
  return { ...NO_EFFECT, hullDamage: Math.max(damage, 0) };
}

/**
 * Gamma-ray burst. One tick, no dice, a large bite out of the hull. The whole
 * hazard is a timing test: it is drawn on the course before the race starts, so
 * an unshielded hit is a call the player got wrong rather than bad luck.
 *
 * Shields do not change what the burst throws; they catch it. The race loop
 * runs every point of damage through the shield pool, and a full pool from
 * Mirror Shielding swallows a burst whole.
 */
export function gammaBurst(): HazardEffect {
  return { ...NO_EFFECT, hullDamage: GAMMA_BURST_DAMAGE };
}

/**
 * Shields eat damage before the hull does. Returns what reaches the hull and
 * what is left in the pool. This is the only place absorption happens, so every
 * hazard is shielded the same way.
 */
export function absorb(
  damage: number,
  shieldPool: number,
): {
  readonly toHull: number;
  readonly poolLeft: number;
} {
  const absorbed = Math.min(shieldPool, damage);
  return { toHull: damage - absorbed, poolLeft: shieldPool - absorbed };
}

/**
 * Hazards that happen once rather than for every tick the ship is inside them.
 * A gamma burst is a single event: the ship's movement can overlap a one-tick
 * window on two consecutive ticks, and it must still only be hit once.
 */
export function isOneShot(kind: HazardKind): boolean {
  return kind === 'gammaBurst';
}

/** Dispatch: what this hazard kind does on this tick. */
export function hazardEffect(kind: HazardKind, context: HazardContext): HazardEffect {
  switch (kind) {
    case 'asteroidField':
      return asteroidField(context);
    case 'gammaBurst':
      return gammaBurst();
    case 'blackHole':
    case 'ringedPlanet':
      // Landing in S2.8 and S2.9. Placed on the track already so the course is
      // visible from the start line.
      return NO_EFFECT;
  }
}
