// Canvas drawing. Reads sim state, never writes it.
//
// The whole course is on screen at once, because the design bet is that the
// player can see the black hole in stage 3 from the start line and plan for it.
// The stage being raced is drawn bright; the rest of the course is dimmed but
// still legible, hazards and all.

import type { RaceState } from '../sim/race';
import { sample, evaluate, type Vec2 } from '../sim/spline';
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

export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
}

/** Map normalised 0..1 coordinates onto the largest centred square. */
function toScreen(p: Vec2, vp: Viewport): Vec2 {
  const side = Math.min(vp.width, vp.height);
  const ox = (vp.width - side) / 2;
  const oy = (vp.height - side) / 2;
  return { x: ox + p.x * side, y: oy + p.y * side };
}

/** Where a distance along the course sits on screen. */
function pointAtDistance(track: Track, distance: number, vp: Viewport): Vec2 {
  return toScreen(evaluate(track.path, splineParamAtTick(track, distance)), vp);
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
function hazardRun(
  track: Track,
  from: number,
  to: number,
  vp: Viewport,
  steps = 12,
): Vec2[] {
  const points: Vec2[] = [];
  for (let i = 0; i <= steps; i++) {
    points.push(pointAtDistance(track, from + ((to - from) * i) / steps, vp));
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

export function draw(ctx: CanvasRenderingContext2D, state: RaceState, vp: Viewport): void {
  const { track } = state;
  const side = Math.min(vp.width, vp.height);

  ctx.save();
  ctx.setTransform(vp.dpr, 0, 0, vp.dpr, 0, 0);

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, vp.width, vp.height);

  // The whole course, dimmed.
  const whole = sample(track.path, 16).map((p) => toScreen(p, vp));
  strokePath(ctx, whole, COLORS.track, 3);

  // The stage being raced, bright, so it is obvious what is in play.
  const stageList = stages(track);
  const current = stageList[Math.min(state.stage, stageList.length - 1)];
  if (current !== undefined) {
    const from = segmentStartTick(track, current.firstSegment);
    strokePath(ctx, hazardRun(track, from, from + current.lengthTicks, vp, 48), COLORS.trackLive, 3);
  }

  // Hazards: the stretch they cover, then a marker at the middle of it.
  track.segments.forEach((segment, index) => {
    const segmentStart = segmentStartTick(track, index);
    segment.hazards.forEach((hazard) => {
      const from = segmentStart + hazard.startTick;
      const to = from + hazard.lengthTicks;
      if (hazard.lengthTicks > 1) {
        ctx.globalAlpha = 0.55;
        strokePath(ctx, hazardRun(track, from, to, vp), HAZARD_COLOR[hazard.kind], 7);
        ctx.globalAlpha = 1;
      }
      drawHazardMarker(ctx, hazard.kind, pointAtDistance(track, (from + to) / 2, vp), side * 0.018);
    });
  });

  // Stage gates: a tick across the course where the race pauses.
  track.gates.forEach((gate) => {
    const at = segmentStartTick(track, gate) + (track.segments[gate]?.lengthTicks ?? 0);
    const here = pointAtDistance(track, at, vp);
    const just = pointAtDistance(track, Math.max(at - 4, 0), vp);
    const dx = here.x - just.x;
    const dy = here.y - just.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = (-dy / length) * side * 0.02;
    const ny = (dx / length) * side * 0.02;
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

  // The ship.
  const ship = pointAtDistance(track, state.distance, vp);
  const radius = Math.max(6, side * 0.014);
  ctx.beginPath();
  ctx.arc(ship.x, ship.y, radius * 2.2, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.shipGlow;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ship.x, ship.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.ship;
  ctx.fill();

  // Shields, while they hold, are a ring around it.
  if (state.shieldPool > 0) {
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, radius * 2.8, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.shields;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.restore();
}
