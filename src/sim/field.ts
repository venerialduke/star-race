// A heat: three ships flying the same loop, stepped in lockstep, never
// touching. Each carries its own race state and its own seeded draws, so one
// ship's *luck* can never shift another's.
//
// Since S6 a ship's **choices** can. A weapon pushes a rival off their line, a
// mine waits on the road for whoever is behind, a boost leaves a black hole.
// The rule that keeps this deterministic is that nothing lands on the tick it
// was fired: every ship reads a world built from the state before the tick, and
// what it sends out is resolved into impulses that arrive on the tick after. So
// the order the ships sit in this array cannot change the race.
//
// Every ship finishes. Damage costs a ship its pace, never its race.
//
// The clock never resets. A lap ends when every ship has finished it; the pit
// stop then restarts them level, and total time is the sum of their laps —
// which is why being ahead on the track is not the same as leading.

import {
  presenceOf,
  startRace,
  stepRace,
  type CornerPlan,
  type RaceState,
  type ShipStats,
} from './race';
import { makeRng } from './rng';
import type { Fitted } from './ship';
import { legalRoutes, type Track } from './track';
import { MINE_POWER, NAV_FOR_REPLAN } from './tuning';
import {
  ageFixtures,
  resolveEmissions,
  type Emission,
  type Fixture,
  type World,
} from './world';

export interface Entrant {
  readonly id: string;
  readonly name: string;
  readonly stats: ShipStats;
  /** What it fitted to get those stats. Visible, so a rival can be read. */
  readonly build?: readonly Fitted[];
  readonly isPlayer: boolean;
}

/**
 * What a ship was told to do before a lap: how to take its bends, and which
 * way to go at every fork. Both are fixed before the lap that consumes them.
 */
export interface Orders {
  readonly plan: CornerPlan;
  /** One route index per sector. Anything the ship's nav cannot read is ignored. */
  readonly routes: readonly number[];
  /**
   * Which sector to lay a mine in before the heat starts, if the ship has any.
   * Decided in the garage like everything else, and shown to the whole heat —
   * a placed fixture is the one piece of interaction nobody is surprised by.
   */
  readonly place?: number | undefined;
}

/**
 * Orders may be given as a bare corner plan, which means the golden path at
 * every fork — the route a ship with no navigation and no opinion would fly.
 */
export type Command = Orders | CornerPlan;

const asOrders = (command: Command | undefined): Orders =>
  command === undefined
    ? { plan: 'carry', routes: [] }
    : typeof command === 'string'
      ? { plan: command, routes: [] }
      : command;

export interface ShipProgress {
  readonly entrant: Entrant;
  /** The plan this ship is flying this lap. Chosen before the lap, never during. */
  readonly plan: CornerPlan;
  /** The route it planned for this lap, already cut down to what its nav can read. */
  readonly routes: readonly number[];
  readonly state: RaceState;
  /** Ticks taken by each lap already completed. */
  readonly lapTicks: readonly number[];
  /** The sum of those, which is what decides the heat. */
  readonly totalTicks: number;
  /** Finished this lap and waiting at the line for the rest of the field. */
  readonly waiting: boolean;
}

export type FieldPhase = 'racing' | 'pit' | 'done';

export interface FieldState {
  /** Ticks into the lap being run. Lap times are measured from this. */
  readonly tick: number;
  /** The lap being run, counting from 0. */
  readonly lap: number;
  readonly phase: FieldPhase;
  readonly ships: readonly ShipProgress[];
  /** What is lying on the track right now. */
  readonly fixtures: readonly Fixture[];
  /** Fired last tick, landing this one. Nothing ever lands on its own tick. */
  readonly emissions: readonly Emission[];
  /** The mines laid before the heat, restored at every pit stop. */
  readonly placed: readonly Fixture[];
}

export interface FieldConfig {
  readonly track: Track;
  readonly laps: number;
  readonly seed: number;
}

