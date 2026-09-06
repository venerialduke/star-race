// The browser end of the game: a canvas, a clock, and a seed.
//
// Everything else lives in ui/game.ts, which can be played through in a test
// without any of these.

import { createGame } from './ui/game';
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

const game = createGame({
  root: document.body,
  render: (state) => draw(ctx, state, viewport),
  seed: Math.floor(Date.now() % 100000),
});

function frame(now: number): void {
  game.frame(now);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
