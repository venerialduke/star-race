// Canvas drawing. Reads sim state, never writes it.
//
// The whole course is on screen at once, because the design bet is that the
// player can see the black hole in stage 3 from the start line and plan for it.
// The stage being raced is drawn bright; the rest of the course is dimmed but
// still legible, hazards and all.

import type { Field, ShipId } from '../sim/field';
import type { RaceState } from '../sim/race';
import { sample, evaluate, type Vec2 } from '../sim/spline';
import { fitTrack, laneShift, project, type Fit, type Viewport } from './project';
import {
  segmentStartTick,
  splineParamAtTick,
  stages,
  type HazardKind,
  type Track,
} from '../sim/track';

const COLORS = {
  bg: '#101c36',
  track: '#3d4c6d',
  trackLive: '#e9e4d6',
  gate: '#8ea2c8',
  ship: '#f2a93b',
  shipGlow: 'rgba(242, 169, 59, 0.35)',
  shields: '#63d2ff',
  lost: '#5b6480',
  text: '#b9b7ae',
  asteroidField: '#b0785a',
  gammaBurst: '#e8e45c',
  blackHole: '#c56be0',
  ringedPlanet: '#6fd08c',
} as const;

const HAZARD_COLOR: Readonly<Record<HazardKind, string>> = {
  asteroidField: COLORS.asteroidField,
  gammaBurst: COLORS.gammaBurst,
  blackHole: COLORS.blackHole,
  ringedPlanet: COLORS.ringedPlanet,
};

/** A colour each, so three dots on one line are three ships. */
const SHIP_COLOR: Readonly<Record<ShipId, string>> = {
  player: '#f2a93b',
  redline: '#e2685f',
  bulwark: '#9aa8ff',
};

export type { Viewport } from './project';

/** Where a distance along the course sits on screen. */
function pointAtDistance(track: Track, distance: number, fit: Fit): Vec2 {
  return project(evaluate(track.path, splineParamAtTick(track, distance)), fit);
}

