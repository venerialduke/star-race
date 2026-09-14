// What is behind the track.
//
// Parallax is the whole job here: the point of a background is to tell you
// that you are moving and turning, and it only does that if its layers move by
// different amounts. So there are three, and they differ in the one way that
// matters — how far away they are.
//
//   stars    infinitely far. They turn with the camera and never slide.
//   bodies   thousands of units out. They slide, slowly, over a lap.
//   dust     a few hundred units out. It slides fast enough to read as speed.
//
// There is no ground here and no sky: the track is a ribbon hung in space, so
// the stars go all the way round and the horizon is only where the ribbon
// stops, not a line anything is drawn against.
//
// Every one of them is placed from a seed made of the track's name, so a track
// keeps its own sky from one heat to the next and two tracks never share one.

import { makeRng, seedFrom } from '../sim/rng';
import type { Track } from '../sim/track';
import { NEAR, toEye, toScreen, type Lens } from './camera';

/** A point of light at no distance at all: a direction, and nothing more. */
interface Star {
  readonly azimuth: number;
  readonly elevation: number;
  readonly size: number;
  readonly glow: number;
}

/** Something with a position, far enough away to drift rather than pass. */
interface Body {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly radius: number;
  readonly colour: string;
  readonly ring: boolean;
}

export interface Sky {
  readonly stars: readonly Star[];
  readonly nebulae: readonly Body[];
  readonly bodies: readonly Body[];
  readonly dust: readonly Body[];
}

const STARS = 520;
const NEBULAE = 6;
const BODIES = 5;
const DUST = 90;

/** How far out the drifting layers sit. Far things drift slowly; that is the effect. */
const NEBULA_NEAR = 7000;
const NEBULA_FAR = 20000;
const BODY_NEAR = 2600;
const BODY_FAR = 9000;
const DUST_NEAR = 260;
const DUST_FAR = 900;

const PALETTE = ['#7ee0ff', '#b48cff', '#ffd166', '#ff7a6b', '#8fd8b0'] as const;

/** Build a track's sky. Deterministic, so it is the same sky every heat. */
export function skyFor(track: Track): Sky {
  const rng = makeRng(seedFrom(`sky:${track.name}`));

  const stars: Star[] = [];
  for (let i = 0; i < STARS; i += 1) {
    stars.push({
      azimuth: rng.unitInterval() * Math.PI * 2,
      // All the way round, above and below: there is nothing under the track.
      elevation: (rng.unitInterval() - 0.5) * Math.PI,
      size: 0.6 + rng.unitInterval() * 1.9,
      glow: 0.25 + rng.unitInterval() * 0.75,
    });
  }

  const middle = {
    x: (track.bounds.min.x + track.bounds.max.x) / 2,
    y: (track.bounds.min.y + track.bounds.max.y) / 2,
  };

  const ringOut = (count: number, near: number, far: number, size: number): Body[] => {
    const out: Body[] = [];
    for (let i = 0; i < count; i += 1) {
      const angle = rng.unitInterval() * Math.PI * 2;
      const away = near + rng.unitInterval() * (far - near);
      out.push({
        x: middle.x + Math.cos(angle) * away,
        y: middle.y + Math.sin(angle) * away,
        // Well above the plane, so they sit in the sky rather than on the track.
        z: away * (0.04 + rng.unitInterval() * 0.36),
        radius: away * size * (0.5 + rng.unitInterval()),
        colour: PALETTE[Math.floor(rng.unitInterval() * PALETTE.length)] as string,
        ring: rng.unitInterval() < 0.3,
      });
    }
    return out;
  };

  return {
    stars,
    // Furthest of all, and the only layer with any size to it: a wash of
    // colour that barely moves, which is what gives the near layers something
    // to move against.
    nebulae: ringOut(NEBULAE, NEBULA_NEAR, NEBULA_FAR, 0.16),
    bodies: ringOut(BODIES, BODY_NEAR, BODY_FAR, 0.055),
    dust: ringOut(DUST, DUST_NEAR, DUST_FAR, 0.0016),
  };
}

