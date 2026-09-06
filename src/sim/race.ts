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

export interface RaceOutcome {
  /** Ticks spent flying. Garage pauses at the gates cost nothing. */
  readonly finishTicks: number;
  /** Hull actually lost over the race, after shields took their share. */
  readonly damageTaken: number;
  /** Did the ship reach the finish line in one piece? */
  readonly survived: boolean;
  /** Hull remaining at the end, floored at 0. */
  readonly hullLeft: number;
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
 * Run a race. `inputs` are the player's active taps: each is honoured on its
 * own tick if that active is off cooldown, and ignored otherwise. Taps do not
 * queue — a tap during a cooldown is a tap wasted, which is the whole game of
 * timing them.
 */
export function simulate(
  track: Track,
  build: Build,
  inputs: readonly PlayerInput[],
  seed: number,
  options: RaceOptions = {},
): RaceOutcome {
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

  // Distance at which each stage ends: the end of every gated segment. A
  // single-stage race has no gates of its own — it ends at one.
  const stageEnds = wholeTrack
    ? track.gates.map((gate) => segmentStartTick(track, gate) + segmentLength(track, gate))
    : [];

  // Each placement gets its own stream, forked once up front, so adding a roll
  // to one hazard cannot shift what another one does.
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

  // One-shot hazards, such as a gamma burst, fire once and are then spent.
  const fired = new Set<PlacedHazard>();

  // Taps, grouped by the tick they were made on. Two taps of the same active on
  // one tick are one tap: the second finds it already on cooldown.
  const tapsByTick = new Map<number, ActiveId[]>();
  inputs.forEach((input) => {
    const taps = tapsByTick.get(input.tick);
    if (taps === undefined) tapsByTick.set(input.tick, [input.active]);
    else taps.push(input.active);
  });

  /** When each active can next be fired. Undefined means it never has been. */
  const readyAt = new Map<ActiveId, number>();
  /** The tick each active stops being on. */
  const activeUntil = new Map<ActiveId, number>();

  const log: RaceEvent[] = [];
  let tick = 0;
  let distance = startDistance;
  let speed = LAUNCH_SPEED;
  let stage = options.stage ?? 0;
  let hull = options.startHull ?? stats.hull;
  if (hull <= 0) throw new Error(`A ship cannot start a race with ${hull} hull.`);
  let heat = 0;
  let damageTaken = 0;
  let damageAbsorbed = 0;
  let shieldPool = 0;
  let overheatedTicks = 0;
  let destroyed = false;

  log.push({ tick, kind: 'start', distance, stage });

  while (distance < finishDistance && tick < MAX_RACE_TICKS && !destroyed) {
    // 0. The player's taps for this tick, honoured in the order they were made.
    (tapsByTick.get(tick) ?? []).forEach((id) => {
      const active = activeById(id);
      if (!isReady(readyAt.get(id), tick)) {
        log.push({ tick, kind: 'activeIgnored', distance, stage, active: id });
        return;
      }
      readyAt.set(id, readyAgainAt(active, tick));
      activeUntil.set(id, tick + active.durationTicks);
      if (id === 'shields') shieldPool = stats.shieldCapacity;
      log.push({ tick, kind: 'activeFired', distance, stage, active: id });
    });

    const shieldsUp = tick < (activeUntil.get('shields') ?? 0);
    const rerouting = tick < (activeUntil.get('powerReroute') ?? 0);
    // Shields that have run out drop whatever was left in the pool.
    if (!shieldsUp) shieldPool = 0;

    // 1. Work out where the ship would reach this tick if nothing interfered,
    //    so a hazard the ship flies straight through still catches it.
    const freeSpeed = Math.min(speed + stats.acceleration, stats.speed);
    const active = placements.filter(
      (placement) =>
        placement.from < distance + freeSpeed &&
        placement.to > distance &&
        !fired.has(placement),
    );

    // 2. Ask each hazard what it does this tick, and combine the answers.
    let hullDamage = 0;
    let addedHeat = 0;
    let speedMultiplier = 1;
    active.forEach((placement) => {
      const effect = hazardEffect(placement.kind, {
        stats,
        speed: freeSpeed,
        heat,
        hull,
        shieldsUp,
        rng: placement.rng,
      });
      if (isOneShot(placement.kind)) fired.add(placement);
      hullDamage += effect.hullDamage;
      addedHeat += effect.heat;
      speedMultiplier *= effect.speedMultiplier;
      if (effect.destroyed) destroyed = true;
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
      const { toHull, poolLeft } = absorb(hullDamage, shieldPool);
      shieldPool = poolLeft;
      damageAbsorbed += hullDamage - toHull;
      hull -= toHull;
      damageTaken += toHull;
    }
    // Heat builds while something is adding it and bleeds away when nothing is.
    // Above tolerance the ship cooks: that damage is internal, so shields do
    // not stop it.
    heat = addedHeat > 0 ? heat + addedHeat : Math.max(heat - HEAT_DISSIPATION_PER_TICK, 0);
    if (heat > stats.heatTolerance) {
      hull -= OVERHEAT_DAMAGE_PER_TICK;
      damageTaken += OVERHEAT_DAMAGE_PER_TICK;
      overheatedTicks++;
    }

    if (hull <= 0) destroyed = true;

    speed = Math.min(speed + stats.acceleration, stats.speed * speedMultiplier);

    // 5. Fly.
    distance += speed;
    tick++;

    if (destroyed) {
      log.push({ tick, kind: 'destroyed', distance, stage });
      break;
    }

    // 6. Stage gate: the race pauses, the garage costs no ticks, and the ship
    //    sets off again from a standstill.
    const nextStageEnd = stageEnds[stage];
    if (nextStageEnd !== undefined && distance >= nextStageEnd) {
      // The ship stops on the gate line rather than carrying its overshoot
      // into the next stage, so every stage is exactly as long as the track
      // says it is.
      distance = nextStageEnd;
      log.push({ tick, kind: 'stageEnd', distance, stage });
      stage++;
      speed = LAUNCH_SPEED;
    }
  }

  const finished = !destroyed && distance >= finishDistance;
  if (!destroyed) {
    log.push({
      tick,
      kind: finished ? 'finish' : 'abandoned',
      distance,
      stage,
    });
  }

  return {
    finishTicks: tick,
    damageTaken,
    survived: finished,
    hullLeft: Math.max(hull, 0),
    damageAbsorbed,
    overheatedTicks,
    heatLeft: heat,
    log,
    seed,
    stats,
  };
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
