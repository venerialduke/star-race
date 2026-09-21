/**
 * How a ship flies: physics, not a dice roll.
 *
 * This is the model the feel lab was built to find, moved into the simulation
 * so that the lab and the game cannot say different things about the same
 * ship. It holds **no geometry at all** — the caller says what the road is
 * doing where the ship is, and this says what the ship does about it. That is
 * what lets one straight-bend-straight in `src/lab` and a whole circuit in
 * `race.ts` share every line of it.
 *
 * The relation the whole thing rests on:
 *
 *     a bend of radius r throws a ship at   v² / r
 *     a ship answers with at most           grip
 *     so flat out through the bend is       v = sqrt(grip · r)
 *
 * which is `holdingSpeed` in `track.ts`, unchanged. What is new is **yaw** —
 * how far the ship points away from where the road goes. A ship with yaw is
 * going sideways and keeps going sideways until something turns it back, so
 * correcting a line costs room and time. The old swing had no version of that,
 * which is why nothing a ship did between turn-in and the exit could matter.
 *
 * **Signs.** Positive lateral is one side of the road and the caller picks
 * which; curvature is positive when the road curves *toward* positive lateral,
 * steering is positive when it pushes the ship that way, and so is a bumper.
 * Every equation here is symmetric under flipping all of them together, so the
 * only rule is to be consistent. The game uses left-positive, because that is
 * what `Bend.turn` and `RaceState.offset` already meant.
 */

import {
  BUMPER_RAMP,
  DRAG,
  MIN_ROLLING_SPEED,
  MOST_YAW,
  NAV_BEST,
  NAV_LEAD_CURVE,
  NAV_LINE_CURVE,
  NAV_PACE_CURVE,
  NAV_WANDER_LINE,
  NAV_WANDER_PACE,
  PILOT_DAMP,
  PILOT_LEAD,
  PILOT_PULL,
  PILOT_SOFT,
  RECOVER_DEADBAND,
  RECOVER_LEAST,
  RECOVER_MOST,
  RECOVER_OVERDRAW,
  STEER_RATE,
  THROTTLE_RATE_DOWN,
  THROTTLE_RATE_UP,
  WANDER_SETTLE,
} from './tuning';

/** What a ship is, as far as flying is concerned. */
export interface Flier {
  /** The fastest it will go, in units per tick. */
  readonly topSpeed: number;
  /** How hard it pulls away from rest, in units per tick squared. */
  readonly accel: number;
  /** How hard it stops, in units per tick squared. */
  readonly brake: number;
  /** The lateral acceleration it can generate — handling, in the units that matter. */
  readonly grip: number;
}

/** Where a ship is and what it is doing, sideways included. */
export interface Motion {
  readonly speed: number;
  readonly offset: number;
  /** How far the ship points away from where the road goes, in radians. */
  readonly yaw: number;
  /** Where the steering actually is, which lags where it was asked to be. */
  readonly steer: number;
  /** Where the throttle actually is, for the same reason. */
  readonly throttle: number;
}

export interface Control {
  /** -1 is full brake, +1 is full throttle. */
  readonly throttle: number;
  /** -1 to +1, positive pushing the ship toward positive lateral. */
  readonly steer: number;
}

/** What the road is doing under the ship this tick. */
export interface Underfoot {
  /** Signed curvature, positive when the road curves toward positive lateral. */
  readonly curvature: number;
  /** Lateral acceleration from the bumpers, if the road has any. */
  readonly bumper: number;
}

function clamp(value: number, low: number, high: number): number {
  return value < low ? low : value > high ? high : value;
}

function approach(from: number, to: number, rate: number): number {
  return from + (to - from) * rate;
}

export function stillFlight(speed = 0): Motion {
  return { speed, offset: 0, yaw: 0, steer: 0, throttle: 0 };
}

/** How fast the ship is going sideways relative to the road. */
export function sideways(motion: Motion): number {
  return -motion.speed * Math.sin(motion.yaw);
}

/**
 * How much of the steering a bend needs at a speed, as a fraction of full lock:
 * `curvature · v² / grip`.
 *
 * Over 1 means the bend cannot be held at this speed however the ship is
 * steered, and by how much.
 */
