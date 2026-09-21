/**
 * How a ship flies, as physics rather than as a dice roll.
 *
 * The game's swing model threw a ship a random distance off the line when it
 * entered a bend too fast. It was cheap and it was never going to feel like
 * driving, because nothing the ship did between the entry and the exit
 * mattered. This is the other way round: the bend applies a force, the ship
 * answers it with grip, and where it ends up is whatever those two add to.
 *
 * The one relation the whole thing rests on:
 *
 *     a bend of radius r throws a ship at v² / r
 *     a ship can answer with at most `grip`
 *     so flat out through the bend is v = sqrt(grip · r)
 *
 * which is the game's `holdingSpeed` exactly. Nothing here changes the game's
 * numbers; it changes what happens between them.
 *
 * Pure and deterministic: no randomness at all, not even seeded. The same
 * inputs give the same lap, every time.
 */

import { makeRng, type Rng } from '../sim/rng';
import {
  DRAG,
  GHOST_DAMP,
  GHOST_LEAD,
  GHOST_PULL,
  GHOST_SIGHT,
  GHOST_SIGHT_STEP,
  GHOST_SOFT,
  MIN_ROLLING_SPEED,
  MOST_YAW,
  NAV_WANDER_LINE,
  NAV_WANDER_PACE,
  STEER_RATE,
  THROTTLE_RATE_DOWN,
  THROTTLE_RATE_UP,
  WANDER_SETTLE,
} from './knobs';
import { curvatureAt, shapeLength, type Shape } from './shape';

export interface Ship {
  /** The fastest it will go, in units per tick. */
  readonly topSpeed: number;
  /** How hard it pulls away from rest, in units per tick squared. */
  readonly accel: number;
  /** How hard it stops, in units per tick squared. */
  readonly brake: number;
  /** The lateral acceleration it can generate. Handling, in the units that matter. */
  readonly grip: number;
}

export interface Input {
  /** -1 is full brake, +1 is full throttle. */
  readonly throttle: number;
  /** -1 is full left, +1 is full right. */
  readonly steer: number;
}

export interface Flight {
  /** How far along the centre line the ship has come. */
  readonly along: number;
  /** How far off the line it sits, positive to its right. */
  readonly offset: number;
  readonly speed: number;
  /**
   * How far the ship points away from where the road goes, in radians.
   *
   * This is the state the old model had no version of, and it is why the old
   * model could not be driven. A ship with yaw is going sideways; it keeps
   * going sideways until something turns it back. Correcting a line is
   * spending yaw, and that takes room and time.
   */
  readonly yaw: number;
  /** Where the steering actually is, which lags where it was asked to be. */
  readonly steer: number;
  /** Where the throttle actually is, for the same reason. */
  readonly throttle: number;
  /** Ticks flown. */
  readonly tick: number;
}

export function atRest(speed = 0): Flight {
  return { along: 0, offset: 0, speed, yaw: 0, steer: 0, throttle: 0, tick: 0 };
}

function clamp(value: number, low: number, high: number): number {
  return value < low ? low : value > high ? high : value;
}

function approach(from: number, to: number, rate: number): number {
  return from + (to - from) * rate;
}

/** How fast this ship can go round this radius flat out: `sqrt(grip · r)`. */
export function holdingSpeed(ship: Ship, radius: number): number {
  return Math.sqrt(ship.grip * radius);
}

/**
 * The steering that would hold the line right now — `curvature · v² / grip`,
 * as a fraction of full lock.
 *
 * A number bigger than 1 means the bend cannot be held at this speed however
 * the ship is steered, and by how much. This is the single most useful thing
 * to put on the screen, because it is exactly what a navigation system knows
 * and a ship without one does not.
 */
export function steerToHold(ship: Ship, shape: Shape, state: Flight): number {
  const curve = curvatureAt(shape, state.along);
  return (curve * state.speed * state.speed) / ship.grip;
}

/** How fast the ship is going sideways relative to the road, positive right. */
export function sideways(state: Flight): number {
  return -state.speed * Math.sin(state.yaw);
}

/**
 * One tick.
 *
 * Forward and sideways are worked out separately, which is a simplification —
 * a real tyre spends one budget on both. It is left out on purpose: the point
 * of the lab is to find out whether *this* much is already enough to feel
 * like driving before anything more is added.
 */
export function step(ship: Ship, shape: Shape, state: Flight, input: Input): Flight {
  const askedThrottle = clamp(input.throttle, -1, 1);
  const askedSteer = clamp(input.steer, -1, 1);

  // Controls have weight. Lifting off is quicker than getting on it, because
  // a ship has mass and a pilot does not.
  const rate = askedThrottle > state.throttle ? THROTTLE_RATE_UP : THROTTLE_RATE_DOWN;
  const throttle = approach(state.throttle, askedThrottle, rate);
  const steer = approach(state.steer, askedSteer, STEER_RATE);

  // Forward. Acceleration falls away as the ship nears its top speed, which is
  // what makes a launch feel like a launch and the last tenth feel earned.
  // A flat rate is why the old model only ever looked like full or stopped.
  let speed = state.speed;
  if (throttle > 0) {
    speed += ship.accel * throttle * (1 - speed / ship.topSpeed);
  } else {
    // Drag only bites off the power. Under thrust the taper alone governs, so
    // a ship's top speed is the speed it actually reaches — otherwise the
    // number on the slider is a number the ship never sees.
    speed += ship.brake * throttle - speed * DRAG;
  }
  speed = clamp(speed, 0, ship.topSpeed);

  // Sideways. The ship's nose turns at (lateral acceleration / speed); the
  // road's own heading turns at (curvature × speed). Yaw is the difference.
  const rolling = Math.max(speed, MIN_ROLLING_SPEED);
  const curve = curvatureAt(shape, state.along);
  const yaw = clamp(
    state.yaw - (steer * ship.grip) / rolling + curve * rolling,
    -MOST_YAW,
    MOST_YAW,
  );

  // A ship pointing off the road goes off the road, and makes less progress
  // along it while doing so.
  const drift = -speed * Math.sin(yaw);
  return {
    along: state.along + speed * Math.cos(yaw),
    offset: state.offset + drift,
    speed,
    yaw,
    steer,
    throttle,
    tick: state.tick + 1,
  };
}

