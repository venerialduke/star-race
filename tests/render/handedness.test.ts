// The two views have to agree about which way a bend goes.
//
// They did not. On the Meridian a left-hand bend went left from behind the ship
// and right on the map, and the map was the one that was wrong: it mapped the
// world's y straight onto the canvas's, and canvas y grows downward while the
// world's grows up. So the whole map was mirrored — which had been true since
// V1 and went unnoticed, because a mirrored track still looks like a plausible
// track. It only shows when you compare it against something.
//
// This compares them, on every bend of every track, against the one thing that
// is not a matter of opinion: the simulation's own `turn`, which is +1 when the
// golden path curves left.

import { describe, expect, it } from 'vitest';
import {
  TRACKS,
  normalOf,
  placeSmooth,
  sampleAt,
  type Track,
} from '../../src/sim/track';
import { eyeFor } from '../../src/render/chase';
import { heightAt, reliefOf } from '../../src/render/height';
import { fitView, project, shipFacing } from '../../src/render/map';
import { lensFor, toEye, toScreen } from '../../src/render/camera';
import type { RouteView, ShipView } from '../../src/render/view';

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

/** Every bend on the golden path, and which way the simulation says it turns. */
function bends(track: Track): { at: number; turn: number }[] {
  const found = [];
  for (let at = 0; at < track.length; at += 9) {
    const here = sampleAt(track, at);
    // Away from the ends of the bend, so the samples either side are in it too.
    if (here.radius <= 0 || here.turn === 0) continue;
    if (sampleAt(track, at + 60).turn !== here.turn) continue;
    found.push({ at, turn: here.turn });
  }
  return found;
}

/**
 * Which way a run of screen points curls, in canvas coordinates.
 *
 * Negative is visually anticlockwise — a left-hand bend — because the y axis
 * points down. This is the whole subject of the suite in one sign.
 */
const curl = (
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
): number => (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);

describe('a bend goes the same way in both views', () => {
  it('curls the way the simulation says, on the map', () => {
    for (const track of TRACKS) {
      const view = fitView(track, 300, 300);
      const found = bends(track);
      expect(found.length, `${track.name} has no bends to check`).toBeGreaterThan(0);
      for (const bend of found) {
        const a = project(view, placeSmooth(track, bend.at, 0).pos);
        const b = project(view, placeSmooth(track, bend.at + 30, 0).pos);
        const c = project(view, placeSmooth(track, bend.at + 60, 0).pos);
        expect(
          Math.sign(curl(a, b, c)),
          `${track.name} at ${bend.at}: the map curls the wrong way`,
        ).toBe(-bend.turn);
      }
    }
  });

  it('curls the way the simulation says, from behind the ship', () => {
    for (const track of TRACKS) {
      const relief = reliefOf(track);
      const lift = (d: number, r: number): number => heightAt(track, relief, d, r);
      for (const bend of bends(track)) {
        const lens = lensFor(
          eyeFor(track, ON_THE_MAIN_LINE, shipAt(bend.at), lift),
          1200,
          700,
        );
        const on = (d: number): { x: number; y: number } => {
          const place = placeSmooth(track, d, 0);
          return toScreen(lens, toEye(lens, place.pos.x, place.pos.y, lift(d, 0)));
        };
        // The road ahead leans toward the side it is turning to.
        const middle = on(bend.at).x;
        const ahead = on(bend.at + 60).x;
        expect(
          Math.sign(ahead - middle),
          `${track.name} at ${bend.at}: the road leans the wrong way`,
        ).toBe(-bend.turn);
      }
    }
  });

  it('puts left of travel on the left of the screen', () => {
    // The rule the chase camera is built on, and the one the map broke.
    for (const track of TRACKS) {
      const relief = reliefOf(track);
      const lift = (d: number, r: number): number => heightAt(track, relief, d, r);
      for (let at = 0; at < track.length; at += 60) {
        const lens = lensFor(eyeFor(track, ON_THE_MAIN_LINE, shipAt(at), lift), 1200, 700);
        const place = placeSmooth(track, at, 0);
        const n = normalOf(sampleAt(track, at));
        const middle = toScreen(lens, toEye(lens, place.pos.x, place.pos.y, 0));
        const left = toScreen(
          lens,
          toEye(lens, place.pos.x + n.x * 8, place.pos.y + n.y * 8, 0),
        );
        expect(left.x, `${track.name} at ${at}`).toBeLessThan(middle.x);
      }
    }
  });
});

describe('the ship on the map', () => {
  /**
   * Which way it is actually travelling on screen: the angle between where it
   * is drawn now and where it is drawn a moment later.
   */
  const movingTowards = (
    view: ReturnType<typeof fitView>,
    track: Track,
    at: number,
  ): number => {
    const now = project(view, placeSmooth(track, at, 0).pos);
    const soon = project(view, placeSmooth(track, at + 4, 0).pos);
    return Math.atan2(soon.y - now.y, soon.x - now.x);
  };

  /** The smaller angle between two headings, in radians. */
  const apart = (a: number, b: number): number => {
    const tau = Math.PI * 2;
    const d = Math.abs(((a - b) % tau) + tau) % tau;
    return Math.min(d, tau - d);
  };

  it('points the way it is going, not the way it came', () => {
    // The map used to hand a *world* heading to `ctx.rotate`, which turns the
    // other way, with a `- π/2` bolted on for the rotated case. That was wrong
    // twice and the two wrongs cancelled against a projection that was itself
    // mirrored. Fixing the projection left the marker pointing backwards.
    for (const track of TRACKS) {
      for (const size of [
        [300, 300],
        [420, 200],
        [200, 420],
      ] as [number, number][]) {
        const view = fitView(track, size[0], size[1]);
        for (let at = 0; at < track.length; at += 17) {
          const here = placeSmooth(track, at, 0);
          const off = apart(shipFacing(view, here, 0), movingTowards(view, track, at));
          expect(
            off,
            `${track.name} at ${at} on a ${size[0]}x${size[1]} panel (rotate=${view.rotate}): ` +
              `the marker is ${((off * 180) / Math.PI).toFixed(0)}° off its travel`,
          ).toBeLessThan(0.2);
        }
      }
    }
  });

  it('points the same way whatever side of the path it has been thrown to', () => {
    // A ship out at the corridor wall is still going the same way.
    const track = TRACKS[0] as Track;
    const view = fitView(track, 300, 300);
    for (let at = 0; at < track.length; at += 31) {
      const here = placeSmooth(track, at, 0);
      const middle = shipFacing(view, here, 0);
      for (const out of [-20, 20]) {
        expect(apart(shipFacing(view, here, out), middle)).toBeLessThan(0.05);
      }
    }
  });
});
