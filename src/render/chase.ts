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
  bandAt,
  canonicalOf,
  effectOf,
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
import { heightAt, reliefOf, type Relief } from './height';
import { drawSky, type Sky } from './sky';
import type { FixtureView, RouteView, ShipView } from './draw';
import {
  ENVIRONMENT_COLOURS,
  HAZARD,
  HOLE,
  MINE,
  POCKET,
  SHOT,
  labelOf,
  withAlpha as alpha,
} from './view';

/** Where the camera sits relative to the ship it is following. */
const BACK = 32;
export const HEIGHT = 15;
const PITCH = 0.3;

/** How far down the track is drawn, and how finely. */
const AHEAD = 460;
const BEHIND = 70;
const STEP = 6;

/**
 * How high a road is at a distance round the lap. Drawing only, always.
 *
 * It takes the route as well as the distance because a split and the golden
 * path span the same canonical distances — one number per lap could never tell
 * a bridge from the road under it.
 */
export type Lift = (distance: number, route: number) => number;

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
  /**
   * Where the track rises over itself, and the track it was worked out for.
   * Solving every crossing is a walk over every pair of samples, so it is done
   * once per track rather than sixty times a second.
   */
  relief: Relief | undefined;
  reliefFor: Track | undefined;
}

export const newChase = (): Chase => ({
  camera: { x: 0, y: 0, height: HEIGHT, yaw: 0, pitch: PITCH },
  settled: false,
  relief: undefined,
  reliefFor: undefined,
});

/**
 * Where the eye goes for a ship: behind it, above its own road, tilted along
 * whatever the road ahead is doing.
 *
 * Pulled out whole so that it can be checked. The one thing a chase camera owes
 * its subject is to keep it on screen, and that is a claim about where the ship
 * *projects* — which is testable without a canvas, and is what
 * `tests/render/chase.test.ts` asserts over every track.
 */
export function eyeFor(
  track: Track,
  routes: RouteView,
  player: ShipView,
  lift: Lift,
): Camera {
  const me = shipPoint(track, player);
  const yaw = me.at.heading;
  const underfoot = lift(player.distance, player.route);
  return {
    x: me.x - Math.cos(yaw) * BACK,
    y: me.y - Math.sin(yaw) * BACK,
    height: eyeHeight(underfoot),
    yaw,
    pitch: eyePitch(track, routes, player, underfoot, lift),
  };
}

/**
 * How far off the ground the eye sits: `HEIGHT` above **the ship's own road**,
 * and nothing else.
 *
 * Two earlier versions were wrong in opposite directions. Taking the height
 * from the road a camera's length *behind* the ship is a different point on a
 * ramp, so the ship slid up and down the screen. Then taking the highest road
 * within sight lifted the eye the moment a bridge came into view — hundreds of
 * units early, and far enough that the ship was lost off the bottom of the
 * frame. A camera that is following something follows it.
 *
 * What a hill does to the picture is a matter of where the eye *looks*, which
 * is `eyePitch` below, not of how high it floats.
 */
function eyeHeight(underfoot: number): number {
  return HEIGHT + underfoot;
}

/**
 * How far the eye tilts: the flat-ground angle, less whatever the road ahead is
 * climbing.
 *
 * This is what gives a hill a sense of direction. The road rises, the camera
 * tilts up to keep looking along it; over a crest it tilts back down. On level
 * ground the slope is zero and the angle is exactly the one the camera has
 * always had, so nothing about a flat track moves.
 *
 * Clamped, because the ship has to stay on screen and a camera that pitches far
 * enough loses it off an edge. The limits are measured against where the ship
 * actually projects rather than picked — see `tests/render/chase.test.ts`.
 */
function eyePitch(
  track: Track,
  routes: RouteView,
  player: ShipView,
  underfoot: number,
  lift: Lift,
): number {
  const aim = player.distance + LOOKS_ALONG;
  const rise = lift(aim, lineAt(track, routes, player, aim)) - underfoot;
  const tilt = Math.atan(rise / LOOKS_ALONG);
  return Math.max(LEAST_PITCH, Math.min(MOST_PITCH, PITCH - tilt));
}

/** How far up the road the eye aims when working out its angle. */
const LOOKS_ALONG = 70;

/**
 * How far the tilt may go either way: half the level angle, up or down.
 *
 * Down is positive, so the floor is the camera looking up a climb and the
 * ceiling is it looking down the far side. The numbers come from measuring
 * where the ship lands rather than from taste. Unclamped, a hill put it at 98%
 * of the frame height — on screen by the arithmetic and off it in practice,
 * since a ship has a size. These hold it inside 43% to 80% while still leaving
 * about nine degrees of swing to feel the hill with.
 */
