// S6: ships reach each other.
//
// Every claim here is about the one rule that makes interaction safe to have:
// **nothing lands on the tick it was fired.** A ship reads a world built before
// the tick and what it sends out arrives on the tick after, so no ship's move
// can depend on where another got to this tick, and the order the ships sit in
// the array cannot change the race. The rest is about what a weapon costs, what
// answers it, and the two mistakes this layer is easiest to make: a thing on the
// road that bites every tick, and a ship that can be pushed somewhere it cannot
// come back from.

import { describe, expect, it } from 'vitest';
import { grantsOf } from '../../src/sim/ability';
import {
  leavePit,
  startField,
  stepField,
  type Entrant,
  type Orders,
} from '../../src/sim/field';
import { startRace, stepRace, type RaceState } from '../../src/sim/race';
import { resolveBuild, type Fitted } from '../../src/sim/ship';
import { CINDER_COIL, KESTREL_LOOP, MERIDIAN_RUN, TRACKS } from '../../src/sim/track';
import {
  ABILITY_WORKS,
  CHARGE_PER_TICK,
  FIXTURE_LIFE,
  LAPS_PER_HEAT,
  PERFECT_BENDS,
  SPEED_PER_THRUST,
  TRACK_HALF_WIDTH,
} from '../../src/sim/tuning';
import {
  ageFixtures,
  resolveEmissions,
  type Emission,
  type Fixture,
} from '../../src/sim/world';

const fit = (componentId: string, level: number, n = 1): Fitted => ({
  uid: `${componentId}-${n}`,
  componentId,
  level,
});

const entrant = (id: string, build: readonly Fitted[]): Entrant => ({
  id,
  name: id,
  stats: resolveBuild(build),
  build,
  isPlayer: id === 'a',
});

/** Run a heat to the end and hand back the field. */
function heat(
  track: (typeof TRACKS)[number],
  entrants: readonly Entrant[],
  orders: readonly Orders[] = entrants.map(() => ({ plan: 'carry', routes: [] })),
  seed = 7,
) {
  const config = { track, laps: LAPS_PER_HEAT, seed };
  let field = startField(entrants, orders, track);
  for (let lap = 0; lap < LAPS_PER_HEAT; lap += 1) {
    for (let i = 0; i < 40000 && field.phase === 'racing'; i += 1) {
      field = stepField(field, config);
    }
    if (field.phase === 'pit') field = leavePit(field, orders, track);
  }
  return field;
}

/** A fixture sitting on the main line of sector 0, wherever the ship will meet it. */
const fixtureAt = (kind: Fixture['kind'], distance: number, power: number): Fixture => ({
  id: `${kind}-test`,
  kind,
  owner: 'nobody',
  distance,
  sector: 0,
  route: 0,
  offset: 0,
  power,
  life: FIXTURE_LIFE,
});

