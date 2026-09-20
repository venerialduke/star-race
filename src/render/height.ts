// How high off the ground each stretch of a track is drawn.
//
// A loop laid out in two dimensions can cross itself, and a road that runs
// through another road looks like a mistake. Real circuits answer this with a
// bridge, and so does this: where the lap passes over itself, one strand climbs
// and the other dips, so the two never occupy the same place.
//
// **This file lives in `render/` on purpose, and that is the whole design.**
// `src/sim` is forbidden by ESLint from importing anything here, so height
// *cannot* reach the simulation — not by discipline, by construction. A lap
// time, a swing, a hazard and a pocket are all exactly what they were before
// any of this existed, and no future change can quietly make elevation matter
// without first moving this file, which is a thing a reviewer would see.
//
// It is also why nothing here needs to be careful about gameplay. A ship's
// position is a canonical distance and a lateral offset; it is never an (x, y),
// so two stretches of road sitting on top of each other in the plan view were
// never able to interfere in the first place. A mine in sector 1 is found by
// `sector === 1`, not by being near something. Height is about what the road
// looks like, and only that.

import type { Track } from '../sim/track';
import { PATH_HALF_WIDTH, TRACK_HALF_WIDTH } from '../sim/tuning';

/**
 * Where the lap passes over itself, in canonical distances.
 *
 * Derived by walking the line, never authored — the same rule checkpoint poses
 * follow, and for the same reason: two sources of truth about where the road is
 * can disagree, and the disagreement is silent.
 */
export interface Crossing {
  /** The strand that goes above, as a distance round the lap. */
  readonly over: number;
  /** The strand that goes below. */
  readonly under: number;
}

/** How far apart the two strands of a crossing are held, in track units. */
const CLEARANCE = 26;

/**
 * How far either side of a crossing the road takes to climb.
 *
 * Long enough to read as a slope rather than a step. Shorter than the shortest
 * sensible gap between two crossings, or two bumps merge into one hill and the
 * clearance between them is lost — which `separation` below measures rather
 * than assumes.
 */
const RAMP = 110;

/**
 * Two stretches count as crossing only if they are this far apart along the
 * lap. Consecutive samples share endpoints and would otherwise all read as
 * crossings of themselves.
 */
const NOT_ITSELF = 60;

/** Do two plan-view segments meet? The standard orientation test. */
function meets(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  d: { x: number; y: number },
): boolean {
  const cross = (
    p: { x: number; y: number },
    q: { x: number; y: number },
    r: { x: number; y: number },
  ): number => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = cross(a, b, c);
  const d2 = cross(a, b, d);
  const d3 = cross(c, d, a);
  const d4 = cross(c, d, b);
  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
}

/** A gap round a loop, brought into (-loop/2, loop/2]. */
function wrapGap(raw: number, loop: number): number {
  if (loop <= 0) return raw;
  const gap = ((raw % loop) + loop) % loop;
  return gap > loop / 2 ? gap - loop : gap;
}

/**
 * Every place the golden path passes over itself.
 *
 * Which strand goes over is decided by canonical distance — the later one
 * climbs — because it has to be decided *somehow* and this is the one rule that
 * cannot depend on where anything is drawn. It is deterministic, which is what
 * matters: the same track always gets the same bridges.
 */
export function crossingsOf(track: Track): readonly Crossing[] {
  const found: Crossing[] = [];
  const samples = track.samples;
  const n = samples.length;
  if (n < 4 || track.length <= 0) return found;
  const step = track.length / n;

  for (let i = 0; i < n; i += 1) {
    const a = samples[i]?.pos;
    const b = samples[(i + 1) % n]?.pos;
    if (a === undefined || b === undefined) continue;
    for (let j = i + 1; j < n; j += 1) {
      const c = samples[j]?.pos;
      const d = samples[(j + 1) % n]?.pos;
      if (c === undefined || d === undefined) continue;
      const apart = Math.abs(wrapGap((j - i) * step, track.length));
      if (apart < NOT_ITSELF) continue;
      if (!meets(a, b, c, d)) continue;
      const here = i * step;
      const there = j * step;
      // One crossing, not the four or five neighbouring sample pairs that all
      // straddle it.
      const already = found.some(
        (was) =>
          Math.abs(wrapGap(was.under - here, track.length)) < NOT_ITSELF &&
          Math.abs(wrapGap(was.over - there, track.length)) < NOT_ITSELF,
      );
      if (!already) found.push({ under: here, over: there });
    }
  }
  return found;
}

