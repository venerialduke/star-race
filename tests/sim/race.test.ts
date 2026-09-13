// S1 carries determinism tests and little else: the questions it answers are
// about feel, and feel is judged by eye. These are the properties that have to
// hold anyway, because everything later is built on them.

import { describe, expect, it } from 'vitest';
import { seedFrom } from '../../src/sim/rng';
import { simulate, type RaceConfig } from '../../src/sim/race';
import { SLICE_TRACK, holdingSpeed } from '../../src/sim/track';

const base = (overrides: Partial<RaceConfig> = {}): RaceConfig => ({
  track: SLICE_TRACK,
  stats: { thrust: 1, handling: 1 },
  plan: 'carry',
  seed: seedFrom('kestrel'),
  ...overrides,
});

describe('the track', () => {
  it('closes: the loop ends where it started', () => {
    const first = SLICE_TRACK.samples.at(0);
    const last = SLICE_TRACK.samples.at(-1);
    if (first === undefined || last === undefined) throw new Error('empty track');
    expect(Math.hypot(last.pos.x - first.pos.x, last.pos.y - first.pos.y)).toBeLessThan(
      12,
    );
  });

  it('is continuous: no sample jumps away from the one before it', () => {
    // The check that catches an arc curving the wrong way, which is what a
    // mis-signed centre does — the heading says one thing, the position another.
    let worst = 0;
    for (let i = 1; i < SLICE_TRACK.samples.length; i += 1) {
      const a = SLICE_TRACK.samples[i - 1];
      const b = SLICE_TRACK.samples[i];
      if (a === undefined || b === undefined) throw new Error('gap in samples');
      worst = Math.max(worst, Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y));
    }
    expect(worst).toBeLessThan(4);
  });

  it('has bends of more than one radius', () => {
    const radii = new Set(SLICE_TRACK.bends.map((b) => b.radius));
    expect(radii.size).toBeGreaterThan(1);
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
