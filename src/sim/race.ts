// The race itself: `simulate(track, build, inputs, seed) -> RaceOutcome`.
//
// Pure and deterministic. The same four arguments always produce the same
// outcome, which is what lets tests run thousands of races headless and what
// lets a replay be stored as a seed rather than a recording.
//
// The loop, once per tick:
//   1. speed closes on the ship's top speed by its acceleration;
//   2. the ship advances by that speed, in track-ticks;
//   3. if it has crossed the end of a gated segment, the stage ends: the race
//      pauses for the garage, which costs no ticks, and the ship sets off again
//      from a standstill.
// Hazards and actives hook into this loop in S2.6 onwards.

import {
  POWER_REROUTE_EFFECT,
  activeById,
  isReady,
  readyAgainAt,
  type ActiveId,
} from './actives';
import { absorb, hazardEffect, isOneShot } from './hazards';
import { makeRng, type Rng } from './rng';
import { resolveBuild, type Build, type DerivedStats } from './ship';
import {
  segmentStartTick,
  stages,
  totalLengthTicks,
  type HazardKind,
  type Track,
} from './track';
import {
  HEAT_DISSIPATION_PER_TICK,
  LAUNCH_SPEED,
  MAX_RACE_TICKS,
  OVERHEAT_DAMAGE_PER_TICK,
} from './tuning';

export type { ActiveId } from './actives';

/** A tap: the player firing an active on a given tick. */
export interface PlayerInput {
  readonly tick: number;
  readonly active: ActiveId;
}

export type RaceEventKind =
  | 'start'
  | 'stageEnd'
  | 'finish'
  | 'abandoned'
  | 'destroyed'
  | 'activeFired'
  | 'activeIgnored';

export interface RaceEvent {
  readonly tick: number;
  readonly kind: RaceEventKind;
  /** Distance covered when the event happened, in track-ticks. */
  readonly distance: number;
  /** Which stage the event belongs to, counting from 0. */
  readonly stage: number;
  /** Which active the event is about, for activeFired and activeIgnored. */
  readonly active?: ActiveId;
}

/** Why a ship was lost. Undefined when it finished. */
export type LossCause = 'hull' | 'overheated' | 'blackHole';

export interface RaceOutcome {
  /** Ticks spent flying. Garage pauses at the gates cost nothing. */
  readonly finishTicks: number;
  /** Hull actually lost over the race, after shields took their share. */
  readonly damageTaken: number;
  /** Did the ship reach the finish line in one piece? */
  readonly survived: boolean;
  /** Hull remaining at the end, floored at 0. */
  readonly hullLeft: number;
  /** What lost the ship, when it was lost. */
  readonly lostTo?: LossCause;
  /** Damage shields swallowed, so the results screen can show what they were worth. */
  readonly damageAbsorbed: number;
  /** Ticks spent above heat tolerance, cooking the hull. */
  readonly overheatedTicks: number;
  /** Heat carried over the finish line. */
  readonly heatLeft: number;
  /** What happened, in order. Enough to narrate a race after the fact. */
  readonly log: readonly RaceEvent[];
  /** The seed this race was run with, so an interesting race can be replayed. */
  readonly seed: number;
  /** The stats the build resolved to, for the results screen. */
  readonly stats: DerivedStats;
}

export interface RaceOptions {
  /**
   * Run only this stage, counting from 0, instead of the whole track. Ticks
   * still start at 0, so the player's taps are timed against the stage they can
   * see rather than the whole run.
   */
  readonly stage?: number;
  /** Hull the ship starts with. Defaults to the hull its build resolves to. */
  readonly startHull?: number;
}

/**
 * A race in progress. The live game steps one of these per tick and draws it;
 * `simulate()` steps one to the end and reports what happened. Both go through
 * `stepRace`, so what a test measures is exactly what a player flies.
 *
 * The state is mutated in place by `stepRace` rather than copied — a race is
 * stepped thousands of times in a balance run — but nothing outside this module
 * writes to it, and the same seed always produces the same sequence.
 */