describe('nothing lands on the tick it was fired', () => {
  it('emits on one tick and arrives on the next', () => {
    const shooter = entrant('a', [fit('missile-rack', 3), fit('crew-engineers', 3, 2)]);
    const target = entrant('b', [fit('speed-engine', 1)]);
    const config = { track: MERIDIAN_RUN, laps: 1, seed: 3 };
    let field = startField([shooter, target], [{ plan: 'carry', routes: [] }, 'carry']);

    let firedOn: number | undefined;
    let landedOn: number | undefined;
    for (let i = 0; i < 4000 && field.phase === 'racing'; i += 1) {
      field = stepField(field, config);
      const emitted = field.ships[0]?.state.emitted ?? [];
      if (firedOn === undefined && emitted.some((e) => e.kind === 'push')) {
        firedOn = field.tick;
      }
      if (landedOn === undefined && field.ships[1]?.state.lastHit !== undefined) {
        landedOn = field.tick;
      }
      if (firedOn !== undefined && landedOn !== undefined) break;
    }
    expect(firedOn).toBeDefined();
    expect(landedOn).toBe((firedOn as number) + 1);
  });

  it('sorts a set of emissions the same way whatever order they arrive in', () => {
    const emissions: Emission[] = [
      { kind: 'push', from: 'a', target: 'b', side: 1, power: 10 },
      { kind: 'drag', from: 'c', target: 'b', scrub: 0.1 },
      { kind: 'push', from: 'b', target: 'c', side: -1, power: 4 },
    ];
    const forward = resolveEmissions(emissions);
    const backward = resolveEmissions([...emissions].reverse());
    const summed = (r: ReturnType<typeof resolveEmissions>, id: string): number =>
      (r.incoming.get(id) ?? []).reduce((n, i) => n + i.power + i.scrub + i.side, 0);
    for (const id of ['a', 'b', 'c']) {
      expect(summed(forward, id)).toBeCloseTo(summed(backward, id), 10);
    }
  });

  it('plays an armed heat the same way twice', () => {
    const field = [
      entrant('a', [fit('speed-engine', 3), fit('missile-rack', 2, 2)]),
      entrant('b', [fit('handling-engine', 3), fit('general-shields', 2, 2)]),
      entrant('c', [fit('gravity-mine', 2), fit('crew-mercenaries', 2, 2)]),
    ];
    const one = heat(CINDER_COIL, field);
    const two = heat(CINDER_COIL, field);
    expect(one.ships.map((s) => s.totalTicks)).toEqual(two.ships.map((s) => s.totalTicks));
    expect(one.ships.map((s) => s.state.salvage)).toEqual(
      two.ships.map((s) => s.state.salvage),
    );
  });
});

describe('a thing on the road bites once', () => {
  it('does not charge a ship for the same fixture on every tick it is near it', () => {
    const build = [fit('speed-engine', 2)];
    const stats = resolveBuild(build);
    const track = KESTREL_LOOP;
    const mine = fixtureAt('mine', 300, 30);
    let state = startRace(stats, build);
    let bites = 0;
    for (let i = 0; i < 900; i += 1) {
      const before = state.met.length;
      state = stepRace(state, {
        track,
        stats,
        build,
        plan: 'carry',
        seed: 1,
        id: 'a',
        world: { ships: [], fixtures: [mine] },
      });
      if (state.met.length > before) bites += 1;
    }
    // It flies right past it, well inside the reach, for many ticks.
    expect(state.distance).toBeGreaterThan(400);
    expect(bites).toBe(1);
  });

  it('never bites the ship that laid it', () => {
    const build = [fit('gravity-mine', 3)];
    const stats = resolveBuild(build);
    const own: Fixture = { ...fixtureAt('mine', 300, 40), owner: 'a' };
    let state = startRace(stats, build);
    for (let i = 0; i < 900; i += 1) {
      state = stepRace(state, {
        track: KESTREL_LOOP,
        stats,
        build,
        plan: 'carry',
        seed: 1,
        id: 'a',
        world: { ships: [], fixtures: [own] },
      });
    }
    expect(state.met).toHaveLength(0);
    expect(state.lastHit).toBeUndefined();
  });

  it('forgets a fixture once it has faded', () => {
    const short: Fixture = { ...fixtureAt('mine', 10, 5), life: 2 };
    expect(ageFixtures([short])).toHaveLength(1);
    expect(ageFixtures(ageFixtures([short]))).toHaveLength(0);
  });
});

