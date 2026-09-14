// Seeing the track from behind the ship rather than from above it.
//
// The world the simulation knows is flat: every position is a point on one
// plane, and the only third dimension is the one the camera adds by sitting
// above that plane and tilting down. So this is a pinhole camera over a floor,
// which canvas can draw perfectly well without a 3D library.
//
// Nothing here reads or writes simulation state. The numbers are presentation —
// how far back the camera sits, how hard it tilts — and so they live with the
// drawing rather than in `tuning.ts`, which is for balance.

/** Where the eye is, and which way it points. */
export interface Camera {
  /** On the track's own plane, in track units. */
  readonly x: number;
  readonly y: number;
  /** Above that plane. */
  readonly height: number;
  /** Which way it looks, in the plane, in radians. */
  readonly yaw: number;
  /** How far it tilts down from level, in radians. */
  readonly pitch: number;
}

/** A camera and the screen it is drawing onto. */
export interface Lens {
  readonly camera: Camera;
  /** Pixels per unit at unit depth. Bigger is a longer lens. */
  readonly focal: number;
  readonly width: number;
  readonly height: number;
}

/**
 * A point as the camera sees it: how far in front of the eye, how far to its
 * right, how far above its centre line. Screen coordinates come from these
 * three by one division, and clipping has to happen before that division.
 */
export interface Eye {
  readonly depth: number;
  readonly right: number;
  readonly up: number;
}

/**
 * Nothing closer than this is drawn. A polygon crossing the plane is cut at
 * it — dividing by a depth of nearly nothing throws vertices to infinity, and
 * the track is a strip that always crosses right under the camera.
 */
export const NEAR = 4;

/** Fit the lens to the canvas: a wider screen sees wider, not more magnified. */
export function lensFor(camera: Camera, width: number, height: number): Lens {
  // A 70° horizontal field, which is about what a chase camera wants: wide
  // enough to keep a rival alongside on screen, tight enough that a bend still
  // sweeps past rather than crawling.
  return { camera, focal: width / 2 / Math.tan(FIELD_OF_VIEW / 2), width, height };
}

const FIELD_OF_VIEW = (70 * Math.PI) / 180;

/** Where a point on the plane — or above it — sits in front of the eye. */
export function toEye(lens: Lens, x: number, y: number, z = 0): Eye {
  const { camera } = lens;
  const dx = x - camera.x;
  const dy = y - camera.y;
  const cos = Math.cos(camera.yaw);
  const sin = Math.sin(camera.yaw);
  // Forward is where the camera points; right is a quarter turn clockwise from
  // it, which puts the simulation's "left of travel" on the left of the screen.
  const forward = dx * cos + dy * sin;
  const right = dx * sin - dy * cos;
  const above = z - camera.height;

  const cp = Math.cos(camera.pitch);
  const sp = Math.sin(camera.pitch);
  return {
    depth: forward * cp - above * sp,
    right,
    up: forward * sp + above * cp,
  };
}

/** The screen point for something already in front of the near plane. */
export function toScreen(lens: Lens, eye: Eye): { x: number; y: number } {
  const scale = lens.focal / eye.depth;
  return {
    x: lens.width / 2 + eye.right * scale,
    y: lens.height / 2 - eye.up * scale,
  };
}

/** How big one unit at that depth is on screen. */
export function scaleAt(lens: Lens, depth: number): number {
  return lens.focal / Math.max(NEAR, depth);
}

/** Where the ground runs out. Everything above this line is sky. */
export function horizonY(lens: Lens): number {
  return lens.height / 2 - lens.focal * Math.tan(lens.camera.pitch);
}

/**
 * Cut a polygon at the near plane, so a quad running under the camera keeps
 * the part of it that is actually in front. One plane, so this is the simple
 * case of the usual walk: keep the vertices in front, and where an edge
 * crosses, put a vertex on the plane.
 */
export function clipNear(polygon: readonly Eye[]): Eye[] {
  const out: Eye[] = [];
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i] as Eye;
    const b = polygon[(i + 1) % polygon.length] as Eye;
    const aIn = a.depth >= NEAR;
    const bIn = b.depth >= NEAR;
    if (aIn) out.push(a);
    if (aIn !== bIn) {
      const t = (NEAR - a.depth) / (b.depth - a.depth);
      out.push({
        depth: NEAR,
        right: a.right + (b.right - a.right) * t,
        up: a.up + (b.up - a.up) * t,
      });
    }
  }
  return out;
}

/** Trace a clipped polygon onto the canvas. Returns false if nothing survived. */
export function tracePolygon(
  ctx: CanvasRenderingContext2D,
  lens: Lens,
  polygon: readonly Eye[],
): boolean {
  const kept = clipNear(polygon);
  if (kept.length < 3) return false;
  ctx.beginPath();
  kept.forEach((eye, i) => {
    const p = toScreen(lens, eye);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  return true;
}

/**
 * Trace an open line, breaking it wherever it passes behind the camera rather
 * than joining the two halves across the screen.
 */
export function traceLine(
  ctx: CanvasRenderingContext2D,
  lens: Lens,
  points: readonly Eye[],
): boolean {
  let drawn = false;
  let open = false;
  ctx.beginPath();
  for (let i = 0; i < points.length; i += 1) {
    const eye = points[i] as Eye;
    if (eye.depth < NEAR) {
      open = false;
      continue;
    }
    const p = toScreen(lens, eye);
    if (open) ctx.lineTo(p.x, p.y);
    else ctx.moveTo(p.x, p.y);
    open = true;
    drawn = true;
  }
  return drawn;
}
