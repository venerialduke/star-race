// A track is a closed loop walked out from an ordered list of pieces. Walking
// them produces the centreline — the golden path — as evenly spaced samples,
// and fixes where every bend begins and ends.
//
// The pieces are level data, not tuning: the shape of a track is content.

import { FORK_SHARE, HOLD_GRIP, NAV_FOR_DARK, NAV_FOR_DIM } from './tuning';

export interface Vec {
  readonly x: number;
  readonly y: number;
}

export type Piece =
  | { readonly kind: 'straight'; readonly length: number }
  /** `sweep` is in degrees: positive turns left, negative turns right. */
  | { readonly kind: 'bend'; readonly radius: number; readonly sweep: number };

/** One sample of the centreline, every SAMPLE_STEP units of arc. */
export interface Sample {
  readonly pos: Vec;
  /** Direction of travel, in radians. */
  readonly heading: number;
  /** The radius of the bend here, or 0 on a straight. */
  readonly radius: number;
  /** +1 turning left, -1 turning right, 0 on a straight. */
  readonly turn: number;
}

export interface Bend {
  readonly start: number;
  readonly end: number;
  readonly radius: number;
  readonly turn: number;
}

/**
 * How easy a split is to see. Navigation is the thing that sees through it: a
 * better system turns a dark split dim and a dim split clear.
 */
export type Grade = 'clear' | 'dim' | 'dark';

/**
 * One way through a sector. Every route of a sector leaves its checkpoint and
 * arrives at the next one, so a ship on any of them is at the same place at
 * both ends — what differs in between is how long the line is and how tight
 * its bends are.
 */
export interface Route {
  readonly id: string;
  readonly name: string;
  readonly grade: Grade;
  /** Its own centreline. Not evenly spaced, so `cum` says where each sample is. */
  readonly samples: readonly Sample[];
  /** Arc length at each sample, from the start of the route. */
  readonly cum: readonly number[];
  readonly length: number;
  /** The bends on it, measured in this route's own distances. */
  readonly bends: readonly Bend[];
  /**
   * How far off the main line this route commits to, positive left of travel.
   * A ship arriving at the fork carrying this much offset is already on it.
   */
  readonly entryOffset: number;
}

/** The stretch between two checkpoints, and every way through it. */
export interface Sector {
  readonly index: number;
  /** Where its checkpoint is on the main line. */
  readonly start: number;
  readonly end: number;
  /** The main line first, splits after it. */
  readonly routes: readonly Route[];
}

export interface Track {
  readonly name: string;
  /** A few words for the player: how long it is and what kind of bends it has. */
  readonly shape: string;
  readonly samples: readonly Sample[];
  readonly bends: readonly Bend[];
  /** Distance of each checkpoint from the start line; the first is 0. */
  readonly checkpoints: readonly number[];
  readonly sectors: readonly Sector[];
  readonly length: number;
  readonly bounds: { readonly min: Vec; readonly max: Vec };
}

/** Arc length between centreline samples. Structural: the resolution of the polyline. */
const SAMPLE_STEP = 3;

/** The fastest a ship can take this bend and stay on the path. */
export function holdingSpeed(radius: number, handling: number): number {
  return Math.sqrt(HOLD_GRIP * handling * radius);
}

/** Where the ship is at a distance around the loop, wrapping at the lap. */
export function sampleAt(track: Track, distance: number): Sample {
  const samples = track.samples;
  const wrapped = ((distance % track.length) + track.length) % track.length;
  const index = Math.floor(wrapped / SAMPLE_STEP) % samples.length;
  return samples[index] as Sample;
}

/** The unit vector pointing left of travel. Offsets are measured along it. */
export function normalOf(sample: Sample): Vec {
  return { x: -Math.sin(sample.heading), y: Math.cos(sample.heading) };
}