export interface RaceState {
  readonly track: Track;
  readonly stats: DerivedStats;
  readonly seed: number;
  /** Ticks since this race started. A stage counts from zero. */
  tick: number;
  /** Distance from the start line, in track-ticks. */
  distance: number;
  /** Where this race ends. */
  readonly finishDistance: number;
  speed: number;
  stage: number;
  hull: number;
  heat: number;
  shieldPool: number;
  damageTaken: number;
  damageAbsorbed: number;
  overheatedTicks: number;
  destroyed: boolean;
  /** What lost the ship, set the moment it is lost. */
  lostTo?: LossCause;
  /** True once the ship has finished, been lost, or run out of ticks. */
  over: boolean;
  readonly log: RaceEvent[];
  readonly placements: readonly PlacedHazard[];
  readonly fired: Set<PlacedHazard>;
  readonly stageEnds: readonly number[];
  readonly readyAt: Map<ActiveId, number>;
  readonly activeUntil: Map<ActiveId, number>;
}

/** Set a race up at the start line without running any of it. */
export function startRace(
  track: Track,
  build: Build,
  seed: number,
  options: RaceOptions = {},
): RaceState {
  const stats = resolveBuild(build);

  // A whole run starts at the start line and ends at the finish. One stage
  // starts and ends at its own gates, and is the only thing simulated.
  const wholeTrack = options.stage === undefined;
  const stageList = stages(track);
  const only = wholeTrack ? undefined : stageList[options.stage ?? 0];
  if (!wholeTrack && only === undefined) {
    throw new Error(`Stage ${options.stage} is not on this track.`);
  }
  const startDistance = only === undefined ? 0 : segmentStartTick(track, only.firstSegment);
  const finishDistance =
    only === undefined ? totalLengthTicks(track) : startDistance + only.lengthTicks;

  const hull = options.startHull ?? stats.hull;
  if (hull <= 0) throw new Error(`A ship cannot start a race with ${hull} hull.`);

  // Each placement gets its own stream, forked once up front, so adding a roll
  // to one hazard cannot shift what another one does. Every placement on the
  // track is forked, including hazards outside this stage, so a stage's dice do
  // not depend on which stage is being raced.
  const raceRng = makeRng(seed);
  const placements: PlacedHazard[] = [];
  track.segments.forEach((segment, index) => {
    const segmentStart = segmentStartTick(track, index);
    segment.hazards.forEach((hazard) => {
      placements.push({
        kind: hazard.kind,
        from: segmentStart + hazard.startTick,
        to: segmentStart + hazard.startTick + hazard.lengthTicks,
        rng: raceRng.fork(),
      });
    });
  });

  // Distance at which each stage ends: the end of every gated segment. A
  // single-stage race has no gates of its own — it ends at one.
  const stageEnds = wholeTrack
    ? track.gates.map((gate) => segmentStartTick(track, gate) + segmentLength(track, gate))
    : [];

  const stage = options.stage ?? 0;
  return {
    track,
    stats,
    seed,
    tick: 0,
    distance: startDistance,
    finishDistance,
    speed: LAUNCH_SPEED,
    stage,
    hull,
    heat: 0,
    shieldPool: 0,
    damageTaken: 0,
    damageAbsorbed: 0,
    overheatedTicks: 0,
    destroyed: false,
    over: false,
    log: [{ tick: 0, kind: 'start', distance: startDistance, stage }],
    placements,
    fired: new Set<PlacedHazard>(),
    stageEnds,
    readyAt: new Map<ActiveId, number>(),
    activeUntil: new Map<ActiveId, number>(),
  };
}

/** Is this active off cooldown right now? The HUD greys out the button otherwise. */
export function activeReady(state: RaceState, id: ActiveId): boolean {
  return isReady(state.readyAt.get(id), state.tick);
}

