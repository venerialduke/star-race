// How high off the ground each stretch of road is drawn.
//
// A loop laid out in two dimensions can cross itself, and a road that runs
// through another road looks like a mistake. Real circuits answer this with a
// bridge, and so does this: where two roads cross, one climbs and the other
// dips, so the two are never in the same place.
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
//
// **Every road, not just the golden path.** A split is a road in its own right
// and can cross the main line, another split, or a different sector entirely.
// Height is therefore a function of *which road* as well as how far along it —
// a split and the main line span the same canonical distances, so one number
// per lap could never separate them from each other.

import { alongOf, routeOf, sectorOf, type Route, type Track } from '../sim/track';
import { PATH_HALF_WIDTH, TRACK_HALF_WIDTH } from '../sim/tuning';

/** One road, named the way the race names one. */
export interface RoadId {
  readonly sector: number;
  readonly route: number;
}

const keyOf = (road: RoadId): string => `${road.sector}:${road.route}`;

/** Where one road passes over another, each measured along its own road. */
export interface Crossing {
  readonly over: RoadId;
  readonly overAt: number;
  readonly under: RoadId;
  readonly underAt: number;
}

/**
 * How far apart the two strands of a crossing are held, in track units.
 *
 * Bigger than it first looks like it needs to be, and measured rather than
 * picked. The full gap is only reached *at* the crossing; a little to either
 * side the two roads are still within a corridor of each other while the ramp
 * has not finished climbing, and that approach is the binding case, not the
 * crossing itself. On a figure-eight loop, 30 at the crossing left only 20.4
 * where the roads pass a corridor apart, against the 19.4 a corridor needs —
 * passing, with a unit of margin, which is not margin. 38 leaves 25.8.
 *
 * This is the whole gap, not half of it: only the road going over moves, and it
 * moves by all of this. See `heightOfRoad`.
 */
const CLEARANCE = 38;

/** How far either side of a crossing the road takes to climb. */
const RAMP = 90;

/**
 * Two stretches of the **same** road count as crossing only this far apart
 * along it. Consecutive samples share endpoints and would otherwise all read as
 * crossings of themselves.
 */
const NOT_ITSELF = 60;

/**
 * How far from each end of a road its height is forced back to the ground.
 *
 * Every road is flat at both of its checkpoints, which is what lets roads that
 * meet there agree without solving anything: a ship crossing a checkpoint may
 * switch roads, and a step in the road at the moment it does would be the one
 * place a bridge is allowed to look broken. The cost is real and is not hidden
 * — a crossing within a ramp of a checkpoint cannot be lifted clear, so
 * `separation` reports it and the shipped-track rule refuses it.
 */
const TAPER = 70;

/** Do two plan-view segments meet? The standard orientation test. */
function meets(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  d: { x: number; y: number },
): boolean {
  const turn = (
    p: { x: number; y: number },
    q: { x: number; y: number },
    r: { x: number; y: number },
  ): number => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = turn(a, b, c);
  const d2 = turn(a, b, d);
  const d3 = turn(c, d, a);
  const d4 = turn(c, d, b);
  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
}

interface Road extends RoadId {
  readonly route: number;
  readonly line: Route;
}

/** Every road on the track: the golden path of each sector, then its splits. */
export function roadsOf(track: Track): readonly Road[] {
  const roads: Road[] = [];
  track.sectors.forEach((sector) => {
    sector.routes.forEach((line, route) => {
      roads.push({ sector: sector.index, route, line });
    });
  });
  return roads;
}

/**
 * Every place two roads cross in the plan view.
 *
 * Which one goes over is decided by road order and then by distance along —
 * the later one climbs — because it has to be decided *somehow* and that is the
 * one rule which cannot depend on how anything is drawn. Deterministic, so the
 * same track always gets the same bridges.
 *
 * Two roads through the *same* sector are not crossing when they part at one
 * checkpoint and meet again at the other; that is what a fork is. Only the
 * ground between the tapers is considered, which is exactly the ground where
 * they can be lifted apart anyway.
 */
export function crossingsOf(track: Track): readonly Crossing[] {
  const roads = roadsOf(track);
  const found: Crossing[] = [];

  const near = (road: Road, along: number): boolean =>
    along < TAPER || along > road.line.length - TAPER;

  for (let a = 0; a < roads.length; a += 1) {
    for (let b = a; b < roads.length; b += 1) {
      const one = roads[a] as Road;
      const two = roads[b] as Road;
      const sameRoad = a === b;
      for (let i = 0; i + 1 < one.line.samples.length; i += 1) {
        const p = one.line.samples[i]?.pos;
        const q = one.line.samples[i + 1]?.pos;
        const atOne = one.line.cum[i] as number;
        if (p === undefined || q === undefined || near(one, atOne)) continue;
        for (let j = sameRoad ? i + 1 : 0; j + 1 < two.line.samples.length; j += 1) {
          const r = two.line.samples[j]?.pos;
          const s = two.line.samples[j + 1]?.pos;
          const atTwo = two.line.cum[j] as number;
          if (r === undefined || s === undefined || near(two, atTwo)) continue;
          if (sameRoad && Math.abs(atTwo - atOne) < NOT_ITSELF) continue;
          if (!meets(p, q, r, s)) continue;

          const already = found.some(
            (was) =>
              keyOf(was.under) === keyOf(one) &&
              keyOf(was.over) === keyOf(two) &&
              Math.abs(was.underAt - atOne) < NOT_ITSELF &&
              Math.abs(was.overAt - atTwo) < NOT_ITSELF,
          );
          if (!already) {
            found.push({ under: one, underAt: atOne, over: two, overAt: atTwo });
          }
        }
      }
    }
  }
  return found;
}