/** The next bend at or after a distance, and how far ahead it starts. */
export function nextBend(
  track: Track,
  distance: number,
): { bend: Bend; gap: number } | undefined {
  const wrapped = ((distance % track.length) + track.length) % track.length;
  let best: { bend: Bend; gap: number } | undefined;
  for (const bend of track.bends) {
    const raw = bend.start - wrapped;
    const gap = raw < 0 ? raw + track.length : raw;
    if (best === undefined || gap < best.gap) best = { bend, gap };
  }
  return best;
}

/** Which sector a distance falls in, counting from 0 at the start line. */
export function sectorAt(track: Track, distance: number): number {
  const wrapped = ((distance % track.length) + track.length) % track.length;
  let sector = 0;
  for (let i = 0; i < track.checkpoints.length; i += 1) {
    if (wrapped >= (track.checkpoints[i] as number)) sector = i;
  }
  return sector;
}

/**
 * Walk the pieces into samples. A piece list whose sweeps total 180° and which
 * is then repeated twice closes exactly: the second copy is the first rotated
 * half a turn, so its displacement cancels the first's.
 */
export function buildTrack(
  name: string,
  pieces: readonly Piece[],
  sectorCount: number,
): Track {
  const samples: Sample[] = [];
  const bends: Bend[] = [];
  let pos: Vec = { x: 0, y: 0 };
  let heading = 0;
  /** Arc length already emitted, so samples stay evenly spaced across pieces. */
  let emitted = 0;
  let travelled = 0;

  const emitUpTo = (
    endOfPiece: number,
    at: (distanceIntoPiece: number) => Sample,
    pieceStart: number,
  ): void => {
    while (emitted <= endOfPiece - 1e-9) {
      samples.push(at(emitted - pieceStart));
      emitted += SAMPLE_STEP;
    }
  };

  for (const piece of pieces) {
    const pieceStart = travelled;
    if (piece.kind === 'straight') {
      const dir = { x: Math.cos(heading), y: Math.sin(heading) };
      const from = pos;
      const held = heading;
      emitUpTo(
        pieceStart + piece.length,
        (into) => ({
          pos: { x: from.x + dir.x * into, y: from.y + dir.y * into },
          heading: held,
          radius: 0,
          turn: 0,
        }),
        pieceStart,
      );
      pos = { x: from.x + dir.x * piece.length, y: from.y + dir.y * piece.length };
      travelled += piece.length;
    } else {
      const turn = Math.sign(piece.sweep);
      const sweepRad = (piece.sweep * Math.PI) / 180;
      const arc = Math.abs(sweepRad) * piece.radius;
      // Centre of the arc sits perpendicular to travel, on the inside: to the
      // left of travel for a left turn, to the right for a right one.
      const centre: Vec = {
        x: pos.x - Math.sin(heading) * piece.radius * turn,
        y: pos.y + Math.cos(heading) * piece.radius * turn,
      };
      const startAngle = Math.atan2(pos.y - centre.y, pos.x - centre.x);
      const held = heading;
      emitUpTo(
        pieceStart + arc,
        (into) => {
          const t = into / piece.radius;
          const angle = startAngle + t * turn;
          return {
            pos: {
              x: centre.x + Math.cos(angle) * piece.radius,
              y: centre.y + Math.sin(angle) * piece.radius,
            },
            heading: held + t * turn,
            radius: piece.radius,
            turn,
          };
        },
        pieceStart,
      );
      bends.push({
        start: pieceStart,
        end: pieceStart + arc,
        radius: piece.radius,
        turn,
      });
      const endAngle = startAngle + Math.abs(sweepRad) * turn;
      pos = {
        x: centre.x + Math.cos(endAngle) * piece.radius,
        y: centre.y + Math.sin(endAngle) * piece.radius,
      };
      heading = held + Math.abs(sweepRad) * turn;
      travelled += arc;
    }
  }

  let min = { x: Infinity, y: Infinity };
  let max = { x: -Infinity, y: -Infinity };
  for (const s of samples) {
    min = { x: Math.min(min.x, s.pos.x), y: Math.min(min.y, s.pos.y) };
    max = { x: Math.max(max.x, s.pos.x), y: Math.max(max.y, s.pos.y) };
  }

  const checkpoints: number[] = [];
  for (let i = 0; i < sectorCount; i += 1) {
    checkpoints.push((travelled * i) / sectorCount);
  }

  const bare: Track = {
    name,
    shape: '',
    samples,
    bends,
    checkpoints,
    sectors: [],
    length: travelled,
    bounds: { min, max },
  };
  // Every track has sectors; a track with no splits has one route in each.
  return withSplits(
    bare,
    checkpoints.map(() => []),
  );
}

