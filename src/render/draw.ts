// Canvas drawing. Reads sim state, never writes it.

import type { SwingEvent } from '../sim/race';
import {
  canonicalOf,
  navFor,
  normalOf,
  placeOn,
  routeOf,
  sampleAt,
  type Route,
  type Track,
  type Vec,
} from '../sim/track';
import { PATH_HALF_WIDTH } from '../sim/tuning';

/** How many recent positions the wake keeps. Structural: the length of a line. */
const TRAIL = 46;

/** How many past bends keep a mark on the track. */
const MARKS = 5;

/**
 * Ships fly the same line, so on screen they would sit on top of each other.
 * Each is nudged into its own lane — a drawing trick only: the simulation has
 * no lanes, and no ship can touch another.
 */
const LANE_STEP = PATH_HALF_WIDTH * 0.42;

const INK = '#e8eeff';
const DEEP = '#0b1428';
const PATH = '#ffd166';
const PATH_EDGE = 'rgba(255, 209, 102, 0.22)';
const OFF_PATH = 'rgba(120, 150, 210, 0.16)';
/** A split you can plan, and one you can only see is there. */
const SPLIT = 'rgba(126, 224, 255, 0.55)';
const SPLIT_HINT = 'rgba(126, 224, 255, 0.18)';
const SPLIT_TAKEN = 'rgba(255, 209, 102, 0.85)';
const SHIP_WIDE = '#ff7a6b';

/** One colour per lane of the field. The player is always the first. */
export const SHIP_COLOURS = ['#7ee0ff', '#f0a868', '#b48cff'] as const;

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

/**
 * One ship as the screen needs it. The renderer reads this and nothing else,
 * so it does not care whether the race is being stepped live or played back
 * from a film that was computed before any of it was shown.
 */
export interface ShipView {
  readonly distance: number;
  /** Which way through the current sector: the same distance is a different place. */
  readonly route: number;
  readonly offset: number;
  readonly wide: boolean;
  readonly isPlayer: boolean;
  /** Where it has just been, oldest first. */
  readonly wake: readonly { distance: number; offset: number; route: number }[];
  /** The bends that threw it, for the marks left behind.  */
  readonly swings: readonly SwingEvent[];
}

/** What the player knows about the route, which decides how the splits are drawn. */
export interface RouteView {
  /** The way through each sector the player means to take. */
  readonly planned: readonly number[];
  /** How far the player's navigation reads. */
  readonly nav: number;
}

export function drawField(
  ctx: CanvasRenderingContext2D,
  track: Track,
  ships: readonly ShipView[],
  routes: RouteView,
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

  // The splits. A line you can plan is drawn; one a grade beyond your
  // navigation is a hint that something turns off here and no more than that;
  // anything further out you cannot see at all, which is what buying a better
  // system is for.
  for (const sector of track.sectors) {
    sector.routes.forEach((route, index) => {
      if (index === 0) return;
      const need = navFor(route.grade);
      if (need > routes.nav + 1) return;
      const readable = need <= routes.nav;
      const taken = readable && routes.planned[sector.index] === index;
      splitLine(
        ctx,
        view,
        route,
        taken ? SPLIT_TAKEN : readable ? SPLIT : SPLIT_HINT,
        taken ? 1.1 : 0.7,
        readable ? [] : [6, 7],
      );
    });
  }

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

  // Rivals first, the player last, so the player's ship is never hidden.
  const order = ships
    .map((ship, i) => ({
      ship,
      colour: SHIP_COLOURS[i % SHIP_COLOURS.length] as string,
      lane: (i - (ships.length - 1) / 2) * LANE_STEP,
    }))
    .sort((a, b) => Number(a.ship.isPlayer) - Number(b.ship.isPlayer));
  for (const { ship, colour, lane } of order) {
    drawShip(ctx, view, track, ship, colour, lane);
  }

  // The track's name, quietly, so three tracks are tellable apart.
  ctx.fillStyle = 'rgba(232,238,255,0.35)';
  ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${track.name} · ${track.shape}`, 12, 20);
  ctx.fillStyle = INK;
}

/**
 * One ship: the marks its recent bends left, its wake, the tether back to the
 * line it should be on, and the ship itself. A rival is drawn quieter than the
 * player, so a glance finds the player first.
 */
function drawShip(
  ctx: CanvasRenderingContext2D,
  view: View,
  track: Track,
  ship: ShipView,
  colour: string,
  lane: number,
): void {
  const isPlayer = ship.isPlayer;
  const fade = isPlayer ? 1 : 0.6;

  if (isPlayer) {
    const marks = ship.swings.slice(-MARKS);
    marks.forEach((swing, i) => {
      if (swing.swing <= 0.5) return;
      const age = (i + 1) / marks.length;
      // The bend is remembered in its own route's distances, so it has to be
      // put back onto the lap before it can be drawn.
      const sector = track.sectors[swing.sector];
      if (sector === undefined) return;
      const line = routeOf(sector, swing.route);
      const at = placeOn(track, canonicalOf(sector, line, swing.bendStart), swing.route);
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
  }

  if (ship.wake.length > 1) {
    ctx.beginPath();
    ship.wake.slice(-TRAIL).forEach((point, i) => {
      const at = placeOn(track, point.distance, point.route);
      const n = normalOf(at);
      const p = project(view, {
        x: at.pos.x + n.x * (point.offset + lane),
        y: at.pos.y + n.y * (point.offset + lane),
      });
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = withAlpha(ship.wide ? SHIP_WIDE : colour, 0.35 * fade);
    ctx.lineWidth = Math.max(1.5, view.scale * 2);
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  const here = placeOn(track, ship.distance, ship.route);
  const n = normalOf(here);
  const p = project(view, {
    x: here.pos.x + n.x * (ship.offset + lane),
    y: here.pos.y + n.y * (ship.offset + lane),
  });
  const size = Math.max(isPlayer ? 7 : 6, (isPlayer ? 5 : 4.2) * view.scale);

  if (Math.abs(ship.offset) > 0.5) {
    const onPath = project(view, {
      x: here.pos.x + n.x * lane,
      y: here.pos.y + n.y * lane,
    });
    ctx.beginPath();
    ctx.moveTo(onPath.x, onPath.y);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = withAlpha(
      ship.wide ? SHIP_WIDE : colour,
      (ship.wide ? 0.55 : 0.3) * fade,
    );
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
  ctx.fillStyle = ship.wide ? SHIP_WIDE : colour;
  ctx.globalAlpha = fade;
  ctx.fill();
  if (isPlayer) {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(232,238,255,0.85)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** A hex colour at an alpha, so one palette serves lines and fills. */
function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
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

/** One split, drawn as the line it is. */
function splitLine(
  ctx: CanvasRenderingContext2D,
  view: View,
  route: Route,
  style: string,
  weight: number,
  dash: readonly number[],
): void {
  ctx.beginPath();
  route.samples.forEach((sample, i) => {
    const p = project(view, sample.pos);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.setLineDash(dash as number[]);
  ctx.lineWidth = Math.max(1.2, PATH_HALF_WIDTH * 0.3 * weight * view.scale);
  ctx.strokeStyle = style;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.setLineDash([]);
}
