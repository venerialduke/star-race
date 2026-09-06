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

import { resolveBuild, type Build, type DerivedStats } from './ship';
import { segmentStartTick, totalLengthTicks, type Track } from './track';
import { LAUNCH_SPEED, MAX_RACE_TICKS } from './tuning';

/** The two actives in the slice. They do nothing until S2.10. */
export type ActiveId = 'shields' | 'powerReroute';

/** A tap: the player firing an active on a given tick. */
export interface PlayerInput {
  readonly tick: number;
  readonly active: ActiveId;
}

export type RaceEventKind = 'start' | 'stageEnd' | 'finish' | 'abandoned';

export interface RaceEvent {
  readonly tick: number;
  readonly kind: RaceEventKind;
  /** Distance covered when the event happened, in track-ticks. */
  readonly distance: number;
  /** Which stage the event belongs to, counting from 0. */
  readonly stage: number;
}

export interface RaceOutcome {
  /** Ticks spent flying. Garage pauses at the gates cost nothing. */
  readonly finishTicks: number;
  /** Hull lost over the race. Always 0 until hazards land in S2.6. */
  readonly damageTaken: number;
  /** Did the ship reach the finish line in one piece? */
  readonly survived: boolean;
  /** What happened, in order. Enough to narrate a race after the fact. */
  readonly log: readonly RaceEvent[];
  /** The seed this race was run with, so an interesting race can be replayed. */
  readonly seed: number;
  /** The stats the build resolved to, for the results screen. */
  readonly stats: DerivedStats;
}

/**
 * Run a race. `inputs` are the player's active taps; they are accepted and
 * carried through now, and consumed once actives exist in S2.10.
 */
export function simulate(
  track: Track,
  build: Build,
  // Underscored because nothing reads it yet; S2.10 drops the underscore when
  // actives start consuming taps.
  _inputs: readonly PlayerInput[],
  seed: number,
): RaceOutcome {
  const stats = resolveBuild(build);
  const finishDistance = totalLengthTicks(track);

  // Distance at which each stage ends: the end of every gated segment.
  const stageEnds = track.gates.map(
    (gate) => segmentStartTick(track, gate) + segmentLength(track, gate),
  );

  const log: RaceEvent[] = [];
  let tick = 0;
  let distance = 0;
  let speed = LAUNCH_SPEED;
  let stage = 0;
  const damageTaken = 0;

  log.push({ tick, kind: 'start', distance, stage });

  while (distance < finishDistance && tick < MAX_RACE_TICKS) {
    // 1. Close on top speed. A ship never overshoots the speed it can hold.
    speed = Math.min(speed + stats.acceleration, stats.speed);

    // 2. Fly.
    distance += speed;
    tick++;

    // 3. Stage gate: the race pauses, the garage costs no ticks, and the ship
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

  const finished = distance >= finishDistance;
  log.push({
    tick,
    kind: finished ? 'finish' : 'abandoned',
    distance,
    stage,
  });

  return {
    finishTicks: tick,
    damageTaken,
    survived: finished,
    log,
    seed,
    stats,
  };
}

function segmentLength(track: Track, index: number): number {
  const segment = track.segments[index];
  if (segment === undefined) throw new Error(`Segment ${index} is not on this track.`);
  return segment.lengthTicks;
}
