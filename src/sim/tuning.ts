// Every balance number in the game, in one file. Never inline one of these.
//
// Not tuning, and so not here: algorithm internals (the RNG's constants),
// level data (the track's pieces), and structural numbers (array indices).

/** Ticks per second. The sim only ever counts whole ticks. */
export const TICK_HZ = 60;

/** Top speed, in track units per tick, at Thrust 1.0. */
export const SPEED_PER_THRUST = 0.85;

/** How hard the ship accelerates toward top speed, per tick, at Thrust 1.0. */
export const ACCEL_PER_THRUST = 0.0035;

/** How hard it can slow down, per tick. Braking beats accelerating. */
export const BRAKE_PER_TICK = 0.0075;

/**
 * Grip. A bend's holding speed is sqrt(HOLD_GRIP * handling * radius): the
 * fastest the ship can take it and stay on the golden path.
 */
export const HOLD_GRIP = 0.0078;

/** Lateral offset, in track units, drawn at an excess of 1.0 — twice the holding speed. */
export const SWING_SPREAD = 40;

/**
 * How steeply the swing grows with excess speed. Above 1 means a ship slightly
 * too fast is usually fine and a ship much too fast is unpredictable — which
 * is the whole bet the game rests on.
 */
export const SWING_EXPONENT = 1.8;

/**
 * Speed a Carry scrubs off per tick while it is over the holding speed in a
 * bend. Carrying too much speed costs some of it — less than braking early
 * would, which is why Carry sits between Lift and Charge.
 */
export const CARRY_SCRUB = 0.0022;

/** Charge is still accelerating when the bend arrives, so it draws from a worse place. */
export const CHARGE_EXCESS_BONUS = 0.18;

/** Half the width of the golden path. Beyond this the ship is wide. */
export const PATH_HALF_WIDTH = 9;

// Being wide costs more the further out you are. A ship that clips the edge
// barely pays; one thrown right out crawls back. A flat penalty was the first
// version and it let Thrust dominate — any speed was worth any swing.

/** What a ship keeps of its speed the moment it crosses the edge of the path. */
export const WIDE_SPEED_AT_EDGE = 0.94;

/** How much more it loses per track unit beyond the edge. */
export const WIDE_SPEED_PER_UNIT = 0.028;

/** However far out it ends up, it keeps at least this much. */
export const WIDE_SPEED_FLOOR = 0.42;

/** How fast the swing opens up through the bend, as a fraction closed per tick. */
export const SWING_RISE = 0.09;

/**
 * How hard a wide ship hauls itself back, as a fraction of its offset per tick
 * at Handling 1.0. Proportional, so it comes back fast at first and fights the
 * last few units — which is what being out of shape looks like.
 */
export const RECOVER_PER_HANDLING = 0.013;

/** The slowest it ever closes, so the last sliver of offset does not linger. */
export const RECOVER_FLOOR = 0.02;

/** Lift brakes to a shade under the holding speed, to be sure of it. */
export const LIFT_MARGIN = 0.97;

/** Ship stats are clamped to this range, so a slider cannot break the sim. */
export const STAT_MIN = 0.5;
export const STAT_MAX = 1.6;