describe('what answers a weapon', () => {
  /**
   * Fly one ship into one fixture and report the furthest it was thrown. The
   * *final* offset says nothing: the ship hauls itself back afterwards, so
   * where it happens to be 800 ticks later is about recovery, not about the hit.
   */
  function meets(
    build: readonly Fitted[],
    fixture: Fixture,
  ): { peak: number; state: RaceState } {
    const stats = resolveBuild(build);
    let state = startRace(stats, build);
    let peak = 0;
    for (let i = 0; i < 800; i += 1) {
      state = stepRace(state, {
        track: KESTREL_LOOP,
        stats,
        build,
        plan: 'carry',
        seed: 1,
        id: 'a',
        world: { ships: [], fixtures: [fixture] },
      });
      peak = Math.max(peak, Math.abs(state.offset));
    }
    return { peak, state };
  }

  /**
   * One missile, on the first tick, from a standing start on the line. Nothing
   * else is happening — measuring this against a fixture met mid-lap was the
   * first version, and both ships simply peaked at the corridor wall because
   * their own swing had already taken them there. The push has to be isolated
   * to be measured.
   */
  function shoved(build: readonly Fitted[], power: number): RaceState {
    const stats = resolveBuild(build);
    return stepRace(startRace(stats, build), {
      track: MERIDIAN_RUN,
      stats,
      build,
      plan: 'carry',
      seed: 1,
      id: 'a',
      incoming: [{ from: 'b', side: 1, power, scrub: 0 }],
    });
  }

  it('pushes an unshielded ship further than a shielded one', () => {
    const bare = shoved([fit('speed-engine', 2)], 60);
    const thin = shoved([fit('speed-engine', 2), fit('general-shields', 1, 2)], 60);
    const deep = shoved([fit('speed-engine', 2), fit('general-shields', 3, 2)], 60);
    expect(Math.abs(bare.offset)).toBeGreaterThan(Math.abs(thin.offset));
    expect(Math.abs(thin.offset)).toBeGreaterThan(Math.abs(deep.offset));
    expect(bare.lastHit).toBe('a missile');
  });

  it('stops a weapon outright when the shields are deeper than it', () => {
    const deep = shoved([fit('speed-engine', 2), fit('general-shields', 3, 2)], 20);
    expect(deep.offset).toBe(0);
    expect(deep.lastHit).toBeUndefined();
    // The shielding is spent answering it, even though nothing got through.
    expect(deep.shields).toBeLessThan(resolveBuild([
      fit('speed-engine', 2),
      fit('general-shields', 3, 2),
    ]).shields);
  });

  it('is felt by a ship that flies into a mine on the road', () => {
    const mine = fixtureAt('mine', 300, 40);
    const bare = meets([fit('speed-engine', 2)], mine);
    expect(bare.state.lastHit).toBe('a gravity mine');
    expect(bare.peak).toBeGreaterThan(0);
  });

  it('keeps the weapon instead of taking it, at a full collector shield', () => {
    const build = [fit('speed-engine', 2), fit('collector-shield', 3, 2)];
    const stats = resolveBuild(build);
    expect(stats.captures).toBe(true);
    let state = startRace(stats, build);
    // A missile arriving on the very first tick, with the shields untouched.
    state = stepRace(state, {
      track: KESTREL_LOOP,
      stats,
      build,
      plan: 'carry',
      seed: 1,
      id: 'a',
      incoming: [{ from: 'b', side: 1, power: 30, scrub: 0 }],
    });
    expect(state.salvage).toBeGreaterThan(0);
    // It never lands: the ship is not moved an inch by a weapon it kept.
    expect(state.offset).toBe(0);
    // But catching it loads the shield, so the next one has to wait for the
    // recharge. Without that the shield never leaves full and captures
    // everything for the rest of the race for nothing.
    expect(state.shields).toBeCloseTo(stats.shields - 30, 6);
  });

  it('keeps a weapon bigger than its shielding, and is emptied doing it', () => {
    const build = [fit('speed-engine', 2), fit('collector-shield', 3, 2)];
    const stats = resolveBuild(build);
    const config = {
      track: KESTREL_LOOP,
      stats,
      build,
      plan: 'carry' as const,
      seed: 1,
      id: 'a',
    };
    const big = { from: 'b', side: 1, power: stats.shields + 40, scrub: 0 };
    const caught = stepRace(startRace(stats, build), { ...config, incoming: [big] });
    // The missiles worth catching are exactly the ones that outweigh a shield.
    expect(caught.salvage).toBeGreaterThan(0);
    expect(caught.offset).toBe(0);
    expect(caught.shields).toBe(0);

    // And the next one lands, because the shields are no longer full. That is
    // the whole of what stops a collector being immune to weapons.
    const next = stepRace(caught, { ...config, incoming: [big] });
    expect(next.salvage).toBe(caught.salvage);
    expect(Math.abs(next.offset)).toBeGreaterThan(0);
  });

  it('takes speed off with a pull, which no shield answers', () => {
    const build = [fit('speed-engine', 2), fit('general-shields', 3, 2)];
    const stats = resolveBuild(build);
    let held = startRace(stats, build);
    let free = startRace(stats, build);
    for (let i = 0; i < 60; i += 1) {
      const config = {
        track: MERIDIAN_RUN,
        stats,
        build,
        plan: 'carry' as const,
        seed: 1,
        id: 'a',
      };
      held = stepRace(held, {
        ...config,
        incoming: [{ from: 'b', side: 0, power: 0, scrub: 0.05 }],
      });
      free = stepRace(free, config);
    }
    expect(held.speed).toBeLessThan(free.speed);
    expect(held.shields).toBe(free.shields);
  });
});

