// Where the eye goes, and the one promise a chase camera makes.
//
// It owes its subject exactly one thing: keep it on screen. That is a claim
// about where the ship *projects*, which needs no canvas — so it is asserted
// here over every track rather than noticed in play, which is how all three of
// the faults below were actually found.
//
// Verticality broke this three ways at once, and every one of them read as the
// projection being wrong when it was the camera. Things sitting on the road
// were drawn on the flat plane, so a ship carried straight on through a hill.
// The height came from the road *behind* the camera, a different point on a
// ramp, so the ship slid up and down the frame. And a later attempt to keep the
// eye above the road took the highest road within sight, which lifted it the
// moment a bridge came into view — hundreds of units early, with the ship lost
// off the bottom.

import { describe, expect, it } from 'vitest';
import { closingSection } from '../../src/sim/section';
import {
  B,
  S,
  TRACKS,
  assemblePlan,
  placeSmooth,
  sector,
  type Piece,
  type Track,
} from '../../src/sim/track';
import { HEIGHT, eyeFor } from '../../src/render/chase';
import { heightAt, reliefOf } from '../../src/render/height';
import { lensFor, toEye, toScreen } from '../../src/render/camera';
import type { RouteView, ShipView } from '../../src/render/view';

const WIDE = 1200;
const TALL = 700;
const ON_THE_MAIN_LINE: RouteView = { planned: [], nav: 0 };

const shipAt = (distance: number): ShipView => ({
  distance,
  route: 0,
  offset: 0,
  wide: false,
  isPlayer: true,
  wake: [],
  swings: [],
  shotAt: undefined,
  struck: 0,
});

/**
 * A loop whose **golden path** climbs a bridge.
 *
 * The four tracks that ship are bridged only on their splits, so a player on
 * the main line never goes over a hill on any of them — which makes them
 * useless for testing what a hill does. This one crosses itself, so the line
 * being flown is the one that climbs.
 */
function hilly(): Track {
  const ring = [
    sector('a', 'A', [S(240), B(50, 160)] as Piece[]),
    sector('b', 'B', [S(240), B(50, -120)] as Piece[]),
  ];
  const home = closingSection(ring, 60);
  if (home === undefined) throw new Error('no way home');
  return assemblePlan({ name: 'Hilly', shape: 'x', par: 1000, ring: [...ring, home] });
}

/** Where the ship lands on screen, all the way round a lap. */
function shipOnScreen(track: Track): { at: number; x: number; y: number }[] {
  const relief = reliefOf(track);
  const lift = (d: number, r: number): number => heightAt(track, relief, d, r);
  const seen = [];
  for (let at = 0; at < track.length; at += 2) {
    const player = shipAt(at);
    const lens = lensFor(eyeFor(track, ON_THE_MAIN_LINE, player, lift), WIDE, TALL);
    const place = placeSmooth(track, at, 0);
    const eye = toEye(lens, place.pos.x, place.pos.y, lift(at, 0) + 1.8);
    // Behind the eye would mean the camera had turned its back on the ship.
    expect(eye.depth, `${track.name} at ${at.toFixed(0)}: the ship is behind the camera`)
      .toBeGreaterThan(0);
    seen.push({ at, ...toScreen(lens, eye) });
  }
  return seen;
}

describe('the ship is always in view', () => {
  it('sits well inside the frame on every track that ships', () => {
    for (const track of TRACKS) {
      for (const row of shipOnScreen(track)) {
        expect(row.x, `${track.name} at ${row.at.toFixed(0)}`).toBeGreaterThan(WIDE * 0.1);
        expect(row.x, `${track.name} at ${row.at.toFixed(0)}`).toBeLessThan(WIDE * 0.9);
        expect(row.y, `${track.name} at ${row.at.toFixed(0)}`).toBeGreaterThan(TALL * 0.1);
        expect(row.y, `${track.name} at ${row.at.toFixed(0)}`).toBeLessThan(TALL * 0.9);
      }
    }
  });

  it('stays inside it over a hill, which is where it used to be lost', () => {
    // Measured: unclamped, the tilt put the ship at 98% of the frame height —
    // on screen by the arithmetic and off it in practice, since a ship has a
    // size. The pitch limits exist for this and are set from this.
    const rows = shipOnScreen(hilly());
    const low = Math.min(...rows.map((r) => r.y));
    const high = Math.max(...rows.map((r) => r.y));
    expect(low).toBeGreaterThan(TALL * 0.2);
    expect(high).toBeLessThan(TALL * 0.85);
  });

  it('holds still horizontally, because the camera looks where the ship goes', () => {
    // The eye is directly behind the ship, so the ship is dead centre and any
    // drift would mean the yaw had come adrift from the heading.
    for (const row of shipOnScreen(hilly())) {
      expect(row.x).toBeCloseTo(WIDE / 2, 6);
    }
  });
});

describe('the eye', () => {
  it('rides exactly its usual height above the ship road, hill or no hill', () => {
    // The drift. The first version took its height from the road a camera's
    // length behind the ship, which on a ramp is a different point on the
    // slope: the gap swung between 15 and 25 units over one bridge.
    for (const track of [...TRACKS, hilly()]) {
      const relief = reliefOf(track);
      const lift = (d: number, r: number): number => heightAt(track, relief, d, r);
      for (let at = 0; at < track.length; at += 3) {
        const eye = eyeFor(track, ON_THE_MAIN_LINE, shipAt(at), lift);
        expect(eye.height - lift(at, 0), `${track.name} at ${at.toFixed(0)}`).toBeCloseTo(
          HEIGHT,
          6,
        );
      }
    }
  });

  it('tilts with the road rather than floating up over it', () => {
    // What a hill should do to the picture: change the angle, not the height.
    // A camera that climbs early loses the thing it is following.
    const track = hilly();
    const relief = reliefOf(track);
    const lift = (d: number, r: number): number => heightAt(track, relief, d, r);
    const pitches = [];
    for (let at = 0; at < track.length; at += 2) {
      pitches.push(eyeFor(track, ON_THE_MAIN_LINE, shipAt(at), lift).pitch);
    }
    // It really does move — otherwise the hill reads as flat ground.
    expect(Math.max(...pitches) - Math.min(...pitches)).toBeGreaterThan(0.1);
  });

  it('is left exactly as it was on a track with no hills', () => {
    // All four shipped tracks are bridged on their splits, so the line a player
    // flies is level the whole way round. Nothing about it may have changed.
    for (const track of TRACKS) {
      const relief = reliefOf(track);
      const lift = (d: number, r: number): number => heightAt(track, relief, d, r);
      for (let at = 0; at < track.length; at += 3) {
        const eye = eyeFor(track, ON_THE_MAIN_LINE, shipAt(at), lift);
        expect(eye.height).toBe(HEIGHT);
        expect(eye.pitch).toBeCloseTo(0.3, 6);
      }
    }
  });
});