/** Each ship draws from its own stream, keyed by who it is and which lap it is. */
function seedFor(seed: number, entrantIndex: number, lap: number): number {
  return (
    makeRng(seed)
      .fork(entrantIndex * 7919 + lap * 131)
      .unitInterval() * 0xffffffff
  );
}

export function startField(
  entrants: readonly Entrant[],
  commands: readonly Command[],
  track?: Track,
): FieldState {
  const ships = entrants.map((entrant, i) => {
    const routes = readable(track, entrant, asOrders(commands[i]).routes);
    return {
      entrant,
      plan: asOrders(commands[i]).plan,
      routes,
      state: startRace(entrant.stats, entrant.build ?? [], routes[0] ?? 0),
      lapTicks: [],
      totalTicks: 0,
      waiting: false,
    };
  });
  const placed = placedFixtures(entrants, commands, ships, track);
  return {
    tick: 0,
    lap: 0,
    phase: 'racing',
    ships,
    fixtures: placed,
    emissions: [],
    placed,
  };
}

/**
 * The mines laid before the heat. Everyone in the heat can see these — they are
 * on the board before the start, which is what separates them from the ones
 * dropped mid-race, which nobody knows about until they bite.
 *
 * A ship can only lay one if it brought a mine rack, and it lays it on the line
 * it planned to fly, which is what makes placing one a route decision too.
 */
function placedFixtures(
  entrants: readonly Entrant[],
  commands: readonly Command[],
  ships: readonly ShipProgress[],
  track: Track | undefined,
): readonly Fixture[] {
  if (track === undefined) return [];
  const laid: Fixture[] = [];
  entrants.forEach((entrant, i) => {
    const where = asOrders(commands[i]).place;
    if (where === undefined) return;
    const sector = track.sectors[where];
    if (sector === undefined) return;
    const level = mineLevel(entrant);
    if (level === 0) return;
    const index = ships[i]?.routes[where] ?? 0;
    laid.push({
      id: `${entrant.id}:placed:${where}`,
      kind: 'mine',
      owner: entrant.id,
      // Half way down the line, so it is met at speed rather than at a
      // checkpoint where everybody is bunched anyway.
      distance: (sector.start + sector.end) / 2,
      sector: where,
      route: index,
      offset: 0,
      power: MINE_POWER[level - 1] ?? 0,
      // A placed mine is there for the whole heat, not for a while.
      life: Number.MAX_SAFE_INTEGER,
    });
  });
  return laid;
}

/** How deep a mine rack this ship brought, or 0 for none. */
export function mineLevel(entrant: Entrant): number {
  let best = 0;
  for (const item of entrant.build ?? []) {
    if (item.componentId === 'gravity-mine') best = Math.max(best, item.level);
  }
  return best;
}

/**
 * A route plan cut down to what this ship's navigation can actually read. A
 * split above its grade is not a choice it gets to make, so it takes the
 * golden path there — the sim decides this, not the screen that drew it.
 */
function readable(
  track: Track | undefined,
  entrant: Entrant,
  routes: readonly number[] | undefined,
): readonly number[] {
  if (track === undefined || routes === undefined) return [];
  const allowed = legalRoutes(track, entrant.stats.nav);
  return track.sectors.map((sector) => {
    const want = routes[sector.index] ?? 0;
    return (allowed[sector.index] ?? []).includes(want) ? want : 0;
  });
}

/**
 * One tick of the heat. Every ship that is still on this lap advances; a ship
 * that crosses the line stops and waits. When the last one is in, the heat
 * moves to the pit stop, or to the finish if that was the final lap.
 */