describe('the screen can say who did it to you', () => {
  // Being bounced by nobody in particular is what made this whole layer
  // invisible on screen: the ship moved and nothing said why or whose fault it
  // was. The sim has to carry the attacker and the moment, or no readout can.
  it('records who fired what reached it, and on which tick', () => {
    const build = [fit('speed-engine', 2)];
    const stats = resolveBuild(build);
    const quiet = stepRace(startRace(stats, build), {
      track: MERIDIAN_RUN,
      stats,
      build,
      plan: 'carry',
      seed: 1,
      id: 'a',
    });
    expect(quiet.lastHitBy).toBeUndefined();
    expect(quiet.lastHitTick).toBeUndefined();

    const shot = stepRace(quiet, {
      track: MERIDIAN_RUN,
      stats,
      build,
      plan: 'carry',
      seed: 1,
      id: 'a',
      incoming: [{ from: 'rival-3', side: 1, power: 40, scrub: 0 }],
    });
    expect(shot.lastHit).toBe('a missile');
    expect(shot.lastHitBy).toBe('rival-3');
    expect(shot.lastHitTick).toBe(shot.tick);
  });

  it('names a mine by whoever laid it', () => {
    const build = [fit('speed-engine', 2)];
    const stats = resolveBuild(build);
    const laid: Fixture = { ...fixtureAt('mine', 300, 50), owner: 'rival-7' };
    let state = startRace(stats, build);
    for (let i = 0; i < 800; i += 1) {
      state = stepRace(state, {
        track: KESTREL_LOOP,
        stats,
        build,
        plan: 'carry',
        seed: 1,
        id: 'a',
        world: { ships: [], fixtures: [laid] },
      });
    }
    expect(state.lastHit).toBe('a gravity mine');
    expect(state.lastHitBy).toBe('rival-7');
  });

  it('marks a shot with who it was aimed at', () => {
    const shooter = entrant('a', [fit('missile-rack', 3), fit('crew-engineers', 3, 2)]);
    const target = entrant('b', [fit('speed-engine', 1)]);
    const config = { track: MERIDIAN_RUN, laps: 1, seed: 3 };
    let field = startField([shooter, target], ['carry', 'carry']);
    let aimed: string | undefined;
    for (let i = 0; i < 6000 && field.phase === 'racing'; i += 1) {
      field = stepField(field, config);
      for (const emission of field.ships[0]?.state.emitted ?? []) {
        if (emission.kind === 'push') aimed = emission.target;
      }
      if (aimed !== undefined) break;
    }
    expect(aimed).toBe('b');
  });
});

