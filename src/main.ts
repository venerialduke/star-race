// Wires the browser to the sim: fixed timestep in, canvas frames out.
//
// The sim advances in whole ticks and knows nothing about frames, wall-clock
// time or the DOM. This file is the only place the two meet.

import { startRace, stepRace, type RaceState } from './sim/race';
import { SLICE_TRACK } from './sim/track';
import { TICK_RATE } from './sim/tuning';
import { draw, type Viewport } from './render/draw';

function getCanvas(): HTMLCanvasElement {
  const el = document.getElementById('game');
  if (!(el instanceof HTMLCanvasElement)) throw new Error('Missing <canvas id="game">');
  return el;
}

function getContext(el: HTMLCanvasElement): CanvasRenderingContext2D {
  const c = el.getContext('2d');
  if (c === null) throw new Error('Canvas 2D context unavailable');
  return c;
}

const canvas: HTMLCanvasElement = getCanvas();
const ctx: CanvasRenderingContext2D = getContext(canvas);

let viewport: Viewport = { width: 0, height: 0, dpr: 1 };

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  viewport = { width, height, dpr };
}
window.addEventListener('resize', resize);
resize();

// A race the player watches. The garage, the HUD and the results screen arrive
// in S3.3 onwards; for now a bare ship flies the whole course on repeat so the
// course itself can be looked at.
function newRace(): RaceState {
  return startRace(SLICE_TRACK, [], Math.floor(Date.now() % 100000));
}

let race: RaceState = newRace();

// Fixed timestep: the sim advances in whole ticks regardless of frame rate.
// Rendering happens once per animation frame with whatever state is current.
const TICK_MS = 1000 / TICK_RATE;
// A slow frame must not slow the race down: whatever time passed gets simulated,
// up to a second of it per frame. The cap is only there so that coming back to a
// tab that was hidden for ten minutes does not lock the page up catching up.
const MAX_TICKS_PER_FRAME = TICK_RATE;
const MAX_BACKLOG_MS = TICK_MS * MAX_TICKS_PER_FRAME;
const RESTART_AFTER_MS = 2000;

let accumulator = 0;
let last = performance.now();
let finishedAt: number | undefined;

function frame(now: number): void {
  accumulator = Math.min(accumulator + (now - last), MAX_BACKLOG_MS);
  last = now;

  while (accumulator >= TICK_MS) {
    if (!race.over) stepRace(race);
    accumulator -= TICK_MS;
  }

  // Hold the finished course on screen for a moment, then fly it again.
  if (race.over) {
    if (finishedAt === undefined) finishedAt = now;
    else if (now - finishedAt > RESTART_AFTER_MS) {
      race = newRace();
      finishedAt = undefined;
    }
  }

  draw(ctx, race, viewport);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
