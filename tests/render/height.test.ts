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
  PROVING_GROUND,
  TRACKS,
  assemblePlan,
  sector,
  type Piece,
  type Track,
} from '../../src/sim/track';
import { startRace, stepRace, type RaceConfig } from '../../src/sim/race';
import { TRACK_HALF_WIDTH } from '../../src/sim/tuning';
import { bareShip } from '../../src/sim/ship';
import {
  NEEDED_CLEARANCE,
  crossingsOf,
  heightAt,
  reliefOf,
  heightOn,
  roadsOf,
  separation,
} from '../../src/render/height';

/** Height of a road at a distance along it, given the road itself. */
const heightAt2 = (
  relief: ReturnType<typeof reliefOf>,
  road: ReturnType<typeof roadsOf>[number],
  along: number,
): number => heightOn(relief, road.sector, road.route, along);

/** A plain loop that never comes near itself: four straights and four corners. */
function plainLoop(): Track {
  return assemblePlan({
    name: 'Plain',
    shape: 'o',
    par: 1000,
    ring: [
      sector('a', 'A', [S(220), B(70, -90)] as Piece[]),
      sector('b', 'B', [S(140), B(45, -90)] as Piece[]),
      sector('c', 'C', [S(220), B(70, -90)] as Piece[]),
      sector('d', 'D', [S(140), B(45, -90)] as Piece[]),
    ],
  });
}

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