/**
 * A loop from a half that turns through 180°, walked twice. The second copy is
 * the first rotated half a turn, so the circuit closes exactly.
 */
function loopFromHalf(
  name: string,
  shape: string,
  half: readonly Piece[],
  sectorCount: number,
  splits: readonly (readonly Split[])[] = [],
): Track {
  const sweep = half.reduce((sum, p) => sum + (p.kind === 'bend' ? p.sweep : 0), 0);
  if (Math.abs(sweep - 180) > 1e-9) {
    throw new Error(`${name}: a half must sweep 180°, not ${sweep}°`);
  }
  const track = buildTrack(name, [...half, ...half], sectorCount);
  return { ...withSplits(track, splits), shape };
}

/**
 * The splits on a track: for each sector, the ways through it besides the
 * golden path. A bulge is a lateral push on the sector's own line, positive to
 * the left of travel — everything else about the split falls out of that.
 */
type Split = { bulge: number; name: string; grade: Grade };

/**
 * The splits on each track: for every sector, the ways through it besides the
 * golden path. A positive bulge hugs the inside of the sector's bends — shorter
 * and tighter; a negative one runs round the outside — longer, but it opens the
 * corners up, so it is the line to take when you cannot afford to be thrown.
 *
 * The grades are not sprinkled at random. **A split you need a navigation
 * system to read is a better split than one anybody can see**, or the system
 * would not be worth its slot.
 */
const KESTREL_SPLITS: readonly (readonly Split[])[] = [
  [{ bulge: -8, name: 'The long way round', grade: 'clear' }],
  [{ bulge: 8, name: 'The cut', grade: 'dim' }],
  [{ bulge: 20, name: 'The inside', grade: 'clear' }],
  [{ bulge: 12, name: 'The needle', grade: 'dark' }],
];

const MERIDIAN_SPLITS: readonly (readonly Split[])[] = [
  [{ bulge: 16, name: 'The shortcut', grade: 'clear' }],
  [{ bulge: -12, name: 'The wide sweep', grade: 'clear' }],
  [
    { bulge: 20, name: 'The tight line', grade: 'dim' },
    { bulge: -16, name: 'The outer arc', grade: 'dark' },
  ],
  [{ bulge: 16, name: 'The late apex', grade: 'dim' }],
];

/**
 * The Coil is half bends, so its inside lines are a gamble that only a ship
 * with handling to spare wins — and its dark split is the opposite, the wide
 * line that is worth most to the ship that cannot corner at all.
 */
const CINDER_SPLITS: readonly (readonly Split[])[] = [
  [{ bulge: 6, name: 'The squeeze', grade: 'clear' }],
  [{ bulge: 6, name: 'The inside', grade: 'dim' }],
  [{ bulge: -10, name: 'The relief road', grade: 'dark' }],
];

/** A middling circuit: a sweeper, a tight right, a hairpin. Where the game started. */
export const KESTREL_LOOP = loopFromHalf(
  'Kestrel Loop',
  'medium · mixed bends',
  [
    { kind: 'straight', length: 260 },
    { kind: 'bend', radius: 70, sweep: 70 },
    { kind: 'straight', length: 90 },
    { kind: 'bend', radius: 42, sweep: -55 },
    { kind: 'straight', length: 70 },
    { kind: 'bend', radius: 55, sweep: 165 },
  ],
  4,
  KESTREL_SPLITS,
);

