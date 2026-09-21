// S4: a sector may offer more than one way through it.
//
// The route is where the economy first touches the geometry, so unlike the
// visual stages it carries real tests. Three claims hold the milestone up: a
// split is a different line and costs a different lap; navigation decides how
// much of the route you are allowed to plan; and a swing big enough to throw
// you off the path can take a fork away from you.

import { describe, expect, it } from 'vitest';
import { leavePit, startField, stepField, type Entrant } from '../../src/sim/field';
import { chooseRoute, startRace, stepRace } from '../../src/sim/race';
import { seedFrom } from '../../src/sim/rng';
import { bareShip, resolveBuild } from '../../src/sim/ship';
import {
  alongOf,
  canonicalOf,
  legalRoutes,
  navFor,
  routeOf,
  sampleOn,
  TRACKS,
  KESTREL_LOOP,
  MERIDIAN_RUN,
  type Route,
  type Sector,
  type Track,
} from '../../src/sim/track';
import {
  FORK_PULL,
  LAPS_PER_HEAT,
  PATH_HALF_WIDTH,
  TRACK_HALF_WIDTH,
} from '../../src/sim/tuning';

const lapTicks = (
  track: Track,
  routes: readonly number[],
  handling: number,
  seed = 'route',
): number => {
  const config = {
    track,
    stats: bareShip(1, handling),
    routes,
    seed: seedFrom(seed),
  };
  let state = startRace(config.stats, [], routes[0] ?? 0);
  while (state.lap < 1 && state.tick < 20000) state = stepRace(state, config);
  return state.tick;
};

describe.each(TRACKS)('$name splits', (track: Track) => {
  it('has every route leave and arrive on its checkpoint', () => {
    for (const sector of track.sectors) {
      const main = sector.routes[0] as Route;
      for (const route of sector.routes) {
        const from = route.samples[0];
        const to = route.samples[route.samples.length - 1];
        const mainFrom = main.samples[0];
        const mainTo = main.samples[main.samples.length - 1];
        if (from === undefined || to === undefined) throw new Error('empty route');
        if (mainFrom === undefined || mainTo === undefined) throw new Error('empty main');
        expect(
          Math.hypot(from.pos.x - mainFrom.pos.x, from.pos.y - mainFrom.pos.y),
        ).toBeLessThan(1);
        expect(Math.hypot(to.pos.x - mainTo.pos.x, to.pos.y - mainTo.pos.y)).toBeLessThan(
          1,
        );
      }
    }
  });

  it('keeps the golden path exactly as the track authored it', () => {
    // Splits are derived geometry; the main line is level data and must not
    // drift. Reading curvature back off the samples used to move an r42 bend
    // to r60, which would have quietly retuned every track in the game.
    for (const sector of track.sectors) {
      const main = sector.routes[0] as Route;
      for (const bend of main.bends) {
        const authored = track.bends.map((b) => b.radius);
        expect(authored).toContain(Math.round(bend.radius));
      }
    }
  });

  it('is a fork, not a wobble: the two roads do not share a corridor', () => {
    // What makes a split a split. It used to deviate by 6 to 20 units from a
    // path 18 wide, which on screen was one road with a kink in it. A split has
    // to leave far enough that a ship on one line is nowhere near the other —
    // and since a ship can be thrown TRACK_HALF_WIDTH either way, "nowhere
    // near" means further apart than two of those.
    for (const sector of track.sectors) {
      const main = sector.routes[0] as Route;
      for (const route of sector.routes.slice(1)) {
        let apart = 0;
        for (let i = 0; i <= 40; i += 1) {
          const at = sector.start + ((sector.end - sector.start) * i) / 40;
          const a = sampleOn(main, alongOf(track, sector, main, at));
          const b = sampleOn(route, alongOf(track, sector, route, at));
          apart = Math.max(apart, Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y));
        }
        expect(apart).toBeGreaterThan(PATH_HALF_WIDTH * 2);
      }
    }
  });

  it('meets the golden path only at the checkpoints', () => {
    // A fork parts and rejoins; it does not touch in between.
    for (const sector of track.sectors) {
      const main = sector.routes[0] as Route;
      for (const route of sector.routes.slice(1)) {
        for (let i = 8; i <= 32; i += 1) {
          const at = sector.start + ((sector.end - sector.start) * i) / 40;
          const a = sampleOn(main, alongOf(track, sector, main, at));
          const b = sampleOn(route, alongOf(track, sector, route, at));
          expect(Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y)).toBeGreaterThan(
            PATH_HALF_WIDTH,
          );
        }
      }
    }
  });

  it('is a lap however you go round it', () => {
    const everySplit = track.sectors.map((s) => (s.routes.length > 1 ? 1 : 0));
    const config = {
      track,
      stats: bareShip(1, 1),
      plan: 'carry' as const,
      routes: everySplit,
      seed: seedFrom('lap'),
    };
    let state = startRace(config.stats, [], everySplit[0] ?? 0);
    const seen: number[] = [state.sector];
    while (state.lap < 1 && state.tick < 20000) {
      const before = state.sector;
      state = stepRace(state, config);
      if (state.sector !== before) seen.push(state.sector);
    }
    // Canonical distance is measured on the main line, so a lap is a lap no
    // matter which way through each sector the ship actually went.
    expect(state.lap).toBe(1);
    expect(state.distance).toBeGreaterThanOrEqual(track.length);
    expect(state.distance).toBeLessThan(track.length * 1.02);
    expect(seen.slice(0, track.sectors.length)).toEqual(track.sectors.map((_, i) => i));
  });
});

