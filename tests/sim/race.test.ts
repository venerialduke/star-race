// S1 carries determinism tests and little else: the questions it answers are
// about feel, and feel is judged by eye. These are the properties that have to
// hold anyway, because everything later is built on them.

import { describe, expect, it } from 'vitest';
import { seedFrom } from '../../src/sim/rng';
import { bareShip, integrity, resolveBuild, type Fitted } from '../../src/sim/ship';
import { simulate, startRace, stepRace, type RaceConfig } from '../../src/sim/race';
import { PATH_HALF_WIDTH } from '../../src/sim/tuning';
import {
  CINDER_COIL,
  KESTREL_LOOP,
  MERIDIAN_RUN,
  TRACKS,
  holdingSpeed,
  type Track,
} from '../../src/sim/track';

const base = (overrides: Partial<RaceConfig> = {}): RaceConfig => ({
  track: KESTREL_LOOP,
  stats: bareShip(1, 1),
  seed: seedFrom('kestrel'),
  ...overrides,
});

/**
 * The same ship, navigating better or worse.
 *
 * Nobody picks a line any more and nothing can be forced off one by fiat: a
 * ship works out its own entry speed and its navigation system decides how
 * near it gets. So a test that used to ask "what if it drove badly" asks for a
 * ship with no navigation instead, which is the only way to fly badly there is.
 */
const navving = (nav: number, thrust = 1, handling = 1) => ({
  ...bareShip(thrust, handling),
  nav,
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

  it('can be lapped, and how well it is navigated changes the lap', () => {
    const lap = (nav: number): number =>
      simulate(base({ track, stats: navving(nav) }), 20000).lastLapTicks ?? Infinity;
    const laps = [lap(0), lap(1), lap(3)];
    expect(Math.max(...laps)).toBeLessThan(Infinity);
    expect(new Set(laps).size).toBe(3);
    // A maxed navigation system is quicker than none, on every track. Steps in
    // between are not a single-seed property — a bad lap at rating 1 can beat
    // a lucky one at 0 — so only the ends are claimed here.
    expect(laps[2]!).toBeLessThan(laps[0]!);
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
    const fast = { stats: bareShip(1.4, 0.7) } as const;
    const a = simulate(base({ ...fast, seed: seedFrom('kestrel') }), 2000);
    const b = simulate(base({ ...fast, seed: seedFrom('other') }), 2000);
    expect(a.distance).not.toBe(b.distance);
  });

  it('holds the path through every bend when it knows where the path is', () => {
    // A mark now records how far off the line a bend actually threw the ship,
    // not how far a draw wanted to. So the claim is about flying rather than
    // about arithmetic: a ship that reads the road holds it, and one that does
    // not is several times further off it — same track, same engine.
    //
    // It used to be able to claim the blind ship was off the *path*. It is not
    // any more: most of a bad navigation system's misjudgement is spent on the
    // pace rather than on the line, so an unguided ship is slow and untidy
    // rather than wild. Leaving the path is what the bend below does to a ship
    // with speed and no grip, which is where the claim belongs.
    const worstOf = (nav: number): number => {
      const state = simulate(base({ stats: navving(nav), track: CINDER_COIL }), 4000);
      return Math.max(0, ...state.swings.map((e) => e.swing));
    };
    expect(worstOf(3)).toBeLessThan(PATH_HALF_WIDTH);
    expect(worstOf(0)).toBeGreaterThan(worstOf(3) * 5);
  });

  it('runs wider the more engine it carries and the less grip', () => {
    const steady = simulate(base({ stats: bareShip(0.6, 1.3) }), 2500);
    const reckless = simulate(base({ stats: bareShip(1.6, 0.6) }), 2500);
    const worst = (s: typeof steady): number =>
      Math.max(0, ...s.swings.map((e) => e.swing));
    expect(worst(reckless)).toBeGreaterThan(worst(steady));
  });

  it('throws a ship that carries speed into a bend it cannot hold', () => {
    // The bet the whole game rests on, and the claim that says a ship still
    // leaves the golden path at all. It is speed against grip that does it —
    // not a dice roll, and not a navigation system: both ships here are flying
    // blind, and only the loose one is thrown.
    //
    // Over twenty laps rather than one, because leaving the path is a thing
    // that happens on some laps and not others: measured at 12 in 20 for the
    // loose ship and 0 in 20 for the grippy one.
    const seeds = Array.from({ length: 20 }, (_, i) => `wide${i}`);
    const pastThePath = (thrust: number, handling: number): number =>
      seeds.filter((seed) => {
        const state = simulate(
          base({ track: CINDER_COIL, stats: bareShip(thrust, handling), seed: seedFrom(seed) }),
          6000,
        );
        return Math.max(0, ...state.swings.map((e) => e.swing)) > PATH_HALF_WIDTH;
      }).length;
    expect(pastThePath(1.6, 0.5)).toBeGreaterThan(seeds.length / 2);
    expect(pastThePath(0.8, 1.8)).toBe(0);
  });

  it('gives a bigger bend a higher holding speed', () => {
    expect(holdingSpeed(70, 1)).toBeGreaterThan(holdingSpeed(42, 1));
  });
});