export function lockToHold(grip: number, curvature: number, speed: number): number {
  return (curvature * speed * speed) / grip;
}

/** How far the ship moves along the road this tick, given it is also sliding. */
export function alongStep(motion: Motion): number {
  return motion.speed * Math.cos(motion.yaw);
}

/**
 * One tick of flight.
 *
 * Forward and sideways are worked out separately, which is a simplification: a
 * real tyre spends one budget on both. It is left out on purpose — the lab
 * showed this much is already enough to feel like driving, and a friction
 * circle is a change to make on evidence rather than on principle.
 */
export function advance(
  flier: Flier,
  motion: Motion,
  control: Control,
  road: Underfoot,
): Motion {
  const askedThrottle = clamp(control.throttle, -1, 1);
  const askedSteer = clamp(control.steer, -1, 1);

  // Controls have weight. Lifting off is quicker than getting on it, because a
  // ship has mass and a pilot does not.
  const rate = askedThrottle > motion.throttle ? THROTTLE_RATE_UP : THROTTLE_RATE_DOWN;
  const throttle = approach(motion.throttle, askedThrottle, rate);
  const steer = approach(motion.steer, askedSteer, STEER_RATE);

  // Forward. Acceleration falls away as the ship nears its top speed, which is
  // what makes a launch feel like a launch and the last tenth feel earned. A
  // flat rate is why a ship used to be only ever flat out or stopped.
  //
  // Drag bites only off the power: applied under thrust as well it fights the
  // taper, and a ship settles below the top speed its own engine claims.
  let speed = motion.speed;
  if (throttle > 0) {
    speed += flier.accel * throttle * (1 - speed / flier.topSpeed);
  } else {
    speed += flier.brake * throttle - speed * DRAG;
  }
  speed = clamp(speed, 0, flier.topSpeed);

  // Sideways. The ship's nose turns at (lateral acceleration / speed); the
  // road's own heading turns at (curvature × speed). Yaw is the difference.
  // The bumpers push exactly as the steering does, and the ship has no say in
  // it — that is the road leaning on the ship rather than the pilot steering.
  const rolling = Math.max(speed, MIN_ROLLING_SPEED);
  const yaw = clamp(
    motion.yaw - (steer * flier.grip + road.bumper) / rolling + road.curvature * rolling,
    -MOST_YAW,
    MOST_YAW,
  );

  return {
    speed,
    offset: motion.offset - speed * Math.sin(yaw),
    yaw,
    steer,
    throttle,
  };
}

/**
 * The lateral acceleration the bumpers apply at an offset.
 *
 * Zero inside them, easing in over `BUMPER_RAMP`, and capped after — a ship a
 * long way out is pushed back steadily, not flung. Not a wall and not a
 * penalty: it bounds a deep excursion so that nobody has to yank at the
 * steering to get home, which is what let the correction below be gentle.
 *
 * Absolute rather than scaled by the ship, because it belongs to the road: a
 * grippy ship should not be shoved back harder than a loose one.
 */
export function bumperPush(offset: number, from: number, push: number): number {
  if (push <= 0) return 0;
  const past = Math.abs(offset) - from;
  if (past <= 0) return 0;
  return -Math.sign(offset) * push * Math.min(1, past / Math.max(1, BUMPER_RAMP));
}

/**
 * A slow wander, one tick on. Normalised so the result has a standard
 * deviation of one whatever `WANDER_SETTLE` is — without that the filter
 * quietly shrinks its own input by about seventeen times at the rate used
 * here, and every amplitude that reads it means a fraction of what it says.
 *
 * Slow on purpose. Fast jitter is filtered out by the ship's own steering lag
 * and changes almost nothing; it reads as a twitch rather than as
 * misjudgement, and bad flying is being in the wrong place and late to notice.
 */
export function wanderOn(was: number, unitDraw: number): number {
  const gain = Math.sqrt((3 * (2 - WANDER_SETTLE)) / WANDER_SETTLE);
  return was + ((unitDraw * 2 - 1) * gain - was) * WANDER_SETTLE;
}

