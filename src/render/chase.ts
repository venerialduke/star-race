// The race from behind the ship.
//
// The camera sits above and behind the player and looks along the track. What
// it draws is the same flat world the top-down view draws — the same samples,
// the same routes, the same offsets — put through a perspective instead of a
// scale. Nothing new is invented for it and nothing is read that the
// simulation did not already say.
//
// Everything is painted far to near, because these are filled surfaces on one
// plane and that is the cheapest way to get the overlaps right.

import {
  canonicalOf,
  navFor,
  normalOf,
  placeOn,
  placeSmooth,
  shortestTurn,
  routeOf,
  sampleAt,
  sectorAt,
  type Place,
  type Track,
} from '../sim/track';
import { PATH_HALF_WIDTH, TRACK_HALF_WIDTH } from '../sim/tuning';
import {
  horizonY,
  lensFor,
  scaleAt,
  toEye,
  toScreen,
  traceLine,
  tracePolygon,
  type Camera,
  type Eye,
  type Lens,
} from './camera';
import { drawSky, type Sky } from './sky';
import type { RouteView, ShipView } from './draw';

/** Where the camera sits relative to the ship it is following. */
const BACK = 32;
const HEIGHT = 15;
const PITCH = 0.3;

/** How far down the track is drawn, and how finely. */
const AHEAD = 460;
const BEHIND = 70;
const STEP = 6;

/** How high the corridor wall is drawn. A field, not a fence: it has no top edge. */
const WALL_HEIGHT = 13;

/**
 * Ships fly the same line, so from behind they would sit exactly on top of one
 * another. Each is nudged sideways into its own lane — the same drawing trick
 * the map uses, and the same caveat: the simulation has no lanes, and no ship
 * can touch another.
 */
const LANE = PATH_HALF_WIDTH * 0.5;

/**
 * How big a ship is drawn, in track units, measured nose to tail. The golden
 * path is 18 units across and three ships have to sit along it, so this is
 * about as big as one can honestly be.
 */
const SHIP_SIZE = 2;
/** How far above the track it flies. */
const LIFT = 1.8;

/**
 * How long the camera takes to close most of the gap to where it should be, in
 * seconds. Expressed as a time rather than a share per frame: a share per frame
 * means a 120Hz screen has a camera twice as tight as a 60Hz one.
 */
const FOLLOW_TIME = 0.09;
const TURN_TIME = 0.13;

const PATH = '#ffd166';
const GROUND = '#1b2854';
const ROAD = '#2d3a6e';
/**
 * What both fade into: the colour of empty space. The ribbon has to dissolve
 * rather than stop, or the far end of the draw distance reads as a cliff.
 */
const VOID = '#050a18';
const SHIP_WIDE = '#ff7a6b';

/**
 * The camera's own memory. It lags the ship on purpose: snapping straight to
 * the ship's heading every frame makes a bend read as a jolt rather than a
 * turn, and a swing look like the whole world twitching.
 */
export interface Chase {
  camera: Camera;
  /** False until the first frame has placed it, so a new heat does not glide in. */
  settled: boolean;
}

export const newChase = (): Chase => ({
  camera: { x: 0, y: 0, height: HEIGHT, yaw: 0, pitch: PITCH },
  settled: false,
});

/** How much of the remaining gap to close in this much time. */
function easeShare(seconds: number, over: number): number {
  return 1 - Math.exp(-Math.max(0, seconds) / over);
}

/**
 * Which way through a sector the player is going, at some distance round the
 * lap. Where the ship is now, that is the route it is actually on; anywhere
 * ahead it is the route it means to take, because it has not reached the fork.
 */
function lineAt(
  track: Track,
  routes: RouteView,
  ship: ShipView,
  distance: number,
): number {
  const sector = sectorAt(track, distance);
  const here = sectorAt(track, ship.distance);
  return sector === here ? ship.route : (routes.planned[sector] ?? 0);
}

