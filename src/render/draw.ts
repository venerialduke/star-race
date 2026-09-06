// Canvas drawing. Reads sim state, never writes it.

import { type DemoState, TRACK, position } from '../sim/demo';
import { sample, type Vec2 } from '../sim/spline';

const COLORS = {
  bg: '#101c36',
  track: '#e9e4d6',
  dot: '#f2a93b',
  glow: 'rgba(242, 169, 59, 0.35)',
  text: '#b9b7ae',
} as const;

const TRACK_POLYLINE: readonly Vec2[] = sample(TRACK, 16);

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

export function draw(
  ctx: CanvasRenderingContext2D,
  state: DemoState,
  vp: Viewport,
): void {
  ctx.save();
  ctx.setTransform(vp.dpr, 0, 0, vp.dpr, 0, 0);

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, vp.width, vp.height);

  // Track
  ctx.beginPath();
  TRACK_POLYLINE.forEach((p, i) => {
    const s = toScreen(p, vp);
    if (i === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  });
  ctx.strokeStyle = COLORS.track;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Dot
  const dot = toScreen(position(state), vp);
  const r = Math.max(6, Math.min(vp.width, vp.height) * 0.014);
  ctx.beginPath();
  ctx.arc(dot.x, dot.y, r * 2.2, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.glow;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(dot.x, dot.y, r, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.dot;
  ctx.fill();

  // Tick counter, so a frozen page is distinguishable from a slow one.
  ctx.fillStyle = COLORS.text;
  ctx.font = '12px ui-monospace, Menlo, Consolas, monospace';
  ctx.textBaseline = 'top';
  ctx.fillText(`tick ${state.tick}`, 12, 12);

  ctx.restore();
}
