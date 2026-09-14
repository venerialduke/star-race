// A heat: three ships flying the same loop, stepped in lockstep, never
// touching. Each carries its own race state and its own seeded draws, so one
// ship's luck can never shift another's.
//
// Every ship finishes. Damage costs a ship its pace, never its race.
//
// The clock never resets. A lap ends when every ship has finished it; the pit
// stop then restarts them level, and total time is the sum of their laps —
// which is why being ahead on the track is not the same as leading.

import {
  startRace,
  stepRace,
  type CornerPlan,
  type RaceState,
  type ShipStats,
} from './race';
import { makeRng } from './rng';
import type { Fitted } from './ship';
import { legalRoutes, type Track } from './track';
import { NAV_FOR_REPLAN } from './tuning';

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
  return {
    tick: 0,
    lap: 0,
    phase: 'racing',
    ships: entrants.map((entrant, i) => {
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
    }),
  };
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

  const ships = state.ships.map((ship, i) => {
    if (ship.waiting) return ship;
    const next = stepRace(ship.state, {
      track: config.track,
      stats: ship.entrant.stats,
      build: ship.entrant.build,
      plan: ship.plan,
      routes: ship.routes,
      seed: seedFor(config.seed, i, state.lap),
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
