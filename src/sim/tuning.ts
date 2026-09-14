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

// The ship, before anything is fitted. An empty ship still flies, slowly.

export const BASE_THRUST = 0.78;
export const BASE_HANDLING = 0.7;

/** How fast a ship with nobody aboard patches itself up. Barely at all. */
export const BASE_REPAIR = 0.25;

/** Shields with nothing fitted: none. A bare ship meets a hazard bare. */
export const BASE_SHIELDS = 0;

/**
 * Endurance with no crew aboard. Low, because nav is flying the ship alone —
 * which the framework says it does badly.
 */
export const BASE_ENDURANCE = 0.35;

// Hazards. The ground off the golden path is not just slower; the framework
// says it holds things that hurt.

/** Damage taken on being thrown off the path, at top speed and a full swing. */
export const HAZARD_DAMAGE = 18;

/**
 * Condition lost per point of damage that gets past the shields. Damage is
 * split across whatever it hits, so a big hit spread over three parts costs
 * each of them less than a small hit on one.
 */
export const CONDITION_PER_DAMAGE = 0.045;

/** Every this much damage in one hit finds another part to break. */
export const DAMAGE_PER_EXTRA_PART = 6;

/** Condition repaired per tick, per point of the crew's repair rating. */
export const REPAIR_PER_TICK = 0.00035;

/** The swing, in track units, that counts as being thrown all the way out. */
export const HAZARD_FULL_EXPOSURE = 26;

/**
 * An excursion counts as over once the ship is back inside this share of the
 * path's half width — so drifting across the line does not bill it twice.
 */
export const EXCURSION_CLEAR = 0.6;

/** Shields regenerate this much per tick while the ship is on the path. */
export const SHIELD_REGEN = 0.035;

// Gravity, and what it does to a crew.

/** Gravity accrued per unit of acceleration the engine applies. */
export const GRAVITY_PER_ACCEL = 4;

/**
 * Gravity accrued per unit of cornering load — speed squared over the bend's
 * radius. This is the part a crew really feels, and it is why the tight track
 * empties them and the open one does not.
 */
export const GRAVITY_PER_CORNER = 0.95;

/** Charging through a bend loads the crew harder than a straight does. */
export const GRAVITY_CHARGE_MULTIPLIER = 2.4;

/** Gravity shed per tick when the ship is not accelerating. */
export const GRAVITY_RECOVERY = 0.0016;

/** How much of its handling a fully spent crew loses. */
export const WORN_HANDLING_LOSS = 0.32;

// The garage.

/** Credits a player opens a season with. There is no other income yet. */
export const STARTING_CREDITS = 100;

/** Slots a ship starts with. */
export const SLOTS_AT_START = 4;

/** Slots gained for finishing a race. */
export const SLOT_PER_FINISH = 1;

/** What selling a component returns, as a share of everything paid for it. */
export const SELL_RETURN = 0.6;

// The rivals.

/** A heat is this many laps, with a pit stop at the end of each one. */
export const LAPS_PER_HEAT = 2;

/** A bend counts as demanding if its holding speed is under this share of top speed. */
export const BOT_TIGHT_HOLD = 0.95;

/** How far a bot leans its build toward Handling on a track full of tight bends. */
export const BOT_HANDLING_TILT = 2;

/** How far a bot's build wanders off what the track suggests. */
export const BOT_STAT_SPREAD = 0.22;

// The route.

/**
 * How far off the line a ship can be carried and still make the split it
 * planned. Past this the fork takes whichever line the ship is pointing at —
 * which is what makes a big swing at the bend before a fork cost you a route.
 *
 * Deliberately just outside PATH_HALF_WIDTH: **losing your line is something
 * that happens to a ship that went wide**, not to one wobbling inside the
 * path. At 7 it fired on almost every checkpoint of the Cinder Coil and the
 * route plan stopped meaning anything.
 */
export const FORK_PULL = 11;

/**
 * A bare ship's navigation: none. Nav is what turns a dark split dim and a dim
 * split clear, so a ship without a system plans only the splits anyone can see.
 */
export const BASE_NAV = 0;

/** Nav needed to plan a split of each grade. A grade above your nav is unplannable. */
export const NAV_FOR_DIM = 1;
export const NAV_FOR_DARK = 2;

/** Nav at which the route may be re-planned at a pit stop rather than only before the heat. */
export const NAV_FOR_REPLAN = 3;

/** How much of a sector the fan-out either side of a fork takes up. */
export const FORK_SHARE = 0.22;

/** How far a bot leans toward the shorter line when its handling can take one. */
export const BOT_ROUTE_NERVE = 0.55;

/** Ship stats are clamped to this range, so a slider cannot break the sim. */
export const STAT_MIN = 0.5;
export const STAT_MAX = 1.6;
