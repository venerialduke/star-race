// The rivals. A bot is a rule that reads the track and picks a build and a
// corner plan, with seeded variation so it is an opponent rather than a
// metronome.
//
// Every decision it makes is an input, chosen before the lap that consumes it
// — the same seam a real player's choices will arrive through.

import type { Entrant } from './field';
import type { CornerPlan } from './race';
import { makeRng, seedFrom } from './rng';
import { holdingSpeed, type Track } from './track';
import {
  BOT_HANDLING_TILT,
  BOT_STAT_SPREAD,
  BOT_TIGHT_HOLD,
  SPEED_PER_THRUST,
  STAT_MAX,
  STAT_MIN,
} from './tuning';

const NAMES = ['Vex Ardo', 'Sable Rook', 'Juno Kest', 'Ilsa Crane', 'Mott Rell'];

const clamp = (v: number): number => Math.min(STAT_MAX, Math.max(STAT_MIN, v));

/**
 * How much this track asks of Handling, from 0 to 1: how far its bends sit
 * below what a stock ship could take flat out, averaged. A share of demanding
 * bends was the first version and it saturated — a coil of hairpins and a
 * mixed circuit both scored 1, and bred identical rivals.
 */
export function tightness(track: Track): number {
  if (track.bends.length === 0) return 0;
  const flatOut = SPEED_PER_THRUST * BOT_TIGHT_HOLD;
  const ease =
    track.bends.reduce(
      (sum, b) => sum + Math.min(1, holdingSpeed(b.radius, 1) / flatOut),
      0,
    ) / track.bends.length;
  return 1 - ease;
}

/**
 * A build shaped by the track, then pushed off it by the draw. A bot that
 * reads the track well still has to commit before it knows how the bends fall.
 */
export function makeBot(track: Track, seed: number, index: number): Entrant {
  const rng = makeRng(seed).fork(index * 5381);
  const tilt = tightness(track) * BOT_HANDLING_TILT;
  const wobble = (): number => (rng.unitInterval() - 0.5) * 2 * BOT_STAT_SPREAD;
  return {
    id: `bot-${index}`,
    name: NAMES[index % NAMES.length] as string,
    stats: {
      thrust: clamp(1 + (0.5 - tilt) * 0.6 + wobble()),
      handling: clamp(1 + (tilt - 0.5) * 0.6 + wobble()),
    },
    isPlayer: false,
  };
}

/**
 * What a bot flies this lap. It leans on the plan that suits its own build —
 * a ship with handling to spare can afford to Charge — and sometimes does not.
 */
export function botPlan(entrant: Entrant, seed: number, lap: number): CornerPlan {
  // Keyed by who it is, not how long its name is: two bots must not agree.
  const rng = makeRng(seed ^ seedFrom(entrant.id)).fork(lap * 17 + 1);
  const spare = entrant.stats.handling - entrant.stats.thrust;
  const roll = rng.unitInterval();
  if (spare > 0.15) return roll < 0.75 ? 'charge' : 'carry';
  if (spare < -0.15) return roll < 0.6 ? 'carry' : roll < 0.85 ? 'charge' : 'lift';
  return roll < 0.5 ? 'carry' : roll < 0.85 ? 'charge' : 'lift';
}