describe('a black hole discriminates by build', () => {
  function through(build: readonly Fitted[]): RaceState {
    const stats = resolveBuild(build);
    let state = startRace(stats, build);
    const hole = fixtureAt('black-hole', 300, 30);
    for (let i = 0; i < 800; i += 1) {
      state = stepRace(state, {
        track: KESTREL_LOOP,
        stats,
        build,
        plan: 'carry',
        seed: 1,
        id: 'a',
        world: { ships: [], fixtures: [hole] },
      });
    }
    return state;
  }

  it('hurts a ship that cannot read it', () => {
    const hurt = through([fit('speed-engine', 2)]);
    expect(hurt.lastHit).toBe('a black hole');
    expect(Math.min(...hurt.condition.parts)).toBeLessThan(1);
  });

  it('is a corner to a ship that can, and pays it', () => {
    const read = through([fit('dark-matter-engine', 2), fit('collector-shield', 1, 2)]);
    expect(read.lastHit).toBe('through a black hole');
    expect(Math.min(...read.condition.parts)).toBe(1);
    expect(read.darkMatter).toBeGreaterThan(0);
  });
});

describe('charge, and what a ship spends it on', () => {
  it('is gathered on the golden path and nowhere else', () => {
    const build = [fit('speed-engine', 2)];
    const stats = resolveBuild(build);
    const config = {
      track: MERIDIAN_RUN,
      stats,
      build,
      plan: 'carry' as const,
      seed: 1,
      id: 'a',
    };
    const onPath = stepRace(startRace(stats, build), config);
    expect(onPath.charge).toBeCloseTo(CHARGE_PER_TICK * stats.shieldRegen, 6);

    const thrown = stepRace({ ...startRace(stats, build), wide: true }, config);
    expect(thrown.charge).toBe(0);
  });

  it('spends the whole charge on whatever it fires', () => {
    const build = [fit('speed-engine', 3)];
    const stats = resolveBuild(build);
    const ready = { ...startRace(stats, build), charge: 1 };
    const after = stepRace(ready, {
      track: MERIDIAN_RUN,
      stats,
      build,
      plan: 'carry',
      seed: 1,
      id: 'a',
    });
    expect(after.lastFired).toBe('boost');
    expect(after.charge).toBe(0);
    expect(after.boostLeft).toBeGreaterThan(0);
  });

  it('fires nothing without a charge', () => {
    const build = [fit('speed-engine', 3)];
    const stats = resolveBuild(build);
    const after = stepRace(startRace(stats, build), {
      track: MERIDIAN_RUN,
      stats,
      build,
      plan: 'carry',
      seed: 1,
      id: 'a',
    });
    expect(after.lastFired).toBeUndefined();
  });

  it('grants an ability at the level the catalogue says, and not below it', () => {
    expect(grantsOf([fit('speed-engine', 2)])).toHaveLength(0);
    expect(grantsOf([fit('speed-engine', 3)])).toEqual([{ id: 'boost', level: 3 }]);
    expect(grantsOf([fit('handling-engine', 3)])).toEqual([
      { id: 'three-bends', level: 3 },
    ]);
  });

  it('loses the ability when the part granting it is badly broken', () => {
    const build = [fit('speed-engine', 3)];
    expect(grantsOf(build, { parts: [ABILITY_WORKS + 0.01] })).toHaveLength(1);
    expect(grantsOf(build, { parts: [ABILITY_WORKS - 0.01] })).toHaveLength(0);
  });

  it('takes exactly three bends perfectly, and swings again after them', () => {
    const build = [fit('handling-engine', 3)];
    const stats = resolveBuild(build);
    let state: RaceState = { ...startRace(stats, build), charge: 1 };
    const config = {
      track: CINDER_COIL,
      stats,
      build,
      plan: 'charge' as const,
      seed: 5,
      id: 'a',
    };
    // Every bend entered while the chain still has one left must take no swing
    // at all; the first bend after it runs out must be able to swing again.
    let inChain = 0;
    let afterChain = 0;
    let swungAfter = false;
    for (let i = 0; i < 2000; i += 1) {
      const before = state.swings.length;
      const chainLeft = state.perfectLeft;
      state = stepRace(state, config);
      if (state.swings.length > before) {
        const swing = state.swings[state.swings.length - 1];
        if (chainLeft > 0 || state.lastFiredTick === state.tick) {
          expect(swing?.excess).toBe(0);
          inChain += 1;
        } else {
          afterChain += 1;
          if ((swing?.excess ?? 0) > 0) swungAfter = true;
        }
      }
      // Never let it charge back up, so exactly one chain is measured.
      state = { ...state, charge: Math.min(state.charge, 0.9) };
    }
    expect(inChain).toBe(PERFECT_BENDS);
    expect(afterChain).toBeGreaterThan(0);
    expect(swungAfter).toBe(true);
  });
});

