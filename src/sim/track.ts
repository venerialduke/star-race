// A track is a closed loop walked out from an ordered list of pieces. Walking
// them produces the centreline — the golden path — as evenly spaced samples,
// and fixes where every bend begins and ends.
//
// The pieces are level data, not tuning: the shape of a track is content.

import {
  ORIGIN,
  checkpointsOf,
  closureOf,
  connector,
  piecesOf,
  poseAfter,
  wrapAngle,
  type Pose,
  type Section,
} from './section';
import { HOLD_GRIP, NAV_FOR_DARK, NAV_FOR_DIM } from './tuning';

export interface Vec {
  readonly x: number;
  readonly y: number;
}

/**
 * What a stretch of track is **like**, beyond its shape.
 *
 * Everything here is optional and additive, and a piece's own properties beat
 * the sector's. Nothing reads them yet — they are the vocabulary, laid down
 * before there is anything to say with it.
 *
 * This is the thing the track model has never had. Until now a stretch of track
 * could say nothing about itself except how long it was and how hard it turned,
 * which is exactly why every split has had to be balanced on the clock: "worth
 * taking because it is safer, or because it holds something" has had no way to
 * be written down.
 */
export interface Properties {
  /** What surrounds it. Drawn first, and eventually what lives there. */
  readonly environment?: 'open' | 'nebula' | 'debris' | 'shadow';
  /** Pays a ship that flies it: dark matter, salvage. */
  readonly pocket?: number;
  /** Danger **on** the path, rather than only off it. */
  readonly hazard?: number;
}

/**
 * The smallest unit of track: a shape, and what that stretch is like.
 *
 * The shape stays parametric — a length, a radius, an angle — which is what
 * lets a builder offer a slider rather than a text box, and what lets the
 * connector invent a piece of exactly the size a gap needs.
 *
 * Properties sit alongside the shape rather than nested under it. Nesting reads
 * better on paper and would have cost a rewrite of every piece in the game and
 * every `piece.kind` that reads one, for no gain in what can be expressed.
 */
export type Piece = (
  | { readonly kind: 'straight'; readonly length: number }
  /** `sweep` is in degrees: positive turns left, negative turns right. */
  | { readonly kind: 'bend'; readonly radius: number; readonly sweep: number }
) & {
  /** Half-width of the golden path here. The track's own when unset. */
  readonly halfWidth?: number;
  readonly properties?: Properties;
};

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
  /**
   * The benchmark lap, in ticks — what the pacing lap is paid against. Level
   * data, measured: a ship that spends its opening budget well and carries
   * speed through the bends beats it, and one that does neither does not.
   */
  readonly par: number;
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
/** What walking a run of pieces produces: the line, its bends, and its length. */
export interface Walk {
  readonly samples: readonly Sample[];
  readonly bends: readonly Bend[];
  readonly length: number;
}

/**
 * Walk pieces from a pose, emitting the centreline every `SAMPLE_STEP` units
 * and recording where each bend begins and ends.
 *
 * Used for the golden path and for every split alike, which is the point: a
 * split is a road walked from its own pieces now, not the golden path pushed
 * sideways, so there is one way of turning pieces into a line and everything
 * uses it.
 */
export function walkPieces(pieces: readonly Piece[], from: Pose = ORIGIN): Walk {
  const samples: Sample[] = [];
  const bends: Bend[] = [];
  let pos: Vec = { x: from.x, y: from.y };
  let heading = from.heading;
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
      const start = pos;
      const held = heading;
      emitUpTo(
        pieceStart + piece.length,
        (into) => ({
          pos: { x: start.x + dir.x * into, y: start.y + dir.y * into },
          heading: held,
          radius: 0,
          turn: 0,
        }),
        pieceStart,
      );
      pos = { x: start.x + dir.x * piece.length, y: start.y + dir.y * piece.length };
      travelled += piece.length;
      continue;
    }
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
    bends.push({ start: pieceStart, end: pieceStart + arc, radius: piece.radius, turn });
    const endAngle = startAngle + Math.abs(sweepRad) * turn;
    pos = {
      x: centre.x + Math.cos(endAngle) * piece.radius,
      y: centre.y + Math.sin(endAngle) * piece.radius,
    };
    heading = held + Math.abs(sweepRad) * turn;
    travelled += arc;
  }
  return { samples, bends, length: travelled };
}