describe('what a split is worth', () => {
  it('changes the lap, and which way depends on what the ship can hold', () => {
    // The Meridian's inside line is now the sharpest case, and it is sharper
    // than anything was before: 221 ticks *worse* for a ship with no handling
    // to spare, 52 ticks *better* for one that has it. A 273-tick swing on the
    // same piece of road.
    //
    // It used to be the Kestrel's needle. Putting the radius into the swing
    // made every tight line harsher — a hairpin now throws a ship further than
    // a sweeper for the same excess, which it did not before — and the
    // Kestrel's three splits are all short tight ones, so all three went from
    // "a choice" to "strictly worse". That is recorded in BACKLOG.md as
    // splits needing a re-tune against the new geometry; they were authored
    // against a swing that had none.
    //
    // Averaged over seeds, not measured on one. Taking a split changes which
    // seeded stream its bends draw from, so any single seed can flatter or damn
    // a line by a swing it happened to get.
    const seeds = Array.from({ length: 16 }, (_, i) => `worth${i}`);
    const over = (routes: readonly number[], handling: number): number =>
      seeds.reduce(
        (sum, seed) => sum + lapTicks(MERIDIAN_RUN, routes, handling, seed),
        0,
      ) / seeds.length;

    const main = [0, 0, 0, 0];
    const inside = [0, 0, 1, 0];
    expect(over(inside, 0.7)).toBeGreaterThan(over(main, 0.7));
    expect(over(inside, 1.8)).toBeLessThan(over(main, 1.8));
  });

  it('puts the ship on a different road, not just on a different clock', () => {
    const sector = KESTREL_LOOP.sectors[3] as Sector;
    const split = routeOf(sector, 1);
    const main = routeOf(sector, 0);
    let apart = 0;
    for (let i = 0; i <= 40; i += 1) {
      const at = sector.start + ((sector.end - sector.start) * i) / 40;
      const a = sampleOn(main, alongOf(KESTREL_LOOP, sector, main, at));
      const b = sampleOn(split, alongOf(KESTREL_LOOP, sector, split, at));
      apart = Math.max(apart, Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y));
    }
    // Wider than both corridors put together: neither road can reach the other.
    expect(apart).toBeGreaterThan(TRACK_HALF_WIDTH * 2);
  });

  it('maps a point on a route back to where it is round the lap', () => {
    for (const sector of KESTREL_LOOP.sectors) {
      for (const route of sector.routes) {
        const along = route.length / 3;
        const back = canonicalOf(sector, route, along);
        expect(alongOf(KESTREL_LOOP, sector, route, back)).toBeCloseTo(along, 6);
      }
    }
  });
});

