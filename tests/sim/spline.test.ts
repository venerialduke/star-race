import { describe, expect, it } from 'vitest';
import { evaluate, makeSpline, sample } from '../../src/sim/spline';

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