export function buildTrack(
  name: string,
  pieces: readonly Piece[],
  /**
   * Either how many sectors to cut the lap into evenly, or exactly where the
   * checkpoints go. A count was all there was when a track was one continuous
   * walk; a list is what an assembled set of sections hands over, so that a
   * checkpoint sits at every join rather than at an arbitrary fraction.
   */
  sectors: number | readonly number[],
): Track {
  const { samples, bends, length: travelled } = walkPieces(pieces);

  let min = { x: Infinity, y: Infinity };
  let max = { x: -Infinity, y: -Infinity };
  for (const s of samples) {
    min = { x: Math.min(min.x, s.pos.x), y: Math.min(min.y, s.pos.y) };
    max = { x: Math.max(max.x, s.pos.x), y: Math.max(max.y, s.pos.y) };
  }

  let checkpoints: number[];
  if (typeof sectors === 'number') {
    checkpoints = [];
    for (let i = 0; i < sectors; i += 1) {
      checkpoints.push((travelled * i) / sectors);
    }
  } else {
    checkpoints = [...sectors];
  }

  // The bare line and where its checkpoints fall. Sectors and their roads are
  // `assemblePlan`'s job, because a road is walked from its own pieces and this
  // function has not been given any.
  return {
    name,
    shape: '',
    par: 0,
    samples,
    bends,
    checkpoints,
    sectors: [],
    length: travelled,
    bounds: { min, max },
  };
}

/**
 * The splits on a track: for each sector, the ways through it besides the
 * golden path. A bulge is a lateral push on the sector's own line, positive to
 * the left of travel — everything else about the split falls out of that.
 *
 * `loopFromHalf` used to live here: a half that swept exactly 180°, walked
 * twice so the circuit closed. It is gone, and with it the rule that closure is
 * something the author gets right by hand. Sections carry their own ends and
 * `assemble` checks the set; `closingSection` builds the run home for any
 * arrangement that does not already close.
 */

/**
 * The three tracks, as plans: a ring of sectors, and the roads beside it.
 *
 * Each ring is the same shape it has always been, piece for piece. What has
 * changed is the splits. They used to be a single number each — a lateral shove
 * applied to the golden path — and they are roads now, authored by peeling off
 * the checkpoint and letting the connector find the way back to the next one.
 *
 * The rings are still a half walked twice, which is why the sections repeat.
 * That is a property of these three tracks rather than a rule anybody obeys.
 */
const S = (length: number): Piece => ({ kind: 'straight', length });
const B = (radius: number, sweep: number): Piece => ({ kind: 'bend', radius, sweep });
const sector = (id: string, name: string, pieces: readonly Piece[]): Section => ({
  id,
  name,
  pieces,
  splits: [],
});

const KESTREL_RING: readonly Section[] = [
  sector('kestrel-main', 'The long straight', [S(260), B(70, 70), S(90)]),
  sector('kestrel-esses', 'The esses', [B(42, -55), S(70), B(55, 165)]),
  sector('kestrel-main-2', 'The long straight again', [S(260), B(70, 70), S(90)]),
  sector('kestrel-esses-2', 'The esses again', [B(42, -55), S(70), B(55, 165)]),
];

