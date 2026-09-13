// S1 carries determinism tests and little else: the questions it answers are
// about feel, and feel is judged by eye. These are the properties that have to
// hold anyway, because everything later is built on them.

import { describe, expect, it } from 'vitest';
import { seedFrom } from '../../src/sim/rng';
import { simulate, type RaceConfig } from '../../src/sim/race';
import { KESTREL_LOOP, TRACKS, holdingSpeed, type Track } from '../../src/sim/track';

const base = (overrides: Partial<RaceConfig> = {}): RaceConfig => ({
  track: KESTREL_LOOP,
  stats: { thrust: 1, handling: 1 },
  plan: 'carry',
  seed: seedFrom('kestrel'),
  ...overrides,
});

describe.each(TRACKS)('$name', (track: Track) => {
  it('closes: the loop ends where it started', () => {
    const first = track.samples.at(0);
    const last = track.samples.at(-1);
    if (first === undefined || last === undefined) throw new Error('empty track');
    expect(Math.hypot(last.pos.x - first.pos.x, last.pos.y - first.pos.y)).toBeLessThan(
      12,
    );
  });

  it('is continuous: no sample jumps away from the one before it', () => {
    // The check that catches an arc curving the wrong way, which is what a
    // mis-signed centre does — the heading says one thing, the position another.
    let worst = 0;
    for (let i = 1; i < track.samples.length; i += 1) {
      const a = track.samples[i - 1];
      const b = track.samples[i];
      if (a === undefined || b === undefined) throw new Error('gap in samples');
      worst = Math.max(worst, Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y));
    }
    expect(worst).toBeLessThan(4);
  });

  it('has bends of more than one radius', () => {
    expect(new Set(track.bends.map((b) => b.radius)).size).toBeGreaterThan(1);
  });

  it('can be lapped, and its laps differ by plan', () => {
    const lap = (plan: 'lift' | 'charge'): number => {
      const state = simulate(base({ track, plan }), 9000);
      return state.lastLapTicks ?? Infinity;
    };
    expect(lap('lift')).toBeLessThan(Infinity);
    expect(lap('charge')).toBeLessThan(lap('lift'));
  });
});

describe('the three tracks', () => {
  it('are different lengths', () => {
    const lengths = TRACKS.map((t) => Math.round(t.length));
    expect(new Set(lengths).size).toBe(TRACKS.length);
  });

  it('differ in how tight their bends are', () => {
    const tightest = TRACKS.map((t) => Math.min(...t.bends.map((b) => b.radius)));
    expect(new Set(tightest).size).toBe(TRACKS.length);
  });
});

describe('the race', () => {
  it('replays identically from the same seed', () => {
    const a = simulate(base(), 2000);
    const b = simulate(base(), 2000);
    expect(a.distance).toBe(b.distance);
    expect(a.swings.map((s) => s.swing)).toEqual(b.swings.map((s) => s.swing));
  });

  it('runs a different race from a different seed', () => {
    // The seed only changes the race through the swing, so this needs a build
    // and a plan that actually swing: a slow enough ship has no corner to lose.
    const fast = { stats: { thrust: 1.4, handling: 0.7 }, plan: 'charge' } as const;
    const a = simulate(base({ ...fast, seed: seedFrom('kestrel') }), 2000);
    const b = simulate(base({ ...fast, seed: seedFrom('other') }), 2000);
    expect(a.distance).not.toBe(b.distance);
  });

  it('never swings on Lift, and swings on Charge', () => {
    const lift = simulate(base({ plan: 'lift' }), 2500);
    const charge = simulate(base({ plan: 'charge' }), 2500);
    expect(Math.max(...lift.swings.map((s) => s.swing))).toBe(0);
    expect(Math.max(...charge.swings.map((s) => s.swing))).toBeGreaterThan(0);
  });

  it('swings wider the more excess speed it carries', () => {
    const steady = simulate(base({ stats: { thrust: 0.6, handling: 1.3 } }), 2500);
    const reckless = simulate(base({ stats: { thrust: 1.6, handling: 0.6 } }), 2500);
    const worst = (s: typeof steady): number =>
      Math.max(0, ...s.swings.map((e) => e.swing));
    expect(worst(reckless)).toBeGreaterThan(worst(steady));
  });

  it('gives a bigger bend a higher holding speed', () => {
    expect(holdingSpeed(70, 1)).toBeGreaterThan(holdingSpeed(42, 1));
  });
});