/**
 * The worst the ship was during the race, rather than what it came home on.
 *
 * Every part mends on the base rate even with no crew aboard, and an excursion
 * is mild enough now that a long race hides the hits by repairing them: read
 * at the flag, a ship that was damaged twice is back at 1 and the claim cannot
 * be seen at all.
 */
const worstWorth = (config: RaceConfig, build: readonly Fitted[], ticks: number): number => {
  let state = startRace(config.stats, build);
  let worst = 1;
  for (let i = 0; i < ticks; i += 1) {
    state = stepRace(state, config);
    worst = Math.min(worst, integrity(state.condition));
  }
  return worst;
};

describe('hazards, shields and the crew', () => {
  const shipWith = (over: Partial<ReturnType<typeof bareShip>>): RaceConfig['stats'] => ({
    ...bareShip(1.3, 0.62),
    ...over,
  });

  it('hurts a ship that is thrown off the path, and not one that stays on it', () => {
    // Damage only has components to break, so this needs a ship with some.
    // `stepRace` re-derives a built ship's stats from its build, so a test
    // about navigation has to *fit* one rather than assert one: passing
    // `stats` alongside a `build` changes nothing at all.
    //
    // Level three, and that is the whole of what makes this ship one that gets
    // thrown: enough engine to arrive at a bend fast and not enough grip to
    // hold it. A pair of level ones is simply too slow to be thrown any more —
    // being off the line is no longer something a bad navigation system does
    // to a ship by itself, it is what speed does to a ship without the grip
    // for it.
    const blind = [
      { uid: 'a', componentId: 'speed-engine', level: 3 },
      { uid: 'b', componentId: 'speed-engine', level: 3 },
    ];
    const guided = [...blind, { uid: 'n', componentId: 'nav-system', level: 3 }];
    // Over many seeds rather than one. A single seed was enough while the draws
    // never moved; then a checkpoint moved, the one seed this stood on happened
    // to stop going wide, and the test failed without the claim being any less
    // true. Measured at 11 laps in 20 blind and 0 in 20 guided, so twenty seeds
    // and a quarter is a floor this clears comfortably and a genuine
    // regression would not.
    const seeds = Array.from({ length: 20 }, (_, i) => `s${i}`);
    const raced = (build: typeof blind): readonly number[] =>
      seeds.map((seed) =>
        worstWorth(base({ stats: resolveBuild(build), build, seed: seedFrom(seed) }), build, 3000),
      );
    // Navigating badly is not guaranteed to go wide on any given lap; it is
    // guaranteed to be the ship that does.
    expect(raced(blind).filter((worth) => worth < 1).length).toBeGreaterThan(
      seeds.length / 4,
    );
    expect(raced(guided).every((worth) => worth === 1)).toBe(true);
  });

  it('bills an excursion once, not once per tick spent outside', () => {
    // The ship crosses the edge a handful of times a lap. If damage were
    // charged by the tick, a low-handling build would be dead long before this.
    const state = simulate(base({ stats: shipWith({}) }), 3000);
    expect(integrity(state.condition)).toBeGreaterThan(0.2);
  });

  it('spends shields before the ship itself, over the same ground', () => {
    // Same flying, same excursions, same number of parts to break; the one
    // with something to absorb them is the one that comes home whole. The
    // other arm carries an inert part rather than a crew, so what is measured
    // is absorbing damage and not repairing it.
    //
    // Over several laps rather than one: an excursion is mild enough now that
    // a single lap damages neither ship and the comparison proves nothing. And
    // measured at its worst rather than at the flag, because both ships mend
    // what got through long before sixteen thousand ticks are up.
    const worthAfter = (extra: {
      uid: string;
      componentId: string;
      level: number;
    }): number => {
      const build = [
        { uid: 'a', componentId: 'speed-engine', level: 3 },
        { uid: 'b', componentId: 'speed-engine', level: 3 },
        extra,
      ];
      // A track that actually throws the ship: on a circuit it can hold,
      // neither ship is damaged and the comparison proves nothing.
      const config = base({ track: CINDER_COIL, stats: resolveBuild(build), build });
      return worstWorth(config, build, 16000);
    };
    expect(
      worthAfter({ uid: 'c', componentId: 'general-shields', level: 3 }),
    ).toBeGreaterThan(worthAfter({ uid: 'c', componentId: 'missile-rack', level: 1 }));
  });

  it('wears a crew on a track of tight bends, and a better crew resists it', () => {
    const weak = simulate(
      {
        track: CINDER_COIL,
        stats: shipWith({ endurance: 0.35 }),
        seed: seedFrom('c'),
      },
      3000,
    );
    const strong = simulate(
      {
        track: CINDER_COIL,
        stats: shipWith({ endurance: 0.95 }),
        seed: seedFrom('c'),
      },
      3000,
    );
    expect(weak.worn).toBeGreaterThan(strong.worn);
    expect(weak.distance).toBeLessThan(strong.distance);
  });

  it('leaves an open track easy on the crew', () => {
    const state = simulate(
      {
        track: MERIDIAN_RUN,
        stats: shipWith({ endurance: 0.35 }),
        seed: seedFrom('m'),
      },
      3000,
    );
    expect(state.worn).toBeLessThan(0.2);
  });
});