/**
 * Paint the sky. Everything here is drawn before the track, and nothing here
 * is clipped against the ground — the horizon is where the track's own colour
 * takes over, not a line anything is cut against.
 */
export function drawSky(ctx: CanvasRenderingContext2D, lens: Lens, sky: Sky): void {
  const { width, height } = lens;

  // Flat, and the same above and below: the ribbon is the only thing here.
  ctx.fillStyle = '#050a18';
  ctx.fillRect(0, 0, width, height);

  for (const cloud of sky.nebulae) drawNebula(ctx, lens, cloud);
  drawStars(ctx, lens, sky.stars);

  for (const body of sky.bodies) drawBody(ctx, lens, body, 1);
  for (const mote of sky.dust) drawBody(ctx, lens, mote, 0.5);
}

/**
 * Stars are directions, not places, so they are projected through the camera's
 * rotation alone. Turn and they sweep across; fly a whole lap and they do not
 * move at all, which is exactly what being that far away looks like.
 */
function drawStars(
  ctx: CanvasRenderingContext2D,
  lens: Lens,
  stars: readonly Star[],
): void {
  const { camera } = lens;
  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const cp = Math.cos(camera.pitch);
  const sp = Math.sin(camera.pitch);

  for (const star of stars) {
    const ce = Math.cos(star.elevation);
    const dx = ce * Math.cos(star.azimuth);
    const dy = ce * Math.sin(star.azimuth);
    const dz = Math.sin(star.elevation);

    const forward = dx * cosYaw + dy * sinYaw;
    const right = dx * sinYaw - dy * cosYaw;
    const depth = forward * cp - dz * sp;
    if (depth <= 0.05) continue;
    const up = forward * sp + dz * cp;

    const scale = lens.focal / depth;
    const x = lens.width / 2 + right * scale;
    const y = lens.height / 2 - up * scale;
    if (x < -20 || x > lens.width + 20 || y < -20 || y > lens.height + 20) continue;

    ctx.globalAlpha = star.glow * Math.min(1, depth * 1.6);
    ctx.fillStyle = '#e8eeff';
    ctx.fillRect(x, y, star.size, star.size);
  }
  ctx.globalAlpha = 1;
}

/** One far thing, drawn flat: a disc, and sometimes a ring to tell it apart. */
function drawBody(
  ctx: CanvasRenderingContext2D,
  lens: Lens,
  body: Body,
  alpha: number,
): void {
  const eye = toEye(lens, body.x, body.y, body.z);
  if (eye.depth <= NEAR) return;
  const p = toScreen(lens, eye);
  const r = (body.radius * lens.focal) / eye.depth;
  if (r < 0.4) return;
  if (p.x + r < 0 || p.x - r > lens.width || p.y + r < 0 || p.y - r > lens.height) return;

  ctx.globalAlpha = alpha * (r > 3 ? 0.5 : 0.75);
  ctx.fillStyle = body.colour;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();

  if (body.ring && r > 4) {
    ctx.globalAlpha = alpha * 0.35;
    ctx.strokeStyle = body.colour;
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * 1.9, r * 0.42, 0.4, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** A cloud: a soft wash with no edge, so it reads as distance rather than as an object. */
function drawNebula(ctx: CanvasRenderingContext2D, lens: Lens, cloud: Body): void {
  const eye = toEye(lens, cloud.x, cloud.y, cloud.z);
  if (eye.depth <= NEAR) return;
  const p = toScreen(lens, eye);
  const r = (cloud.radius * lens.focal) / eye.depth;
  if (r < 8) return;
  if (p.x + r < 0 || p.x - r > lens.width || p.y + r < 0 || p.y - r > lens.height) return;

  const wash = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
  wash.addColorStop(0, withAlpha(cloud.colour, 0.2));
  wash.addColorStop(0.5, withAlpha(cloud.colour, 0.08));
  wash.addColorStop(1, withAlpha(cloud.colour, 0));
  ctx.fillStyle = wash;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** A hex colour at an alpha. */
function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
