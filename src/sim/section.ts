// Sections: the pieces a track is assembled from, and how they snap together.
//
// A track used to be one flat list of pieces walked from the origin, and it
// closed because `loopFromHalf` demanded a half that swept exactly 180° and
// then walked it twice. That made **closure a global constraint on the whole
// list** — the opposite of snapping, and the reason there could be no track
// builder. Sectors were not authored at all: checkpoints were even divisions of
// the total arc length, so a sector was a slice of a continuous walk rather than
// a thing you could lift out, reuse, or splice in.
//
// A **section** fixes both. It is a stretch of track that knows its own two
// ends: it starts at the origin facing along +x, and its `exit` says where it
// leaves you. Snapping one onto another is then just composing poses, which
// always works — any section fits any other. Closure stops being a rule the
// author obeys by hand and becomes a property of an assembled set, which
// something can check and something can fix.
//
// Pure and deterministic like everything in `src/sim`.

import type { Grade, Piece } from './track';

/** A place and a direction: where a section leaves you. */
export interface Pose {
  readonly x: number;
  readonly y: number;
  /** Radians. 0 is along +x, which is where every section starts. */
  readonly heading: number;
}

export const ORIGIN: Pose = { x: 0, y: 0, heading: 0 };

/** A way through a section besides its main line, as a lateral push on it. */
export interface Split {
  readonly bulge: number;
  readonly name: string;
  readonly grade: Grade;
}

/**
 * One stretch of track, with ends. This is the unit a track is built from, the
 * unit a checkpoint sits at either end of, and the unit that gets spliced in
 * when a loop grows.
 */
export interface Section {
  readonly id: string;
  readonly name: string;
  readonly pieces: readonly Piece[];
  /** The ways through it besides the golden path. */
  readonly splits: readonly Split[];
}

/** How long a piece is along its own arc. */
export function lengthOf(piece: Piece): number {
  return piece.kind === 'straight'
    ? piece.length
    : (Math.abs(piece.sweep) * Math.PI * piece.radius) / 180;
}

/** How far a piece list runs. */
export const spanOf = (pieces: readonly Piece[]): number =>
  pieces.reduce((sum, piece) => sum + lengthOf(piece), 0);

/** Bring an angle into (-π, π]. */
export function wrapAngle(radians: number): number {
  const tau = Math.PI * 2;
  let a = radians % tau;
  if (a > Math.PI) a -= tau;
  if (a <= -Math.PI) a += tau;
  return a;
}

/** Walk a piece list from a pose and say where it leaves you. */
export function poseAfter(pieces: readonly Piece[], from: Pose = ORIGIN): Pose {
  let { x, y, heading } = from;
  for (const piece of pieces) {
    if (piece.kind === 'straight') {
      x += Math.cos(heading) * piece.length;
      y += Math.sin(heading) * piece.length;
      continue;
    }
    const turn = Math.sign(piece.sweep);
    const sweep = (Math.abs(piece.sweep) * Math.PI) / 180;
    // The centre sits perpendicular to travel, on the inside of the turn.
    const cx = x - Math.sin(heading) * piece.radius * turn;
    const cy = y + Math.cos(heading) * piece.radius * turn;
    const from0 = Math.atan2(y - cy, x - cx);
    const to = from0 + sweep * turn;
    x = cx + Math.cos(to) * piece.radius;
    y = cy + Math.sin(to) * piece.radius;
    heading += sweep * turn;
  }
  return { x, y, heading };
}

/** Where a section leaves you, starting from its own entry. */
export const exitOf = (section: Section): Pose => poseAfter(section.pieces);

/** Compose a run of sections: where you stand after walking all of them. */
export function poseOfAll(sections: readonly Section[], from: Pose = ORIGIN): Pose {
  return sections.reduce((at, section) => poseAfter(section.pieces, at), from);
}

/** Every piece of an assembled set, in order — what the walker still wants. */
export const piecesOf = (sections: readonly Section[]): readonly Piece[] =>
  sections.flatMap((section) => section.pieces);

/** How far an assembled set is from being a closed circuit. */
export interface Closure {
  /** Distance from the last exit back to the start line, in track units. */
  readonly gap: number;
  /** How far the heading is out at the join, in radians, brought into (-π, π]. */
  readonly turn: number;
  readonly closed: boolean;
}

/**
 * A loop closes when the last section leaves you back where the first one
 * started, pointing the same way. Tolerances are generous on purpose: a
 * millimetre of drift over a two-thousand-unit circuit is not a hole.
 */
export function closureOf(
  sections: readonly Section[],
  tolerance = { gap: 0.5, turn: 0.01 },
): Closure {
  const end = poseOfAll(sections);
  const gap = Math.hypot(end.x, end.y);
  const turn = wrapAngle(end.heading);
  return { gap, turn, closed: gap <= tolerance.gap && Math.abs(turn) <= tolerance.turn };
}

// ---------------------------------------------------------------------------
// Closing the loop.
//
// The catalogue cannot guarantee that every arrangement of sections happens to
// come back to the start line — most will not, and demanding it is the global
// constraint we are trying to get rid of. So instead the loop is **closed for
// you**: given wherever the last section left off, find a short stretch of
// track that returns to the start line facing the right way.
//
// That stretch is a Dubins curve-straight-curve path: turn one way, run
// straight, turn again. Four of them exist for any two poses (left-straight-
// left, right-straight-right, and the two crossed ones) and the shortest valid
// one is the one to lay. It is the same construction a car park uses to work
// out how to reverse into a space, and it is what makes "any section snaps onto
// any other and the circuit still closes" true rather than aspirational.