/** How well a navigation rating flies, broken into the three things it is. */
export interface Skill {
  /** How much of a steering lag it reads ahead, 0 to 1. */
  readonly reads: number;
  /** How wrong it is about where the line is, as a multiple of a half-width. */
  readonly line: number;
  /** How wrong it is about its own speed ceiling, as a fraction. */
  readonly pace: number;
}

/**
 * What a navigation system is worth, from the stat to the three failings.
 *
 * A straight line through all three made no navigation and half of it feel
 * like the same ship, and simply making the bottom worse made none and a
 * quarter feel alike instead. What separates them is failing **differently**:
 * anticipation comes back fast, the wobble fades evenly, and misjudging its
 * own pace is concentrated at the very bottom — so a ship with no navigation
 * does not wobble more, it arrives at bends hopelessly wrong and blows them.
 */
export function skillOf(nav: number): Skill {
  const rating = clamp(nav / NAV_BEST, 0, 1);
  const lost = 1 - rating;
  return {
    reads: Math.pow(rating, NAV_LEAD_CURVE),
    line: Math.pow(lost, NAV_LINE_CURVE) * NAV_WANDER_LINE,
    pace: Math.pow(lost, NAV_PACE_CURVE) * NAV_WANDER_PACE,
  };
}

/** How far ahead a ship reads the road, in units, at a speed. */
export function leadOf(skill: Skill, speed: number): number {
  return speed * PILOT_LEAD * skill.reads;
}

/** What the pilot can see, worked out by the caller from the road it is on. */
export interface Sighted {
  /** Curvature one steering lag ahead — what to steer for, not what is underfoot. */
  readonly ahead: number;
  /** Curvature underfoot, which is what decides whether lifting frees up grip. */
  readonly under: number;
  /** The fastest the road ahead allows, given what the ship can brake. */
  readonly ceiling: number;
  /** Where the pilot believes the line is, which is not always where it is. */
  readonly linePlace: number;
}

/**
 * How a ship drives itself.
 *
 * Two independent closed forms, no search. Speed comes from a ceiling the
 * caller reads off the road ahead; steering is the lock the bend needs plus a
 * correction for where the ship actually is.
 *
 * Three rules make it work, and each was found by a measurement that
 * contradicted the obvious thing:
 *
 * 1. **Read a steering lag ahead, not underfoot.** Steering answers over
 *    `1 / STEER_RATE` ticks, and a ship that waits for the bend to arrive has
 *    been thrown wide by the time the lock is on. At the limit there is no lock
 *    left over to correct with, so the moment is not recoverable. One line,
 *    worth nine units of road.
 * 2. **The bend is served first.** The correction gets only the lock the
 *    feed-forward is not using, plus `RECOVER_OVERDRAW`. Without this a stiff
 *    correction fights the feed-forward and the ship leaves the bend entirely.
 * 3. **When there is no lock spare, slow down.** If getting back needs `fix` of
 *    it, the bend may only have `1 - fix`, so the ship must be down to
 *    `sqrt(grip · (1 - fix) / curvature)`. This is the whole of why an
 *    excursion costs time: nothing punishes being off the line, it is slow by
 *    itself because getting back spends the grip the bend was using.
 */
export function pilot(flier: Flier, motion: Motion, seen: Sighted): Control {
  const hold = lockToHold(flier.grip, seen.ahead, motion.speed);
  const fix =
    (-(motion.offset - seen.linePlace) * PILOT_PULL - sideways(motion) * PILOT_DAMP) /
    flier.grip;

  let ceiling = seen.ceiling;
  const under = Math.abs(seen.under);
  if (under > 0) {
    const asked = Math.max(0, Math.abs(fix) - RECOVER_DEADBAND);
    const spare = Math.max(RECOVER_LEAST, 1 - Math.min(RECOVER_MOST, asked));
    ceiling = Math.min(ceiling, Math.sqrt((flier.grip * spare) / under));
  }

  const room = Math.max(0, 1 - Math.abs(hold)) + RECOVER_OVERDRAW;
  return {
    throttle: clamp((ceiling - motion.speed) / PILOT_SOFT, -1, 1),
    steer: clamp(hold + clamp(fix, -room, room), -1, 1),
  };
}
