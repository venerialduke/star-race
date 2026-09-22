// How fast the film plays.
//
// A segment is resolved in full before any of it is shown, so how many ticks
// it runs to is known before the first of them is drawn. That is what lets the
// playback be *sized*: the film is played at whatever rate fits a whole race
// into one viewing length, rather than at the rate it was flown.
//
// This is the projector, not the film. Nothing here reaches the simulation:
// every lap time, gap and standing is still counted in ticks, and the readouts
// still report the seconds the ship actually took.

import { TICK_HZ } from '../sim/tuning';

/**
 * How long a whole race takes to watch, however long it took to fly. A heat is
 * more than one segment, so each lap gets its share of this and the race as a
 * whole lands on it.
 */
export const VIEW_SECONDS = 30;

/** Wall-clock milliseconds per tick when a film plays at the rate it was flown. */
export const REAL_MS_PER_TICK = 1000 / TICK_HZ;

/**
 * Wall-clock milliseconds per tick of film, for a segment of `ticks` ticks in
 * a race of `laps` of them.
 *
 * Never slower than the ship flew: a race already shorter than its share of
 * the viewing length is played at its own speed rather than stretched into
 * slow motion. So a race takes *at most* `VIEW_SECONDS`, and every race long
 * enough to need speeding up takes exactly that.
 */
export function msPerTick(ticks: number, laps: number): number {
  const share = (VIEW_SECONDS * 1000) / Math.max(1, laps);
  return Math.min(REAL_MS_PER_TICK, share / Math.max(1, ticks));
}