/**
 * How high the road is at a distance round the lap.
 *
 * A raised cosine at each strand of each crossing: zero away from them, so most
 * of a track is flat and a track that never crosses itself is flat everywhere.
 * Bumps add, which is what keeps the profile continuous where two crossings sit
 * near each other — and periodic by construction, because every offset is a
 * wrapped one, so the height at the start line is the height at the end of the
 * lap and a loop never has a step in it.
 */
export function heightAt(
  crossings: readonly Crossing[],
  distance: number,
  loop: number,
): number {
  let height = 0;
  for (const crossing of crossings) {
    height += bump(distance, crossing.over, loop) * (CLEARANCE / 2);
    height -= bump(distance, crossing.under, loop) * (CLEARANCE / 2);
  }
  return height;
}

/** One raised cosine, 1 at the centre and 0 at `RAMP` either side. */
function bump(distance: number, centre: number, loop: number): number {
  const away = Math.abs(wrapGap(distance - centre, loop));
  if (away >= RAMP) return 0;
  return 0.5 + 0.5 * Math.cos((Math.PI * away) / RAMP);
}

/**
 * The whole profile, sampled the way the track is.
 *
 * Built once per track rather than per frame: it is a few hundred numbers and
 * it never changes, and the chase camera would otherwise re-solve every
 * crossing sixty times a second.
 */
export interface Relief {
  readonly crossings: readonly Crossing[];
  readonly heights: readonly number[];
  /** Arc between samples, so a distance can be turned into an index. */
  readonly step: number;
  readonly loop: number;
}

export function reliefOf(track: Track): Relief {
  const crossings = crossingsOf(track);
  const step = track.samples.length > 0 ? track.length / track.samples.length : 1;
  const heights = track.samples.map((_, i) =>
    heightAt(crossings, i * step, track.length),
  );
  return { crossings, heights, step, loop: track.length };
}

/** How high the road is at a distance, read off a built profile. */
export function heightOn(relief: Relief, distance: number): number {
  const n = relief.heights.length;
  if (n === 0 || relief.step <= 0) return 0;
  const wrapped = ((distance % relief.loop) + relief.loop) % relief.loop;
  const at = wrapped / relief.step;
  const low = Math.floor(at) % n;
  const high = (low + 1) % n;
  const t = at - Math.floor(at);
  // Interpolated, because a camera follows this: snapping to a sample would put
  // a stair in every slope.
  return (relief.heights[low] as number) * (1 - t) + (relief.heights[high] as number) * t;
}

/**
 * The smallest vertical gap at any crossing on this track.
 *
 * Bumps add, so two crossings close together can eat into each other's
 * clearance. This measures what actually came out rather than trusting the
 * construction — and it is what the tests assert on.
 */
export function separation(relief: Relief): number {
  let least = Infinity;
  for (const crossing of relief.crossings) {
    least = Math.min(
      least,
      Math.abs(heightOn(relief, crossing.over) - heightOn(relief, crossing.under)),
    );
  }
  return least;
}

/**
 * How much clearance a crossing needs before the two roads are really apart:
 * the corridor a ship can be thrown across, plus the width of the road itself.
 */
export const NEEDED_CLEARANCE = PATH_HALF_WIDTH + TRACK_HALF_WIDTH * 0.4;
