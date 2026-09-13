// A track is a closed loop walked out from an ordered list of pieces. Walking
// them produces the centreline — the golden path — as evenly spaced samples,
// and fixes where every bend begins and ends.
//
// The pieces are level data, not tuning: the shape of a track is content.

import { HOLD_GRIP } from './tuning';

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

export interface Track {
  readonly name: string;
  readonly samples: readonly Sample[];
  readonly bends: readonly Bend[];
  /** Distance of each checkpoint from the start line; the first is 0. */
  readonly checkpoints: readonly number[];
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

  return { name, samples, bends, checkpoints, length: travelled, bounds: { min, max } };
}

/**
 * The first loop. Its half turns through 180° — a long sweeper, a tight right,
 * then a hairpin — and is walked twice, so the circuit closes exactly.
 */
const HALF: readonly Piece[] = [
  { kind: 'straight', length: 260 },
  { kind: 'bend', radius: 70, sweep: 70 },
  { kind: 'straight', length: 90 },
  { kind: 'bend', radius: 42, sweep: -55 },
  { kind: 'straight', length: 70 },
  { kind: 'bend', radius: 55, sweep: 165 },
];

export const SLICE_TRACK: Track = buildTrack('Kestrel Loop', [...HALF, ...HALF], 4);