/** Long straights and open sweepers: a track that pays for top speed. */
export const MERIDIAN_RUN = loopFromHalf(
  'Meridian Run',
  'long · open sweepers',
  [
    { kind: 'straight', length: 420 },
    { kind: 'bend', radius: 85, sweep: 60 },
    { kind: 'straight', length: 300 },
    { kind: 'bend', radius: 110, sweep: 55 },
    { kind: 'straight', length: 200 },
    { kind: 'bend', radius: 62, sweep: 65 },
  ],
  4,
  MERIDIAN_SPLITS,
);

/** Short and tight, barely a straight on it: a track that punishes carrying speed. */
export const CINDER_COIL = loopFromHalf(
  'Cinder Coil',
  'short · tight and busy',
  [
    { kind: 'straight', length: 80 },
    { kind: 'bend', radius: 30, sweep: 90 },
    { kind: 'straight', length: 50 },
    { kind: 'bend', radius: 26, sweep: -70 },
    { kind: 'straight', length: 40 },
    { kind: 'bend', radius: 34, sweep: 160 },
  ],
  3,
  CINDER_SPLITS,
);

/** Every track, in the order the player sees them. */
export const TRACKS: readonly Track[] = [KESTREL_LOOP, MERIDIAN_RUN, CINDER_COIL];

// ---------------------------------------------------------------------------
// Routes: the ways through a sector.
//
// A split is built by pushing the sector's own centreline sideways — out
// through the bends, or in through them — and letting the geometry say what
// that costs. Nothing about a split is authored twice: one lateral bulge
// decides its length, its bends and where it sits on screen, so a line that
// cuts the inside of a bend is shorter *and* tighter because it is the same
// line, not because two numbers were chosen to agree.
// ---------------------------------------------------------------------------

/** The lateral profile of a split: nothing at the checkpoints, all of it between. */
function profileAt(t: number): number {
  const ramp = (x: number): number => 0.5 - 0.5 * Math.cos(Math.PI * x);
  if (t < FORK_SHARE) return ramp(t / FORK_SHARE);
  if (t > 1 - FORK_SHARE) return ramp((1 - t) / FORK_SHARE);
  return 1;
}

/**
 * Turn a sector's turn directions into a continuous "which way is inside"
 * signal: the turn itself inside a bend, and a straight blend between one bend
 * and the next across the straight between them, easing to nothing at the
 * sector's own ends so every route starts and finishes on the checkpoint.
 */
function insideDirection(turns: readonly number[]): number[] {
  const n = turns.length;
  const dir = turns.map((t) => t);
  let i = 0;
  while (i < n) {
    if ((dir[i] as number) !== 0) {
      i += 1;
      continue;
    }
    let end = i;
    while (end < n && (dir[end] as number) === 0) end += 1;
    // Ends of the sector count as nothing: a route leaves and arrives on the line.
    const from = i === 0 ? 0 : (dir[i - 1] as number);
    const to = end >= n ? 0 : (dir[end] as number);
    const steps = end - i + 1;
    for (let k = i; k < end; k += 1) {
      const f = (k - i + 1) / steps;
      dir[k] = from * (1 - f) + to * f;
    }
    i = end;
  }
  return dir;
}

/** Where a polyline points and how long it is. Curvature does not come from here. */
function measureLine(points: readonly Vec[]): {
  headings: number[];
  cum: number[];
  length: number;
} {
  const n = points.length;
  const cum: number[] = [0];
  for (let i = 1; i < n; i += 1) {
    const a = points[i - 1] as Vec;
    const b = points[i] as Vec;
    cum.push((cum[i - 1] as number) + Math.hypot(b.x - a.x, b.y - a.y));
  }
  // Central differences: the direction from the point before to the point
  // after is the tangent *at* this point. A forward difference is the tangent
  // half a step later, which leaves every heading lagging its own sample and
  // makes the joins between routes worse than they need to be.
  const headings: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const a = points[Math.max(0, i - 1)] as Vec;
    const b = points[Math.min(n - 1, i + 1)] as Vec;
    headings.push(Math.atan2(b.y - a.y, b.x - a.x));
  }
  return { headings, cum, length: cum[n - 1] as number };
}

