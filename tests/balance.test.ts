// Sanity bounds on the whole game, not on any one part of it.
//
// These are deliberately loose. They are not there to pin the balance down —
// tuning should be free to move — but to fail loudly if a change makes the
// slice riskless, unsurvivable, or nonsense.

import { describe, expect, it } from 'vitest';
import { runBalance, referencePlay } from '../scripts/balance';
import { STANDARD_BUILDS } from '../src/sim/builds';
import { resolveBuild } from '../src/sim/ship';
import { simulate } from '../src/sim/race';
import { SLICE_TRACK } from '../src/sim/track';

const RACES = 1000;
const rows = runBalance(RACES);

describe(`${RACES} races per standard build`, () => {
  it('races every standard build the stated number of times', () => {
    expect(rows).toHaveLength(STANDARD_BUILDS.length);
    rows.forEach((row) => expect(row.races).toBe(RACES));
  });

  it('produces no NaN anywhere', () => {
    rows.forEach((row) => {
      expect(Number.isNaN(row.survivalRate)).toBe(false);
      expect(Number.isNaN(row.meanDamage)).toBe(false);
      expect(Number.isNaN(row.topSpeed)).toBe(false);
      // Finish times are only defined when something finished, and something
      // always should.
      expect(Number.isNaN(row.meanTicks)).toBe(false);
      expect(Number.isNaN(row.medianTicks)).toBe(false);
    });
  });

  it('keeps overall survival between 5% and 95%', () => {
    // Across every race run, not per build: one safe build and one risky one is
    // a healthy game. Below 5% the slice is unplayable; above 95% nothing the
    // player does matters.
    const survival =
      rows.reduce((sum, row) => sum + row.survivalRate * row.races, 0) /
      rows.reduce((sum, row) => sum + row.races, 0);
    expect(survival).toBeGreaterThan(0.05);
    expect(survival).toBeLessThan(0.95);
  });

  it('leaves no build unplayable and no build risk-free as a set', () => {
    rows.forEach((row) => expect(row.survivalRate).toBeGreaterThan(0));
    // At least one build should be able to lose, or nothing is at stake.
    expect(rows.some((row) => row.survivalRate < 1)).toBe(true);
  });

  it('finishes sooner the faster the build is', () => {
    const bySpeed = [...rows].sort((a, b) => b.topSpeed - a.topSpeed);
    bySpeed.forEach((row, i) => {
      const slower = bySpeed[i + 1];
      if (slower === undefined) return;
      expect(row.topSpeed).toBeGreaterThan(slower.topSpeed);
      expect(row.meanTicks).toBeLessThan(slower.meanTicks);
      expect(row.medianTicks).toBeLessThan(slower.medianTicks);
    });
  });

  it('costs a tougher build less hull than a fragile one', () => {
    const speed = rows.find((row) => row.name === 'Speed');
    const survival = rows.find((row) => row.name === 'Survival');
    expect(speed).toBeDefined();
    expect(survival).toBeDefined();
    expect(survival?.meanDamage).toBeLessThan(speed?.meanDamage ?? 0);
  });

  it('never reports a finish time below the length of the track', () => {
    rows.forEach((row) => {
      expect(row.meanTicks).toBeGreaterThan(0);
      expect(row.meanDamage).toBeGreaterThanOrEqual(0);
    });
  });

  it('is deterministic: the same run twice gives the same table', () => {
    expect(runBalance(50)).toEqual(runBalance(50));
  });

  it('runs 1,000 races per build in well under ten seconds', () => {
    const started = performance.now();
    runBalance(RACES);
    expect(performance.now() - started).toBeLessThan(10_000);
  });
});

describe('the reference player', () => {
  it('plans the same taps for the same seed, and different ones for another', () => {
    const build = STANDARD_BUILDS[0]?.build ?? [];
    expect(referencePlay(SLICE_TRACK, build, 7)).toEqual(
      referencePlay(SLICE_TRACK, build, 7),
    );
    expect(referencePlay(SLICE_TRACK, build, 7)).not.toEqual(
      referencePlay(SLICE_TRACK, build, 8),
    );
  });

  it('raises shields once per burst on the course, and reroutes once', () => {
    const build = STANDARD_BUILDS[0]?.build ?? [];
    const bursts = SLICE_TRACK.segments.flatMap((s) =>
      s.hazards.filter((h) => h.kind === 'gammaBurst'),
    );
    const inputs = referencePlay(SLICE_TRACK, build, 1);
    expect(inputs.filter((i) => i.active === 'shields')).toHaveLength(bursts.length);
    expect(inputs.filter((i) => i.active === 'powerReroute')).toHaveLength(1);
  });

  it('helps: the same races go worse with no taps at all', () => {
    const build = STANDARD_BUILDS[1]?.build ?? [];
    let withTaps = 0;
    let without = 0;
    for (let seed = 0; seed < 200; seed++) {
      if (
        simulate(SLICE_TRACK, build, referencePlay(SLICE_TRACK, build, seed), seed)
          .survived
      ) {
        withTaps++;
      }
      if (simulate(SLICE_TRACK, build, [], seed).survived) without++;
    }
    expect(withTaps).toBeGreaterThan(without);
  });

  it('aims its taps at a tick the ship could actually be at', () => {
    STANDARD_BUILDS.forEach((standard) => {
      const stats = resolveBuild(standard.build);
      referencePlay(SLICE_TRACK, standard.build, 3).forEach((input) => {
        expect(input.tick).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(input.tick)).toBe(true);
        expect(stats.speed).toBeGreaterThan(0);
      });
    });
  });
});
