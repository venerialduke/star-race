// Canvas drawing. Reads sim state, never writes it.

import type { RaceState } from '../sim/race';
import { normalOf, sampleAt, type Track, type Vec } from '../sim/track';
import { PATH_HALF_WIDTH } from '../sim/tuning';

/** How many recent positions the wake keeps. Structural: the length of a line. */
const TRAIL = 46;

/** How many past bends keep a mark on the track. */
const MARKS = 5;

const INK = '#e8eeff';
const DEEP = '#0b1428';
const PATH = '#ffd166';
const PATH_EDGE = 'rgba(255, 209, 102, 0.22)';
const OFF_PATH = 'rgba(120, 150, 210, 0.16)';
const SHIP = '#7ee0ff';
const SHIP_WIDE = '#ff7a6b';

export interface View {
  readonly scale: number;
  readonly centre: Vec;
  readonly width: number;
  readonly height: number;
  /** A landscape track on a portrait screen is turned a quarter turn to fit. */
  readonly rotate: boolean;
}

/** Fit the track's bounds to the canvas, turning it if that fills the screen better. */
export function fitView(track: Track, width: number, height: number): View {
  const margin = PATH_HALF_WIDTH * 4;
  const min = track.bounds.min;
  const max = track.bounds.max;
  const trackWidth = max.x - min.x + margin * 2;
  const trackHeight = max.y - min.y + margin * 2;
  const rotate = trackWidth > trackHeight !== width > height;
  const spanX = rotate ? trackHeight : trackWidth;
  const spanY = rotate ? trackWidth : trackHeight;
  return {
    scale: Math.min(width / spanX, height / spanY),
    centre: { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2 },
    width,
    height,
    rotate,
  };
}

function project(view: View, p: Vec): Vec {
  let dx = p.x - view.centre.x;
  let dy = p.y - view.centre.y;
  if (view.rotate) {
    const held = dx;
    dx = dy;
    dy = -held;
  }
  return { x: view.width / 2 + dx * view.scale, y: view.height / 2 + dy * view.scale };
}

export function drawRace(
  ctx: CanvasRenderingContext2D,
  track: Track,
  state: RaceState,
  width: number,
  height: number,
): void {
  const view = fitView(track, width, height);
  ctx.fillStyle = DEEP;
  ctx.fillRect(0, 0, width, height);

  const ribbon = (lineWidth: number, style: string): void => {
    ctx.beginPath();
    track.samples.forEach((s, i) => {
      const p = project(view, s.pos);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = style;
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  // The space either side of the path, then the path, then its two edges —
  // the lines the ship is thrown across, so crossing one reads as an event.
  ribbon(PATH_HALF_WIDTH * 6 * view.scale, OFF_PATH);
  ribbon(PATH_HALF_WIDTH * 2 * view.scale, PATH_EDGE);
  ribbon(Math.max(1.5, PATH_HALF_WIDTH * 0.4 * view.scale), PATH);
  edge(ctx, view, track, PATH_HALF_WIDTH);
  edge(ctx, view, track, -PATH_HALF_WIDTH);

  // Checkpoints.
  ctx.lineWidth = Math.max(1, view.scale);
  ctx.strokeStyle = 'rgba(232, 238, 255, 0.5)';
  for (const distance of track.checkpoints) {
    const s = sampleAt(track, distance);
    const n = normalOf(s);
    const reach = PATH_HALF_WIDTH * 2.2;
    const a = project(view, { x: s.pos.x + n.x * reach, y: s.pos.y + n.y * reach });
    const b = project(view, { x: s.pos.x - n.x * reach, y: s.pos.y - n.y * reach });
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // Where the last few bends threw it, fading as they fall behind.
  const marks = state.swings.slice(-MARKS);
  marks.forEach((swing, i) => {
    if (swing.swing <= 0.5) return;
    const age = (i + 1) / marks.length;
    const at = sampleAt(track, swing.bendStart);
    const n = normalOf(at);
    const out = -at.turn * Math.min(swing.swing, PATH_HALF_WIDTH * 3);
    const mark = project(view, { x: at.pos.x + n.x * out, y: at.pos.y + n.y * out });
    ctx.beginPath();
    ctx.arc(mark.x, mark.y, Math.max(2, view.scale * 1.8), 0, Math.PI * 2);
    ctx.fillStyle = swing.wentWide
      ? `rgba(255,122,107,${0.15 + age * 0.55})`
      : `rgba(255,209,102,${0.1 + age * 0.3})`;
    ctx.fill();
  });

  // The wake: where the ship has just been, which is what speed looks like.
  if (state.trail.length > 1) {
    ctx.beginPath();
    state.trail.slice(-TRAIL).forEach((point, i) => {
      const at = sampleAt(track, point.distance);
      const n = normalOf(at);
      const p = project(view, {
        x: at.pos.x + n.x * point.offset,
        y: at.pos.y + n.y * point.offset,
      });
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = state.wide ? 'rgba(255,122,107,0.35)' : 'rgba(126,224,255,0.35)';
    ctx.lineWidth = Math.max(1.5, view.scale * 2);
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // The ship, pushed off the line by its offset.
  const here = sampleAt(track, state.distance);
  const n = normalOf(here);
  const world = {
    x: here.pos.x + n.x * state.offset,
    y: here.pos.y + n.y * state.offset,
  };
  const p = project(view, world);
  const size = Math.max(7, 5 * view.scale);

  // A line back to the point on the path it should be on: the cost, drawn.
  if (Math.abs(state.offset) > 0.5) {
    const onPath = project(view, here.pos);
    ctx.beginPath();
    ctx.moveTo(onPath.x, onPath.y);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = state.wide ? 'rgba(255,122,107,0.55)' : 'rgba(126,224,255,0.35)';
    ctx.lineWidth = Math.max(1, view.scale * 0.8);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(here.heading - (view.rotate ? Math.PI / 2 : 0));
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.7, size * 0.62);
  ctx.lineTo(-size * 0.35, 0);
  ctx.lineTo(-size * 0.7, -size * 0.62);
  ctx.closePath();
  ctx.fillStyle = state.wide ? SHIP_WIDE : SHIP;
  ctx.fill();
  ctx.restore();

  // The track's name, quietly, so three tracks are tellable apart.
  ctx.fillStyle = 'rgba(232,238,255,0.35)';
  ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${track.name} · ${track.shape}`, 12, 20);
  ctx.fillStyle = INK;
}

/** One edge of the golden path, offset from the centreline. */
function edge(
  ctx: CanvasRenderingContext2D,
  view: View,
  track: Track,
  offset: number,
): void {
  ctx.beginPath();
  track.samples.forEach((s, i) => {
    const n = normalOf(s);
    const p = project(view, { x: s.pos.x + n.x * offset, y: s.pos.y + n.y * offset });
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.lineWidth = Math.max(1, view.scale * 0.6);
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.45)';
  ctx.stroke();
}
