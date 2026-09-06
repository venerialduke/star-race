// Wires the browser to the sim: fixed timestep in, canvas frames out.

import { INITIAL_STATE, step, type DemoState } from './sim/demo';
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

// Fixed timestep: the sim advances in whole ticks regardless of frame rate.
// Rendering happens once per animation frame with whatever state is current.
const TICK_MS = 1000 / TICK_RATE;
const MAX_TICKS_PER_FRAME = 10; // cap catch-up after a tab was hidden

let state: DemoState = INITIAL_STATE;
let accumulator = 0;
let last = performance.now();

function frame(now: number): void {
  accumulator += now - last;
  last = now;

  let ticks = 0;
  while (accumulator >= TICK_MS && ticks < MAX_TICKS_PER_FRAME) {
    state = step(state);
    accumulator -= TICK_MS;
    ticks++;
  }
  if (ticks === MAX_TICKS_PER_FRAME) accumulator = 0;

  draw(ctx, state, viewport);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