describe('a mine laid before the heat', () => {
  const armed = entrant('a', [fit('gravity-mine', 2), fit('balanced-engine', 2, 2)]);
  const other = entrant('b', [fit('balanced-engine', 2)]);
  const orders: Orders[] = [
    { plan: 'carry', routes: [], place: 1 },
    { plan: 'carry', routes: [] },
  ];

  it('is on the track before a single tick is run', () => {
    const field = startField([armed, other], orders, KESTREL_LOOP);
    expect(field.fixtures).toHaveLength(1);
    expect(field.fixtures[0]?.sector).toBe(1);
    expect(field.fixtures[0]?.owner).toBe('a');
  });

  it('is still there after the pit stop, when a dropped one is not', () => {
    const track = KESTREL_LOOP;
    const config = { track, laps: LAPS_PER_HEAT, seed: 2 };
    let field = startField([armed, other], orders, track);
    for (let i = 0; i < 40000 && field.phase === 'racing'; i += 1) {
      field = stepField(field, config);
    }
    const after = leavePit(field, orders, track);
    expect(after.fixtures).toEqual(after.placed);
    expect(after.fixtures).toHaveLength(1);
  });

  it('is laid by nobody who did not bring a rack', () => {
    const field = startField(
      [other, other],
      [
        { plan: 'carry', routes: [], place: 1 },
        { plan: 'carry', routes: [], place: 2 },
      ],
      KESTREL_LOOP,
    );
    expect(field.fixtures).toHaveLength(0);
  });
});

describe('nothing pushes a ship somewhere it cannot come back from', () => {
  // The corridor holds the position and the swing still costs what it wanted to
  // cost — a weapon must not be a way round that, or being shot once would be
  // the end of a heat rather than the price of a place.
  it('finishes every lap, on every track, however armed the field is', () => {
    const builds: Fitted[][] = [
      [fit('missile-rack', 3), fit('crew-mercenaries', 3, 2)],
      [fit('gravity-mine', 3), fit('crew-mercenaries', 3, 2)],
      [fit('tractor-beam', 3), fit('crew-mercenaries', 3, 2)],
    ];
    for (const track of TRACKS) {
      for (let seed = 0; seed < 6; seed += 1) {
        const field = heat(
          track,
          builds.map((build, i) => entrant(['a', 'b', 'c'][i] as string, build)),
          builds.map(() => ({ plan: 'charge', routes: [] })),
          seed,
        );
        expect(field.phase).toBe('done');
        for (const ship of field.ships) {
          expect(ship.lapTicks).toHaveLength(LAPS_PER_HEAT);
          // Never pinned outside the corridor, and never left crawling.
          expect(Math.abs(ship.state.offset)).toBeLessThanOrEqual(TRACK_HALF_WIDTH + 1e-6);
          expect(ship.state.speed).toBeGreaterThan(SPEED_PER_THRUST * 0.1);
        }
      }
    }
  });
});
