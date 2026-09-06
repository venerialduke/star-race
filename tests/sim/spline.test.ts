import { describe, expect, it } from 'vitest';
import { evaluate, makeSpline, sample } from '../../src/sim/spline';
import { INITIAL_STATE, TRACK, position, step } from '../../src/sim/demo';
import { DEMO_SPEED } from '../../src/sim/tuning';

const square = makeSpline([
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
]);

describe('spline', () => {
  it('passes through every control point at integer parameters', () => {
    square.points.forEach((p, i) => {
      const q = evaluate(square, i);
      expect(q.x).toBeCloseTo(p.x, 10);
      expect(q.y).toBeCloseTo(p.y, 10);
    });
  });

  it('clamps parameters outside the spline to its endpoints', () => {
    expect(evaluate(square, -5)).toEqual(square.points[0]);
    expect(evaluate(square, 99)).toEqual(square.points[square.points.length - 1]);
  });

  it('samples into segmentCount * perSegment + 1 points', () => {
    expect(sample(square, 8)).toHaveLength(3 * 8 + 1);
  });

  it('rejects fewer than two points', () => {
    expect(() => makeSpline([{ x: 0, y: 0 }])).toThrow();
  });
});

describe('demo tick loop', () => {
  it('is deterministic: same state in, same state out', () => {
    expect(step(INITIAL_STATE)).toEqual(step(INITIAL_STATE));
  });

  it('advances exactly DEMO_SPEED per tick and wraps around the track', () => {
    const ticksPerLap = Math.ceil(TRACK.segmentCount / DEMO_SPEED);
    let s = INITIAL_STATE;
    for (let i = 0; i < ticksPerLap; i++) s = step(s);
    expect(s.tick).toBe(ticksPerLap);
    expect(s.u).toBeGreaterThanOrEqual(0);
    expect(s.u).toBeLessThan(TRACK.segmentCount);
  });

  it('starts at the first control point', () => {
    const start = TRACK.points[0];
    expect(start).toBeDefined();
    const p = position(INITIAL_STATE);
    expect(p.x).toBeCloseTo(start?.x ?? NaN, 10);
    expect(p.y).toBeCloseTo(start?.y ?? NaN, 10);
  });
});