/** Where the ship actually is on the plane, offset, drawing lane and all. */
function shipPoint(
  track: Track,
  ship: ShipView,
  lane = 0,
): { at: Place; x: number; y: number } {
  const at = placeSmooth(track, ship.distance, ship.route);
  const n = normalOfHeading(at.heading);
  const out = ship.offset + lane;
  return { at, x: at.pos.x + n.x * out, y: at.pos.y + n.y * out };
}

/** Left of travel, from a heading alone. */
function normalOfHeading(heading: number): { x: number; y: number } {
  return { x: -Math.sin(heading), y: Math.cos(heading) };
}

export function drawChase(
  ctx: CanvasRenderingContext2D,
  track: Track,
  ships: readonly ShipView[],
  routes: RouteView,
  sky: Sky,
  chase: Chase,
  seconds: number,
  width: number,
  height: number,
): void {
  const player = ships.find((s) => s.isPlayer) ?? ships[0];
  if (player === undefined) {
    ctx.fillStyle = VOID;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  // Follow the ship, look where the track goes. Aiming along the ship's own
  // offset instead would swing the whole world every time it was thrown.
  const me = shipPoint(track, player);
  const yaw = me.at.heading;
  const target = {
    x: me.x - Math.cos(yaw) * BACK,
    y: me.y - Math.sin(yaw) * BACK,
    height: HEIGHT,
    yaw,
    pitch: PITCH,
  };
  const follow = easeShare(seconds, FOLLOW_TIME);
  const turn = easeShare(seconds, TURN_TIME);
  chase.camera = chase.settled
    ? {
        x: chase.camera.x + (target.x - chase.camera.x) * follow,
        y: chase.camera.y + (target.y - chase.camera.y) * follow,
        height: HEIGHT,
        yaw: chase.camera.yaw + shortestTurn(chase.camera.yaw, yaw) * turn,
        pitch: PITCH,
      }
    : target;
  chase.settled = true;

  const lens = lensFor(chase.camera, width, height);
  drawSky(ctx, lens, sky);

  // Where the ship's own patch of track is on screen: the road is at full
  // colour there and fades from there to the horizon.
  const underMe = toScreen(lens, toEye(lens, me.x, me.y, 0)).y;
  drawRoad(ctx, lens, track, routes, player, underMe);
  drawGates(ctx, lens, track, player);
  drawMarks(ctx, lens, track, player);

  // Far ships first, so a rival close behind never paints over one in front.
  const drawn = ships
    .map((ship, i) => ({
      ship,
      colour: SHIP_COLOURS[i % SHIP_COLOURS.length] as string,
      lane: (i - (ships.length - 1) / 2) * LANE,
    }))
    .map((row) => {
      const point = shipPoint(track, row.ship, row.lane);
      return { ...row, point, eye: toEye(lens, point.x, point.y, LIFT) };
    })
    .filter((row) => row.eye.depth > 0)
    .sort((a, b) => b.eye.depth - a.eye.depth);
  for (const row of drawn) {
    drawShip(ctx, lens, track, row.ship, row.point, row.colour, row.lane);
  }
}

/** One colour per lane of the field. The player is always the first. */
const SHIP_COLOURS = ['#7ee0ff', '#f0a868', '#b48cff'] as const;

/** Blend two hex colours, for fading the track out into the distance. */
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const part = (shift: number): number =>
    Math.round((((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t) as number);
  return `rgb(${part(16)}, ${part(8)}, ${part(0)})`;
}

/**
 * The track ahead: the ground either side, the golden path, and its two edges.
 * Built by walking canonical distance and asking the route the player is on
 * where it is, which is the same question the simulation asks every tick.
 */
function drawRoad(
  ctx: CanvasRenderingContext2D,
  lens: Lens,
  track: Track,
  routes: RouteView,
  player: ShipView,
  nearY: number,
): void {
  const from = player.distance - BEHIND;
  const to = player.distance + AHEAD;

  // The other roads first, then the one the ship is on, so its own line is
  // never painted over by a fork running alongside it.
  for (const other of otherRoads(track, lens, routes, player, from, to)) {
    drawSurface(ctx, lens, other.rail, nearY, other.readable ? 0.6 : 0.24);
  }

  const mine = railAlong(track, lens, from, to, (d) => lineAt(track, routes, player, d));
  drawSurface(ctx, lens, mine, nearY, 1);
  drawCentreLine(ctx, lens, mine);
}

/** One step of a road: its path edges, its corridor walls, and how far off it is. */
interface Rung {
  readonly left: Eye;
  readonly right: Eye;
  readonly wallL: Eye;
  readonly wallR: Eye;
  readonly topL: Eye;
  readonly topR: Eye;
  readonly centre: Eye;
  readonly fade: number;
}

/** Walk a stretch of canonical distance and measure the road across it. */
function railAlong(
  track: Track,
  lens: Lens,
  from: number,
  to: number,
  routeAt: (distance: number) => number,
): Rung[] {
  const steps = Math.max(2, Math.ceil((to - from) / STEP));
  const rail: Rung[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const distance = from + ((to - from) * i) / steps;
    const at = placeSmooth(track, distance, routeAt(distance));
    const n = normalOfHeading(at.heading);
    const point = (out: number, up = 0): Eye =>
      toEye(lens, at.pos.x + n.x * out, at.pos.y + n.y * out, up);
    rail.push({
      left: point(PATH_HALF_WIDTH),
      right: point(-PATH_HALF_WIDTH),
      wallL: point(TRACK_HALF_WIDTH),
      wallR: point(-TRACK_HALF_WIDTH),
      topL: point(TRACK_HALF_WIDTH, WALL_HEIGHT),
      topR: point(-TRACK_HALF_WIDTH, WALL_HEIGHT),
      centre: point(0, 0.05),
      fade: Math.pow(Math.min(1, Math.max(0, (i * STEP - BEHIND) / AHEAD)), 0.65),
    });
  }
  return rail;
}

/**
 * Every other way through the sectors in view. A split is a road now rather
 * than a line drawn beside one, so it is drawn the way a road is — dimmer when
 * your navigation can only tell you it is there.
 */
function otherRoads(
  track: Track,
  lens: Lens,
  routes: RouteView,
  player: ShipView,
  from: number,
  to: number,
): { rail: Rung[]; readable: boolean }[] {
  const out: { rail: Rung[]; readable: boolean }[] = [];
  for (const sector of track.sectors) {
    // The copy of this sector nearest the ship: the lap keeps counting up.
    const laps = Math.round((player.distance - sector.start) / track.length);
    const start = sector.start + laps * track.length;
    const end = start + (sector.end - sector.start);
    if (end < from || start > to) continue;

    sector.routes.forEach((route, index) => {
      if (index === lineAt(track, routes, player, start + 1)) return;
      const need = navFor(route.grade);
      if (need > routes.nav + 1) return;
      out.push({
        rail: railAlong(track, lens, start, end, () => index),
        readable: need <= routes.nav,
      });
    });
  }
  return out;
}

/** The road surface, its corridor walls, and the two edges of the golden path. */
function drawSurface(
  ctx: CanvasRenderingContext2D,
  lens: Lens,
  rail: readonly Rung[],
  nearY: number,
  alpha: number,
): void {
  const horizon = horizonY(lens);
  const foot = Math.max(horizon + 40, nearY);

  // Each surface is one polygon, not a strip of quads. Quads were the first
  // version and every seam between two of them showed as a diagonal scar
  // across the road, because neighbours were filled at slightly different
  // distances. One polygon has no seams; the fade comes from a gradient down
  // the screen instead, which is near enough since the track recedes upward.
  const surface = (left: readonly Eye[], right: readonly Eye[], near: string): void => {
    if (!tracePolygon(ctx, lens, [...left, ...[...right].reverse()])) return;
    const g = ctx.createLinearGradient(0, horizon, 0, foot);
    g.addColorStop(0, VOID);
    g.addColorStop(0.4, mix(near, VOID, 0.6));
    g.addColorStop(1, near);
    ctx.fillStyle = g;
    ctx.fill();
  };

  ctx.globalAlpha = alpha;
  surface(
    rail.map((r) => r.wallL),
    rail.map((r) => r.wallR),
    GROUND,
  );
  surface(
    rail.map((r) => r.left),
    rail.map((r) => r.right),
    ROAD,
  );

  // The corridor walls: what a ship cannot be thrown through. A field rather
  // than a fence — it fades out upward instead of stopping at a rail, so it
  // reads as something holding the ship in and not as scenery.
  for (const side of [0, 1] as const) {
    const foots = rail.map((r) => (side === 0 ? r.wallL : r.wallR));
    const tops = rail.map((r) => (side === 0 ? r.topL : r.topR));
    if (tracePolygon(ctx, lens, [...foots, ...[...tops].reverse()])) {
      const g = ctx.createLinearGradient(0, horizon - 70, 0, foot);
      g.addColorStop(0, 'rgba(126, 224, 255, 0)');
      g.addColorStop(1, 'rgba(126, 224, 255, 0.15)');
      ctx.fillStyle = g;
      ctx.fill();
    }
    if (traceLine(ctx, lens, foots)) {
      ctx.strokeStyle = 'rgba(126, 224, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // The two edges of the golden path — the lines a swing throws the ship
  // across, so crossing one has to read as an event from in here too.
  for (const side of ['left', 'right'] as const) {
    for (let i = 0; i < rail.length - 1; i += 1) {
      const a = rail[i] as Rung;
      if (!traceLine(ctx, lens, [a[side], (rail[i + 1] as Rung)[side]])) continue;
      ctx.strokeStyle = `rgba(255, 209, 102, ${(0.55 * (1 - a.fade)).toFixed(3)})`;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

/** The golden path itself, dashed so speed has something to run past. */
function drawCentreLine(
  ctx: CanvasRenderingContext2D,
  lens: Lens,
  rail: readonly Rung[],
): void {
  ctx.setLineDash([13, 11]);
  for (let i = 0; i < rail.length - 1; i += 1) {
    const a = rail[i] as Rung;
    if (!traceLine(ctx, lens, [a.centre, (rail[i + 1] as Rung).centre])) continue;
    ctx.strokeStyle = `rgba(255, 209, 102, ${(0.6 * (1 - a.fade)).toFixed(3)})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

/** The checkpoints, as gates you fly through. */
function drawGates(
  ctx: CanvasRenderingContext2D,
  lens: Lens,
  track: Track,
  player: ShipView,
): void {
  for (const distance of track.checkpoints) {
    // The nearest copy of this checkpoint, since the lap keeps counting up.
    const laps = Math.round((player.distance - distance) / track.length);
    const at = sampleAt(track, distance);
    const n = normalOf(at);
    const reach = PATH_HALF_WIDTH * 1.6;
    const base = distance + laps * track.length;
    if (base < player.distance - 40 || base > player.distance + AHEAD) continue;

    const post = (side: number): void => {
      const x = at.pos.x + n.x * reach * side;
      const y = at.pos.y + n.y * reach * side;
      const foot = toEye(lens, x, y, 0);
      const top = toEye(lens, x, y, 11);
      if (!traceLine(ctx, lens, [foot, top])) return;
      ctx.strokeStyle = 'rgba(232, 238, 255, 0.45)';
      ctx.lineWidth = Math.min(6, Math.max(1.2, scaleAt(lens, foot.depth) * 0.35));
      ctx.stroke();
    };
    post(1);
    post(-1);
  }
}

/** The marks the player's recent bends left, lying on the plane. */
function drawMarks(
  ctx: CanvasRenderingContext2D,
  lens: Lens,
  track: Track,
  player: ShipView,
): void {
  const marks = player.swings.slice(-5);
  marks.forEach((swing, i) => {
    if (swing.swing <= 0.5) return;
    const sector = track.sectors[swing.sector];
    if (sector === undefined) return;
    const line = routeOf(sector, swing.route);
    const at = placeOn(track, canonicalOf(sector, line, swing.bendStart), swing.route);
    const n = normalOf(at);
    const out = -at.turn * Math.min(swing.swing, PATH_HALF_WIDTH * 3);
    const eye = toEye(lens, at.pos.x + n.x * out, at.pos.y + n.y * out, 0.1);
    if (eye.depth <= 0) return;
    const p = toScreen(lens, eye);
    const r = Math.max(1.5, scaleAt(lens, eye.depth) * 2.4);
    const age = (i + 1) / marks.length;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = swing.wentWide
      ? `rgba(255,122,107,${0.18 + age * 0.5})`
      : `rgba(255,209,102,${0.1 + age * 0.3})`;
    ctx.fill();
  });
}

/**
 * One ship: a shadow on the plane so it reads as flying above it, a wake so it
 * reads as moving, and a dart that grows and shrinks with distance the way
 * everything else does.
 */
function drawShip(
  ctx: CanvasRenderingContext2D,
  lens: Lens,
  track: Track,
  ship: ShipView,
  point: { at: Place; x: number; y: number },
  colour: string,
  lane: number,
): void {
  const eye = toEye(lens, point.x, point.y, LIFT);
  if (eye.depth <= 0) return;
  const p = toScreen(lens, eye);
  const scale = scaleAt(lens, eye.depth);
  const tint = ship.wide ? SHIP_WIDE : colour;

  // Its wake, lying flat on the track: the line it actually took.
  if (ship.wake.length > 1) {
    const trail = ship.wake.slice(-46).map((step) => {
      const at = placeSmooth(track, step.distance, step.route);
      const n = normalOfHeading(at.heading);
      const out = step.offset + lane;
      return toEye(lens, at.pos.x + n.x * out, at.pos.y + n.y * out, 0.1);
    });
    if (traceLine(ctx, lens, trail)) {
      ctx.strokeStyle = withAlpha(tint, ship.isPlayer ? 0.45 : 0.3);
      ctx.lineWidth = Math.min(5, Math.max(1, scale * 0.5));
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  // The shadow, and the tether up to the ship.
  const under = toScreen(lens, toEye(lens, point.x, point.y, 0));
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#050a18';
  ctx.beginPath();
  ctx.ellipse(under.x, under.y, scale * 1.7, scale * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const size = Math.max(2.5, scale * SHIP_SIZE);

  // Which way it is pointing on screen, found by projecting a step along its
  // own heading rather than guessed from the camera: a rival crossing in front
  // of you through a bend is side-on, and should look it.
  const nose = toEye(
    lens,
    point.x + Math.cos(point.at.heading) * 6,
    point.y + Math.sin(point.at.heading) * 6,
    LIFT,
  );
  let facing = 0;
  if (nose.depth > 0) {
    const tip = toScreen(lens, nose);
    facing = Math.atan2(tip.x - p.x, -(tip.y - p.y));
  }

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(facing);
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.95, size * 0.75);
  ctx.lineTo(0, size * 0.3);
  ctx.lineTo(-size * 0.95, size * 0.75);
  ctx.closePath();
  ctx.fillStyle = tint;
  ctx.globalAlpha = ship.isPlayer ? 1 : 0.85;
  ctx.fill();
  if (ship.isPlayer) {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(232,238,255,0.9)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  // An engine glow, so speed shows on the ship as well as on the ground.
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = PATH;
  ctx.beginPath();
  ctx.ellipse(0, size * 0.55, size * 0.42, size * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** A hex colour at an alpha. */
function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
