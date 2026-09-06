// A run: three stages of one track, one build, one ship.
//
// The state machine the UI drives. A Run is immutable — `choosePart` and
// `runStage` hand back a new one — so a screen can hold the old state while it
// animates its way to the new one, and a test can keep every step of a run.
//
// Two rules make the run more than three separate races:
//
//   1. The **build carries forward**. Every garage adds a part, so the ship
//      that reaches stage 3 is the one the player has been assembling.
//   2. The **hull carries forward**. Damage is not repaired between stages.
//      This is what gives the black hole in stage 3 its teeth: it charges the
//      player for what they spent surviving stages 1 and 2.

import { offerParts } from './garage';
import {
  flyField,
  standings,
  startField,
  type Entry,
  type Field,
  type ShipId,
  type Standing,
} from './field';
import { makeRng, type Rng } from './rng';
import { raceOutcome, type PlayerInput, type RaceOutcome } from './race';
import { RIVALS, rivalBuild, rivalStartingHull } from './rivals';
import type { Build, Part } from './ship';
import { resolveBuild } from './ship';
import { stages, type Track } from './track';

export type RunPhase = 'garage' | 'racing' | 'done';

export interface StageResult {
  /** Which stage this was, counting from 0. */
  readonly stage: number;
  /** The player's race. */
  readonly outcome: RaceOutcome;
  /** Where every ship came, the winner first. */
  readonly standings: readonly Standing[];
  /** Where the player came, 1 for a win. */
  readonly position: number;
}

/** A rival as it stands: what it is flying, and what is left of it. */
export interface RivalState {
  readonly id: ShipId;
  readonly name: string;
  readonly build: Build;
  readonly hull: number;
  /** False once it has been lost; a lost rival takes no further part. */
  readonly alive: boolean;
}

export interface Run {
  readonly seed: number;
  readonly track: Track;
  readonly phase: RunPhase;
  /** The stage about to be raced, or the one just finished when done. */
  readonly stage: number;
  readonly build: Build;
  /** Hull the ship carries into the next stage. */
  readonly hull: number;
  /** The three parts on offer, when the phase is garage. */
  readonly offer: readonly Part[];
  readonly results: readonly StageResult[];
  /** False once the ship has been lost. */
  readonly alive: boolean;
  /** The two ships the player is racing. */
  readonly rivals: readonly RivalState[];
}

/**
 * The seed the current stage races with. Stages differ so a run is not the same
 * three races with the same dice.
 */
export function stageSeed(run: Run): number {
  return run.seed + run.stage;
}

/** The grid for this stage: the player, then whichever rivals are still going. */
function entriesFor(run: Run): Entry[] {
  const grid: Entry[] = [
    { id: 'player', name: 'You', build: run.build, hull: run.hull },
  ];
  run.rivals.forEach((rival) => {
    if (!rival.alive) return;
    grid.push({ id: rival.id, name: rival.name, build: rival.build, hull: rival.hull });
  });
  return grid;
}

/**
 * A live field for the stage the run is on, set up exactly as `runStage` will
 * replay it. The screen flies this one; `runStage` re-runs the same seed with
 * the taps the player made and produces the same result.
 */
export function startStageField(run: Run): Field {
  if (run.phase !== 'racing') {
    throw new Error(`Nothing to race: the run is ${run.phase}.`);
  }
  return startField(run.track, entriesFor(run), stageSeed(run), {
    stage: run.stage,
  });
}

/** Total ticks flown across every stage raced so far. */
export function totalTicks(run: Run): number {
  return run.results.reduce((sum, result) => sum + result.outcome.finishTicks, 0);
}

/** Total hull lost across every stage raced so far. */
export function totalDamage(run: Run): number {
  return run.results.reduce((sum, result) => sum + result.outcome.damageTaken, 0);
}

/** Did the run get through every stage in one piece? */
export function completed(run: Run): boolean {
  return run.phase === 'done' && run.alive;
}

/** The run's own dice for a garage, forked so stage rolls cannot shift them. */
function garageRng(seed: number, stage: number): Rng {
  const rng = makeRng(seed);
  // Fork once per garage so each stage's offer is independent of the others.
  let stream = rng.fork();
  for (let i = 0; i < stage; i++) stream = rng.fork();
  return stream;
}

/** Start a run: the garage opens before the first stage. */
export function startRun(track: Track, seed: number): Run {
  if (stages(track).length === 0) throw new Error('A run needs at least one stage.');
  return {
    seed,
    track,
    phase: 'garage',
    stage: 0,
    build: [],
    hull: resolveBuild([]).hull,
    offer: offerParts(garageRng(seed, 0)),
    results: [],
    alive: true,
    // Rivals line up with their first part already bolted on: they are not
    // waiting in a garage, they are on the grid.
    rivals: RIVALS.map((rival) => ({
      id: rival.id,
      name: rival.name,
      build: rivalBuild(rival, 0),
      hull: rivalStartingHull(rival),
      alive: true,
    })),
  };
}