/** One raised cosine, 1 at the centre and 0 at `RAMP` either side. */
function bump(along: number, centre: number): number {
  const away = Math.abs(along - centre);
  if (away >= RAMP) return 0;
  return 0.5 + 0.5 * Math.cos((Math.PI * away) / RAMP);
}

/** Held to the ground at both ends, so every road meets its checkpoints flat. */
function taper(along: number, length: number): number {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(1, along / TAPER, (length - along) / TAPER));
}

/**
 * How high one road is at a distance along it.
 *
 * **A bridge only ever goes up.** Raising one strand and dipping the other by
 * half each was the first version and it was symmetric and wrong: the road a
 * ship is actually on would sink into a hole, and a camera riding a fixed
 * height above it ends up *below* the flat road ahead — looking at the
 * underside of a surface with no thickness, which reads as the whole view
 * mirroring. Keeping the under strand on the ground means the common case,
 * driving under somebody else's bridge, never moves the road at all; what
 * climbs is the road going over, and a camera on that one is above everything
 * by definition.
 */
function heightOfRoad(
  crossings: readonly Crossing[],
  road: RoadId,
  along: number,
  length: number,
): number {
  let height = 0;
  const key = keyOf(road);
  for (const crossing of crossings) {
    if (keyOf(crossing.over) === key) height += bump(along, crossing.overAt) * CLEARANCE;
  }
  return height * taper(along, length);
}

/**
 * The whole profile, sampled the way each road is.
 *
 * Built once per track rather than per frame: solving every crossing is a walk
 * over every pair of segments on the circuit, and the chase camera would
 * otherwise redo it sixty times a second.
 */
export interface Relief {
  readonly crossings: readonly Crossing[];
  /** Height at each sample of each road, keyed by road. */
  readonly heights: ReadonlyMap<string, readonly number[]>;
  /** Arc length at each sample of each road, so a distance finds its sample. */
  readonly cum: ReadonlyMap<string, readonly number[]>;
  readonly lengths: ReadonlyMap<string, number>;
}

export function reliefOf(track: Track): Relief {
  const crossings = crossingsOf(track);
  const heights = new Map<string, readonly number[]>();
  const cum = new Map<string, readonly number[]>();
  const lengths = new Map<string, number>();
  for (const road of roadsOf(track)) {
    const key = keyOf(road);
    heights.set(
      key,
      road.line.cum.map((at) => heightOfRoad(crossings, road, at, road.line.length)),
    );
    cum.set(key, road.line.cum);
    lengths.set(key, road.line.length);
  }
  return { crossings, heights, cum, lengths };
}

/** How high a road is at a distance along it, read off a built profile. */
export function heightOn(
  relief: Relief,
  sector: number,
  route: number,
  along: number,
): number {
  const key = keyOf({ sector, route });
  const heights = relief.heights.get(key);
  const cum = relief.cum.get(key);
  if (heights === undefined || cum === undefined || heights.length === 0) return 0;

  // Samples are not evenly spaced on a route, so the index is searched rather
  // than divided out — the same reason `sampleOn` binary-searches `cum`.
  let low = 0;
  let high = cum.length - 1;
  if (along <= 0) return heights[0] as number;
  if (along >= (cum[high] as number)) return heights[high] as number;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if ((cum[mid] as number) <= along) low = mid;
    else high = mid - 1;
  }
  const next = Math.min(low + 1, heights.length - 1);
  const span = (cum[next] as number) - (cum[low] as number);
  const t = span <= 0 ? 0 : (along - (cum[low] as number)) / span;
  // Interpolated, because a camera follows this: snapping to a sample would put
  // a stair in every slope.
  return (heights[low] as number) * (1 - t) + (heights[next] as number) * t;
}

/** How high the road under a ship is, given where it is round the lap. */
export function heightAt(
  track: Track,
  relief: Relief,
  distance: number,
  routeIndex: number,
): number {
  const sector = sectorOf(track, distance);
  const route = routeOf(sector, routeIndex);
  return heightOn(
    relief,
    sector.index,
    routeIndex,
    alongOf(track, sector, route, distance),
  );
}

/**
 * The smallest vertical gap at any crossing on this track.
 *
 * Bumps add and the taper subtracts, so what a crossing actually gets is not
 * what it was asked for. This measures the result rather than trusting the
 * construction, and it is what the shipped-track rule asserts on.
 */
export function separation(relief: Relief): number {
  let least = Infinity;
  for (const crossing of relief.crossings) {
    const over = heightOn(
      relief,
      crossing.over.sector,
      crossing.over.route,
      crossing.overAt,
    );
    const under = heightOn(
      relief,
      crossing.under.sector,
      crossing.under.route,
      crossing.underAt,
    );
    least = Math.min(least, Math.abs(over - under));
  }
  return least;
}

/**
 * How much clearance a crossing needs before the two roads are really apart:
 * the corridor a ship can be thrown across, plus some of the road's own width.
 */
export const NEEDED_CLEARANCE = PATH_HALF_WIDTH + TRACK_HALF_WIDTH * 0.4;
