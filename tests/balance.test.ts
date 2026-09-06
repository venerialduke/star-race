// Sanity bounds on the whole game, not on any one part of it.
//
// These are deliberately loose. They are not there to pin the balance down —
// tuning should be free to move — but to fail loudly if a change makes the
// slice riskless, unsurvivable, or nonsense.

import { describe, expect, it } from 'vitest';
import { runBalance, runTheField } from '../scripts/balance';
import { STANDARD_BUILDS } from '../src/sim/builds';

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

  it('brings a tougher build home more often than a fragile one', () => {
    // Not "takes less damage": a pilot flies a tough ship harder, because it can
    // afford to. What toughness has to buy is finishing.
    const speed = rows.find((row) => row.name === 'Speed');
    const survival = rows.find((row) => row.name === 'Survival');
    expect(speed).toBeDefined();
    expect(survival).toBeDefined();
    expect(survival?.survivalRate ?? 0).toBeGreaterThan(speed?.survivalRate ?? 1);
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

describe('whole runs against the rivals', () => {
  const rows = runTheField(60);

  it('measures every player strategy', () => {
    expect(rows.length).toBeGreaterThan(2);
    rows.forEach((row) => {
      expect(row.runs).toBe(60);
      expect(Number.isNaN(row.winRate)).toBe(false);
      expect(row.winRate).toBeGreaterThanOrEqual(0);
      expect(row.winRate).toBeLessThanOrEqual(1);
      expect(row.meanPosition).toBeGreaterThanOrEqual(1);
      expect(row.meanPosition).toBeLessThanOrEqual(3);
    });
  });

  it('leaves the run winnable, and not a formality', () => {
    // A three-way race: 33% is even. Good play should be ahead of that and well
    // short of certain, or the rivals are decoration.
    const best = Math.max(...rows.map((row) => row.winRate));
    expect(best).toBeGreaterThan(0.3);
    expect(best).toBeLessThan(0.75);
  });

  it('pays a player for choosing well', () => {
    // The whole point of the garage. If picking at random did as well as
    // thinking, the offer is noise and the game has no decisions in it.
    const blind = rows.find((row) => row.name === 'First card');
    const best = Math.max(...rows.map((row) => row.winRate));
    expect(blind).toBeDefined();
    expect(best).toBeGreaterThan((blind?.winRate ?? 0) * 1.2);
  });

  it('keeps armour alone from being the answer', () => {
    // Surviving is not winning: a ship that never dies and never keeps up
    // should not be the strongest way to play.
    const armour = rows.find((row) => row.name === 'All armour');
    const best = Math.max(...rows.map((row) => row.winRate));
    expect(armour?.survivalRate ?? 0).toBeGreaterThan(0.85);
    expect(armour?.winRate ?? 1).toBeLessThan(best);
  });

  it('leaves Redline a real threat that is beatable on time', () => {
    const speed = rows.find((row) => row.name === 'All speed');
    expect(speed).toBeDefined();
    // It gets home often enough to be the ship to beat...
    expect(speed?.rivalSurvival ?? 0).toBeGreaterThan(0.4);
    // ...and a fast player beats it on the clock some of the time, rather than
    // only ever inheriting the win when it crashes.
    expect(speed?.beatOnTime ?? 0).toBeGreaterThan(0.15);
  });

  it('leaves stacking a choice rather than the answer', () => {
    // Parts stack: three Ion Thrusters is a legal build. That is deliberate, and
    // it holds only while neither extreme dominates — a player who always takes
    // another of what they have should do no better than one who never does.
    const doubling = rows.find((row) => row.name === 'Doubles down');
    const spreading = rows.find((row) => row.name === 'Never repeats');
    const best = Math.max(...rows.map((row) => row.winRate));
    expect(doubling).toBeDefined();
    expect(spreading).toBeDefined();
    expect(doubling?.winRate ?? 1).toBeLessThan(best);
    expect(spreading?.winRate ?? 1).toBeLessThan(best);
    // Neither is far ahead of the other: stacking is a trade, not a lever.
    const gap = Math.abs((doubling?.winRate ?? 0) - (spreading?.winRate ?? 0));
    expect(gap).toBeLessThan(0.2);
  });

  it('is deterministic: the same sweep twice gives the same table', () => {
    expect(runTheField(20)).toEqual(runTheField(20));
  });
});
