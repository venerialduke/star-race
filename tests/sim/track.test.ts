import { describe, expect, it } from 'vitest';
import { makeSpline } from '../../src/sim/spline';
import {
  SLICE_TRACK,
  makeTrack,
  segmentAtTick,
  segmentStartTick,
  splineParamAtTick,
  stages,
  totalLengthTicks,
  type Segment,
} from '../../src/sim/track';

const line = makeSpline([
  { x: 0, y: 0 },
  { x: 1, y: 0 },
]);

const seg = (
  name: string,
  lengthTicks: number,
  hazards: Segment['hazards'] = [],
): Segment => ({
  name,
  lengthTicks,
  hazards,
});

const simple = makeTrack([seg('a', 10), seg('b', 20), seg('c', 30)], [0], line);

describe('track length', () => {
  it('totals its segments', () => {
    expect(totalLengthTicks(simple)).toBe(60);
  });

  it('starts each segment where the previous one ended', () => {
    expect(segmentStartTick(simple, 0)).toBe(0);
    expect(segmentStartTick(simple, 1)).toBe(10);
    expect(segmentStartTick(simple, 2)).toBe(30);
  });

  it('rejects a segment index off the track', () => {
    expect(() => segmentStartTick(simple, 3)).toThrow();
    expect(() => segmentStartTick(simple, -1)).toThrow();
  });

  it('maps a tick to the segment containing it', () => {
    expect(segmentAtTick(simple, 0)).toBe(0);
    expect(segmentAtTick(simple, 9)).toBe(0);
    expect(segmentAtTick(simple, 10)).toBe(1);
    expect(segmentAtTick(simple, 29)).toBe(1);
    expect(segmentAtTick(simple, 30)).toBe(2);
    // The finish tick and anything past it belong to the final segment.
    expect(segmentAtTick(simple, 60)).toBe(2);
    expect(segmentAtTick(simple, 999)).toBe(2);
    expect(() => segmentAtTick(simple, -1)).toThrow();
  });
});

describe('stage gates', () => {
  it('splits the track into gates + 1 stages', () => {
    expect(stages(simple)).toEqual([
      { firstSegment: 0, lastSegment: 0, lengthTicks: 10 },
      { firstSegment: 1, lastSegment: 2, lengthTicks: 50 },
    ]);
  });

  it('covers every segment exactly once, in order', () => {
    const covered = stages(SLICE_TRACK).flatMap((stage) => {
      const out: number[] = [];
      for (let i = stage.firstSegment; i <= stage.lastSegment; i++) out.push(i);
      return out;
    });
    expect(covered).toEqual(SLICE_TRACK.segments.map((_, i) => i));
  });

  it('stage lengths sum to the track length', () => {
    const summed = stages(SLICE_TRACK).reduce((sum, stage) => sum + stage.lengthTicks, 0);
    expect(summed).toBe(totalLengthTicks(SLICE_TRACK));
  });

  it('rejects gates that are unsorted, duplicated or off the track', () => {
    const segs = [seg('a', 10), seg('b', 10), seg('c', 10)];
    expect(() => makeTrack(segs, [1, 0], line)).toThrow();
    expect(() => makeTrack(segs, [1, 1], line)).toThrow();
    expect(() => makeTrack(segs, [7], line)).toThrow();
    expect(() => makeTrack(segs, [-1], line)).toThrow();
  });

  it('refuses a gate on the last segment: the race ends there', () => {
    expect(() => makeTrack([seg('a', 10), seg('b', 10)], [1], line)).toThrow();
  });
});