function strokePath(
  ctx: CanvasRenderingContext2D,
  points: readonly Vec2[],
  color: string,
  width: number,
): void {
  if (points.length < 2) return;
  ctx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** The stretch of course a hazard covers, as screen points. */
function hazardRun(track: Track, from: number, to: number, fit: Fit, steps = 12): Vec2[] {
  const points: Vec2[] = [];
  for (let i = 0; i <= steps; i++) {
    points.push(pointAtDistance(track, from + ((to - from) * i) / steps, fit));
  }
  return points;
}

function drawHazardMarker(
  ctx: CanvasRenderingContext2D,
  kind: HazardKind,
  at: Vec2,
  radius: number,
): void {
  ctx.fillStyle = HAZARD_COLOR[kind];
  ctx.strokeStyle = HAZARD_COLOR[kind];
  ctx.lineWidth = 2;

  switch (kind) {
    case 'asteroidField': {
      // A scatter of rocks, laid out the same way every frame.
      const offsets: readonly Vec2[] = [
        { x: -0.7, y: -0.4 },
        { x: 0.5, y: -0.7 },
        { x: 0.2, y: 0.6 },
        { x: -0.4, y: 0.5 },
      ];
      offsets.forEach((o) => {
        ctx.beginPath();
        ctx.arc(at.x + o.x * radius, at.y + o.y * radius, radius * 0.32, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }
    case 'gammaBurst': {
      // A star: the one hazard that happens at a point rather than over a run.
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const reach = i % 2 === 0 ? radius * 1.4 : radius * 0.5;
        const x = at.x + Math.cos(angle) * reach;
        const y = at.y + Math.sin(angle) * reach;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'blackHole': {
      ctx.beginPath();
      ctx.arc(at.x, at.y, radius * 0.75, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.bg;
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(at.x, at.y, radius * 1.3, 0, Math.PI * 2);
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case 'ringedPlanet': {
      ctx.beginPath();
      ctx.arc(at.x, at.y, radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(at.x, at.y, radius * 1.5, radius * 0.5, -0.4, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
  }
}

/** The course itself: the line, the hazards on it, and the gates. */
function drawCourse(
  ctx: CanvasRenderingContext2D,
  state: RaceState,
  vp: Viewport,
  fit: Fit,
  unit: number,
): void {
  const { track } = state;

  ctx.save();
  ctx.setTransform(vp.dpr, 0, 0, vp.dpr, 0, 0);

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, vp.width, vp.height);

  // The whole course, dimmed.
  const whole = sample(track.path, 16).map((p) => project(p, fit));
  strokePath(ctx, whole, COLORS.track, 3);

  // The stage being raced, bright, so it is obvious what is in play.
  const stageList = stages(track);
  const current = stageList[Math.min(state.stage, stageList.length - 1)];
  if (current !== undefined) {
    const from = segmentStartTick(track, current.firstSegment);
    strokePath(
      ctx,
      hazardRun(track, from, from + current.lengthTicks, fit, 48),
      COLORS.trackLive,
      3,
    );
  }

  // Hazards: the stretch they cover, then a marker at the middle of it.
  track.segments.forEach((segment, index) => {
    const segmentStart = segmentStartTick(track, index);
    segment.hazards.forEach((hazard) => {
      const from = segmentStart + hazard.startTick;
      const to = from + hazard.lengthTicks;
      if (hazard.lengthTicks > 1) {
        ctx.globalAlpha = 0.55;
        strokePath(ctx, hazardRun(track, from, to, fit), HAZARD_COLOR[hazard.kind], 7);
        ctx.globalAlpha = 1;
      }
      drawHazardMarker(
        ctx,
        hazard.kind,
        pointAtDistance(track, (from + to) / 2, fit),
        unit * 0.022,
      );
    });
  });

  // Stage gates: a tick across the course where the race pauses.
  track.gates.forEach((gate) => {
    const at = segmentStartTick(track, gate) + (track.segments[gate]?.lengthTicks ?? 0);
    const here = pointAtDistance(track, at, fit);
    const just = pointAtDistance(track, Math.max(at - 4, 0), fit);
    const dx = here.x - just.x;
    const dy = here.y - just.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = (-dy / length) * unit * 0.025;
    const ny = (dx / length) * unit * 0.025;
    strokePath(
      ctx,
      [
        { x: here.x + nx, y: here.y + ny },
        { x: here.x - nx, y: here.y - ny },
      ],
      COLORS.gate,
      3,
    );
  });

  ctx.restore();
}

/**
 * Where a ship sits when it is one of several on the same line. Ships do not
 * touch in the simulation, so lanes are only here to stop three dots covering
 * each other up: each one is nudged across the track, the player down the
 * middle.
 */
function laneOffset(track: Track, distance: number, lane: number, fit: Fit, unit: number): Vec2 {
  return laneShift(
    pointAtDistance(track, distance, fit),
    pointAtDistance(track, Math.max(distance - 4, 0), fit),
    lane,
    unit,
  );
}

/** One ship: a dot, a glow if it is the player's, a ring if its shields are up. */
function drawShip(
  ctx: CanvasRenderingContext2D,
  track: Track,
  state: RaceState,
  id: ShipId,
  lane: number,
  fit: Fit,
  unit: number,
): void {
  const at = laneOffset(track, state.distance, lane, fit, unit);
  const radius = Math.max(5, unit * (id === 'player' ? 0.018 : 0.014));
  const lost = state.destroyed;

  if (id === 'player' && !lost) {
    ctx.beginPath();
    ctx.arc(at.x, at.y, radius * 2.2, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.shipGlow;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(at.x, at.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = lost ? COLORS.lost : SHIP_COLOR[id];
  ctx.fill();

  // A lost ship is drawn as a hollow wreck rather than removed, so the player
  // can see where a rival went.
  if (lost) {
    ctx.beginPath();
    ctx.arc(at.x, at.y, radius * 1.6, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.lost;
    ctx.lineWidth = 2;
    ctx.stroke();
    return;
  }

  if (state.shieldPool > 0) {
    ctx.beginPath();
    ctx.arc(at.x, at.y, radius * 2.8, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.shields;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

/**
 * Draw a whole field: the course once, then every ship on it. The player is
 * drawn last so they are never hidden under a rival.
 */
export function drawField(
  ctx: CanvasRenderingContext2D,
  field: Field,
  vp: Viewport,
): void {
  const player = field.racers.find((racer) => racer.id === 'player') ?? field.racers[0];
  if (player === undefined) return;

  const fit = fitTrack(player.state.track.path, vp);
  const unit = fit.scale;
  drawCourse(ctx, player.state, vp, fit, unit);

  ctx.save();
  ctx.setTransform(vp.dpr, 0, 0, vp.dpr, 0, 0);
  // Rivals take the outside lanes, the player the middle one.
  let lane = 1;
  field.racers.forEach((racer) => {
    if (racer.id === 'player') return;
    drawShip(ctx, player.state.track, racer.state, racer.id, lane, fit, unit);
    lane = lane > 0 ? -lane : -lane + 1;
  });
  drawShip(ctx, player.state.track, player.state, 'player', 0, fit, unit);
  ctx.restore();
}
