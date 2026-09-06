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
import { makeRng, type Rng } from './rng';
import { simulate, type PlayerInput, type RaceOutcome } from './race';
import type { Build, Part } from './ship';
import { resolveBuild } from './ship';
import { stages, type Track } from './track';

export type RunPhase = 'garage' | 'racing' | 'done';

export interface StageResult {
  /** Which stage this was, counting from 0. */
  readonly stage: number;
  readonly outcome: RaceOutcome;
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
  const outcome = simulate(run.track, run.build, inputs, run.seed + run.stage, {
    stage: run.stage,
    startHull: run.hull,
  });
  const results = [...run.results, { stage: run.stage, outcome }];
  const lastStage = run.stage >= stages(run.track).length - 1;
  const alive = outcome.survived;

  if (!alive || lastStage) {
    return { ...run, phase: 'done', results, hull: outcome.hullLeft, alive, offer: [] };
  }
  const nextStage = run.stage + 1;
  return {
    ...run,
    phase: 'garage',
    stage: nextStage,
    hull: outcome.hullLeft,
    results,
    offer: offerParts(garageRng(run.seed, nextStage)),
    alive,
  };
}