/**
 * One route through a sector, as a lateral bulge on the sector's own line.
 * A bulge of 0 is the golden path itself.
 *
 * The bulge is measured **toward the inside of whatever the line is doing**,
 * not toward one side of the screen: positive hugs the inside of every bend in
 * the sector, negative runs round the outside of every one. Pushing to a fixed
 * side was the first version and it made nonsense of any sector that turns
 * both ways — it tightened one corner and opened the next, so half the splits
 * came out longer *and* tighter, which is nobody's choice. Following the turn
 * makes the trade the same everywhere: **inside is shorter and tighter,
 * outside is longer and opens up.**
 *
 * The line is measured off the offset polyline, but its **bends are not**:
 * they come from the track's authored bends, moved sideways. Reading curvature
 * back off a polyline was an earlier version and it lied about exactly the
 * corners that matter — a 40-unit r42 hairpin came back as r60, because a
 * short bend is smeared by the samples either side of it. The arithmetic is
 * exact anyway: hugging the inside of a bend of radius `r` by `b` leaves `r-b`.
 */
function routeFrom(
  track: Track,
  start: number,
  end: number,
  bulge: number,
  id: string,
  name: string,
  grade: Grade,
): Route {
  const span = end - start;
  const steps = Math.max(8, Math.round(span / SAMPLE_STEP));

  const base = [];
  for (let i = 0; i <= steps; i += 1)
    base.push(sampleAt(track, start + (i / steps) * span));

  // Which way "inside" points at each step: the turn itself through a bend,
  // and a straight swing between the two on the straight in between, so the
  // line crosses over rather than kinking.
  const inside = insideDirection(base.map((sample) => sample.turn));

  const points: Vec[] = base.map((sample, i) => {
    const off = bulge * (inside[i] as number) * profileAt(i / steps);
    const n = normalOf(sample);
    return { x: sample.pos.x + n.x * off, y: sample.pos.y + n.y * off };
  });
  const { headings, cum, length } = measureLine(points);

  /** Where a point of the sector, as a fraction of it, falls along this route. */
  const alongAt = (t: number): number => {
    const raw = Math.min(steps, Math.max(0, t * steps));
    const low = Math.floor(raw);
    const high = Math.min(steps, low + 1);
    const frac = raw - low;
    return (cum[low] as number) * (1 - frac) + (cum[high] as number) * frac;
  };

  const bends: Bend[] = [];
  for (const bend of track.bends) {
    const from = Math.max(bend.start, start);
    const to = Math.min(bend.end, end);
    if (to - from <= 1e-9) continue;
    const t0 = (from - start) / span;
    const t1 = (to - start) / span;
    bends.push({
      start: alongAt(t0),
      end: alongAt(t1),
      // The bulge is toward the inside here, so it comes straight off the radius.
      radius: Math.max(4, bend.radius - bulge * profileAt((t0 + t1) / 2)),
      turn: bend.turn,
    });
  }

  // Samples take their curvature from the bends, so the line the ship flies and
  // the corners it meets are the same object.
  //
  // Both ends take the main line's own heading rather than an estimate. Every
  // route of a sector leaves and arrives on the checkpoint, and the lateral
  // profile is flat there — its slope at both ends is zero — so the route
  // really is tangent to the main line at each end, and saying so exactly is
  // what keeps a ship from flicking as it crosses from one sector's route to
  // the next one's.
  const samples: Sample[] = points.map((pos, i) => {
    const at = cum[i] as number;
    const bend = bends.find((b) => at >= b.start && at < b.end);
    const ends =
      i === 0
        ? sampleAt(track, start).heading
        : i === points.length - 1
          ? sampleAt(track, end - 1e-6).heading
          : undefined;
    return {
      pos,
      heading: ends ?? (headings[i] as number),
      radius: bend?.radius ?? 0,
      turn: bend?.turn ?? 0,
    };
  });

  return { id, name, grade, samples, cum, bends, length, entryOffset: bulge };
}