/** A medium loop of mixed bends: the one that asks for a bit of everything. */
export const KESTREL_LOOP = assemblePlan({
  name: 'Kestrel Loop',
  shape: 'medium · mixed bends',
  par: 2100,
  ring: KESTREL_RING,
  splits: [
    {
      from: 0,
      grade: 'clear',
      sector: splitThrough(
        KESTREL_RING,
        0,
        'kestrel-wide',
        'The long way round',
        [B(90, -60)],
        85,
      ),
    },
    {
      from: 1,
      grade: 'dim',
      sector: splitThrough(
        KESTREL_RING,
        1,
        'kestrel-cut',
        'The cut',
        [B(26, 22), S(60)],
        26,
      ),
    },
    {
      from: 3,
      grade: 'dark',
      sector: splitThrough(
        KESTREL_RING,
        3,
        'kestrel-needle',
        'The needle',
        [B(45, 46)],
        26,
      ),
    },
  ],
});

const MERIDIAN_RING: readonly Section[] = [
  sector('meridian-drag', 'The drag', [S(420), B(85, 60), S(300)]),
  sector('meridian-sweep', 'The sweep', [B(110, 55), S(200), B(62, 65)]),
  sector('meridian-drag-2', 'The drag again', [S(420), B(85, 60), S(300)]),
  sector('meridian-sweep-2', 'The sweep again', [B(110, 55), S(200), B(62, 65)]),
];

/** Long straights and open sweepers: a track that pays for top speed. */
export const MERIDIAN_RUN = assemblePlan({
  name: 'Meridian Run',
  shape: 'long · open sweepers',
  par: 3250,
  ring: MERIDIAN_RING,
  splits: [
    {
      from: 0,
      grade: 'clear',
      sector: splitThrough(
        MERIDIAN_RING,
        0,
        'meridian-outer',
        'The outer arc',
        [B(90, -60), S(60)],
        85,
      ),
    },
    {
      from: 1,
      grade: 'dim',
      sector: splitThrough(
        MERIDIAN_RING,
        1,
        'meridian-wide',
        'The wide line',
        [B(70, -14)],
        160,
      ),
    },
    {
      from: 2,
      grade: 'clear',
      sector: splitThrough(
        MERIDIAN_RING,
        2,
        'meridian-inside',
        'The inside line',
        [B(120, 46), S(320)],
        34,
      ),
    },
    {
      from: 3,
      grade: 'dark',
      sector: splitThrough(
        MERIDIAN_RING,
        3,
        'meridian-far',
        'The far side',
        [B(120, -14)],
        160,
      ),
    },
  ],
});

const CINDER_RING: readonly Section[] = [
  sector('cinder-hook', 'The hook', [S(80), B(30, 90), S(50), B(26, -70)]),
  sector('cinder-coil', 'The coil', [S(40), B(34, 160), S(80), B(30, 90)]),
  sector('cinder-whip', 'The whip', [S(50), B(26, -70), S(40), B(34, 160)]),
];

/** Short and tight, barely a straight on it: a track that punishes carrying speed. */
export const CINDER_COIL = assemblePlan({
  name: 'Cinder Coil',
  shape: 'short · tight and busy',
  par: 1320,
  ring: CINDER_RING,
  splits: [
    {
      from: 0,
      grade: 'dark',
      // The Cinder is 687 units of curl, and it folds back on itself hard
      // enough that no road beside this sector clears the *rest* of the
      // circuit by two corridors — searched exhaustively; the best available is
      // 36 units against a corridor of 26. So the roads do not cross and their
      // corridors do overlap, which means a ship thrown badly wide here could
      // reach the other road. That is a property of a track this small rather
      // than a mistake in this split, and it is the kind of thing a builder
      // will have to say out loud.
      sector: splitThrough(
        CINDER_RING,
        0,
        'cinder-tight',
        'The tight line',
        [B(30, 55), S(40)],
        52,
      ),
    },
    {
      from: 1,
      grade: 'dim',
      sector: splitThrough(
        CINDER_RING,
        1,
        'cinder-outside',
        'The outside',
        [B(45, 60), S(30)],
        60,
      ),
    },
    {
      from: 2,
      grade: 'clear',
      sector: splitThrough(
        CINDER_RING,
        2,
        'cinder-sling',
        'The slingshot',
        [B(55, -46), S(100)],
        26,
      ),
    },
  ],
});

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
/**
 * A way through a sector that is **its own road**: a sector in its own right,
 * connecting the same two checkpoints as the golden path does.
 *
 * The thing it replaces was a number. A split used to be `{ bulge: 46 }`, and
 * the route was the golden path sampled and shoved sideways — so a split had no
 * pieces, no authored bends, and no meaning independent of whatever shape it
 * happened to be applied to. Move a checkpoint and the road silently became a
 * different road, which is exactly what happened when sections landed and the
 * Kestrel's dark split had to be re-measured to get its character back.
 */
