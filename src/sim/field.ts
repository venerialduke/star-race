// A heat: three ships flying the same loop, stepped in lockstep, never
// touching. Each carries its own race state and its own seeded draws, so one
// ship's luck can never shift another's.
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
import type { Track } from './track';

export interface Entrant {
  readonly id: string;
  readonly name: string;
  readonly stats: ShipStats;
  readonly isPlayer: boolean;
}

export interface ShipProgress {
  readonly entrant: Entrant;
  /** The plan this ship is flying this lap. Chosen before the lap, never during. */
  readonly plan: CornerPlan;
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
  plans: readonly CornerPlan[],
): FieldState {
  return {
    tick: 0,
    lap: 0,
    phase: 'racing',
    ships: entrants.map((entrant, i) => ({
      entrant,
      plan: plans[i] ?? 'carry',
      state: startRace(),
      lapTicks: [],
      totalTicks: 0,
      waiting: false,
    })),
  };
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
      plan: ship.plan,
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
export function leavePit(state: FieldState, plans: readonly CornerPlan[]): FieldState {
  return {
    tick: 0,
    lap: state.lap + 1,
    phase: 'racing',
    ships: state.ships.map((ship, i) => ({
      ...ship,
      plan: plans[i] ?? ship.plan,
      state: startRace(),
      waiting: false,
    })),
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