/** Where a route is at a distance along it, clamped to its ends. */
export function sampleOn(route: Route, along: number): Sample {
  const cum = route.cum;
  if (along <= 0) return route.samples[0] as Sample;
  if (along >= route.length) return route.samples[route.samples.length - 1] as Sample;
  let low = 0;
  let high = cum.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if ((cum[mid] as number) <= along) low = mid;
    else high = mid - 1;
  }
  return route.samples[low] as Sample;
}

/**
 * Where a route is at a distance along it, **between** samples.
 *
 * `sampleOn` snaps to the sample it lands in, which is what the simulation
 * wants — a bend's radius is a fact about the bend, not something to average
 * across its edge. It is not what a camera wants. Samples are 3 units apart and
 * a ship covers 0.85 in a tick, so a snapped position holds still for three
 * ticks and then jumps the whole 3 units, and a snapped heading does not turn
 * at all and then snaps 0.043 radians. Followed by a camera that is a visible
 * shake.
 *
 * So this exists alongside `sampleOn` rather than replacing it: position and
 * heading are the only things any view needs, and they are the only things
 * here. Nothing in `src/sim` outside this file calls it.
 */
export function placeSmooth(track: Track, distance: number, routeIndex: number): Place {
  const sector = sectorOf(track, distance);
  const route = routeOf(sector, routeIndex);
  const along = alongOf(track, sector, route, distance);
  const cum = route.cum;
  const samples = route.samples;

  let low = 0;
  let high = cum.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if ((cum[mid] as number) <= along) low = mid;
    else high = mid - 1;
  }
  const here = samples[low] as Sample;
  const next = samples[low + 1];
  if (next === undefined) return { pos: here.pos, heading: here.heading };

  const span = (cum[low + 1] as number) - (cum[low] as number);
  const t =
    span <= 0 ? 0 : Math.min(1, Math.max(0, (along - (cum[low] as number)) / span));
  return {
    pos: {
      x: here.pos.x + (next.pos.x - here.pos.x) * t,
      y: here.pos.y + (next.pos.y - here.pos.y) * t,
    },
    heading: here.heading + shortestTurn(here.heading, next.heading) * t,
  };
}

/** Just the position and heading — what a view needs and nothing else. */
export interface Place {
  readonly pos: Vec;
  readonly heading: number;
}

/** The shortest way round from one heading to another, in (-π, π]. */
export function shortestTurn(from: number, to: number): number {
  const tau = Math.PI * 2;
  let delta = (to - from) % tau;
  if (delta > Math.PI) delta -= tau;
  if (delta <= -Math.PI) delta += tau;
  return delta;
}

/** The bend a route is in at a distance along it, if any. */
export function bendOn(route: Route, along: number): Bend | undefined {
  return route.bends.find((b) => along >= b.start && along < b.end);
}

/** The next bend on a route at or after a distance, and how far ahead it starts. */
export function nextBendOn(
  route: Route,
  along: number,
): { bend: Bend; gap: number } | undefined {
  for (const bend of route.bends) {
    if (bend.start >= along) return { bend, gap: bend.start - along };
  }
  return undefined;
}

/** The sector a canonical distance falls in. */
export function sectorOf(track: Track, distance: number): Sector {
  return track.sectors[sectorAt(track, distance)] as Sector;
}

/** A route by index, falling back to the main line if the index is not one. */
export function routeOf(sector: Sector, index: number): Route {
  return (sector.routes[index] ?? sector.routes[0]) as Route;
}

/**
 * How far along its own line a ship is, given where it is round the lap.
 *
 * Canonical distance is measured on the main line and nowhere else, so laps,
 * checkpoints and standings never have to care which way a ship went. What a
 * route changes is the exchange rate: a short line buys canonical distance
 * faster than a long one, which is exactly why it is worth taking.
 */
export function alongOf(
  track: Track,
  sector: Sector,
  route: Route,
  distance: number,
): number {
  // Canonical distance counts up across laps; a sector does not. Forgetting to
  // wrap here pinned every ship at the end of sector 0 from lap 2 onwards.
  const wrapped = ((distance % track.length) + track.length) % track.length;
  const span = sector.end - sector.start;
  const t = span <= 0 ? 0 : (wrapped - sector.start) / span;
  return Math.min(route.length, Math.max(0, t * route.length));
}

