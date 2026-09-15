// Sections: the pieces a track is assembled from.
//
// Two claims hold this up, and they are the two halves of what the backlog
// called the blocker. **A section has ends**, so snapping one onto another is
// composing poses and always works. And **closure is a property of an assembled
// set** rather than a rule the author obeys by hand — something can check it,
// and something can fix it, for any arrangement at all.

import { describe, expect, it } from 'vitest';
import {
  ORIGIN,
  checkpointsOf,
  closingSection,
  closureOf,
  exitOf,
  piecesOf,
  poseAfter,
  poseOfAll,
  spanOf,
  wrapAngle,
  type Section,
} from '../../src/sim/section';
import { TRACKS, type Piece } from '../../src/sim/track';
import { TRACK_HALF_WIDTH } from '../../src/sim/tuning';

const S = (length: number): Piece => ({ kind: 'straight', length });
const B = (radius: number, sweep: number): Piece => ({ kind: 'bend', radius, sweep });
const sec = (id: string, pieces: readonly Piece[]): Section => ({
  id,
  name: id,
  pieces,
  splits: [],
});

describe('a section has ends', () => {
  it('leaves you along its own length when it is straight', () => {
    const end = poseAfter([S(100)]);
    expect(end.x).toBeCloseTo(100, 9);
    expect(end.y).toBeCloseTo(0, 9);
    expect(end.heading).toBeCloseTo(0, 9);
  });

  it('turns a quarter circle where the arithmetic says it should', () => {
    // A left bend of 90° at radius r leaves you at (r, r) facing +y.
    const end = poseAfter([B(50, 90)]);
    expect(end.x).toBeCloseTo(50, 6);
    expect(end.y).toBeCloseTo(50, 6);
    expect(end.heading).toBeCloseTo(Math.PI / 2, 9);
  });

  it('composes: walking two sections is walking their pieces', () => {
    const a = sec('a', [S(120), B(40, 55)]);
    const b = sec('b', [S(80), B(60, -30)]);
    const composed = poseOfAll([a, b]);
    const flat = poseAfter([...a.pieces, ...b.pieces]);
    expect(composed.x).toBeCloseTo(flat.x, 9);
    expect(composed.y).toBeCloseTo(flat.y, 9);
    expect(wrapAngle(composed.heading - flat.heading)).toBeCloseTo(0, 9);
  });

  it('snaps any section onto any other', () => {
    // The whole claim: a section starts at the origin, so placing it after
    // another is walking it from that one's exit. There is no arrangement this
    // fails for, which is what "any sector snaps onto any other" means.
    const parts = [
      sec('p', [S(200), B(60, 80)]),
      sec('q', [B(45, -40), S(120)]),
      sec('r', [S(90)]),
    ];
    for (const first of parts) {
      for (const second of parts) {
        const together = poseOfAll([first, second]);
        const byHand = poseAfter(second.pieces, exitOf(first));
        expect(together.x).toBeCloseTo(byHand.x, 9);
        expect(together.y).toBeCloseTo(byHand.y, 9);
      }
    }
  });

  it('measures a run as the sum of its pieces', () => {
    const quarter = (50 * Math.PI) / 2;
    expect(spanOf([S(100), B(50, 90)])).toBeCloseTo(100 + quarter, 9);
  });
});