export function stepField(state: FieldState, config: FieldConfig): FieldState {
  if (state.phase !== 'racing') return state;
  const tick = state.tick + 1;

  // What was fired last tick lands now, and what was dropped last tick is on
  // the road now. Both are resolved before a single ship moves, so every ship
  // this tick reads the same world and none of them can read another's move.
  const { incoming, dropped } = resolveEmissions(state.emissions);
  const fixtures = [...ageFixtures(state.fixtures), ...dropped];
  const world: World = {
    // A ship waiting at the line is out of the race and out of the world:
    // there is nothing to be gained by shooting it.
    ships: state.ships
      .filter((ship) => !ship.waiting)
      .map((ship) => presenceOf(ship.state, ship.entrant.id)),
    fixtures,
  };

  const ships = state.ships.map((ship, i) => {
    if (ship.waiting) return ship;
    const next = stepRace(ship.state, {
      track: config.track,
      stats: ship.entrant.stats,
      build: ship.entrant.build,
      plan: ship.plan,
      routes: ship.routes,
      seed: seedFor(config.seed, i, state.lap),
      id: ship.entrant.id,
      world,
      incoming: incoming.get(ship.entrant.id) ?? [],
    });
    if (next.distance < config.track.length) return { ...ship, state: next };
    return {
      ...ship,
      state: next,
      lapTicks: [...ship.lapTicks, tick],
      totalTicks: ship.totalTicks + tick,
      waiting: true,
    };
  });

  const allIn = ships.every((s) => s.waiting);
  const lastLap = state.lap + 1 >= config.laps;
  return {
    tick,
    lap: state.lap,
    phase: allIn ? (lastLap ? 'done' : 'pit') : 'racing',
    ships,
    fixtures,
    // Collected, not applied: these land on the next tick.
    emissions: ships.flatMap((s) => (s.waiting ? [] : s.state.emitted)),
    placed: state.placed,
  };
}

/**
 * Leave the pit stop. Everyone restarts level, on a fresh lap, carrying their
 * total time and nothing else — the line resets, the clock does not.
 */
export function leavePit(
  state: FieldState,
  commands: readonly Command[],
  track?: Track,
): FieldState {
  return {
    tick: 0,
    lap: state.lap + 1,
    phase: 'racing',
    ships: state.ships.map((ship, i) => {
      // Re-planning the route at a pit stop is what the best navigation buys.
      // Without it the route you set before the heat is the route you fly.
      const routes =
        ship.entrant.stats.nav >= NAV_FOR_REPLAN
          ? readable(track, ship.entrant, asOrders(commands[i]).routes)
          : ship.routes;
      return {
        ...ship,
        plan: commands[i] === undefined ? ship.plan : asOrders(commands[i]).plan,
        routes,
        // Shields come back at the pit stop. Damage does not: the crew goes on
        // patching it as the ship flies, and the rest waits for the garage.
        state: {
          ...startRace(ship.entrant.stats, ship.entrant.build ?? [], routes[0] ?? 0),
          condition: ship.state.condition,
        },
        waiting: false,
      };
    }),
    // The lap restarts, so the road is clear again — except for the mines that
    // were laid before the heat, which are there for the whole of it.
    fixtures: state.placed,
    emissions: [],
    placed: state.placed,
  };
}

/**
 * Where a ship stands right now, in ticks, counting the lap in progress and
 * the ground it still has to make up on the leader. Being ahead on the track
 * is not the same as leading, so this is what the tracking bar reads.
 */
export function projectedTicks(state: FieldState, ship: ShipProgress): number {
  if (ship.waiting || state.phase === 'done') return ship.totalTicks;
  const furthest = Math.max(...state.ships.map((s) => s.state.distance));
  const behind = Math.max(0, furthest - ship.state.distance);
  // At its current pace; a stopped ship is charged the whole gap generously.
  const pace = Math.max(ship.state.speed, 0.05);
  return ship.totalTicks + state.tick + behind / pace;
}

/** The field in order: least time first, with the ships still out placed by pace. */
export function standings(
  state: FieldState,
): readonly { ship: ShipProgress; ticks: number; place: number }[] {
  return state.ships
    .map((ship) => ({ ship, ticks: projectedTicks(state, ship) }))
    .sort((a, b) => a.ticks - b.ticks)
    .map((row, i) => ({ ...row, place: i + 1 }));
}