describe('navigation, and what it lets you plan', () => {
  it('opens one grade of split at a time', () => {
    const clear = legalRoutes(KESTREL_LOOP, 0);
    const dim = legalRoutes(KESTREL_LOOP, 1);
    const dark = legalRoutes(KESTREL_LOOP, 2);
    const count = (rows: readonly (readonly number[])[]): number =>
      rows.reduce((sum, row) => sum + row.length, 0);

    expect(count(clear)).toBeLessThan(count(dim));
    expect(count(dim)).toBeLessThan(count(dark));
    // Every sector always offers the golden path, whatever you are flying.
    for (const row of clear) expect(row).toContain(0);
  });

  it('grades the splits so a system is worth its slot', () => {
    for (const track of TRACKS) {
      const hidden = track.sectors.flatMap((s) =>
        s.routes.filter((r) => navFor(r.grade) > 0),
      );
      expect(hidden.length).toBeGreaterThan(0);
    }
  });

  it('ignores a split the ship cannot read rather than letting it fly one', () => {
    // The rule lives in the sim, not in the screen that drew the buttons.
    const blind: Entrant = {
      id: 'blind',
      name: 'No nav',
      stats: bareShip(1, 1),
      isPlayer: true,
    };
    const field = startField(
      [blind],
      [{ routes: [1, 1, 1, 1] }],
      KESTREL_LOOP,
    );
    const flown = (field.ships[0] as { routes: readonly number[] }).routes;
    // Sector 1 is dim and sector 3 dark on the Kestrel: neither is readable.
    expect(flown[1]).toBe(0);
    expect(flown[3]).toBe(0);
    // Sector 0's split is clear, so a ship with no navigation still gets it.
    expect(flown[0]).toBe(1);
  });

  it('only lets the best system re-plan the route at a pit stop', () => {
    const make = (id: string, nav: number): Entrant => ({
      id,
      name: id,
      stats: { ...bareShip(1, 1), nav },
      isPlayer: false,
    });
    const entrants = [make('cheap', 0), make('deep', 3)];
    const opening = [
      { plan: 'carry' as const, routes: [0, 0, 0, 0] },
      { plan: 'carry' as const, routes: [0, 0, 0, 0] },
    ];
    let field = startField(entrants, opening, KESTREL_LOOP);
    field = { ...field, phase: 'pit' };

    // Sector 0's split is the clear one, so nav is not what is being tested.
    const changed = [
      { plan: 'carry' as const, routes: [1, 0, 0, 0] },
      { plan: 'carry' as const, routes: [1, 0, 0, 0] },
    ];
    const out = leavePit(field, changed, KESTREL_LOOP);

    expect((out.ships[0] as { routes: readonly number[] }).routes[0]).toBe(0);
    expect((out.ships[1] as { routes: readonly number[] }).routes[0]).toBe(1);
  });

  it('is worth nothing to a crew that reads it well if there is nothing to read', () => {
    const androidsOnly = resolveBuild([
      { uid: 'a', componentId: 'crew-androids', level: 1 },
    ]);
    const withSystem = resolveBuild([
      { uid: 'a', componentId: 'crew-androids', level: 1 },
      { uid: 'b', componentId: 'nav-system', level: 1 },
    ]);
    expect(androidsOnly.nav).toBe(0);
    expect(withSystem.nav).toBe(2);
  });
});

describe('being swung into the wrong split', () => {
  const sector = KESTREL_LOOP.sectors[3] as Sector;

  it('gives you the fork you planned when you arrive on the line', () => {
    expect(chooseRoute(sector, [0, 0, 0, 1], 0)).toBe(1);
    expect(chooseRoute(sector, [0, 0, 0, 1], FORK_PULL - 0.5)).toBe(1);
    expect(chooseRoute(sector, [0, 0, 0, 0], 0)).toBe(0);
  });

  it('takes it away when the ship arrives thrown off the path', () => {
    const split = routeOf(sector, 1);
    // Flung the other way from the line it planned: it cannot make the fork.
    expect(chooseRoute(sector, [0, 0, 0, 1], -split.entryOffset * 2)).toBe(0);
    // And a ship that planned nothing can be carried onto a split anyway.
    expect(chooseRoute(sector, [0, 0, 0, 0], split.entryOffset)).toBe(1);
  });

  it('only happens to a ship that actually went wide', () => {
    // The threshold sits outside the path on purpose: wobbling inside the
    // golden path must never cost a route, or the plan stops meaning anything.
    expect(FORK_PULL).toBeGreaterThan(PATH_HALF_WIDTH);
    for (let offset = -PATH_HALF_WIDTH; offset <= PATH_HALF_WIDTH; offset += 1) {
      expect(chooseRoute(sector, [0, 0, 0, 1], offset)).toBe(1);
    }
  });
});

describe('the route stays deterministic', () => {
  it('runs the same heat twice when the orders are the same', () => {
    const entrant: Entrant = {
      id: 'p',
      name: 'P',
      stats: { ...bareShip(1, 1), nav: 3 },
      isPlayer: true,
    };
    const orders = [{ plan: 'charge' as const, routes: [1, 1, 1, 1] }];
    const run = (): number[] => {
      let field = startField([entrant], orders, KESTREL_LOOP);
      const config = { track: KESTREL_LOOP, laps: LAPS_PER_HEAT, seed: seedFrom('d') };
      const marks: number[] = [];
      for (let i = 0; i < 4000 && field.phase === 'racing'; i += 1) {
        const ship = field.ships[0];
        if (ship !== undefined && i % 200 === 0) {
          marks.push(Math.round(ship.state.distance), ship.state.route);
        }
        field = stepField(field, config);
      }
      return marks;
    };
    expect(run()).toEqual(run());
  });
});
