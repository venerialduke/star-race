// The course: what the ship flies through, and where the race pauses.
//
// A track is an ordered list of segments. A segment has a length measured in
// ticks at base speed — a ship faster than base crosses it in fewer ticks —
// and a list of hazard placements sitting inside it. Stage gates mark the
// segments at whose end the race pauses and the player returns to the garage.
//
// Geometry is separate from timing on purpose. `path` is a spline used only to
// draw the course and to place the ship on screen; nothing in the simulation
// reads it. Lengths, hazards and gates decide what actually happens.
//
// The numbers in SLICE_TRACK below are level data — the shape of a course, not
// balance knobs. See the tuning.ts header for that distinction.

import { makeSpline, type Spline } from './spline';

/** The four hazards in the vertical slice. One function each in hazards.ts. */
export type HazardKind = 'asteroidField' | 'gammaBurst' | 'blackHole' | 'ringedPlanet';

export interface HazardPlacement {
  readonly kind: HazardKind;
  /** Ticks from the start of its segment where the hazard begins. */
  readonly startTick: number;
  /** How long it lasts, in ticks. An instantaneous burst is 1. */
  readonly lengthTicks: number;
}

export interface Segment {
  /** Shown in the garage and in logs; not used by the simulation. */
  readonly name: string;
  /** How long the segment takes at base speed, in whole ticks. */
  readonly lengthTicks: number;
  readonly hazards: readonly HazardPlacement[];
}

export interface Track {
  readonly segments: readonly Segment[];
  /**
   * Segment indices at whose end the race pauses. Sorted, no duplicates, and
   * never the final segment — the race ends there rather than pausing. Three
   * stages means two gates.
   */
  readonly gates: readonly number[];
  /** Geometry only: the line the course is drawn along. */
  readonly path: Spline;
}

/** A contiguous run of segments the ship flies without returning to the garage. */
export interface Stage {
  /** Index of the first segment of the stage. */
  readonly firstSegment: number;
  /** Index of the last segment of the stage, inclusive. */
  readonly lastSegment: number;
  readonly lengthTicks: number;
}

/**
 * Build a track, rejecting anything the simulation could not run: empty
 * tracks, non-positive or non-integer segment lengths, hazards that fall
 * outside their segment, and gates that are out of order or in the wrong
 * place.
 */
export function makeTrack(
  segments: readonly Segment[],
  gates: readonly number[],
  path: Spline,
): Track {
  if (segments.length === 0) {
    throw new Error('A track needs at least one segment.');
  }

  segments.forEach((segment, i) => {
    if (!Number.isInteger(segment.lengthTicks) || segment.lengthTicks <= 0) {
      throw new Error(
        `Segment ${i} (${segment.name}) must be a positive whole number of ticks, got ${segment.lengthTicks}.`,
      );
    }
    segment.hazards.forEach((hazard) => {
      if (!Number.isInteger(hazard.startTick) || !Number.isInteger(hazard.lengthTicks)) {
        throw new Error(
          `Hazard ${hazard.kind} in segment ${i} (${segment.name}) must be placed on whole ticks.`,
        );
      }
      if (hazard.lengthTicks <= 0) {
        throw new Error(
          `Hazard ${hazard.kind} in segment ${i} (${segment.name}) must last at least one tick.`,
        );
      }
      if (
        hazard.startTick < 0 ||
        hazard.startTick + hazard.lengthTicks > segment.lengthTicks
      ) {
        throw new Error(
          `Hazard ${hazard.kind} runs from ${hazard.startTick} to ${
            hazard.startTick + hazard.lengthTicks
          } but segment ${i} (${segment.name}) is only ${segment.lengthTicks} ticks long.`,
        );
      }
    });
  });

  gates.forEach((gate, i) => {
    if (!Number.isInteger(gate) || gate < 0 || gate >= segments.length) {
      throw new Error(`Gate ${gate} is not a segment index of this track.`);
    }
    if (gate === segments.length - 1) {
      throw new Error('The last segment cannot carry a gate: the race ends there.');
    }
    const previous = gates[i - 1];
    if (previous !== undefined && gate <= previous) {
      throw new Error(`Gates must be sorted and unique; ${gate} follows ${previous}.`);
    }
  });

  return { segments, gates, path };
}

/** The whole course in ticks at base speed. */
export function totalLengthTicks(track: Track): number {
  return track.segments.reduce((sum, segment) => sum + segment.lengthTicks, 0);
}

/** Tick, measured from the start of the race, at which a segment begins. */
export function segmentStartTick(track: Track, index: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= track.segments.length) {
    throw new Error(`Segment ${index} is not on this track.`);
  }
  let start = 0;
  for (let i = 0; i < index; i++) {
    const segment = track.segments[i];
    if (segment === undefined) throw new Error('unreachable: segment index in range');
    start += segment.lengthTicks;
  }
  return start;
}

