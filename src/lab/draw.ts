/**
 * Drawing the lab. Reads the model, never writes it.
 *
 * Top-down and the whole shape at once, because the question the lab asks is
 * "where did the ship actually go", and that is a question about the line as a
 * whole rather than about the road immediately ahead.
 */

import { PATH_HALF_WIDTH, SLIDING_YAW } from './knobs';
import {
  bendEnd,
  bendStart,
  centreAt,
  headingAt,
  placeAt,
  shapeLength,
  type Point,
  type Shape,
} from './shape';
import type { Flight } from './flight';

export interface View {
  readonly scale: number;
  readonly ox: number;
  readonly oy: number;
  /**
   * The whole world is turned by this before it is drawn, so that the bend's
   * two straights leave the frame at the same angle. A shape drawn unturned
   * is an L, and an L wastes half a landscape frame on empty floor.
   */
  readonly turn: number;
}

const INK = '#e8eeff';
const SOFT = '#93a4c8';
const GOLD = '#ffd166';
const ROAD = '#1a2647';
const EDGE = '#3a4d80';

/** Enough room round the road to watch a ship leave it and not lose sight of it. */
const MARGIN = 40;

function samples(shape: Shape, step = 4): number[] {
  const end = shapeLength(shape);
  const out: number[] = [];
  for (let d = 0; d <= end; d += step) out.push(d);
  out.push(end);
  return out;
}

function turned(p: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
}

/**
 * A view that puts the whole shape on the canvas, y flipped for the screen.
 *
 * `reach` is how far off the line the ship has strayed. The frame opens up to
 * keep it in sight rather than letting it sail off the edge, because watching
 * where a lost ship ends up is most of what the lab is for.
 */
export function fit(shape: Shape, width: number, height: number, reach = 0): View {
  // Turn the world by half the bend, so the approach and the exit leave the
  // frame at equal and opposite angles.
  const turn = (shape.hand * shape.sweep) / 2;
  let lowX = Infinity;
  let highX = -Infinity;
  let lowY = Infinity;
  let highY = -Infinity;
  for (const d of samples(shape, 8)) {
    const p = turned(centreAt(shape, d), turn);
    lowX = Math.min(lowX, p.x);
    highX = Math.max(highX, p.x);
    lowY = Math.min(lowY, p.y);
    highY = Math.max(highY, p.y);
  }
  const pad = MARGIN + shape.halfWidth + reach;
  lowX -= pad;
  highX += pad;
  lowY -= pad;
  highY += pad;
  const scale = Math.min(width / (highX - lowX), height / (highY - lowY));
  return {
    scale,
    ox: (width - (highX + lowX) * scale) / 2,
    // y grows up in the world and down on the screen, so the sign flips here
    // and nowhere else.
    oy: (height + (highY + lowY) * scale) / 2,
    turn,
  };
}

function screen(view: View, p: Point): Point {
  const t = turned(p, view.turn);
  return { x: view.ox + t.x * view.scale, y: view.oy - t.y * view.scale };
}

function trace(ctx: CanvasRenderingContext2D, view: View, points: readonly Point[]): void {
  ctx.beginPath();
  points.forEach((p, i) => {
    const s = screen(view, p);
    if (i === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  });
}

/** The golden path, its edges, and where the bend begins and ends. */
export function drawRoad(ctx: CanvasRenderingContext2D, view: View, shape: Shape): void {
  const half = shape.halfWidth;
  const marks = samples(shape);
  const left = marks.map((d) => placeAt(shape, d, -half));
  const right = marks.map((d) => placeAt(shape, d, half));

  ctx.fillStyle = ROAD;
  trace(ctx, view, left);
  [...right].reverse().forEach((p) => {
    const s = screen(view, p);
    ctx.lineTo(s.x, s.y);
  });
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 1.5;
  trace(ctx, view, left);
  ctx.stroke();
  trace(ctx, view, right);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 209, 102, 0.45)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([7, 9]);
  trace(
    ctx,
    view,
    marks.map((d) => centreAt(shape, d)),
  );
  ctx.stroke();
  ctx.setLineDash([]);

  // The two moments that matter: the bend arriving, and the bend letting go.
  for (const [at, label] of [
    [bendStart(shape), 'turn in'],
    [bendEnd(shape), 'exit'],
  ] as const) {
    const a = screen(view, placeAt(shape, at, -half - 5));
    const b = screen(view, placeAt(shape, at, half + 5));
    ctx.strokeStyle = 'rgba(126, 224, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = SOFT;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, (a.x + b.x) / 2, Math.min(a.y, b.y) - 6);
  }
}

/**
 * The shove, drawn where it sits and pointing the way it pushes.
 *
 * Deliberately loud. It is the one thing on the course you put there, and the
 * whole reason to put it there is to watch what happens just after it.
 */
export function drawBump(ctx: CanvasRenderingContext2D, view: View, shape: Shape): void {
  const bump = shape.bump;
  if (bump === undefined) return;
  const half = shape.halfWidth;
  const a = screen(view, placeAt(shape, bump.at, -half - 4));
  const b = screen(view, placeAt(shape, bump.at, half + 4));
  ctx.strokeStyle = '#ff7a6b';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // An arrow along the road's own right, so which way it shoves is unambiguous.
  const from = screen(view, placeAt(shape, bump.at, 0));
  const to = screen(view, placeAt(shape, bump.at, Math.sign(bump.push) * (half + 4)));
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.strokeStyle = '#ff7a6b';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.fillStyle = '#ff7a6b';
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - 7 * Math.cos(angle - 0.4), to.y - 7 * Math.sin(angle - 0.4));
  ctx.lineTo(to.x - 7 * Math.cos(angle + 0.4), to.y - 7 * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ff9fb0';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('shove', from.x, Math.min(a.y, b.y) - 8);
}

