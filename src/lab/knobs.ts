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

/**
 * How hard the ghost pulls back toward the centre line, per unit off it, and
 * how hard it damps its own approach, per unit of sideways.
 *
 * The pull is *half* what it was and the damping is two and a half times it,
 * because the thing that made recovery feel violent was not weakness, it was
 * **overshoot**. A shove used to send the ship back across the centre and out
 * the other side — 0, 8, 14, 16, 14, 9, 1, -4, -6, -7 — and then back again.
 *
 * An earlier tuning pass missed it because it scored "ticks until back within
 * one unit of the line", which rewards a fast first crossing and says nothing
 * at all about what happens after it. Scored on overshoot instead: past the
 * centre by 9.7 units before, 0.1 now; mean yaw through the recovery 0.29
 * before, 0.13 now; ticks pegged at the yaw clamp 95 before, 9 now. The return
 * is monotone — 0, 8, 13, 9, 6, 5, 4, 3, 2 — for 0.6% on a clean lap.
 */
export const GHOST_PULL = 0.003;
export const GHOST_DAMP = 0.3;

// ---------------------------------------------------------------------------
// The bumpers.
//
// A soft lateral push back toward the road once a ship is well off it. Not a
// wall, not a penalty, and not the driver's doing — it is the road leaning on
// the ship, so a deep excursion is bounded without anybody having to yank at
// the steering. Containing it this way is what let the correction above be
// halved: with the bumpers on, the worst a shove does falls from 22.6 units to
// 14.0 even with the gentler gains.
// ---------------------------------------------------------------------------

/** Where they begin, as a multiple of the path's half-width. */
export const BUMPER_FROM = 1;

/** Units over which the push reaches full strength. Short, so it bites. */
export const BUMPER_RAMP = 6;

/**
 * The lateral acceleration at full strength, in units per tick squared.
 *
 * Absolute rather than scaled by the ship, because it belongs to the road: a
 * grippy ship should not be shoved back harder than a loose one.
 */
export const BUMPER_PUSH = 0.024;

/**
 * The bend gets its steering first; the correction may only have the lock left
 * over, plus this much overdraw.
 *
 * Without it a stiff correction fights the feed-forward and the ship simply
 * leaves the corner: shoved before turn-in, the same gains go from 6.8 units
 * off with this rule to 60.7 without it.
 */
export const RECOVER_OVERDRAW = 0.5;

/**
 * And when there is no lock to spare, the answer is not to steer harder, it is
 * to slow down: if getting back to the line needs `fix` of the lock, the bend
 * may only have `1 - fix`, so the ship must be down to
 * `sqrt(grip · (1 - fix) / curvature)`.
 *
 * This is the whole of why an excursion costs time. Nothing punishes going
 * wide in the lab — being off the line is slower on its own, because getting
 * back spends the grip the corner was using. A penalty that falls out of the
 * physics beats one that is invented.
 */
export const RECOVER_DEADBAND = 0.25;
export const RECOVER_LEAST = 0.15;
export const RECOVER_MOST = 0.85;

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

// ---------------------------------------------------------------------------
// Navigation, 0 to 100.
//
// 100 is the ghost above: it anticipates a full steering lag and knows exactly
// where the line and the limit are. 0 is a ship with no navigation at all.
// What falls away in between is three things, and each is something a pilot
// would plausibly be bad at rather than a number bolted onto the outcome:
//
//   - how far ahead it reads the road   (deterministic; the measured big lever)
//   - where it thinks the line is       (a slow wander)
//   - how fast it thinks it can go      (a slow wander)
//
// The wanders are slow on purpose. Fast jitter is filtered out by the ship's
// own steering lag and changes almost nothing, and it looks like a twitch
// rather than like misjudgement. Bad driving is being in the wrong place and
// late to notice, not vibrating.
// ---------------------------------------------------------------------------

/**
 * How quickly a wander forgets where it was, per tick. 0.02 is a time constant
 * of fifty ticks, so a misjudgement lasts most of a second — long enough to
 * put the ship somewhere it has to recover from.
 */
export const WANDER_SETTLE = 0.02;

/**
 * How far a ship with no navigation misjudges the line, as a multiple of the
 * path's half-width.
 */
export const NAV_WANDER_LINE = 1.6;

/**
 * How badly a ship with no navigation misjudges its own speed ceiling, as a
 * fraction of it. Sometimes it arrives too hot, sometimes it crawls.
 */
export const NAV_WANDER_PACE = 0.35;

/**
 * How the rating maps onto the three things it is made of.
 *
 * A straight line through all three made 0 and 50 feel like the same ship, and
 * simply making the bottom worse made 0 and 25 feel like the same ship instead.
 * What separates them is failing *differently*, not failing more:
 *
 * - `NAV_LEAD_CURVE` below 1: anticipation comes back fast, so a rating of 50
 *   already reads most of the road ahead and looks broadly competent.
 * - `NAV_LINE_CURVE` near 1: the wobble in where it thinks the line is fades
 *   about evenly across the dial, and its amplitude is *smaller* than it was.
 * - `NAV_PACE_CURVE` well above 1: misjudging its own speed is concentrated at
 *   the very bottom. That is what makes no-navigation look different in kind
 *   rather than in degree — it does not wobble more, it arrives at corners
 *   hopelessly wrong and blows them.
 *
 * Re-fitted once the bumpers landed, because they change what the dial can
 * mean: a bumper bounds how far *anybody* gets, so the separation between
 * ratings moves off the ruler and onto the clock. Measured over thirty runs a
 * rating (r55/90°, handling 1.2): median units off the line 12.5 / 11.0 / 6.4 /
 * 2.7 / 0.4 at 0 / 25 / 50 / 75 / 100, and a lap 43% / 29% / 20% / 5% / 0%
 * longer than the reference.
 */
export const NAV_LEAD_CURVE = 0.65;
export const NAV_LINE_CURVE = 1.3;
export const NAV_PACE_CURVE = 1.6;
