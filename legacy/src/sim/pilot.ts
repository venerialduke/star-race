// A pilot: the rule that decides when to tap.
//
// Rivals are flown by one, and so are the balance harness's reference builds, so
// there is one answer in the repo to "what does decent play look like". If the
// rule is wrong, both are wrong together and the table says so.
//
// Two habits, both of which a player would recognise:
//
//   Shields, for gamma bursts. It looks ahead for the next burst, works out
//   roughly when the ship will reach it, and raises shields to cover it.
//   Deliberately imperfectly: each burst gets a seeded misjudgement, so the
//   pilot is sometimes early and sometimes late, exactly as a thumb is.
//
//   Rerouted power, on clear track. Only when nothing is close ahead and the
//   ship has the heat headroom to hold the boost — so a ship with Radiator Fins
//   uses it freely and one with an Overclocked Reactor is careful with it.
//
// It never taps into a cooldown: a wasted tap is a player's mistake to make, not
// a rule's.

import { ACTIVES, type ActiveId } from './actives';
import { activeOn, activeReady, type RaceState } from './race';
import type { Rng } from './rng';
import { hazardsOnTrack, type HazardAt, type Track } from './track';
import {
  PILOT_JITTER_TICKS,
  PILOT_REROUTE_CLEAR_TICKS,
  POWER_REROUTE_EFFECT_HEADROOM,
} from './tuning';

export interface Pilot {
  /** What this pilot taps on this tick, if anything. */
  taps(state: RaceState): ActiveId[];
}

/**
 * A pilot for one race. `rng` is its own stream: two pilots on the same track
 * misjudge different bursts, and the same seed always misjudges the same ones.
 */
export function makePilot(track: Track, rng: Rng): Pilot {
  const all: HazardAt[] = hazardsOnTrack(track);
  const bursts = all.filter((marker) => marker.kind === 'gammaBurst');
  // One misjudgement per burst, drawn up front so the amount does not depend on
  // how many ticks the ship spent getting there.
  const misjudged = new Map<number, number>();
  bursts.forEach((burst) => {
    misjudged.set(burst.from, rng.nextInt(-PILOT_JITTER_TICKS, PILOT_JITTER_TICKS + 1));
  });

  return {
    taps(state: RaceState): ActiveId[] {
      const out: ActiveId[] = [];
      const speed = Math.max(state.speed, state.stats.speed * 0.25);

      // Shields, for the next burst ahead.
      if (activeReady(state, 'shields') && !activeOn(state, 'shields')) {
        const next = bursts.find((burst) => burst.from > state.distance);
        if (next !== undefined) {
          const ticksAway = (next.from - state.distance) / speed;
          // Aim to be covered when it lands, then miss by this burst's own
          // misjudgement.
          const aimAt =
            ACTIVES.shields.durationTicks / 2 + (misjudged.get(next.from) ?? 0);
          if (ticksAway <= aimAt) out.push('shields');
        }
      }

      // Rerouted power, on clear track the ship can afford to run hot on.
      if (activeReady(state, 'powerReroute') && !activeOn(state, 'powerReroute')) {
        // The first hazard not yet behind the ship. One the ship is already
        // inside counts as zero ticks away: boosting through an asteroid field
        // is the worst thing a pilot could do, since rock scales with the square
        // of speed.
        const ahead = all.find((marker) => marker.to > state.distance);
        const clearFor =
          ahead === undefined ? Infinity : (ahead.from - state.distance) / speed;
        const heatAfter =
          state.heat + ACTIVES.powerReroute.durationTicks * POWER_REROUTE_EFFECT_HEADROOM;
        if (
          clearFor > PILOT_REROUTE_CLEAR_TICKS &&
          heatAfter < state.stats.heatTolerance
        ) {
          out.push('powerReroute');
        }
      }

      return out;
    },
  };
}

/** A pilot that never touches anything, for measuring what the parts alone do. */
export const PASSENGER: Pilot = {
  taps: () => [],
};
