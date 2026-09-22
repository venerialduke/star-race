// The film plays at whatever rate fits a race into one viewing length. The
// race itself is untouched — this is only the projector — so what is worth a
// test is the promise the rate makes: a race takes the viewing length, a heat
// of two laps takes it between them, and nothing is ever played slower than it
// was flown.

import { describe, expect, it } from 'vitest';
import { msPerTick, REAL_MS_PER_TICK, VIEW_SECONDS } from '../../src/ui/playback';
import { LAPS_PER_HEAT, TICK_HZ } from '../../src/sim/tuning';

/** How long, in seconds of wall clock, a film of this many ticks takes to watch. */
const watching = (ticks: number, laps: number): number =>
  (ticks * msPerTick(ticks, laps)) / 1000;

describe('a race is played at the rate that fits it into the viewing length', () => {
  it('takes the viewing length however long the lap was', () => {
    for (const ticks of [2400, 3600, 4800, 9000]) {
      expect(watching(ticks, 1)).toBeCloseTo(VIEW_SECONDS, 6);
    }
  });

  it('splits the viewing length between the laps of a heat, so the race lands on it', () => {
    const first = watching(2600, LAPS_PER_HEAT);
    const second = watching(2200, LAPS_PER_HEAT);
    expect(first + second).toBeCloseTo(VIEW_SECONDS, 6);
  });

  it('speeds a long lap up rather than slowing a short one down', () => {
    // A lap that already fits inside its share is played at the rate it was
    // flown: a race is at most the viewing length, never stretched past it.
    const short = TICK_HZ * 4;
    expect(msPerTick(short, 1)).toBe(REAL_MS_PER_TICK);
    expect(watching(short, 1)).toBeCloseTo(4, 6);
  });

  it('never plays a film slower than the ship flew it', () => {
    for (const ticks of [1, 10, 100, 900, 1800, 5000]) {
      expect(msPerTick(ticks, 1)).toBeLessThanOrEqual(REAL_MS_PER_TICK);
    }
  });

  it('survives the degenerate counts rather than dividing by zero', () => {
    expect(Number.isFinite(msPerTick(0, 1))).toBe(true);
    expect(Number.isFinite(msPerTick(1000, 0))).toBe(true);
  });
});
