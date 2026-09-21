// S7: the shop has to be a choice.
//
// One claim holds this milestone up: **a level is worth more than a copy**.
// Only engines and shields add up at all — a crew, a navigation system and a
// weapon are each the best one aboard — so those two are the only place where
// "buy another" competes with "buy deeper", and they are what these tests are
// about. Before S7 the arithmetic said buy another, slots arrived free, and the
// whole shop collapsed into bolting on cheap engines until the stats capped.

import { describe, expect, it } from 'vitest';
import { startRace, stepRace } from '../../src/sim/race';
import { COMPONENTS, componentById, resolveBuild, type Fitted } from '../../src/sim/ship';
import { MERIDIAN_RUN } from '../../src/sim/track';
import { buy, fit as fitOn, newGarage, type Garage } from '../../src/sim/garage';
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
    //
    // **A garage can no longer assemble this ship at all** — `fit` allows one
    // engine — so this is now a statement about `resolveBuild` rather than
    // about a build anybody can bring to a race. It is kept because the
    // falloff is what makes two of a thing a build and twelve a mistake, and
    // that arithmetic still governs shields, which are not capped. The limit
    // is tested where it lives, in `garage.test.ts`.
    const spam = resolveBuild([
      fit('balanced-engine', 3, 0),
      ...Array.from({ length: 11 }, (_, i) => fit('balanced-engine', 1, i + 1)),
    ]);
    const naive = 0.15 * 11;
    // Eleven copies are worth well under half what eleven of them would be.
    const stacked = spam.handling - resolveBuild([fit('balanced-engine', 3)]).handling;
    expect(stacked).toBeLessThan(naive * 0.5);
  });

  it('is a ship the garage will not build, which is the real answer', () => {
    // Pricing the degenerate build failed four times. Forbidding it took one
    // rule, and this is where the two meet: the arithmetic above says a ship of
    // twelve engines is bad, and the garage says it is not a ship.
    let garage: Garage = { ...newGarage(), credits: 100000, slots: 50 };
    for (let i = 0; i < 12; i += 1) {
      garage = buy(garage, 'balanced-engine');
      garage = fitOn(garage, garage.shelf.length - 1);
    }
    expect(garage.fitted).toHaveLength(1);
    expect(garage.shelf).toHaveLength(11);
  });
});

describe('every part has a reason to be bought', () => {
  it('tows the ship that fires a tractor beam, which is why you fit one', () => {
    // Its whole job: a tether pulls both ways. Without that it does nothing a
    // missile or a mine does not do better, and it won 0 seasons in 72.
    const build = [fit('tractor-beam', 2), fit('balanced-engine', 2, 2)];
    const stats = resolveBuild(build);
    const config = {
      track: MERIDIAN_RUN,
      stats,
      build,
      plan: 'carry' as const,
      seed: 4,
      id: 'a',
      world: {
        ships: [
          { id: 'a', distance: 0, offset: 0, sector: 0, route: 0, speed: 0 },
          { id: 'b', distance: 150, offset: 0, sector: 0, route: 0, speed: 0.5 },
        ],
        fixtures: [],
      },
    };
    const fired = stepRace({ ...startRace(stats, build), charge: 1 }, config);
    expect(fired.lastFired).toBe('tractor');
    expect(fired.towLeft).toBeGreaterThan(0);

    // Held side by side against the same ship with no charge to spend, the
    // towed one pulls ahead.
    let towed = fired;
    let alone = stepRace(startRace(stats, build), config);
    for (let i = 0; i < 60; i += 1) {
      towed = stepRace(towed, config);
      alone = stepRace({ ...alone, charge: 0 }, config);
    }
    expect(towed.speed).toBeGreaterThan(alone.speed);
  });

  it('collects at every level, not only at the one that captures', () => {
    const paid = [1, 2, 3].map((level) => {
      const build = [fit('collector-shield', level)];
      const stats = resolveBuild(build);
      // A weapon too big for the shield, so it lands rather than being caught.
      const hit = stepRace(startRace(stats, build), {
        track: MERIDIAN_RUN,
        stats,
        build,
        seed: 1,
        id: 'a',
        incoming: [{ from: 'b', side: 1, power: stats.shields + 60, scrub: 0 }],
      });
      return hit.salvage;
    });
    expect(paid[0]).toBeGreaterThan(0);
    expect(paid[1]).toBeGreaterThan(paid[0] as number);
    expect(paid[2]).toBeGreaterThan(paid[1] as number);
  });

  it('pays a plain shield nothing for the same hit', () => {
    const build = [fit('general-shields', 3)];
    const stats = resolveBuild(build);
    const hit = stepRace(startRace(stats, build), {
      track: MERIDIAN_RUN,
      stats,
      build,
      seed: 1,
      id: 'a',
      incoming: [{ from: 'b', side: 1, power: stats.shields + 60, scrub: 0 }],
    });
    expect(hit.salvage).toBe(0);
  });
});