/**
 * The distance along the centre line nearest to a point on the canvas, so the
 * shove can be put somewhere by pointing at it.
 */
export function alongAtScreen(shape: Shape, view: View, x: number, y: number): number {
  let best = 0;
  let near = Infinity;
  for (const d of samples(shape, 3)) {
    const p = screen(view, centreAt(shape, d));
    const gap = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (gap < near) {
      near = gap;
      best = d;
    }
  }
  return best;
}

/**
 * Where a ship has been. Off-path stretches are drawn hot — nothing punishes
 * them in the lab, but you should still be able to see them.
 */
export function drawTrail(
  ctx: CanvasRenderingContext2D,
  view: View,
  shape: Shape,
  path: readonly Flight[],
  colour: string,
  faint = false,
): void {
  if (path.length < 2) return;
  ctx.lineWidth = faint ? 1.4 : 2.2;
  ctx.lineJoin = 'round';
  let run: Point[] = [];
  let wide = Math.abs(path[0]!.offset) > shape.halfWidth;
  const flush = (): void => {
    if (run.length > 1) {
      ctx.strokeStyle = wide ? (faint ? 'rgba(255,122,107,0.3)' : '#ff7a6b') : colour;
      trace(ctx, view, run);
      ctx.stroke();
    }
    run = run.length > 0 ? [run[run.length - 1]!] : [];
  };
  for (const state of path) {
    const out = Math.abs(state.offset) > shape.halfWidth;
    if (out !== wide) {
      flush();
      wide = out;
    }
    run.push(placeAt(shape, state.along, state.offset));
  }
  flush();
}

/**
 * A ship, pointed where it is actually pointed rather than where the road
 * goes. A ship sideways through a bend looks sideways, which is most of what
 * makes the model legible at a glance.
 */
export function drawShip(
  ctx: CanvasRenderingContext2D,
  view: View,
  shape: Shape,
  state: Flight,
  colour: string,
  size = 9,
): void {
  const at = screen(view, placeAt(shape, state.along, state.offset));
  // World headings turn anticlockwise and the canvas turns clockwise, so the
  // screen angle is the negative of the world one.
  const facing = -(headingAt(shape, state.along) + state.yaw + view.turn);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(facing);
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.62, size * 0.58);
  ctx.lineTo(-size * 0.28, 0);
  ctx.lineTo(-size * 0.62, -size * 0.58);
  ctx.closePath();
  ctx.fill();
  if (Math.abs(state.yaw) > SLIDING_YAW) {
    ctx.strokeStyle = '#ff7a6b';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  ctx.restore();
}

export interface Reading {
  readonly speed: number;
  readonly ceiling: number;
  readonly offset: number;
}

/**
 * Speed and offset over the last stretch of time.
 *
 * The strip is here to answer one complaint directly: that the ship was only
 * ever flat out or crawling. A throttle that eases shows up as a slope, and a
 * slope is the thing you cannot see by watching a dot move.
 */
export function drawStrip(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  history: readonly Reading[],
  topSpeed: number,
): void {
  ctx.clearRect(0, 0, width, height);
  if (history.length < 2) return;
  const span = Math.max(history.length, 2);
  const x = (i: number): number => (i / (span - 1)) * width;

  // Offset, as a band round the middle. The path's width is drawn behind it so
  // the excursions read against something.
  const mid = height * 0.5;
  const reach = Math.max(PATH_HALF_WIDTH * 2.4, ...history.map((h) => Math.abs(h.offset)));
  const y = (off: number): number => mid + (off / reach) * (height * 0.46);
  ctx.fillStyle = 'rgba(126, 224, 255, 0.10)';
  ctx.fillRect(0, y(-PATH_HALF_WIDTH), width, y(PATH_HALF_WIDTH) - y(-PATH_HALF_WIDTH));

  ctx.strokeStyle = 'rgba(126, 224, 255, 0.85)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  history.forEach((h, i) => (i === 0 ? ctx.moveTo(x(i), y(h.offset)) : ctx.lineTo(x(i), y(h.offset))));
  ctx.stroke();

  // Speed, and the ceiling it is being held under, as a fraction of top speed.
  const sy = (v: number): number => height - (v / topSpeed) * height * 0.92 - height * 0.04;
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.35)';
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  history.forEach((h, i) =>
    i === 0 ? ctx.moveTo(x(i), sy(Math.min(h.ceiling, topSpeed))) : ctx.lineTo(x(i), sy(Math.min(h.ceiling, topSpeed))),
  );
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  history.forEach((h, i) => (i === 0 ? ctx.moveTo(x(i), sy(h.speed)) : ctx.lineTo(x(i), sy(h.speed))));
  ctx.stroke();

  ctx.fillStyle = SOFT;
  ctx.font = '9px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('speed', 4, 10);
  ctx.fillStyle = 'rgba(126, 224, 255, 0.85)';
  ctx.fillText('off centre', 46, 10);
}

export { INK, SOFT, GOLD };
