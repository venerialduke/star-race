// S7: the shop has to be a choice.
//
// One claim holds this milestone up: **a level is worth more than a copy**.
// Only engines and shields add up at all — a crew, a navigation system and a
// weapon are each the best one aboard — so those two are the only place where
// "buy another" competes with "buy deeper", and they are what these tests are
// about. Before S7 the arithmetic said buy another, slots arrived free, and the
// whole shop collapsed into bolting on cheap engines until the stats capped.

import { describe, expect, it } from 'vitest';
import { COMPONENTS, componentById, resolveBuild, type Fitted } from '../../src/sim/ship';
import { STACK_FALLOFF } from '../../src/sim/tuning';

const fit = (componentId: string, level: number, n = 0): Fitted => ({
  uid: `${componentId}-${n}`,
  componentId,
  level,
});

/** What it costs to own this component at this level, from nothing. */
function priceOf(id: string, level: number): number {
  const component = componentById(id);
  let total = 0;
  for (let l = 0; l < level; l += 1) total += component?.levels[l]?.cost ?? 0;
  return total;
}

/** The two categories whose numbers sum, which is where the choice lives. */
const STACKING = COMPONENTS.filter(
  (c) => c.category === 'engine' || c.category === 'shields',
);

/**
 * What a set of stats is worth, as one number. Signed on purpose: the speed
 * engine buys thrust by giving up handling, and a downside has to count against
 * it or "adds more" can be satisfied by getting worse faster.
 */
const worth = (thrust: number, handling: number, shields: number): number =>
  thrust + handling + shields / 40;

describe('a level is worth more than a copy', () => {
  it('has every level add more than the level below it', () => {
    for (const component of STACKING) {
      const steps = component.levels.map((level) =>
        worth(level.thrust ?? 0, level.handling ?? 0, level.shields ?? 0),
      );
      for (let i = 1; i < steps.length; i += 1) {
        // Cumulative, so each step is the gain over the one before.
        const gain = (steps[i] as number) - (steps[i - 1] as number);
        const first = steps[0] as number;
        expect(
          gain,
          `${component.id} level ${i + 1} adds ${gain.toFixed(2)}, less than its own level 1`,
        ).toBeGreaterThanOrEqual(first * 0.9);
      }
    }
  });

  it('beats the copies the same credits would buy, in fewer slots', () => {
    for (const component of STACKING) {
      const deep = priceOf(component.id, 3);
      const each = priceOf(component.id, 1);
      const copies = Math.floor(deep / each);
      // What one maxed part is worth, against as many level 1s as the money buys.
      const maxed = resolveBuild([fit(component.id, 3)]);
      const many = resolveBuild(
        Array.from({ length: copies }, (_, i) => fit(component.id, 1, i)),
      );
      const value = (s: ReturnType<typeof resolveBuild>): number =>
        worth(s.thrust, s.handling, s.shields);
      expect(
        value(maxed),
        `${component.id}: ${copies} copies beat one maxed for the same ${deep}c`,
      ).toBeGreaterThan(value(many));
    }
  });
});

describe('each further copy of the same part is worth less', () => {
  it('falls off at the rate the tuning says', () => {
    const one = resolveBuild([fit('general-shields', 1, 1)]);
    const two = resolveBuild([fit('general-shields', 1, 1), fit('general-shields', 1, 2)]);
    const added = two.shields - one.shields;
    expect(added).toBeCloseTo(one.shields * STACK_FALLOFF, 6);
  });

  it('leaves two different shields both counting in full', () => {
    // The framework is explicit that two shields is a build, not a mistake.
    // What the falloff stops is the same part twelve times over.
    const general = resolveBuild([fit('general-shields', 1)]);
    const collector = resolveBuild([fit('collector-shield', 1)]);
    const both = resolveBuild([fit('general-shields', 1), fit('collector-shield', 1)]);
    expect(both.shields).toBe(general.shields + collector.shields);
  });

  it('does not touch the categories that take the best aboard', () => {
    // A crew does not stack in the first place, so there is nothing to fall off.
    const one = resolveBuild([fit('crew-engineers', 2, 1)]);
    const two = resolveBuild([fit('crew-engineers', 2, 1), fit('crew-engineers', 2, 2)]);
    expect(two.endurance).toBe(one.endurance);
    expect(two.repair).toBe(one.repair);

    const nav = resolveBuild([fit('nav-system', 2, 1)]);
    const navs = resolveBuild([fit('nav-system', 2, 1), fit('nav-system', 2, 2)]);
    expect(navs.nav).toBe(nav.nav);
  });

  it('makes a ship of twelve cheap engines worse than it was', () => {
    // The build that used to win every season: one maxed engine and eleven
    // level 1s bolted into the slots the season hands out for free.
    const spam = resolveBuild([
      fit('balanced-engine', 3, 0),
      ...Array.from({ length: 11 }, (_, i) => fit('balanced-engine', 1, i + 1)),
    ]);
    const naive = 0.15 * 11;
    // Eleven copies are worth well under half what eleven of them would be.
    const stacked = spam.handling - resolveBuild([fit('balanced-engine', 3)]).handling;
    expect(stacked).toBeLessThan(naive * 0.5);
  });
});
