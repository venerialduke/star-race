// Drawing the draft.
//
// Not the game's renderer. That one draws a race — ships, wakes, a camera — and
// wants a `Track`, which a draft is not until it closes. This draws a thing
// being built: the road so far, where it has got to, and the hole it has not
// filled yet.

import { poseOfAll, type Pose } from '../sim/section';
import { walkPieces, type Sample } from '../sim/track';
import { PATH_HALF_WIDTH } from '../sim/tuning';
import { closure, piecesOfSector, ringOf, splitPieces, type Draft } from './plan';

const PATH = '#ffd166';
const SPLIT = '#6ee7a8';
const GAP = '#ff5f7a';
const MARK = '#7ee0ff';
const DIM = 'rgba(232, 238, 255, 0.25)';

interface View {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

/** Fit everything drawn into the canvas, with room to breathe. */
function viewOf(points: readonly { x: number; y: number }[], w: number, h: number): View {
  if (points.length === 0) return { scale: 1, x: w / 2, y: h / 2 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const pad = 60;
  const scale = Math.min(
    (w - pad * 2) / Math.max(1, maxX - minX),
    (h - pad * 2) / Math.max(1, maxY - minY),
  );
  return {
    scale,
    x: w / 2 - ((minX + maxX) / 2) * scale,
    y: h / 2 - ((minY + maxY) / 2) * scale,
  };
}

const at = (view: View, p: { x: number; y: number }): { x: number; y: number } => ({
  x: view.x + p.x * view.scale,
  y: view.y + p.y * view.scale,
});

function line(
  ctx: CanvasRenderingContext2D,
  view: View,
  samples: readonly Sample[],
  colour: string,
  width: number,
  dashed = false,
): void {
  if (samples.length < 2) return;
  ctx.beginPath();
  samples.forEach((s, i) => {
    const p = at(view, s.pos);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(1, width * view.scale);
  ctx.setLineDash(dashed ? [6, 6] : []);
  ctx.stroke();
  ctx.setLineDash([]);
}

/** A checkpoint: a gate across the road, numbered. */
function gate(
  ctx: CanvasRenderingContext2D,
  view: View,
  pose: Pose,
  label: string,
  hot: boolean,
): void {
  const n = { x: -Math.sin(pose.heading), y: Math.cos(pose.heading) };
  const reach = PATH_HALF_WIDTH * 1.6;
  const a = at(view, { x: pose.x + n.x * reach, y: pose.y + n.y * reach });
  const b = at(view, { x: pose.x - n.x * reach, y: pose.y - n.y * reach });
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.strokeStyle = hot ? MARK : DIM;
  ctx.lineWidth = hot ? 3 : 2;
  ctx.stroke();
  ctx.fillStyle = hot ? MARK : DIM;
  ctx.font = '600 12px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, a.x, a.y - 8);
}

export function drawDraft(
  ctx: CanvasRenderingContext2D,
  draft: Draft,
  selected: number,
  width: number,
  height: number,
): void {
  ctx.clearRect(0, 0, width, height);

  const ring = ringOf(draft);
  const walks = draft.ring.map((sector, i) => {
    const before = ring.slice(0, i);
    return walkPieces(piecesOfSector(sector), poseOfAll(before));
  });
  const splitWalks = draft.splits.map((split) => {
    const pieces = splitPieces(draft, split);
    const poses = ring.map((_, i) => poseOfAll(ring.slice(0, i)));
    return pieces === undefined
      ? undefined
      : walkPieces(pieces, poses[split.from] ?? { x: 0, y: 0, heading: 0 });
  });

  const all = [
    ...walks.flatMap((w) => w.samples.map((s) => s.pos)),
    ...splitWalks.flatMap((w) => (w === undefined ? [] : w.samples.map((s) => s.pos))),
  ];
  const view = viewOf(all, width, height);

  // The ground the road sits on, so the loop reads as a track and not a wire.
  for (const walk of walks) line(ctx, view, walk.samples, 'rgba(126,224,255,0.10)', PATH_HALF_WIDTH * 2);
  for (const walk of splitWalks) {
    if (walk !== undefined) line(ctx, view, walk.samples, SPLIT, 1.6, true);
  }
  walks.forEach((walk, i) => {
    line(ctx, view, walk.samples, i === selected ? MARK : PATH, i === selected ? 2.6 : 2);
  });

  // The hole, if there is one: from where the road ends back to the line.
  const state = closure(draft);
  const end = poseOfAll(ring);
  if (!state.closed) {
    const a = at(view, end);
    const b = at(view, { x: 0, y: 0 });
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = GAP;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 7]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = GAP;
    ctx.beginPath();
    ctx.arc(a.x, a.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  draft.ring.forEach((_, i) => {
    gate(ctx, view, poseOfAll(ring.slice(0, i)), String(i + 1), i === selected);
  });
}