const LEAST_PITCH = 0.15;
const MOST_PITCH = 0.45;

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
  fixtures: readonly FixtureView[],
  sky: Sky,
  chase: Chase,
  seconds: number,
  width: number,
  height: number,
): void {
  if (chase.reliefFor !== track) {
    chase.relief = reliefOf(track);
    chase.reliefFor = track;
  }
  const relief = chase.relief as Relief;
  /**
   * How high the road is at a distance round the lap.
   *
   * Visual only, and structurally so: this comes from `render/height.ts`, which
   * `src/sim` is forbidden to import. A track that never crosses itself is flat
   * and every number below is what it always was.
   */
  const lift = (distance: number, route: number): number =>
    heightAt(track, relief, distance, route);

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
  const underfoot = lift(player.distance, player.route);
  const target = eyeFor(track, routes, player, lift);
  const follow = easeShare(seconds, FOLLOW_TIME);
  const turn = easeShare(seconds, TURN_TIME);
  chase.camera = chase.settled
    ? {
        x: chase.camera.x + (target.x - chase.camera.x) * follow,
        y: chase.camera.y + (target.y - chase.camera.y) * follow,
        height: chase.camera.height + (target.height - chase.camera.height) * follow,
        yaw: chase.camera.yaw + shortestTurn(chase.camera.yaw, yaw) * turn,
        // Eased like everything else, or cresting a hill is a flinch.
        pitch: chase.camera.pitch + (target.pitch - chase.camera.pitch) * turn,
      }
    : target;
  chase.settled = true;

  const lens = lensFor(chase.camera, width, height);
  drawSky(ctx, lens, sky);

  // Where the ship's own patch of track is on screen: the road is at full
  // colour there and fades from there to the horizon.
  const underMe = toScreen(lens, toEye(lens, me.x, me.y, underfoot)).y;
  drawRoad(ctx, lens, track, routes, player, underMe, lift);
  drawGates(ctx, lens, track, player);
  drawMarks(ctx, lens, track, player, lift);
  // On the road, before the ships, so a rival is never hidden behind a mine.
  for (const fixture of fixtures) drawFixture(ctx, lens, track, fixture, lift);

  // Far ships first, so a rival close behind never paints over one in front.
  const drawn = ships
    .map((ship, i) => ({
      ship,
      colour: SHIP_COLOURS[i % SHIP_COLOURS.length] as string,
      lane: (i - (ships.length - 1) / 2) * LANE,
    }))
    .map((row) => {
      const point = shipPoint(track, row.ship, row.lane);
      return {
        ...row,
        point,
        eye: toEye(lens, point.x, point.y, LIFT + lift(row.ship.distance, row.ship.route)),
      };
    })
    .filter((row) => row.eye.depth > 0)
    .sort((a, b) => b.eye.depth - a.eye.depth);
  // A shot runs between two ships, so it is drawn once both their points are
  // known — under them, so neither end of it is hidden by what it connects.
  const points = new Map(
    drawn.map((row) => [
      ships.indexOf(row.ship),
      { ...row.point, up: lift(row.ship.distance, row.ship.route) + LIFT },
    ]),
  );
  for (const row of drawn) {
    const target =
      row.ship.shotAt === undefined ? undefined : points.get(row.ship.shotAt);
    const mine = points.get(ships.indexOf(row.ship));
    if (target !== undefined && mine !== undefined) tracer(ctx, lens, mine, target);
  }
  for (const row of drawn) {
    if (row.ship.struck > 0) {
      const at = points.get(ships.indexOf(row.ship));
      if (at !== undefined) flash(ctx, lens, at, row.ship.struck);
    }
    drawShip(ctx, lens, track, row.ship, row.point, row.colour, row.lane, lift);
  }
}

/** The line a shot took. Drawn on the plane, so it runs away with the road. */
function tracer(
  ctx: CanvasRenderingContext2D,
  lens: Lens,
  from: { x: number; y: number; up: number },
  to: { x: number; y: number; up: number },
): void {
  const a = toEye(lens, from.x, from.y, from.up);
  const b = toEye(lens, to.x, to.y, to.up);
  if (a.depth <= 0 || b.depth <= 0) return;
  const pa = toScreen(lens, a);
  const pb = toScreen(lens, b);
  ctx.beginPath();
  ctx.moveTo(pa.x, pa.y);
  ctx.lineTo(pb.x, pb.y);
  ctx.strokeStyle = alpha(SHOT, 0.5);
  ctx.lineWidth = Math.max(1, scaleAt(lens, Math.min(a.depth, b.depth)) * 0.5);
  ctx.setLineDash([5, 5]);
  ctx.stroke();
  ctx.setLineDash([]);
}