describe('the tracks that ship', () => {
  it('are bridged, and never more than a loop needs', () => {
    // Three of the four have a split that crosses its own sector's golden path
    // on the way round. That was always true and always allowed — the old rule
    // skipped a split's own sector rather than permitting it — and it is now
    // drawn as what it is: one road carried over the other. The fourth, the
    // Proving Ground, crosses its main line instead, twice, by the symmetry of
    // a half walked twice.
    for (const track of TRACKS) {
      const relief = reliefOf(track);
      // Never more than a bridge or two. A shipped track is a loop, not a knot.
      expect(relief.crossings.length, `${track.name}`).toBeLessThan(3);
      if (relief.crossings.length > 0) {
        expect(separation(relief), `${track.name}`).toBeGreaterThan(NEEDED_CLEARANCE);
      }
    }
  });

  it('cross the golden path over itself on exactly one of them', () => {
    // The three race tracks are plain loops: a crossing on the main line would
    // mean the lap runs back through itself, which none of them do. The Proving
    // Ground does, on purpose — it is the track a season opens on and the only
    // one where the line a player flies goes over a hill.
    for (const track of TRACKS) {
      const main = crossingsOf(track).filter(
        (c) => c.over.route === 0 && c.under.route === 0,
      );
      if (track === PROVING_GROUND) {
        expect(main.length, 'the Proving Ground stopped crossing itself').toBeGreaterThan(0);
      } else {
        expect(main, `${track.name} crosses its own golden path`).toHaveLength(0);
      }
    }
  });

  it('leave a track with no crossings perfectly flat', () => {
    // Built here rather than borrowed from the shipped four: every one of them
    // is bridged somewhere now, so there is no flat one left to point at.
    const relief = reliefOf(plainLoop());
    expect(relief.crossings).toHaveLength(0);
    for (const heights of relief.heights.values()) {
      expect(Math.max(...heights, 0)).toBe(0);
      expect(Math.min(...heights, 0)).toBe(0);
    }
  });

  it('put the hill where a player on the main line will meet it', () => {
    // A bridge a player never drives over is a bridge nobody sees. This is the
    // whole reason the Proving Ground was reshaped, so it is worth asserting
    // rather than assuming: the golden path itself climbs.
    const relief = reliefOf(PROVING_GROUND);
    let highest = 0;
    for (let at = 0; at < PROVING_GROUND.length; at += 1) {
      highest = Math.max(highest, heightAt(PROVING_GROUND, relief, at, 0));
    }
    expect(highest).toBeGreaterThan(NEEDED_CLEARANCE);
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

  it('meets every checkpoint at the ground', () => {
    // A ship crossing a checkpoint may change roads, so every road has to be at
    // the same height there — which is what the taper buys, and the only reason
    // roads meeting at a checkpoint need nothing solved between them.
    const track = crossedLoop();
    const relief = reliefOf(track);
    for (const road of roadsOf(track)) {
      const sector = track.sectors[road.sector];
      if (sector === undefined) continue;
      expect(heightAt(track, relief, sector.start, road.route)).toBeCloseTo(0, 6);
      expect(heightAt(track, relief, sector.end - 1e-6, road.route)).toBeCloseTo(0, 6);
    }
  });

  it('climbs and falls rather than stepping', () => {
    // A camera follows this. A jump between neighbouring samples would read as
    // the whole world flinching.
    const track = crossedLoop();
    const relief = reliefOf(track);
    let worst = 0;
    for (let d = 0; d < track.length; d += 1) {
      worst = Math.max(
        worst,
        Math.abs(heightAt(track, relief, d + 1, 0) - heightAt(track, relief, d, 0)),
      );
    }
    expect(worst).toBeLessThan(1);
  });

  it('is flat everywhere except near a crossing', () => {
    const track = crossedLoop();
    const relief = reliefOf(track);
    const all = [...relief.heights.values()].flat();
    const raised = all.filter((h) => Math.abs(h) > 0.01).length;
    expect(raised).toBeGreaterThan(0);
    // Most of a lap is ordinary road.
    expect(raised).toBeLessThan(all.length * 0.8);
  });
});

describe('two roads are never in the same place', () => {
  it('lets a loop cross itself, which the flat rule could not', () => {
    // The permission the rule change buys. Before this, a road coming within a
    // corridor of another part of the circuit was refused outright; now it is
    // refused only if the relief does not lift one clear of the other. This is
    // the shape that was impossible and now is not.
    const track = crossedLoop();
    const relief = reliefOf(track);
    const roads = roadsOf(track);
    expect(relief.crossings.length).toBeGreaterThan(0);

    const MERGE = 70;
    const merging = (road: (typeof roads)[number], along: number): boolean =>
      along < MERGE || along > road.line.length - MERGE;

    let closest = Infinity;
    let least = Infinity;
    for (let a = 0; a < roads.length; a += 1) {
      for (let b = a; b < roads.length; b += 1) {
        const one = roads[a] as (typeof roads)[number];
        const two = roads[b] as (typeof roads)[number];
        if (a !== b && one.sector === two.sector) continue;
        one.line.samples.forEach((p, i) => {
          const atOne = one.line.cum[i] as number;
          if (merging(one, atOne)) return;
          two.line.samples.forEach((q, j) => {
            const atTwo = two.line.cum[j] as number;
            if (merging(two, atTwo)) return;
            if (a === b && Math.abs(atTwo - atOne) < MERGE) return;
            const apart = Math.hypot(p.pos.x - q.pos.x, p.pos.y - q.pos.y);
            if (apart > TRACK_HALF_WIDTH) return;
            closest = Math.min(closest, apart);
            least = Math.min(
              least,
              Math.abs(
                heightAt2(relief, one, atOne) - heightAt2(relief, two, atTwo),
              ),
            );
          });
        });
      }
    }
    // It really does come within a corridor somewhere — otherwise the check
    // below proves nothing about crossing tracks.
    expect(closest).toBeLessThanOrEqual(TRACK_HALF_WIDTH);
    expect(least).toBeGreaterThan(NEEDED_CLEARANCE);
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
      const config: RaceConfig = { track, stats, seed: 7 };
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
    expect(heightAt(tiny, relief, 0, 0)).toBe(0);
    expect(heightAt(tiny, relief, -50, 0)).toBe(0);
    expect(heightAt(tiny, relief, 1e6, 0)).toBe(0);
    // A road index nobody has is not a crash.
    expect(heightAt(tiny, relief, 10, 7)).toBe(0);
  });
});