export interface SplitEdge {
  readonly sector: Section;
  /** The checkpoint it leaves, as an index into the ring. */
  readonly from: number;
  readonly grade: Grade;
}

/** A whole track, as it is authored: a ring of sectors, and the roads beside it. */
export interface TrackPlan {
  readonly name: string;
  readonly shape: string;
  readonly par: number;
  /** The golden path in order. A checkpoint falls between consecutive sectors. */
  readonly ring: readonly Section[];
  readonly splits?: readonly SplitEdge[];
}

/** Where each checkpoint is and which way it faces. Walked, never authored. */
export function checkpointPoses(ring: readonly Section[]): readonly Pose[] {
  const poses: Pose[] = [];
  let at: Pose = ORIGIN;
  for (const sector of ring) {
    poses.push(at);
    at = poseAfter(sector.pieces, at);
  }
  return poses;
}

/**
 * A route from its own pieces, walked from the checkpoint it leaves.
 *
 * `entryOffset` — how far off the golden path this road commits to — is
 * measured rather than declared: the furthest the road gets from the line,
 * signed, comparing them at the same fraction of the way through the sector,
 * which is the same mapping `alongOf` and `rateOf` use to trade one for the
 * other.
 */
function routeOfPieces(
  track: Track,
  start: number,
  span: number,
  pieces: readonly Piece[],
  from: Pose,
  id: string,
  name: string,
  grade: Grade,
): Route {
  const walked = walkPieces(pieces, from);
  const { bends, length } = walked;
  // A route has to **arrive**. The walk emits every SAMPLE_STEP and stops short
  // of the end, which is right for a closed lap — its last sample is a step
  // before the line it is about to cross — and wrong for a road that must meet
  // the next checkpoint exactly. So the end is added if the walk did not land
  // on it, and `cum` says where each sample really is rather than assuming
  // they are evenly spaced, because that last step is a short one.
  const samples = [...walked.samples];
  const cum = samples.map((_, i) => i * SAMPLE_STEP);
  const lastAt = cum[cum.length - 1] ?? 0;
  if (length - lastAt > 1e-6) {
    const end = poseAfter(pieces, from);
    const tail = bends.find((b) => b.end >= length - 1e-6);
    samples.push({
      pos: { x: end.x, y: end.y },
      heading: end.heading,
      radius: tail?.radius ?? 0,
      turn: tail?.turn ?? 0,
    });
    cum.push(length);
  }

  let entryOffset = 0;
  samples.forEach((sample, i) => {
    const fraction = length === 0 ? 0 : (cum[i] as number) / length;
    const online = sampleAt(track, start + fraction * span);
    const n = normalOf(online);
    const off =
      (sample.pos.x - online.pos.x) * n.x + (sample.pos.y - online.pos.y) * n.y;
    if (Math.abs(off) > Math.abs(entryOffset)) entryOffset = off;
  });

  return { id, name, grade, samples, cum, length, bends, entryOffset };
}

/**
 * Build a track from a plan: a ring of sectors, and the splits beside them.
 *
 * Every route — the golden path's own included — is walked from its pieces, so
 * there is one way a road becomes a line. A split has to leave its checkpoint
 * and arrive at the next one at the poses the ring has, and this says so rather
 * than assuming it.
 */
