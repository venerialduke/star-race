// Where the course goes on the screen.
//
// The track is drawn in a 0..1 space that says nothing about the shape of a
// phone. This maps it onto the strip of screen between the readouts and the
// buttons, as large as it will go without distorting: the course is the thing
// the player reads, and on a tall screen a centred square threw away half of it.
//
// It will also turn the course a quarter turn when that fits better. A star map
// has no up, so a wide course on a tall screen is drawn running down it — which
// on a phone is the difference between a course in a band across the middle and
// one that fills the screen. Three ships need that room.
//
// Pure maths, no canvas, so it can be tested.

import { sample, type Spline, type Vec2 } from '../sim/spline';

export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
}

/** The rectangle a spline occupies in its own 0..1 space. */
export interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/** How to get from track space to screen pixels. */
export interface Fit {
  readonly scale: number;
  readonly originX: number;
  readonly originY: number;
  /** Draw the course a quarter turn round, because it fits better that way. */
  readonly rotated: boolean;
  readonly bounds: Bounds;
}

/** Screen the HUD readouts occupy, in CSS pixels. */
export const TOP_INSET = 96;
/** Screen the two active buttons occupy. */
export const BOTTOM_INSET = 128;
/** Breathing room around the course. */
export const EDGE_PAD = 14;

const boundsCache = new WeakMap<Spline, Bounds>();

/** The box the drawn course actually fills, sampled once per track. */
export function trackBounds(path: Spline): Bounds {
  const cached = boundsCache.get(path);
  if (cached !== undefined) return cached;

  const points = sample(path, 16);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  points.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  });
  const bounds: Bounds = { minX, minY, maxX, maxY };
  boundsCache.set(path, bounds);
  return bounds;
}

/** The strip of screen the course is allowed to use. */
function drawingArea(vp: Viewport): { width: number; height: number; top: number } {
  const insets = TOP_INSET + BOTTOM_INSET;
  const roomy = vp.height - insets > 40;
  const height = roomy ? vp.height - insets : Math.max(vp.height * 0.5, 1);
  return {
    width: Math.max(vp.width - EDGE_PAD * 2, 1),
    height,
    top: roomy ? TOP_INSET : (vp.height - height) / 2,
  };
}

/**
 * Fit those bounds into the drawing area, keeping the course's shape, turning it
 * a quarter turn if that makes it bigger.
 */
export function fitToViewport(bounds: Bounds, vp: Viewport): Fit {
  const boxWidth = Math.max(bounds.maxX - bounds.minX, 1e-6);
  const boxHeight = Math.max(bounds.maxY - bounds.minY, 1e-6);
  const area = drawingArea(vp);

  const upright = Math.min(area.width / boxWidth, area.height / boxHeight);
  const turned = Math.min(area.width / boxHeight, area.height / boxWidth);
  const rotated = turned > upright;
  const scale = rotated ? turned : upright;

  // After turning, the box's width on screen is the track's height.
  const drawnWidth = (rotated ? boxHeight : boxWidth) * scale;
  const drawnHeight = (rotated ? boxWidth : boxHeight) * scale;

  return {
    scale,
    originX: EDGE_PAD + (area.width - drawnWidth) / 2,
    originY: area.top + (area.height - drawnHeight) / 2,
    rotated,
    bounds,
  };
}

/** A point in track space, in screen pixels. */
export function project(p: Vec2, fit: Fit): Vec2 {
  const { bounds } = fit;
  // Turned: the track's y axis runs across the screen and its x axis runs down.
  const acrossTrack = fit.rotated ? bounds.maxY - p.y : p.x - bounds.minX;
  const downTrack = fit.rotated ? p.x - bounds.minX : p.y - bounds.minY;
  return {
    x: fit.originX + acrossTrack * fit.scale,
    y: fit.originY + downTrack * fit.scale,
  };
}

/** How far apart the lanes sit, as a fraction of the course's scale. */
export const LANE_GAP = 0.03;

/**
 * Nudge a ship across the track into its own lane. Ships do not touch in the
 * simulation — lanes exist only so three dots on one line do not cover each
 * other up. Lane 0 is the middle of the track, which is where the player flies.
 *
 * `behind` is a point just back along the course, which gives the direction of
 * travel; the lane offset is at right angles to it.
 */
export function laneShift(here: Vec2, behind: Vec2, lane: number, unit: number): Vec2 {
  if (lane === 0) return here;
  const dx = here.x - behind.x;
  const dy = here.y - behind.y;
  const length = Math.hypot(dx, dy) || 1;
  const gap = lane * unit * LANE_GAP;
  return { x: here.x + (-dy / length) * gap, y: here.y + (dx / length) * gap };
}

/** The fit for a track on a viewport, in one call. */
export function fitTrack(path: Spline, vp: Viewport): Fit {
  return fitToViewport(trackBounds(path), vp);
}
