// Pure spline math. No DOM, no Date, no Math.random.
//
// A Catmull-Rom spline passes through every control point, which is what we
// want for a track: the designer places points, the ship flies through them.

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/** Positions along a spline are addressed by u in [0, segmentCount]. */
export type SplineParam = number;

export interface Spline {
  readonly points: readonly Vec2[];
  /** Number of segments between consecutive control points. */
  readonly segmentCount: number;
}

export function makeSpline(points: readonly Vec2[]): Spline {
  if (points.length < 2) {
    throw new Error('A spline needs at least two control points.');
  }
  return { points, segmentCount: points.length - 1 };
}

function clampIndex(i: number, n: number): number {
  return i < 0 ? 0 : i >= n ? n - 1 : i;
}

function pointAt(spline: Spline, i: number): Vec2 {
  const p = spline.points[clampIndex(i, spline.points.length)];
  if (p === undefined) throw new Error('unreachable: spline has no points');
  return p;
}

/**
 * Evaluate the spline at parameter u. Integer u lands exactly on control
 * point u; fractional u interpolates smoothly between neighbours. Values
 * outside [0, segmentCount] are clamped to the endpoints.
 */
export function evaluate(spline: Spline, u: SplineParam): Vec2 {
  const clamped = u <= 0 ? 0 : u >= spline.segmentCount ? spline.segmentCount : u;
  let seg = Math.floor(clamped);
  if (seg >= spline.segmentCount) seg = spline.segmentCount - 1;
  const t = clamped - seg;

  const p0 = pointAt(spline, seg - 1);
  const p1 = pointAt(spline, seg);
  const p2 = pointAt(spline, seg + 1);
  const p3 = pointAt(spline, seg + 2);

  const t2 = t * t;
  const t3 = t2 * t;

  // Uniform Catmull-Rom basis (tension 0.5).
  const b0 = -0.5 * t3 + t2 - 0.5 * t;
  const b1 = 1.5 * t3 - 2.5 * t2 + 1;
  const b2 = -1.5 * t3 + 2 * t2 + 0.5 * t;
  const b3 = 0.5 * t3 - 0.5 * t2;

  return {
    x: b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x,
    y: b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y,
  };
}

/**
 * Sample the spline into a polyline with `perSegment` samples per segment.
 * Used by the renderer to draw the track once.
 */
export function sample(spline: Spline, perSegment: number): Vec2[] {
  const out: Vec2[] = [];
  const total = spline.segmentCount * perSegment;
  for (let i = 0; i <= total; i++) {
    out.push(evaluate(spline, i / perSegment));
  }
  return out;
}