/** A ring where something landed, opening out and fading as it goes. */
function flash(
  ctx: CanvasRenderingContext2D,
  lens: Lens,
  at: { x: number; y: number; up: number },
  strength: number,
): void {
  const centre = toEye(lens, at.x, at.y, at.up);
  if (centre.depth <= 0) return;
  const radius = 4 + (1 - strength) * 14;
  const ring: { x: number; y: number }[] = [];
  for (let i = 0; i <= 14; i += 1) {
    const angle = (i / 14) * Math.PI * 2;
    const point = toEye(
      lens,
      at.x + Math.cos(angle) * radius,
      at.y + Math.sin(angle) * radius,
      LIFT,
    );
    if (point.depth <= 0) return;
    ring.push(toScreen(lens, point));
  }
  ctx.beginPath();
  ring.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.strokeStyle = alpha(SHOT, 0.9 * strength);
  ctx.lineWidth = Math.max(1, scaleAt(lens, centre.depth) * 0.8);
  ctx.stroke();
}

/**
 * A mine or a black hole, standing on the road ahead. Drawn as a ring lying on
 * the plane, because the thing that matters is whether your line goes through
 * it — a marker floating above the track would not answer that.
 */
function drawFixture(
  ctx: CanvasRenderingContext2D,
  lens: Lens,
  track: Track,
  fixture: FixtureView,
  lift: Lift,
): void {
  const up = lift(fixture.distance, fixture.route);
  const at = placeOn(track, fixture.distance, fixture.route);
  const n = normalOf(at);
  const cx = at.pos.x + n.x * fixture.offset;
  const cy = at.pos.y + n.y * fixture.offset;
  const eye = toEye(lens, cx, cy, up);
  if (eye.depth <= 0) return;
  const radius = fixture.kind === 'mine' ? 5 : 9;
  const ring: { x: number; y: number }[] = [];
  for (let i = 0; i <= 16; i += 1) {
    const a = (i / 16) * Math.PI * 2;
    const point = toEye(lens, cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, up);
    if (point.depth <= 0) return;
    ring.push(toScreen(lens, point));
  }
  ctx.beginPath();
  ring.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  const colour = fixture.kind === 'mine' ? MINE : HOLE;
  ctx.fillStyle = withAlpha(colour, fixture.kind === 'mine' ? 0.22 : 0.4);
  ctx.fill();
  ctx.strokeStyle = withAlpha(colour, fixture.mine ? 0.5 : 0.95);
  ctx.lineWidth = Math.max(1, scaleAt(lens, eye.depth) * 0.6);
  ctx.stroke();

  // Something standing up out of the ring, and its name over it.
  //
  // The ring alone is the thing's *reach*, painted flat on the road, and flat
  // on the road is exactly where a perspective view hides it — at any distance
  // it is a few pixels of ellipse under the horizon. A post is visible from far
  // enough away to steer around, which is the whole point of drawing it.
  //
  // Placeholder shapes: a narrow post for a mine, a wide one for a hole, each
  // in its own colour. Both say what they are in text, because a coloured
  // rectangle is not something a player should have to learn.
  const post = fixture.kind === 'mine' ? 1.6 : 4;
  const tall = fixture.kind === 'mine' ? 6 : 10;
  const corners = [
    toEye(lens, cx - n.x * post, cy - n.y * post, up),
    toEye(lens, cx + n.x * post, cy + n.y * post, up),
    toEye(lens, cx + n.x * post, cy + n.y * post, up + tall),
    toEye(lens, cx - n.x * post, cy - n.y * post, up + tall),
  ];
  if (tracePolygon(ctx, lens, corners)) {
    ctx.fillStyle = withAlpha(colour, 0.55);
    ctx.fill();
    ctx.strokeStyle = withAlpha(colour, 0.95);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  label(
    ctx,
    lens,
    { x: cx, y: cy },
    up + tall + 4,
    fixture.kind === 'mine' ? 'MINE' : 'BLACK HOLE',
    colour,
  );
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
  lift: Lift,
): void {
  const from = player.distance - BEHIND;
  const to = player.distance + AHEAD;

  // The other roads first, then the one the ship is on, so its own line is
  // never painted over by a fork running alongside it.
  for (const other of otherRoads(track, lens, routes, player, from, to, lift)) {
    drawSurface(ctx, lens, other.rail, nearY, other.readable ? 0.6 : 0.24);
  }

  const mine = railAlong(track, lens, from, to, (d) => lineAt(track, routes, player, d), lift);
  drawSurface(ctx, lens, mine, nearY, 1);
  drawBands(ctx, lens, track, mine);
  drawCentreLine(ctx, lens, mine);
}

/**
 * What the road ahead is made of: a nebula, a debris field, a stretch that pays.
 *
 * The map draws these too, and it has to — it is where a route is *chosen*. This
 * is where one is *flown*, and a player who cannot see the nebula coming has no
 * way to connect being thrown wide with the reason for it.
 *
 * Placeholder art on purpose: a tint on the road and the thing's name floating
 * over it. What matters first is that the stretch is visibly a thing and says
 * which thing it is; what it eventually looks like is a separate job.
 */
function drawBands(
  ctx: CanvasRenderingContext2D,
  lens: Lens,
  track: Track,
  rail: readonly Rung[],
): void {
  // Consecutive rungs standing in the same band are one run. Identity compares
  // rather than value, because a band is a stable object on its route — so a
  // lap coming round onto the same stretch is the same run, and two touching
  // stretches that happen to read alike stay two.
  let i = 0;
  while (i < rail.length) {
    const here = rail[i] as Rung;
    const band = bandAt(track, here.distance, here.route);
    if (band === undefined) {
      i += 1;
      continue;
    }
    let end = i;
    while (
      end + 1 < rail.length &&
      bandAt(track, (rail[end + 1] as Rung).distance, (rail[end + 1] as Rung).route) ===
        band
    ) {
      end += 1;
    }
    const run = rail.slice(i, end + 1);
    i = end + 1;
    if (run.length < 2) continue;

    // The ground it is made of. `open` has nothing to say, so it is not drawn.
    const environment = band.properties.environment ?? 'open';
    const paint = (colour: string, left: readonly Eye[], right: readonly Eye[]): void => {
      if (!tracePolygon(ctx, lens, [...left, ...[...right].reverse()])) return;
      ctx.fillStyle = colour;
      ctx.fill();
    };
    // The nearest rung of the run decides how solid it is drawn: a stretch at
    // the horizon is a hint, one under the ship is the thing you are in.
    const near = run.reduce((least, r) => Math.min(least, r.fade), 1);
    const strength = 1 - near * 0.6;
    if (environment !== 'open') {
      paint(
        alpha(
          ENVIRONMENT_COLOURS[environment],
          (environment === 'shadow' ? 0.62 : 0.34) * strength,
        ),
        run.map((r) => r.left),
        run.map((r) => r.right),
      );
    }
    // Pocket and hazard are numbers rather than places, so they edge the
    // stretch: a strip down each side, inside the path. A stretch can be a
    // nebula *and* pay, and one colour cannot say both.
    const effect = effectOf(band.properties);
    const strip = (colour: string, out: number, width: number): void => {
      const edge = (r: Rung, at: number, side: number): Eye =>
        toEye(
          lens,
          r.pos.x + r.across.x * at * side,
          r.pos.y + r.across.y * at * side,
          0.08,
        );
      for (const side of [1, -1] as const) {
        paint(
          colour,
          run.map((r) => edge(r, out, side)),
          run.map((r) => edge(r, out - width, side)),
        );
      }
    };
    if (effect.pocket > 0) strip(alpha(POCKET, 0.5 * strength), PATH_HALF_WIDTH, 2);
    if (effect.hazard > 0)
      strip(alpha(HAZARD, 0.55 * strength), PATH_HALF_WIDTH - 2.5, 1.6);

    // And its name, once, over the near end of the run — so it is read on the
    // way in rather than after it has already cost you something.
    const text = labelOf(band.properties);
    const front = run.reduce(
      (best, r) => (r.fade < best.fade ? r : best),
      run[0] as Rung,
    );
    if (text !== '') {
      label(
        ctx,
        lens,
        front.pos,
        LABEL_HEIGHT,
        text,
        environment === 'open' ? POCKET : ENVIRONMENT_COLOURS[environment],
      );
    }
  }
}

/** How high over the road a placeholder label floats. */
const LABEL_HEIGHT = 9;

/**
 * A name hung in the world over a point on the road.
 *
 * Drawn in screen space at a size the distance decides, with a dark outline
 * under it — the road behind it is anything from near-black to a bright nebula,
 * and a label that is only readable over one of those is not a label.
 */
function label(
  ctx: CanvasRenderingContext2D,
  lens: Lens,
  at: { readonly x: number; readonly y: number },
  up: number,
  text: string,
  colour: string,
): void {
  const eye = toEye(lens, at.x, at.y, up);
  if (eye.depth <= 0) return;
  const point = toScreen(lens, eye);
  const size = Math.max(8, Math.min(20, scaleAt(lens, eye.depth) * 1.5));
  if (size <= 8.5) return;
  ctx.font = `600 ${size.toFixed(1)}px ui-monospace, Consolas, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = alpha(VOID, 0.9);
  ctx.lineWidth = Math.max(2, size * 0.3);
  ctx.strokeText(text, point.x, point.y);
  ctx.fillStyle = colour;
  ctx.fillText(text, point.x, point.y);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
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
  /** Where round the lap this rung is, and which road it is on. */
  readonly distance: number;
  readonly route: number;
  /** The same point in the world, so a label can be hung above it. */
  readonly pos: { readonly x: number; readonly y: number };
  /** Left of travel here, so anything drawn across the road can be placed. */
  readonly across: { readonly x: number; readonly y: number };
}

/** Walk a stretch of canonical distance and measure the road across it. */
function railAlong(
  track: Track,
  lens: Lens,
  from: number,
  to: number,
  routeAt: (distance: number) => number,
  lift: Lift,
): Rung[] {
  const steps = Math.max(2, Math.ceil((to - from) / STEP));
  const rail: Rung[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const distance = from + ((to - from) * i) / steps;
    const route = routeAt(distance);
    const at = placeSmooth(track, distance, route);
    const n = normalOfHeading(at.heading);
    // Everything on this rung sits on the road, and the road is wherever the
    // relief put it. A flat track lifts by zero and nothing moves.
    const ground = lift(distance, route);
    const point = (out: number, up = 0): Eye =>
      toEye(lens, at.pos.x + n.x * out, at.pos.y + n.y * out, ground + up);
    rail.push({
      distance,
      route,
      pos: at.pos,
      across: n,
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
  lift: Lift,
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
        rail: railAlong(track, lens, start, end, () => index, lift),
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
      // Every road is held to the ground at its own two checkpoints, so a gate
      // is always at zero — which is also what lets two roads meeting there
      // agree on a height without anything being solved.
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
  lift: Lift,
): void {
  const marks = player.swings.slice(-5);
  marks.forEach((swing, i) => {
    if (swing.swing <= 0.5) return;
    const sector = track.sectors[swing.sector];
    if (sector === undefined) return;
    const line = routeOf(sector, swing.route);
    const where = canonicalOf(sector, line, swing.bendStart);
    const at = placeOn(track, where, swing.route);
    const n = normalOf(at);
    const out = -at.turn * Math.min(swing.swing, PATH_HALF_WIDTH * 3);
    // A mark is a scuff on the road, so it goes wherever the road went.
    const eye = toEye(
      lens,
      at.pos.x + n.x * out,
      at.pos.y + n.y * out,
      lift(where, swing.route) + 0.1,
    );
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
  lift: Lift,
): void {
  // A ship flies over the road, so everything about it — hull, shadow, wake and
  // the step used to work out which way it is pointing — is measured from the
  // road under it rather than from the plane. Drawing the hull at the road's
  // height and its shadow on the flat plane was the first version, and it made
  // a ship going over a bridge look like it was carrying straight on through.
  const ground = lift(ship.distance, ship.route);
  const eye = toEye(lens, point.x, point.y, ground + LIFT);
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
      return toEye(
        lens,
        at.pos.x + n.x * out,
        at.pos.y + n.y * out,
        lift(step.distance, step.route) + 0.1,
      );
    });
    if (traceLine(ctx, lens, trail)) {
      ctx.strokeStyle = withAlpha(tint, ship.isPlayer ? 0.45 : 0.3);
      ctx.lineWidth = Math.min(5, Math.max(1, scale * 0.5));
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  // The shadow, and the tether up to the ship.
  const under = toScreen(lens, toEye(lens, point.x, point.y, ground));
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
    point.x + Math.cos(point.at.heading) * PROBE,
    point.y + Math.sin(point.at.heading) * PROBE,
    ground + LIFT,
  );
  let facing = 0;
  // How much of the screen a unit of height takes against a unit of road ahead,
  // right here. Measured rather than assumed, because it is the whole size of
  // the lean and it is nowhere near 1: the road ahead is foreshortened and the
  // vertical is not.
  let rise = 1;
  if (nose.depth > 0) {
    const tip = toScreen(lens, nose);
    facing = Math.atan2(tip.x - p.x, -(tip.y - p.y));
    const along = Math.hypot(tip.x - p.x, tip.y - p.y);
    const above = toScreen(
      lens,
      toEye(lens, point.x, point.y, ground + LIFT + PROBE),
    );
    // Capped, because a ship pointing straight at the camera has no road ahead
    // of it on screen at all and the ratio runs away.
    if (along > 0.01) {
      rise = Math.min(MOST_RISE, Math.hypot(above.x - p.x, above.y - p.y) / along);
    }
  }

  // And how far its nose is lifted, which is the gradient of the road under it.
  const corner = hullOf(
    facing,
    shipTilt(track, lift, ship.distance, ship.route),
    size,
    rise,
  );

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(facing);
  ctx.beginPath();
  ctx.moveTo(...corner(1, 0));
  ctx.lineTo(...corner(-0.75, 0.95));
  ctx.lineTo(...corner(-0.3, 0));
  ctx.lineTo(...corner(-0.75, -0.95));
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
  ctx.ellipse(...corner(-0.55, 0), size * 0.42, size * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

/**
 * Where a point of the hull lands, given which way the ship faces and how far
 * its nose is up.
 *
 * The hull is described the way a ship is shaped rather than the way it is
 * drawn: how far forward and how far across, in units of its size. Tilting it
 * is then one rotation about the across axis — the nose swings up toward the
 * world's vertical and the body foreshortens, which is what makes a climb read
 * as a climb rather than as a ship that has simply grown.
 *
 * Two things make it worth writing down rather than inlining. The canvas frame
 * has **already been turned** by `facing`, and a turned frame's up is not the
 * screen's: straight up the screen is `(0, -1)` outside it and
 * `(-sin facing, -cos facing)` within, so that is where forward leans. And a
 * unit of height is not a unit of road on screen — under a camera looking along
 * the track the road ahead is foreshortened almost to nothing while the
 * vertical is barely foreshortened at all — so `rise`, the ratio between the
 * two where the ship is, carries the lean. Treating them as equal was the first
 * version and it under-tilted the ship by a factor of several.
 *
 * At no tilt it comes back to exactly the flat dart, on every heading and at
 * any `rise`.
 */
export function hullOf(
  facing: number,
  tilt: number,
  size: number,
  rise: number,
): (forward: number, across: number) => [number, number] {
  const lean = Math.sin(tilt) * rise;
  const ahead = {
    x: -Math.sin(facing) * lean,
    y: -Math.cos(tilt) - Math.cos(facing) * lean,
  };
  return (forward, across) => [
    (across + ahead.x * forward) * size,
    ahead.y * forward * size,
  ];
}

/**
 * How far the ship's nose lifts: the gradient of the road under it.
 *
 * A ship over a bridge used to be drawn flat while the road it was on climbed
 * away beneath it, which read as the ship ignoring the hill entirely. This is
 * the road's own slope, measured either side of where the ship is, and nothing
 * else. It changes no number in the race — height is a drawing, and so is this
 * — only which way the hull points.
 *
 * Capped, because a ramp is steepest at its middle and a short sector can stack
 * a bump on a taper: the Cinder gets to 46° of road, and a ship standing on its
 * tail is not the thing this is for.
 */
export function shipTilt(
  track: Track,
  lift: Lift,
  distance: number,
  route: number,
): number {
  const wrap = (at: number): number =>
    track.length <= 0 ? 0 : ((at % track.length) + track.length) % track.length;
  const climb =
    lift(wrap(distance + GRADIENT_STEP), route) -
    lift(wrap(distance - GRADIENT_STEP), route);
  const tilt = Math.atan(climb / (GRADIENT_STEP * 2));
  return Math.max(-MOST_TILT, Math.min(MOST_TILT, tilt));
}

/** How far either side of the ship the road's gradient is read. */
const GRADIENT_STEP = 6;

/**
 * The length of the two steps that `rise` is the ratio of: one along the road,
 * one straight up. The same number for both or it is not a ratio.
 */
const PROBE = 6;

/** The most the hull ever leans, in radians: a little over 20°. */
const MOST_TILT = 0.36;

/** The most the lean is ever multiplied by, however side-on the ship is. */
const MOST_RISE = 4;

/** A hex colour at an alpha. */
function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
