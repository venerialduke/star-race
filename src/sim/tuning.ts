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

/**
 * Base shield capacity, in points of damage absorbed while shields are up.
 * Above one gamma burst on purpose: shields timed right stop a burst dead, and
 * are then nearly spent.
 */
export const BASE_SHIELD_CAPACITY = 50;

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
export const ASTEROID_DAMAGE_PER_TICK = 0.12;

/** Asteroid field: how much a roll can swing damage, as a fraction. 0.4 = ±40%. */
export const ASTEROID_DAMAGE_VARIANCE = 0.4;

/**
 * Ringed planet: what the gravity assist does to top speed inside it. 1.35
 * means a ship is slung through a third faster than it could otherwise fly.
 */
export const RINGED_PLANET_SPEED_MULTIPLIER = 1.35;

/**
 * Ringed planet: heat added per tick of the assist. The price of the speed.
 * Note the assist speeds the ship up, so it spends fewer ticks inside than the
 * segment is long: a base ship takes on about 122 heat crossing a 110-tick
 * assist, which is just past what it can hold.
 */
export const RINGED_PLANET_HEAT_PER_TICK = 1.5;

/** Hull damage per tick spent above heat tolerance. Cooking is slow, not fatal. */
export const OVERHEAT_DAMAGE_PER_TICK = 0.4;

/**
 * Heat shed per tick when nothing is adding any. Heat is a resource that comes
 * back, not a scar: a ship that overcooks an assist pays for it for a few
 * seconds, not for the rest of the race.
 */
export const HEAT_DISSIPATION_PER_TICK = 2;

/**
 * Black hole: what the pull does to top speed inside it. 0.55 means a ship
 * holds a little over half the speed it otherwise could.
 */
export const BLACK_HOLE_SPEED_MULTIPLIER = 0.55;

/**
 * Black hole: a ship entering with less hull than this cannot pull away and is
 * lost. Flat, not a fraction — arriving battered is what kills you, and no
 * amount of extra plating changes the number you have to beat.
 */
export const BLACK_HOLE_ESCAPE_HULL = 15;

/**
 * Gamma-ray burst: hull damage from one unshielded burst. Nearly half a base
 * hull, in a single tick, with no dice: the answer is to see it coming.
 */
export const GAMMA_BURST_DAMAGE = 45;

// --- Garage ----------------------------------------------------------------

/** How many parts the garage offers between stages. Three is a real choice. */
export const GARAGE_OFFER_SIZE = 3;

// --- Actives ---------------------------------------------------------------
// Both are timing tools. Duration is how long the tap lasts, cooldown is how
// long until the next one. At 60 ticks per second these read as seconds.

/** Shields: how long they hold, in ticks. 90 is a second and a half. */
export const SHIELDS_DURATION_TICKS = 90;

/** Shields: ticks until they can be raised again. Roughly one per stage. */
export const SHIELDS_COOLDOWN_TICKS = 420;

/** Reroute: how long the boost lasts, in ticks. */
export const POWER_REROUTE_DURATION_TICKS = 120;

/** Reroute: ticks until it can be used again. */
export const POWER_REROUTE_COOLDOWN_TICKS = 420;

/** Reroute: what the boost does to top speed while it is on. */
export const POWER_REROUTE_SPEED_MULTIPLIER = 1.3;

/**
 * Reroute: heat per tick while it is on. Just under what a base ship can hold
 * for a full boost, so one reroute on clear track is free — the cost lands when
 * it is stacked on a gravity assist, or run on a ship that already runs hot.
 */
export const POWER_REROUTE_HEAT_PER_TICK = 0.8;

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
export const INERTIAL_ANCHOR_SPEED = -0.02;

/** Overclocked Reactor: speed and acceleration together. */
export const OVERCLOCKED_REACTOR_SPEED = 0.1;
export const OVERCLOCKED_REACTOR_ACCELERATION = 0.015;
/** Overclocked Reactor: it runs hot, and that is the whole risk. */
export const OVERCLOCKED_REACTOR_HEAT_TOLERANCE = -30;
