// The S1 "game": a dot that laps a hard-coded track on a fixed integer tick.
// This file exists to prove the pipeline. S2 replaces it with race.ts.

import { evaluate, makeSpline, type Spline, type Vec2 } from './spline';
import { DEMO_SPEED } from './tuning';

// Speed and tick rate live in tuning.ts. The control points below are level
// data — the shape of the track, not a balance knob.

/** Coordinates are in a normalised 0..1 square; the renderer scales them. */
export const TRACK: Spline = makeSpline([
  { x: 0.08, y: 0.85 },
  { x: 0.22, y: 0.62 },
  { x: 0.3, y: 0.45 },
  { x: 0.42, y: 0.28 },
  { x: 0.58, y: 0.3 },
  { x: 0.72, y: 0.42 },
  { x: 0.84, y: 0.62 },
  { x: 0.9, y: 0.78 },
  { x: 0.75, y: 0.9 },
  { x: 0.55, y: 0.82 },
  { x: 0.4, y: 0.9 },
  { x: 0.2, y: 0.92 },
  { x: 0.08, y: 0.85 }, // back to start so the loop closes
]);

export interface DemoState {
  readonly tick: number;
  /** Spline parameter in [0, TRACK.segmentCount). */
  readonly u: number;
}

export const INITIAL_STATE: DemoState = { tick: 0, u: 0 };

/** Advance the simulation by exactly one tick. Pure. */
export function step(state: DemoState): DemoState {
  let u = state.u + DEMO_SPEED;
  if (u >= TRACK.segmentCount) u -= TRACK.segmentCount;
  return { tick: state.tick + 1, u };
}

/** Where the dot is right now, in normalised coordinates. */
export function position(state: DemoState): Vec2 {
  return evaluate(TRACK, state.u);
}