/** Bring an angle into [0, 2π), which is what the arc lengths below want. */
const mod2pi = (radians: number): number => {
  const tau = Math.PI * 2;
  return ((radians % tau) + tau) % tau;
};

/** One curve-straight-curve candidate, in units of the turning radius. */
interface Csc {
  /** First turn, second turn: +1 left, -1 right. */
  readonly first: number;
  readonly second: number;
  /** Arc of the first turn, length of the straight, arc of the second. */
  readonly t: number;
  readonly p: number;
  readonly q: number;
}

function cscPaths(alpha: number, beta: number, d: number): readonly Csc[] {
  const found: Csc[] = [];
  const sa = Math.sin(alpha);
  const sb = Math.sin(beta);
  const ca = Math.cos(alpha);
  const cb = Math.cos(beta);
  const cab = Math.cos(alpha - beta);

  // Left, straight, left.
  const lsl = 2 + d * d - 2 * cab + 2 * d * (sa - sb);
  if (lsl >= 0) {
    const tmp = Math.atan2(cb - ca, d + sa - sb);
    found.push({
      first: 1,
      second: 1,
      t: mod2pi(-alpha + tmp),
      p: Math.sqrt(lsl),
      q: mod2pi(beta - tmp),
    });
  }
  // Right, straight, right.
  const rsr = 2 + d * d - 2 * cab + 2 * d * (sb - sa);
  if (rsr >= 0) {
    const tmp = Math.atan2(ca - cb, d - sa + sb);
    found.push({
      first: -1,
      second: -1,
      t: mod2pi(alpha - tmp),
      p: Math.sqrt(rsr),
      q: mod2pi(-beta + tmp),
    });
  }
  // Left, straight, right.
  const lsr = -2 + d * d + 2 * cab + 2 * d * (sa + sb);
  if (lsr >= 0) {
    const p = Math.sqrt(lsr);
    const tmp = Math.atan2(-ca - cb, d + sa + sb) - Math.atan2(-2, p);
    found.push({
      first: 1,
      second: -1,
      t: mod2pi(-alpha + tmp),
      p,
      q: mod2pi(-mod2pi(beta) + tmp),
    });
  }
  // Right, straight, left.
  const rsl = -2 + d * d + 2 * cab - 2 * d * (sa + sb);
  if (rsl >= 0) {
    const p = Math.sqrt(rsl);
    const tmp = Math.atan2(ca + cb, d - sa - sb) - Math.atan2(2, p);
    found.push({
      first: -1,
      second: 1,
      t: mod2pi(alpha - tmp),
      p,
      q: mod2pi(beta - tmp),
    });
  }
  return found;
}

/** The pieces of a CSC path, at a turning radius, dropping anything of no length. */
function piecesOfCsc(path: Csc, radius: number): readonly Piece[] {
  const degrees = (arc: number): number => (arc * 180) / Math.PI;
  const pieces: Piece[] = [];
  if (path.t > 1e-9)
    pieces.push({ kind: 'bend', radius, sweep: degrees(path.t) * path.first });
  if (path.p > 1e-9) pieces.push({ kind: 'straight', length: path.p * radius });
  if (path.q > 1e-9)
    pieces.push({ kind: 'bend', radius, sweep: degrees(path.q) * path.second });
  return pieces;
}

/**
 * A section that runs from wherever `sections` leave off back to the start
 * line, so the circuit closes. Undefined when the two ends are so close and so
 * badly aligned that no curve-straight-curve at this radius reaches — in which
 * case a wider radius, or one more section before it, is the answer.
 */
export function closingSection(
  sections: readonly Section[],
  radius: number,
  id = 'closing',
  name = 'The run home',
): Section | undefined {
  const from = poseOfAll(sections);
  const dx = ORIGIN.x - from.x;
  const dy = ORIGIN.y - from.y;
  const span = Math.hypot(dx, dy);
  const theta = Math.atan2(dy, dx);
  const alpha = mod2pi(from.heading - theta);
  const beta = mod2pi(ORIGIN.heading - theta);

  const candidates = cscPaths(alpha, beta, span / radius)
    .map((path) => ({ path, cost: path.t + path.p + path.q }))
    .sort((a, b) => a.cost - b.cost);

  for (const { path } of candidates) {
    const pieces = piecesOfCsc(path, radius);
    if (pieces.length === 0) continue;
    // Trust the arithmetic only after walking it: the formulae have four
    // branches and a sign error in one of them would close nothing.
    const landed = poseAfter(pieces, from);
    if (
      Math.hypot(landed.x - ORIGIN.x, landed.y - ORIGIN.y) < 0.5 &&
      Math.abs(wrapAngle(landed.heading - ORIGIN.heading)) < 0.01
    ) {
      return { id, name, pieces, splits: [] };
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Assembly.

/**
 * Where each section's checkpoint falls, measured along the lap. The first is
 * always 0, and there is one per section — which is the whole point: a sector
 * *is* a section now, rather than a slice of a continuous walk taken at an
 * arbitrary fraction of the total length.
 */
export function checkpointsOf(sections: readonly Section[]): readonly number[] {
  const marks: number[] = [];
  let at = 0;
  for (const section of sections) {
    marks.push(at);
    at += spanOf(section.pieces);
  }
  return marks;
}