/** Is this active on right now? The HUD lights the button while it is. */
export function activeOn(state: RaceState, id: ActiveId): boolean {
  return state.tick < (state.activeUntil.get(id) ?? 0);
}

/**
 * Advance one tick, honouring any taps made on it. Returns the same state,
 * mutated. Stepping a race that is over does nothing.
 */
export function stepRace(state: RaceState, taps: readonly ActiveId[] = []): RaceState {
  if (state.over) return state;

  const { stats } = state;

  // 0. The player's taps for this tick, honoured in the order they were made.
  taps.forEach((id) => {
    const active = activeById(id);
    if (!isReady(state.readyAt.get(id), state.tick)) {
      state.log.push({
        tick: state.tick,
        kind: 'activeIgnored',
        distance: state.distance,
        stage: state.stage,
        active: id,
      });
      return;
    }
    state.readyAt.set(id, readyAgainAt(active, state.tick));
    state.activeUntil.set(id, state.tick + active.durationTicks);
    if (id === 'shields') state.shieldPool = stats.shieldCapacity;
    state.log.push({
      tick: state.tick,
      kind: 'activeFired',
      distance: state.distance,
      stage: state.stage,
      active: id,
    });
  });

  const shieldsUp = activeOn(state, 'shields');
  const rerouting = activeOn(state, 'powerReroute');
  // Shields that have run out drop whatever was left in the pool.
  if (!shieldsUp) state.shieldPool = 0;

  // 1. Work out where the ship would reach this tick if nothing interfered,
  //    so a hazard the ship flies straight through still catches it.
  const freeSpeed = Math.min(state.speed + stats.acceleration, stats.speed);
  const active = state.placements.filter(
    (placement) =>
      placement.from < state.distance + freeSpeed &&
      placement.to > state.distance &&
      !state.fired.has(placement),
  );

  // 2. Ask each hazard what it does this tick, and combine the answers.
  let hullDamage = 0;
  let addedHeat = 0;
  let speedMultiplier = 1;
  active.forEach((placement) => {
    const effect = hazardEffect(placement.kind, {
      stats,
      speed: freeSpeed,
      heat: state.heat,
      hull: state.hull,
      shieldsUp,
      rng: placement.rng,
    });
    if (isOneShot(placement.kind)) state.fired.add(placement);
    hullDamage += effect.hullDamage;
    addedHeat += effect.heat;
    speedMultiplier *= effect.speedMultiplier;
    if (effect.destroyed) {
      state.destroyed = true;
      // Only the black hole takes a ship outright, but say so by name rather
      // than assuming: a later hazard that does the same will read correctly.
      state.lostTo = placement.kind === 'blackHole' ? 'blackHole' : 'hull';
    }
  });

  // 3. Rerouted power is speed bought with heat, and joins the hazards'
  //    contributions rather than overriding them.
  if (rerouting) {
    speedMultiplier *= POWER_REROUTE_EFFECT.speedMultiplier;
    addedHeat += POWER_REROUTE_EFFECT.heatPerTick;
  }

  // 4. Apply damage and heat, then close on whatever top speed the hazards
  //    left the ship with. Shields eat damage before the hull does.
  if (hullDamage > 0) {
    const { toHull, poolLeft } = absorb(hullDamage, state.shieldPool);
    state.shieldPool = poolLeft;
    state.damageAbsorbed += hullDamage - toHull;
    state.hull -= toHull;
    state.damageTaken += toHull;
  }
  // Heat builds while something is adding it and bleeds away when nothing is.
  // Above tolerance the ship cooks: that damage is internal, so shields do not
  // stop it.
  state.heat =
    addedHeat > 0 ? state.heat + addedHeat : Math.max(state.heat - HEAT_DISSIPATION_PER_TICK, 0);
  const cooking = state.heat > stats.heatTolerance;
  if (cooking) {
    state.hull -= OVERHEAT_DAMAGE_PER_TICK;
    state.damageTaken += OVERHEAT_DAMAGE_PER_TICK;
    state.overheatedTicks++;
  }

  if (state.hull <= 0 && !state.destroyed) {
    state.destroyed = true;
    // Cooking with nothing else hitting the ship is a different story to tell
    // than being shot to pieces, so the results screen can tell it.
    state.lostTo = cooking && hullDamage === 0 ? 'overheated' : 'hull';
  }

  state.speed = Math.min(state.speed + stats.acceleration, stats.speed * speedMultiplier);

  // 5. Fly.
  state.distance += state.speed;
  state.tick++;

  if (state.destroyed) {
    state.log.push({
      tick: state.tick,
      kind: 'destroyed',
      distance: state.distance,
      stage: state.stage,
    });
    state.over = true;
    return state;
  }

  // 6. Stage gate: the race pauses, the garage costs no ticks, and the ship
  //    sets off again from a standstill.
  const nextStageEnd = state.stageEnds[state.stage];
  if (nextStageEnd !== undefined && state.distance >= nextStageEnd) {
    // The ship stops on the gate line rather than carrying its overshoot into
    // the next stage, so every stage is exactly as long as the track says.
    state.distance = nextStageEnd;
    state.log.push({
      tick: state.tick,
      kind: 'stageEnd',
      distance: state.distance,
      stage: state.stage,
    });
    state.stage++;
    state.speed = LAUNCH_SPEED;
  }

  if (state.distance >= state.finishDistance || state.tick >= MAX_RACE_TICKS) {
    state.log.push({
      tick: state.tick,
      kind: state.distance >= state.finishDistance ? 'finish' : 'abandoned',
      distance: state.distance,
      stage: state.stage,
    });
    state.over = true;
  }
  return state;
}