describe('closure is a property of the set, and one that can be fixed', () => {
  const ARRANGEMENTS: readonly Section[][] = [
    [sec('a', [S(200), B(60, 80)]), sec('b', [S(120), B(45, -40)]), sec('c', [S(90), B(70, 100)])],
    [sec('a', [S(400)]), sec('b', [B(90, 30)]), sec('c', [S(150), B(40, -25)])],
    [sec('a', [S(80), B(30, 90)]), sec('b', [S(50), B(26, -70)]), sec('c', [S(40), B(34, 160)])],
    [sec('a', [S(300), B(100, 45)]), sec('b', [S(300), B(100, 45)])],
    [sec('only', [S(250), B(55, 120)])],
  ];

  it('says how far an arrangement is from closing', () => {
    const open = closureOf([sec('a', [S(300)])]);
    expect(open.closed).toBe(false);
    expect(open.gap).toBeCloseTo(300, 6);
  });

  it('closes any arrangement at some turning radius', () => {
    for (const [i, sections] of ARRANGEMENTS.entries()) {
      const closed = [40, 60, 90, 130, 200].some((radius) => {
        const run = closingSection(sections, radius);
        return run !== undefined && closureOf([...sections, run]).closed;
      });
      expect(closed, `arrangement ${i} could not be closed`).toBe(true);
    }
  });

  it('lands the closing run back on the start line, walked rather than trusted', () => {
    const sections = ARRANGEMENTS[0] as readonly Section[];
    const run = closingSection(sections, 60);
    expect(run).toBeDefined();
    const end = poseOfAll([...sections, run as Section]);
    expect(Math.hypot(end.x - ORIGIN.x, end.y - ORIGIN.y)).toBeLessThan(0.5);
    expect(Math.abs(wrapAngle(end.heading))).toBeLessThan(0.01);
  });

  it('puts a checkpoint at every join and the first one on the line', () => {
    const sections = ARRANGEMENTS[0] as readonly Section[];
    const marks = checkpointsOf(sections);
    expect(marks).toHaveLength(sections.length);
    expect(marks[0]).toBe(0);
    expect(marks[1]).toBeCloseTo(spanOf((sections[0] as Section).pieces), 9);
    expect(piecesOf(sections)).toHaveLength(
      sections.reduce((n, s) => n + s.pieces.length, 0),
    );
  });
});

describe('the tracks that ship', () => {
  it('are closed circuits', () => {
    for (const track of TRACKS) {
      const first = track.samples[0];
      const last = track.samples[track.samples.length - 1];
      if (first === undefined || last === undefined) throw new Error('empty');
      // The last sample is a step short of the line, not on it.
      expect(Math.hypot(last.pos.x - first.pos.x, last.pos.y - first.pos.y)).toBeLessThan(6);
    }
  });

  it('have one sector per section, with a checkpoint at each join', () => {
    for (const track of TRACKS) {
      expect(track.checkpoints).toHaveLength(track.sectors.length);
      expect(track.checkpoints[0]).toBe(0);
      // Checkpoints climb, and the last sector still has a lap left to run.
      for (let i = 1; i < track.checkpoints.length; i += 1) {
        expect(track.checkpoints[i] as number).toBeGreaterThan(
          track.checkpoints[i - 1] as number,
        );
      }
      expect(track.checkpoints[track.checkpoints.length - 1] as number).toBeLessThan(
        track.length,
      );
    }
  });

  it('keep every split clear of the rest of the circuit', () => {
    // A split is a road now, not a bulge, so it can be authored anywhere —
    // including straight across the infield into another sector. Two roads
    // closer than a corridor is a junction the game has no rules for, and the
    // only thing that catches it is looking.
    for (const track of TRACKS) {
      for (const sector of track.sectors) {
        for (const route of sector.routes.slice(1)) {
          // How far round the lap two distances are, the short way.
          const apart = (a: number, b: number): number => {
            const d = Math.abs(((a - b) % track.length + track.length) % track.length);
            return Math.min(d, track.length - d);
          };
          let nearest = Infinity;
          for (const point of route.samples) {
            track.samples.forEach((online, i) => {
              const at = i * 3;
              // Its own sector's stretch is shared ground: they meet at both
              // checkpoints by construction. Wrapped, because a split arriving
              // at checkpoint 0 meets the line at 0, which is also the lap.
              if (apart(at, sector.start) <= 60 || apart(at, sector.end) <= 60) return;
              if (at > sector.start && at < sector.end) return;
              nearest = Math.min(
                nearest,
                Math.hypot(point.pos.x - online.pos.x, point.pos.y - online.pos.y),
              );
            });
          }
          expect(
            nearest,
            `${track.name} ${route.name} runs ${nearest.toFixed(0)} from another part of the circuit`,
          ).toBeGreaterThan(TRACK_HALF_WIDTH);
        }
      }
    }
  });

  it('no longer cut their sectors at even fractions of the lap', () => {
    // The thing that changed. A sector used to be a slice of a continuous walk
    // taken at an arbitrary distance; it is a shape with ends now, so at least
    // one checkpoint on at least one track sits somewhere an even division
    // would not have put it.
    const moved = TRACKS.some((track) =>
      track.checkpoints.some((at, i) =>
        Math.abs(at - (track.length * i) / track.sectors.length) > 1,
      ),
    );
    expect(moved).toBe(true);
  });
});
