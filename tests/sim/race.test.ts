// S1 carries determinism tests and little else: the questions it answers are
// about feel, and feel is judged by eye. These are the properties that have to
// hold anyway, because everything later is built on them.

import { describe, expect, it } from 'vitest';
import { seedFrom } from '../../src/sim/rng';
import { bareShip, integrity, resolveBuild } from '../../src/sim/ship';
import { simulate, startRace, stepRace, type RaceConfig } from '../../src/sim/race';
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

  it('can be lapped, and the corner plan changes the lap', () => {
    // Which plan is quickest is the track's business, not this test's: since
    // damage degrades the ship for the rest of the race, Lift is the fastest
    // way round a track tight enough to keep throwing you off the path.
    const lap = (plan: 'lift' | 'carry' | 'charge'): number =>
      simulate(base({ track, plan }), 9000).lastLapTicks ?? Infinity;
    const laps = [lap('lift'), lap('carry'), lap('charge')];
    expect(Math.max(...laps)).toBeLessThan(Infinity);
    expect(new Set(laps).size).toBeGreaterThan(1);
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
    const fast = { stats: bareShip(1.4, 0.7), plan: 'charge' } as const;
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
    const steady = simulate(base({ stats: bareShip(0.6, 1.3) }), 2500);
    const reckless = simulate(base({ stats: bareShip(1.6, 0.6) }), 2500);
    const worst = (s: typeof steady): number =>
      Math.max(0, ...s.swings.map((e) => e.swing));
    expect(worst(reckless)).toBeGreaterThan(worst(steady));
  });

  it('gives a bigger bend a higher holding speed', () => {
    expect(holdingSpeed(70, 1)).toBeGreaterThan(holdingSpeed(42, 1));
  });
});

describe('hazards, shields and the crew', () => {
  const shipWith = (over: Partial<ReturnType<typeof bareShip>>): RaceConfig['stats'] => ({
    ...bareShip(1.3, 0.62),
    ...over,
  });

  it('hurts a ship that is thrown off the path, and not one that stays on it', () => {
    // Damage only has components to break, so this needs a ship with some.
    const build = [
      { componentId: 'speed-engine', level: 1 },
      { componentId: 'speed-engine', level: 1 },
    ];
    const raced = (plan: 'lift' | 'charge'): number =>
      integrity(
        simulate(base({ stats: resolveBuild(build), build, plan }), 3000).condition,
      );
    expect(raced('charge')).toBeLessThan(1);
    expect(raced('lift')).toBe(1);
  });

  it('bills an excursion once, not once per tick spent outside', () => {
    // The ship crosses the edge a handful of times a lap. If damage were
    // charged by the tick, a low-handling build would be dead long before this.
    const state = simulate(base({ stats: shipWith({}), plan: 'charge' }), 3000);
    expect(integrity(state.condition)).toBeGreaterThan(0.2);
  });

  it('spends shields before the ship itself, over the same ground', () => {
    // Compared over one lap, not a fixed number of ticks: a shielded ship
    // stays quicker, so by any tick count it has met more bends than the bare
    // one and the comparison flips for the wrong reason.
    const overALap = (extra: readonly { componentId: string; level: number }[]): number => {
      const build = [
        { componentId: 'speed-engine', level: 1 },
        { componentId: 'speed-engine', level: 1 },
        ...extra,
      ];
      const config = base({ stats: resolveBuild(build), build, plan: 'charge' });
      let state = startRace(config.stats, build);
      while (state.lap < 1 && state.tick < 20000) state = stepRace(state, config);
      return integrity(state.condition);
    };
    expect(overALap([{ componentId: 'general-shields', level: 3 }])).toBeGreaterThan(
      overALap([{ componentId: 'crew-androids', level: 1 }]),
    );
  });

  it('wears a crew on a track of tight bends, and a better crew resists it', () => {
    const weak = simulate(
      { track: CINDER_COIL, stats: shipWith({ endurance: 0.35 }), plan: 'carry', seed: seedFrom('c') },
      3000,
    );
    const strong = simulate(
      { track: CINDER_COIL, stats: shipWith({ endurance: 0.95 }), plan: 'carry', seed: seedFrom('c') },
      3000,
    );
    expect(weak.worn).toBeGreaterThan(strong.worn);
    expect(weak.distance).toBeLessThan(strong.distance);
  });

  it('leaves an open track easy on the crew', () => {
    const state = simulate(
      { track: MERIDIAN_RUN, stats: shipWith({ endurance: 0.35 }), plan: 'carry', seed: seedFrom('m') },
      3000,
    );
    expect(state.worn).toBeLessThan(0.2);
  });
});

describe('damage that breaks things', () => {
  const kit = ['speed-engine', 'speed-engine', 'general-shields'].map((id) => ({
    componentId: id,
    level: 1,
  }));

  const heatOf = (build: typeof kit, plan: 'lift' | 'charge', ticks = 4000) =>
    simulate(
      {
        track: CINDER_COIL,
        stats: resolveBuild(build),
        build,
        plan,
        seed: seedFrom('damage'),
      },
      ticks,
    );

  it('breaks parts rather than draining one pool', () => {
    const state = heatOf(kit, 'charge');
    expect(state.condition.parts).toHaveLength(kit.length);
    const hurt = state.condition.parts.filter((c) => c < 1);
    expect(hurt.length).toBeGreaterThan(0);
    expect(state.lastBroken).toBeDefined();
  });

  it('makes a damaged ship worth less for the rest of the race', () => {
    const state = heatOf(kit, 'charge');
    const whole = resolveBuild(kit);
    expect(state.stats.thrust).toBeLessThan(whole.thrust);
  });

  it('leaves an undamaged ship at full worth', () => {
    const state = heatOf(kit, 'lift');
    expect(integrity(state.condition)).toBe(1);
    expect(state.stats.thrust).toBe(resolveBuild(kit).thrust);
  });

  it('repairs faster with a crew that is good at it', () => {
    const withNanites = [...kit.slice(0, 2), { componentId: 'crew-nanites', level: 1 }];
    const withAndroids = [...kit.slice(0, 2), { componentId: 'crew-androids', level: 1 }];
    expect(integrity(heatOf(withNanites, 'charge').condition)).toBeGreaterThan(
      integrity(heatOf(withAndroids, 'charge').condition),
    );
  });

  it('spreads a bigger hit across more of the ship', () => {
    // Every part of a four-part ship should be able to take a hit, given a
    // race long enough to be thrown off the path a few times.
    const four = [...kit, { componentId: 'crew-androids', level: 1 }];
    const state = heatOf(four, 'charge', 9000);
    expect(state.condition.parts.filter((c) => c < 1).length).toBeGreaterThan(1);
  });
});
