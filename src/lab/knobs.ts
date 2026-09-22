/**
 * The lab's numbers — all of which now live in `src/sim/tuning.ts`.
 *
 * They were the lab's own while the flight model was an experiment. It is the
 * game's model now, so the numbers are the game's numbers, and this file is a
 * doorway rather than a store: the lab and the race cannot be tuned apart,
 * because there is only one set of them to tune.
 */

export {
  BUMPER_FROM,
  BUMPER_PUSH,
  BUMPER_RAMP,
  DRAG,
  GRIP_PER_HANDLING,
  MIN_ROLLING_SPEED,
  MOST_YAW,
  NAV_BEST,
  NAV_LEAD_CURVE,
  NAV_LINE_CURVE,
  NAV_PACE_CURVE,
  NAV_WANDER_LINE,
  NAV_WANDER_PACE,
  PATH_HALF_WIDTH,
  PILOT_DAMP,
  PILOT_LEAD,
  PILOT_PULL,
  PILOT_SOFT,
  RECOVER_DEADBAND,
  RECOVER_LEAST,
  RECOVER_MOST,
  RECOVER_OVERDRAW,
  SLIDING_YAW,
  STEER_RATE,
  THROTTLE_RATE_DOWN,
  THROTTLE_RATE_UP,
  TICK_HZ,
  WANDER_SETTLE,
} from '../sim/tuning';

/**
 * How fast holding a key builds a steering command, and how fast letting go
 * gives it back. The one number here that is genuinely the lab's, because the
 * game has no keyboard: a key is on or off, and a ship that goes from straight
 * to full lock in half a second cannot be placed on a line by hand.
 *
 * It shapes the input and nothing else — the ship's own lag is `STEER_RATE`,
 * and slowing *that* to suit a keyboard costs a perfect pilot the line.
 */
export const KEY_STEER_ON = 0.035;
export const KEY_STEER_OFF = 0.12;
