/**
 * The test shape: a straight, one bend, a straight.
 *
 * Small on purpose. A whole lap hides which corner taught you what; one bend
 * with a known approach and a known exit does not. Everything about how a
 * ship drives shows up here, and nothing else is in the way.
 *
 * Pure: the model and the drawing both read it, neither writes it.
 */

/** Which way the bend goes. `1` turns right, `-1` turns left. */
export type Hand = 1 | -1;

/**
 * A shove sideways at a point on the road — debris, a rival, a gust.
 *
 * The one thing on the course that is not the course. It exists so that being
 * thrown off the line can be *caused* rather than waited for, which is the only
 * way to see what a navigation system does about it.
 */
export interface Bump {
  /** How far along the centre line it sits. */
  readonly at: number;
  /** The sideways velocity it adds, in units per tick. Positive shoves right. */
  readonly push: number;
}

export interface Shape {
  /** The approach straight, in units. */
  readonly entry: number;
  /** The bend's radius, in units. Small is tight. */
  readonly radius: number;
  /** How much of a turn the bend is, in radians. */
  readonly sweep: number;
  /** The straight out the far side, in units. */
  readonly exit: number;
  readonly hand: Hand;
  /** Half the width of the golden path. Nothing enforces it; it is a mark. */
  readonly halfWidth: number;
  readonly bump?: Bump | undefined;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Where the bend starts and ends, as distances along the centre line. */
export function bendStart(shape: Shape): number {
  return shape.entry;
}

export function bendLength(shape: Shape): number {
  return shape.radius * shape.sweep;
}

export function bendEnd(shape: Shape): number {
  return shape.entry + bendLength(shape);
}

export function shapeLength(shape: Shape): number {
  return bendEnd(shape) + shape.exit;
}

/**
 * The road's curvature at a distance along it: `1 / radius` on the bend and
 * zero on the straights, signed so that positive curves right.
 *
 * This single number is the whole of what the road does to a ship. Everything
 * else in the model reads it and nothing else about the shape.
 */
export function curvatureAt(shape: Shape, along: number): number {
  if (along < bendStart(shape) || along > bendEnd(shape)) return 0;
  return shape.hand / shape.radius;
}

/**
 * How far it is to the start of the bend, or 0 once the ship is on it or past
 * it. What a driver needs in order to know when to brake.
 */
export function gapToBend(shape: Shape, along: number): number {
  return Math.max(0, bendStart(shape) - along);
}

/** Which way the road points at a distance along it, in radians, y-up. */
export function headingAt(shape: Shape, along: number): number {
  const on = Math.min(Math.max(along, bendStart(shape)), bendEnd(shape));
  if (along <= bendStart(shape)) return 0;
  return (-shape.hand * (on - bendStart(shape))) / shape.radius;
}

/**
 * The point on the centre line at a distance along it.
 *
 * World coordinates, y up. The approach runs along +x from the origin, so a
 * right-hand bend curves down the screen and a left-hand one curves up.
 */
export function centreAt(shape: Shape, along: number): Point {
  const start = bendStart(shape);
  if (along <= start) return { x: along, y: 0 };

  // The bend's centre of curvature sits one radius to the side of the road.
  const hub: Point = { x: start, y: -shape.hand * shape.radius };
  const turned = Math.min(along - start, bendLength(shape)) / shape.radius;
  const angle = shape.hand * (Math.PI / 2 - turned);
  const arc: Point = {
    x: hub.x + shape.radius * Math.cos(angle),
    y: hub.y + shape.radius * Math.sin(angle),
  };
  if (along <= bendEnd(shape)) return arc;

  const out = along - bendEnd(shape);
  const heading = -shape.hand * shape.sweep;
  return { x: arc.x + out * Math.cos(heading), y: arc.y + out * Math.sin(heading) };
}

/**
 * A ship's place in the world, from how far it has come and how far it sits
 * off the line. Offset is positive to the ship's right.
 */
export function placeAt(shape: Shape, along: number, offset: number): Point {
  const centre = centreAt(shape, along);
  const heading = headingAt(shape, along);
  // Right of a heading, with y up, is the heading turned a quarter clockwise.
  return {
    x: centre.x + offset * Math.sin(heading),
    y: centre.y - offset * Math.cos(heading),
  };
}

/**
 * Whether a tick that moved the ship from `was` to `now` crossed the bump.
 *
 * Checked as a crossing rather than a proximity, so a fast ship cannot step
 * over it and a stopped one cannot sit in it being shoved every tick.
 */
export function crossedBump(shape: Shape, was: number, now: number): Bump | undefined {
  const bump = shape.bump;
  if (bump === undefined) return undefined;
  return was < bump.at && now >= bump.at ? bump : undefined;
}