describe('damage that breaks things', () => {
  /**
   * Two engines and nothing to absorb anything, on the tightest track there is.
   *
   * Damage used to be generated by picking Charge, and then by forcing a
   * hopeless entry speed. A ship flies its own line now, so being thrown into
   * things is what *bad navigation* does — and `bareShip` carries `BASE_NAV`,
   * which is none at all, so a kit with no navigation system is flying blind.
   *
   * No shields, deliberately. An excursion is milder than it was: a ship is
   * held near the line by the bumpers and gets back without flailing, so a
   * shield pool of 22 soaks every excursion of a nineteen-bend race and
   * regenerates between them. That is a real consequence of the new flight
   * model, recorded in BACKLOG.md rather than tuned away here.
   *
   * Level three engines, because a pair of level ones is no longer fast enough
   * to be thrown at all. Most of a bad navigation system's misjudgement is
   * spent on the pace now rather than on the line, so an unguided ship is slow
   * and untidy rather than wild — what puts a ship off the path is arriving at
   * a bend with more speed than its grip can hold, and that takes an engine.
   */
  const kit = ['speed-engine', 'speed-engine'].map((id, i) => ({
    uid: `k${i}`,
    componentId: id,
    level: 3,
  }));

  /** The same kit that can see where it is going. */
  const guided = [...kit, { uid: 'nav', componentId: 'nav-system', level: 3 }];

  const configOf = (build: typeof kit): RaceConfig => ({
    // The Kestrel rather than the Coil, which used to be the obvious choice as
    // the tightest track there is. Under flight a tight track is a *slow* one:
    // every bend has a low holding speed, so the ship is never carrying enough
    // into one to be thrown hard, and what damage costs scales with how hard
    // it was thrown and how fast it was going. The track that hurts a loose
    // ship is the quick one.
    track: KESTREL_LOOP,
    stats: resolveBuild(build),
    build,
    seed: seedFrom('damage'),
  });

  const heatOf = (build: typeof kit, ticks = 4000) => simulate(configOf(build), ticks);

  /**
   * The race as it was flown, tick by tick, rather than the state it ended in.
   *
   * Parts mend on the base rate even with nobody aboard to mend them, so a
   * race long enough to be thrown a few times is also long enough to hide it:
   * read at the flag, a ship that lost an engine twice is back at full worth.
   */
  const during = (build: typeof kit, ticks: number) => {
    const config = configOf(build);
    let state = startRace(config.stats, build);
    const everHit = new Set<number>();
    let worst = 1;
    let leastThrust = Infinity;
    let broken: string | undefined;
    for (let i = 0; i < ticks; i += 1) {
      state = stepRace(state, config);
      state.condition.parts.forEach((part, at) => {
        if (part < 1) everHit.add(at);
      });
      worst = Math.min(worst, integrity(state.condition));
      leastThrust = Math.min(leastThrust, state.stats.thrust);
      broken = state.lastBroken ?? broken;
    }
    return { everHit, worst, leastThrust, broken, parts: state.condition.parts.length };
  };

  it('breaks parts rather than draining one pool', () => {
    const race = during(kit, 4000);
    expect(race.parts).toBe(kit.length);
    expect(race.everHit.size).toBeGreaterThan(0);
    expect(race.broken).toBeDefined();
  });

  it('makes a damaged ship worth less for the rest of the race', () => {
    // One engine rather than the pair, because two level threes are over the
    // stat cap: the first slice of damage comes out of headroom and the ship
    // is worth exactly what it was worth before. That is a real property of
    // the cap and not a bug, but it hides the claim being made here.
    const one = [{ uid: 'k0', componentId: 'speed-engine', level: 3 }];
    expect(during(one, 4000).leastThrust).toBeLessThan(resolveBuild(one).thrust);
  });

  it('leaves an undamaged ship at full worth', () => {
    const state = heatOf(guided);
    expect(integrity(state.condition)).toBe(1);
    expect(state.stats.thrust).toBe(resolveBuild(kit).thrust);
  });

  it('repairs faster with a crew that is good at it', () => {
    // Measured as time spent damaged, not as what the ship ends on. Both crews
    // take the same hits and both eventually mend them, so the end state is 1
    // for everybody and says nothing at all; what a better crew buys is being
    // whole again sooner, and that only shows while the race is running.
    const hurtTicks = (crew: string): number => {
      const build = [...kit, { uid: 'c', componentId: crew, level: 1 }];
      const config = configOf(build);
      let state = startRace(config.stats, build);
      let ticks = 0;
      for (let i = 0; i < 12000; i += 1) {
        state = stepRace(state, config);
        if (integrity(state.condition) < 1) ticks += 1;
      }
      return ticks;
    };
    expect(hurtTicks('crew-nanites')).toBeLessThan(hurtTicks('crew-androids'));
  });

  it('spreads a bigger hit across more of the ship', () => {
    // Every part of a four-part ship should be able to take a hit, given a race
    // long enough to be thrown off the path a few times.
    //
    // Flown with nothing that absorbs, repairs or navigates. With any of them
    // the claim cannot be tested at all: a shield pool soaks an excursion, a
    // crew patches what gets through before the next one arrives, and a
    // navigation system stops the ship leaving the path in the first place.
    //
    // Read at nine thousand ticks rather than later: parts repair on the base
    // rate even with no crew aboard, so a long enough race hides how many of
    // them were hit by mending them.
    const exposed = ['speed-engine', 'speed-engine', 'missile-rack', 'missile-rack'].map(
      (componentId, i) => ({ uid: `x${i}`, componentId, level: i < 2 ? 3 : 1 }),
    );
    expect(during(exposed, 9000).everHit.size).toBeGreaterThan(1);
  });
});