describe('hazard placement', () => {
  it('accepts a hazard that fills its segment exactly', () => {
    const track = makeTrack(
      [seg('a', 10, [{ kind: 'asteroidField', startTick: 0, lengthTicks: 10 }])],
      [],
      line,
    );
    expect(totalLengthTicks(track)).toBe(10);
  });

  it('rejects a hazard that runs past the end of its segment', () => {
    expect(() =>
      makeTrack(
        [seg('a', 10, [{ kind: 'asteroidField', startTick: 5, lengthTicks: 6 }])],
        [],
        line,
      ),
    ).toThrow();
  });

  it('rejects a hazard that starts before its segment', () => {
    expect(() =>
      makeTrack(
        [seg('a', 10, [{ kind: 'gammaBurst', startTick: -1, lengthTicks: 1 }])],
        [],
        line,
      ),
    ).toThrow();
  });

  it('rejects a zero-length or fractional hazard', () => {
    expect(() =>
      makeTrack(
        [seg('a', 10, [{ kind: 'blackHole', startTick: 0, lengthTicks: 0 }])],
        [],
        line,
      ),
    ).toThrow();
    expect(() =>
      makeTrack(
        [seg('a', 10, [{ kind: 'blackHole', startTick: 0.5, lengthTicks: 2 }])],
        [],
        line,
      ),
    ).toThrow();
  });

  it('rejects a segment that is not a positive whole number of ticks', () => {
    expect(() => makeTrack([seg('a', 0)], [], line)).toThrow();
    expect(() => makeTrack([seg('a', -5)], [], line)).toThrow();
    expect(() => makeTrack([seg('a', 12.5)], [], line)).toThrow();
  });

  it('rejects an empty track', () => {
    expect(() => makeTrack([], [], line)).toThrow();
  });
});

describe('the slice track', () => {
  it('has three stages, so two gates', () => {
    expect(SLICE_TRACK.gates).toHaveLength(2);
    expect(stages(SLICE_TRACK)).toHaveLength(3);
  });

  it('matches the table in DESIGN.md', () => {
    // DESIGN.md is the source of truth. If this fails, the doc and the code
    // disagree and one of them is a bug — fix both in the same change.
    expect(SLICE_TRACK.segments).toHaveLength(9);
    expect(totalLengthTicks(SLICE_TRACK)).toBe(1320);
    expect(SLICE_TRACK.gates).toEqual([2, 5]);
    expect(stages(SLICE_TRACK)).toEqual([
      { firstSegment: 0, lastSegment: 2, lengthTicks: 420 },
      { firstSegment: 3, lastSegment: 5, lengthTicks: 450 },
      { firstSegment: 6, lastSegment: 8, lengthTicks: 450 },
    ]);
  });

  it('puts every hazard placement inside its segment', () => {
    SLICE_TRACK.segments.forEach((segment) => {
      segment.hazards.forEach((hazard) => {
        expect(hazard.startTick).toBeGreaterThanOrEqual(0);
        expect(hazard.lengthTicks).toBeGreaterThan(0);
        expect(hazard.startTick + hazard.lengthTicks).toBeLessThanOrEqual(
          segment.lengthTicks,
        );
      });
    });
  });

  it('uses all four slice hazards', () => {
    const kinds = new Set(
      SLICE_TRACK.segments.flatMap((s) => s.hazards.map((h) => h.kind)),
    );
    expect([...kinds].sort()).toEqual([
      'asteroidField',
      'blackHole',
      'gammaBurst',
      'ringedPlanet',
    ]);
  });

  it('gives every stage some track to fly', () => {
    stages(SLICE_TRACK).forEach((stage) => {
      expect(stage.lengthTicks).toBeGreaterThan(0);
      expect(stage.lastSegment).toBeGreaterThanOrEqual(stage.firstSegment);
    });
  });
});

describe('geometry', () => {
  it('maps the start line to the start of the spline and the finish to its end', () => {
    expect(splineParamAtTick(SLICE_TRACK, 0)).toBe(0);
    expect(splineParamAtTick(SLICE_TRACK, totalLengthTicks(SLICE_TRACK))).toBe(
      SLICE_TRACK.path.segmentCount,
    );
  });

  it('never moves backwards, and clamps outside the race', () => {
    const total = totalLengthTicks(SLICE_TRACK);
    let previous = -1;
    for (let tick = 0; tick <= total; tick++) {
      const u = splineParamAtTick(SLICE_TRACK, tick);
      expect(u).toBeGreaterThanOrEqual(previous);
      previous = u;
    }
    expect(splineParamAtTick(SLICE_TRACK, -10)).toBe(0);
    expect(splineParamAtTick(SLICE_TRACK, total + 500)).toBe(
      SLICE_TRACK.path.segmentCount,
    );
  });
});