/** What a race that is over came to. */
export function raceOutcome(state: RaceState): RaceOutcome {
  return {
    finishTicks: state.tick,
    damageTaken: state.damageTaken,
    survived: !state.destroyed && state.distance >= state.finishDistance,
    hullLeft: Math.max(state.hull, 0),
    ...(state.lostTo === undefined ? {} : { lostTo: state.lostTo }),
    damageAbsorbed: state.damageAbsorbed,
    overheatedTicks: state.overheatedTicks,
    heatLeft: state.heat,
    log: state.log,
    seed: state.seed,
    stats: state.stats,
  };
}

/**
 * Run a race from start to finish. `inputs` are the player's active taps: each
 * is honoured on its own tick if that active is off cooldown, and ignored
 * otherwise. Taps do not queue — a tap during a cooldown is a tap wasted, which
 * is the whole game of timing them.
 */
export function simulate(
  track: Track,
  build: Build,
  inputs: readonly PlayerInput[],
  seed: number,
  options: RaceOptions = {},
): RaceOutcome {
  // Taps, grouped by the tick they were made on. Two taps of the same active on
  // one tick are one tap: the second finds it already on cooldown.
  const tapsByTick = new Map<number, ActiveId[]>();
  inputs.forEach((input) => {
    const taps = tapsByTick.get(input.tick);
    if (taps === undefined) tapsByTick.set(input.tick, [input.active]);
    else taps.push(input.active);
  });

  const state = startRace(track, build, seed, options);
  while (!state.over) {
    stepRace(state, tapsByTick.get(state.tick));
  }
  return raceOutcome(state);
}

/** A hazard resolved to absolute race distances, with its own dice. */
interface PlacedHazard {
  readonly kind: HazardKind;
  /** Distance at which the hazard starts, from the start line. */
  readonly from: number;
  /** Distance at which it ends. */
  readonly to: number;
  readonly rng: Rng;
}

function segmentLength(track: Track, index: number): number {
  const segment = track.segments[index];
  if (segment === undefined) throw new Error(`Segment ${index} is not on this track.`);
  return segment.lengthTicks;
}
