/**
 * The lab's own numbers.
 *
 * These are deliberately *not* in `src/sim/tuning.ts`. The lab is an
 * experiment in how a ship should feel to drive, and until that model earns
 * its way into the game it has no business sitting beside the game's balance.
 * If the model ships, these move to `tuning.ts` and this file goes away.
 *
 * The scale is the game's scale, so anything learned here transfers: distance
 * is in track units, time is in ticks, and `HOLD_GRIP` below is the same
 * number `src/sim/tuning.ts` uses.
 */

/** Ticks per second. The same clock the game runs on. */
export const TICK_HZ = 60;

/**
 * Lateral acceleration per point of handling, in units per tick squared.
 * A bend of radius r can be held flat out at `sqrt(GRIP_PER_HANDLING * r)`,
 * which is exactly the game's `holdingSpeed`.
 */
export const GRIP_PER_HANDLING = 0.0078;

/** Half the width of the golden path, in units. The game's number. */
export const PATH_HALF_WIDTH = 9;

/**
 * Coasting drag, as a fraction of speed shed per tick. Small: enough that
 * lifting off is felt, not so much that it stands in for the brake.
 *
 * It applies only off the power. Applied under thrust as well it fights the
 * acceleration taper, and a ship settles below the top speed on its own
 * slider — which makes every number in the lab quietly mean something else.
 */
export const DRAG = 0.0012;

/**
 * How fast the *ship* answers the steering, as a fraction of the way to the
 * asked-for input per tick. Steering has weight; a ship does not snap from
 * straight to full lock.
 *
 * This is the ship's own lag and not the pilot's, and the two must not be
 * confused. Slowing this down to give a keyboard finer control costs a perfect
 * driver the line as well: measured over sixteen ship-and-bend pairs, the best
 * a ghost can hold goes from 1.4 units off at 0.09 to 7.5 at 0.05 and 14.6 at
 * 0.035, whatever it anticipates. Fine control belongs on the input, below.
 */
export const STEER_RATE = 0.09;

/**
 * How fast *holding a key* builds a steering command, and how fast letting go
 * gives it back.
 *
 * A key is on or off, and a ship that goes from straight to full lock in half
 * a second cannot be placed on a line — which is the same complaint as a ship
 * that is only ever flat out or stopped, wearing different clothes. Holding
 * builds to full lock over about a second and a half, so a tap is a nudge and
 * a hold is a commitment. Letting go is quicker, because straightening up is
 * the thing a driver wants to happen now.
 *
 * It shapes the input and nothing else: the ghost commands the ship directly
 * and never sees it.
 */
export const KEY_STEER_ON = 0.035;
export const KEY_STEER_OFF = 0.12;

/** Throttle builds (a ship has mass) and lifts off at once (so does a pilot). */
export const THROTTLE_RATE_UP = 0.08;
export const THROTTLE_RATE_DOWN = 0.5;

/**
 * Below this speed, steering has nothing to work against — dividing the
 * ship's turn rate by its speed would blow up. A floor, not a rule.
 */
export const MIN_ROLLING_SPEED = 0.08;

/**
 * How far the ship may point away from the road before it is simply spinning.
 * Reaching it is not a penalty, it is a statement: the corner is gone.
 */
export const MOST_YAW = 0.7;

/** Past this much yaw the ship is visibly sliding, and the readout says so. */
export const SLIDING_YAW = 0.22;

// ---------------------------------------------------------------------------
// The ghost — a ship driven perfectly, which is what a navigation system is
// worth. It is a PD controller on the offset plus the steering the bend needs.
// ---------------------------------------------------------------------------

/** How hard the ghost pulls back toward the centre line, per unit off it. */
export const GHOST_PULL = 0.00055;

/** How hard the ghost damps its own approach to the line, per unit of sideways. */
export const GHOST_DAMP = 0.055;

/** How far ahead the ghost reads the road, in units. */
export const GHOST_SIGHT = 700;

/** The step it reads the road at. Fine enough not to miss a bend's start. */
export const GHOST_SIGHT_STEP = 6;

/**
 * How far above its speed ceiling the ghost must be for full brake. Below it
 * the throttle eases, which is what makes the ghost look like it is driving
 * rather than switching.
 */
export const GHOST_SOFT = 0.06;

/**
 * How far ahead the ghost steers for, in ticks of its own steering lag.
 *
 * Measured, and then explained: a ship that turns in exactly one steering
 * time-constant early holds the line to within a unit; one that waits for the
 * bend to arrive is nine units wide at the same speed, and no amount of
 * correction afterwards recovers it, because at the limit there is no lock
 * left to correct with.
 *
 * This is the clearest thing the lab has found. **Anticipation is what a
 * navigation system buys** — not precision against a number, but knowing the
 * corner is coming in time to do anything about it.
 */
export const GHOST_LEAD = 1 / STEER_RATE;
