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
  PROVING_GROUND,
  S,
  TRACKS,
  assemblePlan,
  placeSmooth,
  sector,
  type Piece,
  type Track,
} from '../../src/sim/track';
import { HEIGHT, eyeFor, hullOf, shipTilt } from '../../src/render/chase';
import { heightAt, reliefOf } from '../../src/render/height';
import { lensFor, toEye, toScreen } from '../../src/render/camera';
import type { RouteView, ShipView } from '../../src/render/view';

/** The tracks whose golden path never leaves the ground. Not the Proving Ground. */
const LEVEL_TRACKS = TRACKS.filter((track) => track !== PROVING_GROUND);

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
 * The three race tracks are bridged only on their splits, so a player on the
 * main line never goes over a hill on any of them. The Proving Ground does
 * cross itself now, and is checked below; this one stays because it is steeper
 * and shorter than anything that ships, which is what a limit is for.
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
    // The three race tracks are bridged only on their splits, so the line a
    // player flies is level the whole way round and nothing about the eye may
    // have changed. The Proving Ground is excluded because its golden path
    // climbs on purpose — that is what the test above is measuring.
    for (const track of LEVEL_TRACKS) {
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

describe('the ship leans with the road', () => {
  const liftOf = (track: Track) => {
    const relief = reliefOf(track);
    return (d: number, r: number): number => heightAt(track, relief, d, r);
  };

  it('stays flat where the road is flat', () => {
    // The race tracks bridge only their splits, so a player on the golden path
    // never climbs on any of them and should never be drawn as if it did.
    for (const track of LEVEL_TRACKS) {
      const lift = liftOf(track);
      for (let at = 0; at < track.length; at += 3) {
        expect(shipTilt(track, lift, at, 0), `${track.name} at ${at}`).toBe(0);
      }
    }
  });

  it('leans on the one shipped track that has a hill on its main line', () => {
    // The Proving Ground, which a season always opens on. Without this the
    // tilt is a thing only the test loop above ever sees.
    const lift = liftOf(PROVING_GROUND);
    let most = 0;
    for (let at = 0; at < PROVING_GROUND.length; at += 1) {
      most = Math.max(most, Math.abs(shipTilt(PROVING_GROUND, lift, at, 0)));
    }
    expect(most).toBeGreaterThan(0.1);
  });

  it('noses up going onto a bridge and down coming off it', () => {
    const track = hilly();
    const lift = liftOf(track);
    let climbing = 0;
    let falling = 0;
    let worst = 0;
    for (let at = 0; at < track.length; at += 1) {
      const tilt = shipTilt(track, lift, at, 0);
      // Up where the road under it is going up, down where it is going down.
      const rise = lift(at + 6, 0) - lift(at - 6, 0);
      if (Math.abs(rise) > 0.2) expect(Math.sign(tilt), `at ${at}`).toBe(Math.sign(rise));
      if (tilt > 0.02) climbing += 1;
      if (tilt < -0.02) falling += 1;
      worst = Math.max(worst, Math.abs(tilt));
    }
    // It really does both, and a bridge that goes up has to come back down.
    expect(climbing).toBeGreaterThan(20);
    expect(falling).toBeGreaterThan(20);
    expect(climbing).toBeCloseTo(falling, -1);
    // Visible, and never further than a ship on its tail.
    expect(worst).toBeGreaterThan(0.2);
    expect(worst).toBeLessThanOrEqual(0.36);
  });

  it('does not flinch at the start line', () => {
    // The gradient is read either side of the ship, so at distance 0 one of
    // those samples is off the back of the lap. Wrapped, not clamped.
    const track = hilly();
    const lift = liftOf(track);
    for (let at = -3; at <= 3; at += 0.5) {
      const here = shipTilt(track, lift, at, 0);
      const next = shipTilt(track, lift, at + 0.5, 0);
      expect(Math.abs(next - here), `at ${at}`).toBeLessThan(0.05);
    }
  });
});

describe('the hull that is drawn', () => {
  /**
   * How much of the screen a unit of height takes against a unit of road ahead.
   * Measured in the game; roughly three, because the road ahead of the ship is
   * foreshortened almost flat and the vertical hardly at all.
   */
  const RISE = 2.95;

  /** A hull point in plain screen pixels, out of the frame `facing` turned. */
  const onScreen = (
    facing: number,
    tilt: number,
    forward: number,
    across: number,
    rise = RISE,
  ): { x: number; y: number } => {
    const [x, y] = hullOf(facing, tilt, 10, rise)(forward, across);
    return {
      x: x * Math.cos(facing) - y * Math.sin(facing),
      y: x * Math.sin(facing) + y * Math.cos(facing),
    };
  };

  it('is the same flat dart it always was when the road is flat', () => {
    for (const facing of [0, 0.7, -1.9, Math.PI, 3]) {
      for (const rise of [0.5, 1, RISE, 4]) {
        const corner = hullOf(facing, 0, 10, rise);
        expect(corner(1, 0)[0]).toBeCloseTo(0, 9);
        expect(corner(1, 0)[1]).toBeCloseTo(-10, 9);
        expect(corner(-0.75, 0.95)[0]).toBeCloseTo(9.5, 9);
        expect(corner(-0.75, 0.95)[1]).toBeCloseTo(7.5, 9);
        expect(corner(-0.3, 0)[1]).toBeCloseTo(3, 9);
      }
    }
  });

  it('lifts the nose up the screen on a climb, whichever way the ship faces', () => {
    // The trap this is here for: the frame is turned by `facing` before the
    // hull is drawn, so leaning the nose toward that frame's own "up" would
    // roll the ship instead of pitching it, and would do it differently
    // depending on where on the map the hill happened to be.
    for (const facing of [0, 0.7, -1.9, Math.PI, 3, -2.6]) {
      const level = onScreen(facing, 0, 1, 0);
      const up = onScreen(facing, 0.3, 1, 0);
      const down = onScreen(facing, -0.3, 1, 0);
      expect(up.y, `facing ${facing}`).toBeLessThan(level.y);
      expect(down.y, `facing ${facing}`).toBeGreaterThan(level.y);
      // And the wings, which are behind the ship, go the other way.
      expect(onScreen(facing, 0.3, -0.75, 0.95).y).toBeGreaterThan(
        onScreen(facing, 0, -0.75, 0.95).y,
      );
    }
  });

  it('keeps the span across the ship, so a pitch is not a roll', () => {
    // Tilting turns the hull about its own across axis. The two wingtips are on
    // that axis, so they stay exactly as far apart and exactly as level with
    // each other as they were.
    for (const facing of [0, 1.1, -2.2]) {
      for (const tilt of [-0.36, -0.1, 0, 0.2, 0.36]) {
        const right = onScreen(facing, tilt, -0.75, 0.95);
        const left = onScreen(facing, tilt, -0.75, -0.95);
        expect(Math.hypot(right.x - left.x, right.y - left.y)).toBeCloseTo(19, 9);
        const flatRight = onScreen(facing, 0, -0.75, 0.95);
        const flatLeft = onScreen(facing, 0, -0.75, -0.95);
        // Both wingtips move the same way and by the same amount: no roll.
        expect(right.y - flatRight.y).toBeCloseTo(left.y - flatLeft.y, 9);
      }
    }
  });

  it('leans by as much as the screen says a unit of height is worth', () => {
    // The first version treated a unit of height and a unit of road ahead as
    // the same number of pixels. They are not — it is about three to one under
    // this camera — and taking them as equal made the tilt a third of what the
    // road was doing, which on a bridge reads as a ship not quite keeping up.
    const facing = 0;
    const flat = onScreen(facing, 0, 1, 0).y;
    const lifted = (rise: number): number => flat - onScreen(facing, 0.3, 1, 0, rise).y;
    // The lean is linear in the ratio: the foreshortening of the body is not
    // part of it, which is why this is a difference rather than a multiple.
    expect(lifted(3) - lifted(2)).toBeCloseTo(lifted(2) - lifted(1), 6);
    expect(lifted(3)).toBeGreaterThan(lifted(1));
    // Visible at the ratio the game actually measures: the nose ends up most of
    // a ship-length further up the screen than it was.
    expect(lifted(RISE)).toBeGreaterThan(6);
  });
});
