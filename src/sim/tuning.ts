// Every balance constant in the game, in one file.
//
// The rule: no other file in src/sim spells out a balance number. If you are
// about to type a value that changes how the game feels — a speed, a damage
// figure, a cooldown, a threshold — it belongs here with a one-line comment
// saying what it does, and the code imports it by name. A tuning change should
// then be a one-file diff that anyone can read.
//
// What is NOT tuning, and stays where it is:
//   - Algorithm internals (the mulberry32 constants in rng.ts, the Catmull-Rom
//     basis in spline.ts). Changing them is a bug, not a balance decision.
//   - Track geometry: spline control points are level data, not knobs.
//   - Structural numbers: array indices, `+ 1` in a counter, `/ 2` for a
//     midpoint.
//
// DESIGN.md says what each constant is for; this file holds its value.

/** Ticks per second. Everything in sim advances in whole ticks. */
export const TICK_RATE = 60;

/** Demo dot: spline segments crossed per second. Replaced by ship speed in S2.5. */
export const DEMO_SPEED_PER_SECOND = 0.6;

/** Demo dot: spline parameter advanced per tick. */
export const DEMO_SPEED = DEMO_SPEED_PER_SECOND / TICK_RATE;

// --- Base ship -------------------------------------------------------------
// A bare hull with no parts. Speed is in track-ticks per tick: at 1.0 the ship
// covers a segment in exactly its stated length, which is what "ticks at base
// speed" means in track.ts.

/** Base speed, in track-ticks per tick. 1.0 is the definition of base speed. */
export const BASE_SPEED = 1;

/** Base acceleration: how much speed closes on its target each tick. */
export const BASE_ACCELERATION = 0.02;

/** Base shield capacity, in points of damage absorbed while shields are up. */
export const BASE_SHIELD_CAPACITY = 20;

/** Base heat tolerance: heat points the ship can hold before it cooks. */
export const BASE_HEAT_TOLERANCE = 100;

/** Base hull, in points of damage the ship survives. */
export const BASE_HULL = 100;

// --- Stat floors -----------------------------------------------------------
// A build stacked with downsides still has to produce a ship that can race.

/** No build can drop speed below this. */
export const MIN_SPEED = 0.35;

/** No build can drop acceleration below this. */
export const MIN_ACCELERATION = 0.004;

/** Shields, heat tolerance and hull floor here rather than at zero. */
export const MIN_SHIELD_CAPACITY = 0;
export const MIN_HEAT_TOLERANCE = 10;
export const MIN_HULL = 10;

// --- Race ------------------------------------------------------------------

/** Speed the ship leaves the start line, and every stage gate, with. */
export const LAUNCH_SPEED = 0;

/**
 * Hard stop on a race, in ticks. A ship crawling at MIN_SPEED needs about
 * 3,800 ticks for the slice track, so this only ever catches a bug.
 */
export const MAX_RACE_TICKS = 20000;

// --- Hazards ---------------------------------------------------------------

/**
 * Asteroid field: hull damage per tick inside the field at base speed. Damage
 * scales with the square of speed, so a fast ship spends fewer ticks in the
 * field but takes more in each of them, and crossing quickly costs more
 * overall.
 */
export const ASTEROID_DAMAGE_PER_TICK = 0.25;

/** Asteroid field: how much a roll can swing damage, as a fraction. 0.4 = ±40%. */
export const ASTEROID_DAMAGE_VARIANCE = 0.4;

/**
 * Gamma-ray burst: hull damage from one unshielded burst. Nearly half a base
 * hull, in a single tick, with no dice: the answer is to see it coming.
 */
export const GAMMA_BURST_DAMAGE = 45;

// --- Parts -----------------------------------------------------------------
// Six parts in the slice. Each is one upside and one cost; DESIGN.md says what
// each is for and which hazard it answers.

/** Ion Thruster: raw speed. */
export const ION_THRUSTER_SPEED = 0.15;
/** Ion Thruster: the light frame it needs costs hull. */
export const ION_THRUSTER_HULL = -10;

/** Ablative Plating: hull, the answer to asteroid fields. */
export const ABLATIVE_PLATING_HULL = 40;
/** Ablative Plating: the mass costs speed. */
export const ABLATIVE_PLATING_SPEED = -0.08;

/** Mirror Shielding: shield capacity, the answer to gamma bursts. */
export const MIRROR_SHIELDING_SHIELD_CAPACITY = 35;
/** Mirror Shielding: the array costs a little speed. */
export const MIRROR_SHIELDING_SPEED = -0.05;

/** Radiator Fins: heat tolerance, the answer to the ringed planet's assist. */
export const RADIATOR_FINS_HEAT_TOLERANCE = 45;
/** Radiator Fins: fins are fragile and cost hull. */
export const RADIATOR_FINS_HULL = -15;

/** Inertial Anchor: acceleration, to claw speed back out of a black hole. */
export const INERTIAL_ANCHOR_ACCELERATION = 0.03;
/** Inertial Anchor: the mass costs top speed. */
export const INERTIAL_ANCHOR_SPEED = -0.04;

/** Overclocked Reactor: speed and acceleration together. */
export const OVERCLOCKED_REACTOR_SPEED = 0.1;
export const OVERCLOCKED_REACTOR_ACCELERATION = 0.015;
/** Overclocked Reactor: it runs hot, and that is the whole risk. */
export const OVERCLOCKED_REACTOR_HEAT_TOLERANCE = -30;