/**
 * The fastest the ship may be going here and still survive everything it can
 * see, given what it can brake.
 *
 * Reading the road ahead rather than the bend it is on is what lets a long
 * approach be worth more than a short one — the ship can carry speed later
 * into a straight that gives it room to shed it.
 */
export function ceilingAhead(ship: Ship, shape: Shape, along: number): number {
  let ceiling = ship.topSpeed;
  for (let look = 0; look <= GHOST_SIGHT; look += GHOST_SIGHT_STEP) {
    const curve = Math.abs(curvatureAt(shape, along + look));
    if (curve === 0) continue;
    const limit = Math.sqrt(ship.grip / curve);
    // What it may be doing now and still be down to `limit` in `look` units.
    ceiling = Math.min(ceiling, Math.sqrt(limit * limit + 2 * ship.brake * look));
  }
  return ceiling;
}

/**
 * The one driver, told how far ahead it reads and what it is getting wrong.
 *
 * `lead` is how many ticks of road it looks past its own nose, `lineError` is
 * how far off it thinks the line is in units, and `paceError` is how wrong it
 * is about its own ceiling as a fraction. Perfect navigation is `GHOST_LEAD`
 * and two zeroes; everything below that is the same driver, worse informed.
 */
function drive(
  ship: Ship,
  shape: Shape,
  state: Flight,
  lead: number,
  lineError: number,
  paceError: number,
): Input {
  const ceiling = ceilingAhead(ship, shape, state.along) * (1 + paceError);
  const throttle = clamp((ceiling - state.speed) / GHOST_SOFT, -1, 1);

  // Read `lead` ticks of road ahead, not underfoot: steering answers over
  // `1 / STEER_RATE` ticks, and a ship that waits for the bend to arrive has
  // already been thrown wide by the time the lock is on. At the limit there is
  // no lock left over to correct with, so the moment is not recoverable —
  // which is why this one line is worth nine units of road.
  const curve = curvatureAt(shape, state.along + state.speed * lead);
  const want =
    curve * state.speed * state.speed -
    (state.offset - lineError) * GHOST_PULL -
    sideways(state) * GHOST_DAMP;
  return { throttle, steer: clamp(want / ship.grip, -1, 1) };
}

/**
 * How a ship with a perfect navigation system drives: it knows the line, and
 * it knows what it can brake.
 *
 * This exists to be raced against. The gap between it and a human on the same
 * ship is, to the tick, what a navigation system is worth — which is the thing
 * that has been impossible to see.
 */
export function ghostInput(ship: Ship, shape: Shape, state: Flight): Input {
  return drive(ship, shape, state, GHOST_LEAD, 0, 0);
}

/** Something that drives, and remembers what it is currently getting wrong. */
export type Pilot = (state: Flight) => Input;

/**
 * A driver with a navigation rating from 0 to 100.
 *
 * At 100 this is `ghostInput` exactly, with no randomness at all — the two
 * wanders are multiplied by zero, so the reference line stays the reference
 * line. Below it, the ship reads less of the road ahead and is wrong, slowly,
 * about where the line is and how fast it may go.
 *
 * It keeps state, so a run is replayed by making a fresh pilot on the same
 * seed rather than by rewinding this one.
 */
export function makePilot(ship: Ship, shape: Shape, nav: number, seed: number): Pilot {
  const skill = clamp(nav, 0, 100) / 100;
  const lost = 1 - skill;
  const line: Rng = makeRng(seed).fork(1);
  const pace: Rng = makeRng(seed).fork(2);
  let lineWander = 0;
  let paceWander = 0;

  // A first-order filter on white noise: slow, and it forgets where it was.
  //
  // Normalised so the result has a standard deviation of one whatever
  // WANDER_SETTLE is. Without this the filter quietly shrinks its own input by
  // about seventeen times at the settle rate used here, and every amplitude
  // constant below would mean something other than what it says.
  const gain = Math.sqrt((3 * (2 - WANDER_SETTLE)) / WANDER_SETTLE);
  const wander = (was: number, rng: Rng): number =>
    was + ((rng.unitInterval() * 2 - 1) * gain - was) * WANDER_SETTLE;

  return (state) => {
    lineWander = wander(lineWander, line);
    paceWander = wander(paceWander, pace);
    return drive(
      ship,
      shape,
      state,
      GHOST_LEAD * skill,
      lineWander * lost * NAV_WANDER_LINE * shape.halfWidth,
      paceWander * lost * NAV_WANDER_PACE,
    );
  };
}

export interface Run {
  readonly ticks: number;
  readonly worst: number;
  readonly path: readonly Flight[];
  readonly finished: boolean;
}

/**
 * Fly the shape start to finish under some driver. The lab's measuring stick:
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