/**
 * Take a part and close the garage. The part must be one of the three on offer:
 * the garage is a choice between what it showed, not a shopping list.
 */
export function choosePart(run: Run, part: Part): Run {
  if (run.phase !== 'garage') {
    throw new Error(`The garage is closed: the run is ${run.phase}.`);
  }
  if (!run.offer.includes(part)) {
    throw new Error(`${part.name} was not on offer this garage.`);
  }
  const build = [...run.build, part];
  // A part that raises maximum hull adds that much to the ship as it stands;
  // it does not repair the damage already taken.
  const gained = resolveBuild(build).hull - resolveBuild(run.build).hull;
  return {
    ...run,
    phase: 'racing',
    build,
    hull: Math.max(run.hull + gained, 1),
    offer: [],
  };
}

/**
 * Race the current stage with the taps the player made during it. Ticks in
 * `inputs` are counted from the start of the stage.
 */
export function runStage(run: Run, inputs: readonly PlayerInput[]): Run {
  if (run.phase !== 'racing') {
    throw new Error(`Nothing to race: the run is ${run.phase}.`);
  }

  // The player's taps, by the tick they landed on.
  const tapsByTick = new Map<number, PlayerInput['active'][]>();
  inputs.forEach((input) => {
    const taps = tapsByTick.get(input.tick);
    if (taps === undefined) tapsByTick.set(input.tick, [input.active]);
    else taps.push(input.active);
  });

  const field = flyField(startStageField(run), (tick) => tapsByTick.get(tick) ?? []);
  const order = standings(field);

  const player = field.racers.find((racer) => racer.id === 'player');
  if (player === undefined) throw new Error('unreachable: the player is always on the grid');
  const outcome = raceOutcome(player.state);
  const position = order.find((row) => row.id === 'player')?.position ?? order.length;

  const results = [...run.results, { stage: run.stage, outcome, standings: order, position }];
  const lastStage = run.stage >= stages(run.track).length - 1;
  const alive = outcome.survived;

  // Rivals carry their hull too, and a lost rival is out of the run.
  const nextStage = run.stage + 1;
  const rivals = run.rivals.map((rival) => {
    const racer = field.racers.find((entry) => entry.id === rival.id);
    if (racer === undefined) return rival;
    const rivalOutcome = raceOutcome(racer.state);
    const definition = RIVALS.find((candidate) => candidate.id === rival.id);
    const grown =
      definition === undefined || !rivalOutcome.survived
        ? rival.build
        : rivalBuild(definition, nextStage);
    // A part that raises maximum hull adds to the ship as it stands; it does not
    // repair what is already gone. Same rule as the player's garage.
    const gained = resolveBuild(grown).hull - resolveBuild(rival.build).hull;
    return {
      ...rival,
      build: grown,
      hull: Math.max(rivalOutcome.hullLeft + gained, 1),
      alive: rival.alive && rivalOutcome.survived,
    };
  });

  if (!alive || lastStage) {
    return {
      ...run,
      phase: 'done',
      results,
      hull: outcome.hullLeft,
      alive,
      offer: [],
      rivals,
    };
  }
  return {
    ...run,
    phase: 'garage',
    stage: nextStage,
    hull: outcome.hullLeft,
    results,
    offer: offerParts(garageRng(run.seed, nextStage)),
    alive,
    rivals,
  };
}

/** Total ticks each ship has flown, for the standings across a whole run. */
export interface RunStanding {
  readonly id: ShipId;
  readonly name: string;
  readonly position: number;
  readonly totalTicks: number;
  /** Stages it got through in one piece. */
  readonly stagesFinished: number;
  readonly survived: boolean;
}

/**
 * Standings across the whole run: every stage a ship finished counts, and a
 * ship that was lost is placed behind every ship that was not. A player who
 * survives all three stages and is slower than both rivals comes third, which is
 * the point of having them.
 */
export function runStandings(run: Run): RunStanding[] {
  const ids: ShipId[] = ['player', ...run.rivals.map((rival) => rival.id)];
  const rows = ids.map((id) => {
    let totalTicks = 0;
    let stagesFinished = 0;
    let survived = true;
    run.results.forEach((result) => {
      const row = result.standings.find((entry) => entry.id === id);
      if (row === undefined) return;
      totalTicks += row.finishTicks;
      if (row.survived) stagesFinished++;
      else survived = false;
    });
    const name =
      id === 'player' ? 'You' : (run.rivals.find((rival) => rival.id === id)?.name ?? id);
    return { id, name, totalTicks, stagesFinished, survived };
  });

  rows.sort((a, b) => {
    if (a.stagesFinished !== b.stagesFinished) return b.stagesFinished - a.stagesFinished;
    return a.totalTicks - b.totalTicks;
  });

  return rows.map((row, index) => ({ ...row, position: index + 1 }));
}

/** Did the player beat both rivals? */
export function wonRun(run: Run): boolean {
  return runStandings(run)[0]?.id === 'player';
}
