// Where the eye sits, and why it is not obvious.
//
// Verticality landed and the chase camera went wrong in three ways at once, all
// of which read as the projection being broken and none of which were: the ship
// carried straight on through a bridge, the camera drifted up and down as if it
// had lost the ship, and on the way out of a dip the whole view mirrored — a
// bend that goes right appeared to go left.
//
// All three were the same mistake in different clothes. Things that sit *on*
// the road were being drawn on the flat plane, and the camera's height was
// worked out from the road behind it rather than the road under the ship —
// which on a ramp is a different height, and could put the eye underneath a
// surface drawn with no thickness. You see the underside of a road, and the
// underside of a right-hand bend is a left-hand bend.
//
// The camera itself cannot be tested headlessly. The two rules it stands on can.

import { describe, expect, it } from 'vitest';
import { TRACKS, type Track } from '../../src/sim/track';
import { CAMERA_SEES, HEIGHT, eyeHeight } from '../../src/render/chase';
import { heightAt, reliefOf } from '../../src/render/height';
import type { RouteView, ShipView } from '../../src/render/view';

const ON_THE_MAIN_LINE: RouteView = { planned: [], nav: 0 };

/** A ship far enough along to be somewhere, and on the golden path. */
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

/** Walk a lap and hand back the eye height and the road under the ship. */
function overALap(track: Track): { eye: number; road: number; at: number }[] {
  const relief = reliefOf(track);
  const lift = (d: number, r: number): number => heightAt(track, relief, d, r);
  const rows = [];
  for (let at = 0; at < track.length; at += 3) {
    const road = lift(at, 0);
    rows.push({
      at,
      road,
      eye: eyeHeight(track, ON_THE_MAIN_LINE, shipAt(at), road, lift),
    });
  }
  return rows;
}

describe('the eye', () => {
  it('never sits closer to the ship road than it does on flat ground', () => {
    // The drift. The first version took its height from the road a camera's
    // length *behind* the ship, which on a ramp is a different point on the
    // slope: the gap swung between 15 and 25 units over one bridge, and the
    // ship slid up and down the screen.
    for (const track of TRACKS) {
      for (const row of overALap(track)) {
        expect(
          row.eye - row.road,
          `${track.name} at ${row.at.toFixed(0)}`,
        ).toBeGreaterThanOrEqual(HEIGHT - 1e-9);
      }
    }
  });

  it('is never underneath the road it is looking along', () => {
    // The mirroring. A road is a filled surface with no thickness, so an eye
    // below one sees its underside, and a bend seen from beneath turns the
    // other way. On the Kestrel the old rule put the eye 4 units under.
    for (const track of TRACKS) {
      const relief = reliefOf(track);
      const lift = (d: number, r: number): number => heightAt(track, relief, d, r);
      for (const row of overALap(track)) {
        for (let on = 0; on <= CAMERA_SEES; on += 10) {
          expect(
            lift(row.at + on, 0),
            `${track.name}: road at ${(row.at + on).toFixed(0)} is above the eye`,
          ).toBeLessThan(row.eye);
        }
      }
    }
  });

  it('sits exactly where it always did on a track with no bridges', () => {
    // Nothing about a flat track may have changed, or verticality altered the
    // game rather than adding to it.
    for (const row of overALap(TRACKS[3] as Track)) {
      expect(row.road).toBe(0);
      expect(row.eye).toBe(HEIGHT);
    }
  });
});

describe('a bridge', () => {
  it('only ever goes up', () => {
    // Which is what keeps the eye out of trouble. Raising one strand and
    // dipping the other by half each was symmetric and wrong: the road a ship
    // is actually on would sink into a hole, and a fixed height above a hole is
    // below the flat road beyond it. Driving *under* somebody else's bridge is
    // the common case and now moves nothing at all.
    for (const track of TRACKS) {
      const relief = reliefOf(track);
      for (const [road, heights] of relief.heights) {
        for (const height of heights) {
          expect(height, `${track.name} road ${road} digs`).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('leaves the golden path alone where it is the road being crossed', () => {
    // All three bridged tracks are bridged by a split crossing the main line,
    // so the line the player actually flies should be untouched.
    for (const track of TRACKS) {
      const relief = reliefOf(track);
      for (const crossing of relief.crossings) {
        expect(crossing.under.route, `${track.name}`).toBe(0);
        const under = relief.heights.get(`${crossing.under.sector}:0`) ?? [];
        expect(Math.max(...under, 0)).toBe(0);
      }
    }
  });
});