/** Where a ship is, given how far round the lap it is and which way it went. */
export function placeOn(track: Track, distance: number, routeIndex: number): Sample {
  const sector = sectorOf(track, distance);
  const route = routeOf(sector, routeIndex);
  return sampleOn(route, alongOf(track, sector, route, distance));
}

/** The inverse of `alongOf`: where a point on a route sits round the lap. */
export function canonicalOf(sector: Sector, route: Route, along: number): number {
  const t = route.length <= 0 ? 0 : along / route.length;
  return sector.start + t * (sector.end - sector.start);
}

/** Canonical distance bought per unit travelled on a route. */
export function rateOf(sector: Sector, route: Route): number {
  return route.length <= 0 ? 1 : (sector.end - sector.start) / route.length;
}

/** How a split reads next to the main line, for the board. */
export function describeRoute(sector: Sector, route: Route): string {
  const main = sector.routes[0] as Route;
  if (route === main) return 'the golden path';
  const longer = (route.length - main.length) / main.length;
  const tightest = (r: Route): number =>
    r.bends.reduce((least, b) => Math.min(least, b.radius), Infinity);
  const mine = tightest(route);
  const theirs = tightest(main);
  const length =
    Math.abs(longer) < 0.005
      ? 'same length'
      : `${Math.abs(Math.round(longer * 100))}% ${longer < 0 ? 'shorter' : 'longer'}`;
  if (!Number.isFinite(mine) || !Number.isFinite(theirs)) return length;
  const bends =
    mine < theirs * 0.97 ? 'tighter' : mine > theirs * 1.03 ? 'opens up' : 'same bends';
  return `${length} · ${bends}`;
}

/** The lowest navigation that can read a split of each grade. */
export function navFor(grade: Grade): number {
  return grade === 'clear' ? 0 : grade === 'dim' ? NAV_FOR_DIM : NAV_FOR_DARK;
}

/**
 * Which way through each sector a given navigation is allowed to plan. A split
 * it cannot read is not a choice it has — the ship can still be thrown onto
 * one at the fork, which is a different thing from choosing it.
 */
export function legalRoutes(track: Track, nav: number): readonly (readonly number[])[] {
  return track.sectors.map((sector) =>
    sector.routes.flatMap((route, i) => (navFor(route.grade) <= nav ? [i] : [])),
  );
}

/** Splits on this track a given navigation still cannot read. */
export function unreadable(track: Track, nav: number): number {
  return track.sectors.reduce(
    (count, sector) =>
      count + sector.routes.filter((route) => navFor(route.grade) > nav).length,
    0,
  );
}

/** Give a built track its sectors: the main line, plus whatever splits it has. */
export function withSplits(
  track: Track,
  splits: readonly (readonly { bulge: number; name: string; grade: Grade }[])[],
): Track {
  const sectors: Sector[] = track.checkpoints.map((start, index) => {
    const end =
      index + 1 < track.checkpoints.length
        ? (track.checkpoints[index + 1] as number)
        : track.length;
    const here = splits[index] ?? [];
    return {
      index,
      start,
      end,
      routes: [
        routeFrom(track, start, end, 0, `s${index}-main`, 'The golden path', 'clear'),
        ...here.map((split, i) =>
          routeFrom(
            track,
            start,
            end,
            split.bulge,
            `s${index}-${i}`,
            split.name,
            split.grade,
          ),
        ),
      ],
    };
  });
  let min = track.bounds.min;
  let max = track.bounds.max;
  for (const sector of sectors) {
    for (const route of sector.routes) {
      for (const sample of route.samples) {
        min = { x: Math.min(min.x, sample.pos.x), y: Math.min(min.y, sample.pos.y) };
        max = { x: Math.max(max.x, sample.pos.x), y: Math.max(max.y, sample.pos.y) };
      }
    }
  }
  return { ...track, sectors, bounds: { min, max } };
}