/** Which segment a race tick falls in. The finish tick belongs to the last segment. */
export function segmentAtTick(track: Track, tick: number): number {
  if (tick < 0) throw new Error(`Tick ${tick} is before the start of the race.`);
  let elapsed = 0;
  for (let i = 0; i < track.segments.length; i++) {
    const segment = track.segments[i];
    if (segment === undefined) throw new Error('unreachable: segment index in range');
    elapsed += segment.lengthTicks;
    if (tick < elapsed) return i;
  }
  return track.segments.length - 1;
}

/** A hazard placed on the track, as distances from the start line. */
export interface HazardAt {
  readonly kind: HazardKind;
  /** Distance at which it begins. */
  readonly from: number;
  /** Distance at which it ends. */
  readonly to: number;
}

/**
 * Every hazard on the track as a distance, in order. Wanted by anything that
 * looks ahead: a pilot deciding when to raise shields, and the screen deciding
 * when to slow time down.
 */
export function hazardsOnTrack(track: Track): HazardAt[] {
  const out: HazardAt[] = [];
  track.segments.forEach((segment, index) => {
    const start = segmentStartTick(track, index);
    segment.hazards.forEach((hazard) => {
      out.push({
        kind: hazard.kind,
        from: start + hazard.startTick,
        to: start + hazard.startTick + hazard.lengthTicks,
      });
    });
  });
  return out.sort((a, b) => a.from - b.from);
}

/** The stages, split at the gates. Three stages on the slice track. */
export function stages(track: Track): Stage[] {
  const out: Stage[] = [];
  let firstSegment = 0;
  const boundaries = [...track.gates, track.segments.length - 1];
  boundaries.forEach((lastSegment) => {
    let lengthTicks = 0;
    for (let i = firstSegment; i <= lastSegment; i++) {
      const segment = track.segments[i];
      if (segment === undefined) throw new Error('unreachable: segment index in range');
      lengthTicks += segment.lengthTicks;
    }
    out.push({ firstSegment, lastSegment, lengthTicks });
    firstSegment = lastSegment + 1;
  });
  return out;
}

/**
 * Where along the drawn course a race tick sits, as a spline parameter for
 * `evaluate`. Progress is linear in ticks-at-base-speed, so a long segment
 * takes up more of the line. Rendering only.
 */
export function splineParamAtTick(track: Track, tick: number): number {
  const total = totalLengthTicks(track);
  const clamped = tick <= 0 ? 0 : tick >= total ? total : tick;
  return (clamped / total) * track.path.segmentCount;
}

// ---------------------------------------------------------------------------
// The slice track: one star system, three stages, all four hazards.
// Level data. Lengths are ticks at base speed; at 60 ticks/s the whole course
// is about 22 seconds, roughly 7 per stage.
// ---------------------------------------------------------------------------

const SLICE_PATH: Spline = makeSpline([
  { x: 0.08, y: 0.85 },
  { x: 0.22, y: 0.62 },
  { x: 0.3, y: 0.45 },
  { x: 0.42, y: 0.28 },
  { x: 0.58, y: 0.3 },
  { x: 0.72, y: 0.42 },
  { x: 0.84, y: 0.62 },
  { x: 0.9, y: 0.78 },
  { x: 0.75, y: 0.9 },
  { x: 0.55, y: 0.82 },
  { x: 0.4, y: 0.9 },
  { x: 0.2, y: 0.92 },
  { x: 0.08, y: 0.85 },
]);

const SLICE_SEGMENTS: readonly Segment[] = [
  // Stage 1 — teaches the asteroid field.
  { name: 'Launch', lengthTicks: 120, hazards: [] },
  {
    name: 'Asteroid belt',
    lengthTicks: 180,
    hazards: [{ kind: 'asteroidField', startTick: 30, lengthTicks: 120 }],
  },
  { name: 'Open run', lengthTicks: 120, hazards: [] },

  // Stage 2 — the ringed planet's gravity assist, then a burst to shield.
  {
    name: 'Ringed planet',
    lengthTicks: 150,
    hazards: [{ kind: 'ringedPlanet', startTick: 20, lengthTicks: 110 }],
  },
  {
    name: 'Gamma corridor',
    lengthTicks: 160,
    hazards: [{ kind: 'gammaBurst', startTick: 80, lengthTicks: 1 }],
  },
  {
    name: 'Debris tail',
    lengthTicks: 140,
    hazards: [{ kind: 'asteroidField', startTick: 40, lengthTicks: 80 }],
  },

  // Stage 3 — the black hole you could see from the start line.
  { name: 'Inner system', lengthTicks: 130, hazards: [] },
  {
    name: 'Black hole',
    lengthTicks: 200,
    hazards: [{ kind: 'blackHole', startTick: 40, lengthTicks: 130 }],
  },
  { name: 'Finish straight', lengthTicks: 120, hazards: [] },
];

/** Gates close stage 1 after 'Open run' and stage 2 after 'Debris tail'. */
const SLICE_GATES: readonly number[] = [2, 5];

export const SLICE_TRACK: Track = makeTrack(SLICE_SEGMENTS, SLICE_GATES, SLICE_PATH);
