// Canvas drawing. Reads sim state, never writes it.
//
// Two views of one race. The **chase camera** is the race as the player flies
// it — behind and above the ship, the track running away ahead, rivals where
// they actually are. The **map** is the race as a standings sheet: the whole
// loop at once, every ship's place on it, every split. Neither is complete on
// its own, so both are on screen, and which one is big is the player's call.

import type { Track } from '../sim/track';
import { drawChase, newChase, type Chase } from './chase';
import { drawMap } from './map';
import { skyFor, type Sky } from './sky';
import {
  SHIP_COLOURS,
  type FixtureView,
  type Rect,
  type RouteView,
  type ShipView,
} from './view';

export { SHIP_COLOURS, newChase };
export type { FixtureView, Rect, RouteView, ShipView, Chase };

/** How much of the short edge the small view takes. */
const INSET_SHARE = 0.34;
const INSET_MARGIN = 10;
/** The small view never gets smaller than this, or it stops being readable. */
const INSET_MIN = 96;

/** Which view has the canvas, and which is tucked into the corner. */
export type Big = 'chase' | 'map';

/**
 * What the renderer keeps between frames. The camera has to lag the ship to
 * look like a camera rather than a bolt, and the sky is built once per track —
 * neither is state the simulation has or wants.
 */
export interface Scene {
  readonly chase: Chase;
  sky: Sky | undefined;
  skyFor: string;
  big: Big;
}

export const newScene = (): Scene => ({
  chase: newChase(),
  sky: undefined,
  skyFor: '',
  big: 'chase',
});

/** Where the small view sits. Exported so a tap on it can be recognised. */
export function insetRect(width: number, height: number): Rect {
  const size = Math.max(INSET_MIN, Math.min(width, height) * INSET_SHARE);
  return { x: width - size - INSET_MARGIN, y: INSET_MARGIN, width: size, height: size };
}

export function drawField(
  ctx: CanvasRenderingContext2D,
  track: Track,
  ships: readonly ShipView[],
  routes: RouteView,
  fixtures: readonly FixtureView[],
  scene: Scene,
  /** Wall-clock seconds since the last frame, so the camera eases by time. */
  seconds: number,
  width: number,
  height: number,
): void {
  if (scene.skyFor !== track.name) {
    scene.sky = skyFor(track);
    scene.skyFor = track.name;
    scene.chase.settled = false;
  }
  const sky = scene.sky;
  if (sky === undefined) return;

  const inset = insetRect(width, height);

  if (scene.big === 'chase') {
    drawChase(
      ctx,
      track,
      ships,
      routes,
      fixtures,
      sky,
      scene.chase,
      seconds,
      width,
      height,
    );
    drawMap(ctx, track, ships, routes, fixtures, inset);
  } else {
    drawMap(ctx, track, ships, routes, fixtures, { x: 0, y: 0, width, height });
    // The chase camera keeps running while it is small, so swapping back to it
    // picks up where the race is rather than snapping from where it was left.
    ctx.save();
    ctx.beginPath();
    ctx.rect(inset.x, inset.y, inset.width, inset.height);
    ctx.clip();
    ctx.translate(inset.x, inset.y);
    drawChase(
      ctx,
      track,
      ships,
      routes,
      fixtures,
      sky,
      scene.chase,
      seconds,
      inset.width,
      inset.height,
    );
    ctx.restore();
  }

  // Named once, on the canvas — not inside whichever view happens to be big.
  ctx.fillStyle = 'rgba(232,238,255,0.35)';
  ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${track.name} · ${track.shape}`, 12, 20);

  // A border, so the small view reads as a panel rather than a hole.
  ctx.strokeStyle = 'rgba(232, 238, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(inset.x + 0.5, inset.y + 0.5, inset.width - 1, inset.height - 1);
}
