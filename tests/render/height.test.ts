// Verticality: roads that cross get a bridge, and nothing else changes.
//
// The point of this suite is not the geometry, which is a raised cosine and
// hard to get wrong. It is the *containment*: elevation is a drawing decision
// and it has to be provably unable to reach the simulation. Two things prove
// it. The height function lives in `render/`, which `src/sim` is forbidden by
// ESLint to import — so the sim cannot see it even if somebody wanted it to —
// and the race is flown here with and without a relief built, to show the
// numbers are identical rather than merely believed to be.
//
// Worth writing down because it is the reason this was cheap: a ship's position
// is a canonical distance plus a lateral offset. It is never an (x, y). Two
// stretches of road sitting on top of each other in the plan view could never
// interfere — a mine in sector 1 is found by `sector === 1`, not by being near
// anything — so height buys a picture that makes sense and costs no rules.

import { describe, expect, it } from 'vitest';
import { closingSection } from '../../src/sim/section';
import {
  B,
  S,
  TRACKS,
  assemblePlan,
  sector,
  type Piece,
  type Track,
} from '../../src/sim/track';
import { startRace, stepRace, type RaceConfig } from '../../src/sim/race';
import { bareShip } from '../../src/sim/ship';
import {
  NEEDED_CLEARANCE,
  crossingsOf,
  heightOn,
  reliefOf,
  separation,
} from '../../src/render/height';

/** A loop that runs back over itself, built by letting the closer find the way. */
function crossedLoop(): Track {
  const ring = [
    sector('a', 'A', [S(240), B(50, 160)] as Piece[]),
    sector('b', 'B', [S(240), B(50, -120)] as Piece[]),
  ];
  const home = closingSection(ring, 60);
  if (home === undefined) throw new Error('no way home');
  return assemblePlan({ name: 'Crossed', shape: 'x', par: 1000, ring: [...ring, home] });
}

describe('a track that never crosses itself', () => {
  it('is flat, so nothing about it moves', () => {
    // Every track that ships is a plain loop. If any of them gained a hill,
    // this feature would have changed the game rather than the picture.
    for (const track of TRACKS) {
      const relief = reliefOf(track);
      expect(relief.crossings, `${track.name} has a crossing`).toHaveLength(0);
      expect(Math.max(...relief.heights)).toBe(0);
      expect(Math.min(...relief.heights)).toBe(0);
    }
  });
});

describe('a track that does cross itself', () => {
  it('is found, and told apart from the places it merely runs near itself', () => {
    const track = crossedLoop();
    const crossings = crossingsOf(track);
    expect(crossings.length).toBeGreaterThan(0);
    // One crossing, not the several neighbouring sample pairs that straddle it.
    expect(crossings.length).toBeLessThan(4);
  });

  it('holds the two strands far enough apart to be two roads', () => {
    const track = crossedLoop();
    const relief = reliefOf(track);
    expect(separation(relief)).toBeGreaterThan(NEEDED_CLEARANCE);
  });

  it('comes back to the same height at the start line', () => {
    // A loop with a step in it is not a loop. Every offset inside the height
    // function is a wrapped one, which makes the profile periodic by
    // construction — this is the check that the construction holds.
    const track = crossedLoop();
    const relief = reliefOf(track);
    expect(heightOn(relief, 0)).toBeCloseTo(heightOn(relief, track.length), 6);
  });

  it('climbs and falls rather than stepping', () => {
    // A camera follows this. A jump between neighbouring samples would read as
    // the whole world flinching.
    const track = crossedLoop();
    const relief = reliefOf(track);
    let worst = 0;
    for (let d = 0; d < track.length; d += 1) {
      worst = Math.max(worst, Math.abs(heightOn(relief, d + 1) - heightOn(relief, d)));
    }
    expect(worst).toBeLessThan(1);
  });

  it('is flat everywhere except near a crossing', () => {
    const track = crossedLoop();
    const relief = reliefOf(track);
    const raised = relief.heights.filter((h) => Math.abs(h) > 0.01).length;
    expect(raised).toBeGreaterThan(0);
    // Most of a lap is ordinary road.
    expect(raised).toBeLessThan(relief.heights.length * 0.8);
  });
});

describe('height cannot reach the race', () => {
  it('leaves every number of a lap exactly as it was', () => {
    // The claim in one test. Build the relief, fly the lap, and compare against
    // a lap flown without ever having built one: same ticks, same distance,
    // same swings, same shields. The relief is a *drawing* of the track.
    const track = crossedLoop();
    const stats = bareShip(1.6, 0.9);

    const fly = (): ReturnType<typeof stepRace> => {
      let state = startRace(stats, [], 0);
      const config: RaceConfig = { track, stats, plan: 'carry', seed: 7 };
      for (let i = 0; i < 1500; i += 1) state = stepRace(state, config);
      return state;
    };

    const before = fly();
    const relief = reliefOf(track);
    expect(relief.crossings.length).toBeGreaterThan(0);
    const after = fly();

    expect(after.distance).toBe(before.distance);
    expect(after.tick).toBe(before.tick);
    expect(after.speed).toBe(before.speed);
    expect(after.offset).toBe(before.offset);
    expect(after.shields).toBe(before.shields);
    expect(after.swings.map((s) => s.swing)).toEqual(before.swings.map((s) => s.swing));
  });

  it('is nowhere in the track the simulation is handed', () => {
    // A `Track` has no height field and no sample has one. If elevation ever
    // became part of the thing the sim reads, this is what would notice.
    const track = crossedLoop();
    expect(track).not.toHaveProperty('heights');
    expect(track).not.toHaveProperty('relief');
    for (const sample of track.samples.slice(0, 5)) {
      expect(Object.keys(sample).sort()).toEqual(['heading', 'pos', 'radius', 'turn']);
      expect(Object.keys(sample.pos).sort()).toEqual(['x', 'y']);
    }
  });
});

describe('a degenerate track', () => {
  it('has no crossings and no height rather than throwing', () => {
    // The chase camera builds a relief for whatever track it is handed, so this
    // has to cope with the smallest one there is.
    const tiny = assemblePlan({
      name: 'Tiny',
      shape: 't',
      par: 1,
      ring: [
        sector('a', 'A', [S(60), B(20, 180)] as Piece[]),
        sector('b', 'B', [S(60), B(20, 180)] as Piece[]),
      ],
    });
    const relief = reliefOf(tiny);
    expect(relief.crossings).toEqual([]);
    expect(heightOn(relief, 0)).toBe(0);
    expect(heightOn(relief, -50)).toBe(0);
    expect(heightOn(relief, 1e6)).toBe(0);
  });
});
