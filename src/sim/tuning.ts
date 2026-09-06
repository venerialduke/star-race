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
