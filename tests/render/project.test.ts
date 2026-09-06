import { describe, expect, it } from 'vitest';
import {
  BOTTOM_INSET,
  EDGE_PAD,
  TOP_INSET,
  fitToViewport,
  fitTrack,
  project,
  trackBounds,
  type Viewport,
} from '../../src/render/project';
import { makeSpline, sample } from '../../src/sim/spline';
import { SLICE_TRACK } from '../../src/sim/track';

const phone: Viewport = { width: 375, height: 812, dpr: 2 };
const tablet: Viewport = { width: 768, height: 1024, dpr: 2 };
const squat: Viewport = { width: 640, height: 180, dpr: 1 };

const corners = makeSpline([
  { x: 0.2, y: 0.4 },
  { x: 0.8, y: 0.4 },
  { x: 0.8, y: 0.6 },
  { x: 0.2, y: 0.6 },
]);

/** Every drawn point of a track, on screen. */
const drawn = (vp: Viewport, path = SLICE_TRACK.path) => {
  const fit = fitTrack(path, vp);
  return sample(path, 16).map((p) => project(p, fit));
};

describe('track bounds', () => {
  it('covers the drawn course, not just its control points', () => {
    const bounds = trackBounds(SLICE_TRACK.path);
    sample(SLICE_TRACK.path, 16).forEach((p) => {
      expect(p.x).toBeGreaterThanOrEqual(bounds.minX - 1e-9);
      expect(p.x).toBeLessThanOrEqual(bounds.maxX + 1e-9);
      expect(p.y).toBeGreaterThanOrEqual(bounds.minY - 1e-9);
      expect(p.y).toBeLessThanOrEqual(bounds.maxY + 1e-9);
    });
  });

  it('is the same box every time it is asked', () => {
    expect(trackBounds(SLICE_TRACK.path)).toEqual(trackBounds(SLICE_TRACK.path));
  });
});

describe('fitting the course to a phone', () => {
  it('keeps the whole course on screen', () => {
    drawn(phone).forEach((p) => {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(phone.width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(phone.height);
    });
  });

  it('leaves the readouts and the buttons their room', () => {
    drawn(phone).forEach((p) => {
      expect(p.y).toBeGreaterThanOrEqual(TOP_INSET - 1e-6);
      expect(p.y).toBeLessThanOrEqual(phone.height - BOTTOM_INSET + 1e-6);
    });
  });

  it('fills the width it is given', () => {
    const xs = drawn(phone).map((p) => p.x);
    const width = Math.max(...xs) - Math.min(...xs);
    // Within a pixel of the full width, less the padding on each side.
    expect(width).toBeGreaterThan(phone.width - EDGE_PAD * 2 - 1);
  });

  it('keeps the course a course: neighbouring points stay neighbours', () => {
    const points = drawn(phone);
    points.forEach((p, i) => {
      const next = points[i + 1];
      if (next === undefined) return;
      expect(Math.hypot(next.x - p.x, next.y - p.y)).toBeLessThan(phone.width);
    });
  });

  it('is bigger than the old centred square, which threw the screen away', () => {
    // The square mapping scaled the 0..1 space by min(width, height), so on a
    // phone the course sat in a band across the middle.
    const points = drawn(phone);
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));

    const bounds = trackBounds(SLICE_TRACK.path);
    const squareSide = Math.min(phone.width, phone.height);
    const squareArea =
      (bounds.maxX - bounds.minX) * squareSide * ((bounds.maxY - bounds.minY) * squareSide);
    expect(area).toBeGreaterThan(squareArea * 1.5);
  });

  it('turns a wide course a quarter turn to fit a tall screen', () => {
    expect(fitTrack(SLICE_TRACK.path, phone).rotated).toBe(true);
    // And uses the height it just bought.
    const ys = drawn(phone).map((p) => p.y);
    const used = Math.max(...ys) - Math.min(...ys);
    expect(used).toBeGreaterThan((phone.height - TOP_INSET - BOTTOM_INSET) * 0.7);
  });

  it('leaves a course alone when turning would not help', () => {
    // A course taller than it is wide already suits a tall screen.
    const tall = makeSpline([
      { x: 0.4, y: 0.1 },
      { x: 0.6, y: 0.4 },
      { x: 0.4, y: 0.7 },
      { x: 0.6, y: 0.9 },
    ]);
    expect(fitTrack(tall, phone).rotated).toBe(false);
  });

  it('does not distort the course, turned or not', () => {
    const bounds = trackBounds(corners);
    const fit = fitToViewport(bounds, phone);
    const boxRatio = (bounds.maxX - bounds.minX) / (bounds.maxY - bounds.minY);
    const points = sample(corners, 16).map((p) => project(p, fit));
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const screenRatio =
      (Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys));
    // A quarter turn swaps the axes; it must not stretch either of them.
    expect(screenRatio).toBeCloseTo(fit.rotated ? 1 / boxRatio : boxRatio, 6);
  });
});

describe('other screens', () => {
  it('works on a tablet as well as a phone', () => {
    drawn(tablet).forEach((p) => {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(tablet.width);
      expect(p.y).toBeGreaterThanOrEqual(TOP_INSET - 1e-6);
      expect(p.y).toBeLessThanOrEqual(tablet.height - BOTTOM_INSET + 1e-6);
    });
  });

  it('still draws something on a screen too short for the insets', () => {
    const points = drawn(squat);
    points.forEach((p) => {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(squat.height);
    });
    const ys = points.map((p) => p.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0);
  });

  it('grows the course when the screen grows', () => {
    const small = fitTrack(SLICE_TRACK.path, phone).scale;
    const large = fitTrack(SLICE_TRACK.path, tablet).scale;
    expect(large).toBeGreaterThan(small);
  });
});