export function assemblePlan(plan: TrackPlan): Track {
  const closure = closureOf(plan.ring);
  if (!closure.closed) {
    throw new Error(
      `${plan.name}: the ring does not close — ${closure.gap.toFixed(1)} units and ` +
        `${((closure.turn * 180) / Math.PI).toFixed(1)}° out.`,
    );
  }
  const marks = checkpointsOf(plan.ring);
  const poses = checkpointPoses(plan.ring);
  const base = buildTrack(plan.name, piecesOf(plan.ring), marks);

  const sectors: Sector[] = plan.ring.map((sector, index) => {
    const start = marks[index] as number;
    const end = index + 1 < marks.length ? (marks[index + 1] as number) : base.length;
    const span = end - start;
    const here = poses[index] as Pose;
    const mine = (plan.splits ?? []).filter((split) => split.from === index);
    return {
      index,
      start,
      end,
      routes: [
        routeOfPieces(
          base,
          start,
          span,
          sector.pieces,
          here,
          `s${index}-main`,
          'The golden path',
          'clear',
        ),
        ...mine.map((split, i) =>
          routeOfPieces(
            base,
            start,
            span,
            split.sector.pieces,
            here,
            `s${index}-${i}`,
            split.sector.name,
            split.grade,
          ),
        ),
      ],
    };
  });

  let min = base.bounds.min;
  let max = base.bounds.max;
  for (const sector of sectors) {
    for (const route of sector.routes) {
      for (const sample of route.samples) {
        min = { x: Math.min(min.x, sample.pos.x), y: Math.min(min.y, sample.pos.y) };
        max = { x: Math.max(max.x, sample.pos.x), y: Math.max(max.y, sample.pos.y) };
      }
    }
  }
  return {
    ...base,
    shape: plan.shape,
    par: plan.par,
    sectors,
    bounds: { min, max },
  };
}

/**
 * A split authored the way a builder authors one: **peel off, then find the way
 * back.** You lay the pieces that give the road its character — swing out, run
 * wide, dive inside — and the connector works out the curve-straight-curve that
 * returns it to the checkpoint the golden path is about to reach.
 *
 * This is why the connector was worth generalising. Closing a ring and closing a
 * split are the same problem: a start pose, a goal pose, and the smallest thing
 * that joins them.
 */
export function splitThrough(
  ring: readonly Section[],
  from: number,
  id: string,
  name: string,
  lead: readonly Piece[],
  radius: number,
): Section {
  const poses = checkpointPoses(ring);
  const here = poses[from];
  const next = poses[(from + 1) % poses.length];
  if (here === undefined || next === undefined) {
    throw new Error(`${id}: no checkpoint ${from}`);
  }
  const tail = connector(poseAfter(lead, here), next, radius);
  if (tail === undefined) {
    throw new Error(
      `${id}: no way back to checkpoint ${(from + 1) % poses.length} at radius ${radius}`,
    );
  }
  return { id, name, pieces: [...lead, ...tail], splits: [] };
}

/**
 * How far each split is from meeting the checkpoint it should arrive at. Empty
 * when every road in the plan joins up — which is what a builder needs to say.
 */
export function splitFaults(
  plan: TrackPlan,
): readonly { readonly split: SplitEdge; readonly gap: number; readonly turn: number }[] {
  const poses = checkpointPoses(plan.ring);
  const faults = [];
  for (const split of plan.splits ?? []) {
    const here = poses[split.from];
    const next = poses[(split.from + 1) % poses.length];
    if (here === undefined || next === undefined) continue;
    const landed = poseAfter(split.sector.pieces, here);
    const gap = Math.hypot(landed.x - next.x, landed.y - next.y);
    const turn = Math.abs(wrapAngle(landed.heading - next.heading));
    if (gap > 0.5 || turn > 0.01) faults.push({ split, gap, turn });
  }
  return faults;
}

