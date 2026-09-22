/**
 * The lab's flight, which is the game's flight.
 *
 * Everything that decides what a ship does now lives in `src/sim/flight.ts` —
 * this file is the geometry around it: a `Shape` instead of a circuit, a
 * distance along that shape, and the bookkeeping a hand-flown run needs. The
 * physics and the pilot are imported, not copied, so the lab and the race
 * cannot drift apart. They did for one afternoon and it was already confusing.
 *
 * **Signs.** The lab reads positive as the ship's *right*; the game reads it as
 * left. Neither is more correct and the shared model is symmetric under
 * flipping all of them together — curvature, steering, offset and bumper — so
 * the only rule is to be consistent within one caller, and this file is.
 */

import {
  advance,
  alongStep,
  bumperPush as pushFrom,
  leadOf,
  lockToHold,
  paceBelief,
  pilot,
  sideways as sidewaysOf,
  skillOf,
  wanderOn,
  type Control,
  type Flier,
  type Motion,
  type Sighted,
} from '../sim/flight';
import { makeRng, type Rng } from '../sim/rng';
import { PILOT_SIGHT } from '../sim/tuning';
import { crossedBump, curvatureAt, shapeLength, type Shape } from './shape';

/** A ship, as far as flying is concerned. The same shape the race uses. */
export type Ship = Flier;

/** What the pilot, or the person at the keyboard, is asking for. */
export type Input = Control;

/** Where a ship is on the shape, and what it is doing. */
export interface Flight extends Motion {
  /** How far along the centre line the ship has come. */
  readonly along: number;
  /** Ticks flown. */
  readonly tick: number;
}

export function atRest(speed = 0): Flight {
  return { along: 0, offset: 0, speed, yaw: 0, steer: 0, throttle: 0, tick: 0 };
}

function clamp(value: number, low: number, high: number): number {
  return value < low ? low : value > high ? high : value;
}

/** How fast this ship can go round this radius flat out: `sqrt(grip · r)`. */
export function holdingSpeed(ship: Ship, radius: number): number {
  return Math.sqrt(ship.grip * radius);
}

/**
 * The steering that would hold the line right now, as a fraction of full lock.
 * Over 1 means the bend cannot be held at this speed however it is steered —
 * the single most useful thing to put on the screen, because it is exactly
 * what a navigation system knows and a ship without one does not.
 */
export function steerToHold(ship: Ship, shape: Shape, state: Flight): number {
  return lockToHold(ship.grip, curvatureAt(shape, state.along), state.speed);
}

/** How fast the ship is going sideways relative to the road. */
export function sideways(state: Flight): number {
  return sidewaysOf(state);
}

/** One tick: the shared physics, plus this shape's bumpers and anything on it. */
export function step(ship: Ship, shape: Shape, state: Flight, input: Input): Flight {
  const bumpers = shape.bumpers;
  const flown = advance(ship, state, input, {
    curvature: curvatureAt(shape, state.along),
    bumper:
      bumpers === undefined
        ? 0
        : pushFrom(state.offset, bumpers.from, bumpers.push),
  });
  const along = state.along + alongStep(flown);

  // Anything on the road that shoves the ship sideways does it here, by adding
  // to how fast it is already going sideways and re-deriving where it points.
  const bump = crossedBump(shape, state.along, along);
  const yaw =
    bump === undefined
      ? flown.yaw
      : -Math.asin(
          clamp((sidewaysOf(flown) + bump.push) / Math.max(flown.speed, 0.08), -1, 1),
        );

  return { ...flown, yaw, along, tick: state.tick + 1 };
}

/**
 * The fastest the ship may be going here and still survive everything it can
 * see, given what it can brake.
 *
 * The lab reads the whole shape rather than the next bend, because it has only
 * one and can afford to; the race reads the next bend, because it has a
 * circuit and a sight range to spend.
 */
export function ceilingAhead(ship: Ship, shape: Shape, along: number, speed = 1): number {
  let ceiling = ship.topSpeed;
  const warning = Math.max(speed, 0.08) * PILOT_SIGHT;
  for (let look = 0; look <= warning; look += 6) {
    const curve = Math.abs(curvatureAt(shape, along + look));
    if (curve === 0) continue;
    const limit = Math.sqrt(ship.grip / curve);
    ceiling = Math.min(ceiling, Math.sqrt(limit * limit + 2 * ship.brake * look));
  }
  return ceiling;
}

function seenBy(ship: Ship, shape: Shape, state: Flight, reads: number, miss: number): Sighted {
  return {
    ahead: curvatureAt(shape, state.along + state.speed * leadOf({ reads, line: 0, pace: 0 }, 1)),
    under: curvatureAt(shape, state.along),
    ceiling: ceilingAhead(ship, shape, state.along, state.speed),
    linePlace: miss,
  };
}

/** How a ship with a perfect navigation system flies: the reference line. */
export function ghostInput(ship: Ship, shape: Shape, state: Flight): Input {
  return pilot(ship, state, seenBy(ship, shape, state, 1, 0));
}

/** Something that flies, and remembers what it is currently getting wrong. */
export type Pilot = (state: Flight) => Input;

/**
 * A pilot with a navigation rating from 0 to 100.
 *
 * At 100 this is `ghostInput` exactly, with no randomness at all — the wanders
 * are multiplied by zero, so the reference line stays the reference line.
 *
 * The rating is quoted out of 100 here and out of `NAV_BEST` in the game; both
 * go through the same `skillOf`, so a lab slider at 100 and a maxed navigation
 * system in a race are the same pilot.
 */
export function makePilot(ship: Ship, shape: Shape, nav: number, seed: number): Pilot {
  const skill = skillOf((clamp(nav, 0, 100) / 100) * 3);
  const line: Rng = makeRng(seed).fork(1);
  const pace: Rng = makeRng(seed).fork(2);
  let lineWander = 0;
  let paceWander = 0;

  return (state) => {
    lineWander = wanderOn(lineWander, line.unitInterval());
    paceWander = wanderOn(paceWander, pace.unitInterval());
    const seen: Sighted = {
      ahead: curvatureAt(shape, state.along + leadOf(skill, state.speed)),
      under: curvatureAt(shape, state.along),
      ceiling:
        ceilingAhead(ship, shape, state.along, state.speed) *
        paceBelief(paceWander, skill.pace),
      linePlace: lineWander * skill.line * shape.halfWidth,
    };
    return pilot(ship, state, seen);
  };
}

export interface Run {
  readonly ticks: number;
  readonly worst: number;
  readonly path: readonly Flight[];
  readonly finished: boolean;
}

/**
 * Fly the shape start to finish under some pilot. The lab's measuring stick:
 * how long it took and how far off the line it ever got.
 */
export function fly(
  ship: Ship,
  shape: Shape,
  drive: (state: Flight) => Input,
  from: Flight = atRest(),
  limit = 6000,
): Run {
  const end = shapeLength(shape);
  const path: Flight[] = [from];
  let state = from;
  let worst = Math.abs(from.offset);
  while (state.along < end && state.tick - from.tick < limit) {
    state = step(ship, shape, state, drive(state));
    worst = Math.max(worst, Math.abs(state.offset));
    path.push(state);
  }
  return { ticks: state.tick - from.tick, worst, path, finished: state.along >= end };
}
