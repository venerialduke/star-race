// Three ships on one stage.
//
// Each ship flies its own race — its own state, its own hazard dice — and they
// are stepped in lockstep, one tick each, until they are all done. They never
// touch: no collisions, no blocking, no drafting. What the player races is the
// clock and the other two ships' choices.
//
// That is why this file is small. A field is three races stepped together and a
// rule for reading the finishing order off them.

import type { ActiveId } from './actives';
import {
  raceOutcome,
  startRace,
  stepRace,
  type RaceOptions,
  type RaceState,
} from './race';
import { makeRng } from './rng';
import { makePilot, type Pilot } from './pilot';
import type { Build } from './ship';
import { MAX_RACE_TICKS } from './tuning';
import type { Track } from './track';

export type ShipId = 'player' | 'redline' | 'bulwark';

/** One ship on the grid. */
export interface Entry {
  readonly id: ShipId;
  readonly name: string;
  readonly build: Build;
  /** Hull it starts the stage with. */
  readonly hull: number;
  /** Undefined for the player: their taps come from a thumb. */
  readonly pilot?: Pilot;
}

export interface Racer {
  readonly id: ShipId;
  readonly name: string;
  readonly state: RaceState;
  readonly pilot?: Pilot;
}

export interface Field {
  readonly racers: readonly Racer[];
  /** True once every ship has finished or been lost. */
  over: boolean;
  /** Ticks the field has been running. */
  tick: number;
}

/** Where a ship came, once the field is done. */
export interface Standing {
  readonly id: ShipId;
  readonly name: string;
  /** 1 for the winner. */
  readonly position: number;
  readonly finishTicks: number;
  readonly survived: boolean;
  /** How far it got, for ships that did not finish. */
  readonly distance: number;
}

/**
 * A ship's own dice. Every ship meets the same hazards in the same places, but
 * rolls its own variance inside them — one ship's lucky run through an asteroid
 * field is not every ship's.
 */
function seedFor(seed: number, index: number): number {
  return seed + index * 7919;
}

/** Put the grid together. Nothing has moved yet. */
export function startField(
  track: Track,
  entries: readonly Entry[],
  seed: number,
  options: RaceOptions = {},
): Field {
  const racers = entries.map((entry, index) => {
    const shipSeed = seedFor(seed, index);
    return {
      id: entry.id,
      name: entry.name,
      state: startRace(track, entry.build, shipSeed, {
        ...options,
        startHull: entry.hull,
      }),
      pilot:
        entry.pilot ??
        (entry.id === 'player' ? undefined : makePilot(track, makeRng(shipSeed).fork())),
    };
  });
  return { racers, over: false, tick: 0 };
}

/**
 * One tick for every ship still going. `playerTaps` are the taps the player made
 * this tick; rivals ask their pilots.
 */
export function stepField(field: Field, playerTaps: readonly ActiveId[] = []): Field {
  if (field.over) return field;

  field.racers.forEach((racer) => {
    if (racer.state.over) return;
    const taps = racer.pilot === undefined ? playerTaps : racer.pilot.taps(racer.state);
    stepRace(racer.state, taps);
  });

  field.tick++;
  field.over =
    field.racers.every((racer) => racer.state.over) || field.tick >= MAX_RACE_TICKS;
  return field;
}

/**
 * The finishing order. Ships that finished come first, soonest first; ships that
 * were lost come after them, whoever got furthest first — the black hole took
 * you either way, but it took you later.
 */
export function standings(field: Field): Standing[] {
  const rows = field.racers.map((racer) => {
    const outcome = raceOutcome(racer.state);
    return {
      id: racer.id,
      name: racer.name,
      finishTicks: outcome.finishTicks,
      survived: outcome.survived,
      distance: racer.state.distance,
    };
  });

  rows.sort((a, b) => {
    if (a.survived !== b.survived) return a.survived ? -1 : 1;
    if (a.survived) return a.finishTicks - b.finishTicks;
    return b.distance - a.distance;
  });

  return rows.map((row, index) => ({ ...row, position: index + 1 }));
}

/**
 * The order the ships are in right now, best first: furthest along wins, and a
 * ship that has been lost is behind every ship still flying. Used by the HUD
 * mid-race, so the player can see whether they are winning without waiting for
 * the line.
 */
export function livePositions(field: Field): ShipId[] {
  return [...field.racers]
    .sort((a, b) => {
      const aLost = a.state.destroyed;
      const bLost = b.state.destroyed;
      if (aLost !== bLost) return aLost ? 1 : -1;
      if (a.state.distance !== b.state.distance) return b.state.distance - a.state.distance;
      return a.state.tick - b.state.tick;
    })
    .map((racer) => racer.id);
}

/** Where one ship is right now, 1 for the lead. */
export function livePositionOf(field: Field, id: ShipId): number {
  const index = livePositions(field).indexOf(id);
  if (index === -1) throw new Error(`${id} is not in this field.`);
  return index + 1;
}

/** Where one ship came. */
export function positionOf(order: readonly Standing[], id: ShipId): number {
  const found = order.find((row) => row.id === id);
  if (found === undefined) throw new Error(`${id} was not in this field.`);
  return found.position;
}

/**
 * Run a whole field to the end, with the player's taps supplied per tick. Used
 * to replay a stage the player has already flown, and by tests.
 */
export function flyField(
  field: Field,
  playerTaps: (tick: number) => readonly ActiveId[] = () => [],
): Field {
  while (!field.over) stepField(field, playerTaps(field.tick));
  return field;
}
