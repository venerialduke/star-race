// Drawing the draft.
//
// Not the game's renderer. That one draws a race — ships, wakes, a camera — and
// wants a `Track`, which a draft is not until it closes. This draws a thing
// being built: the road so far, where it has got to, and the hole it has not
// filled yet.

import { poseOfAll, type Pose } from '../sim/section';
import {
  effectOf,
  resolvePieces,
  walkPieces,
  type Band,
  type Environment,
  type Sample,
} from '../sim/track';
import { PATH_HALF_WIDTH } from '../sim/tuning';
import {
  closure,
  fixturePose,
  ringOf,
  splitPieces,
  type Draft,
} from './plan';

/**
 * What each environment looks like. Colour is the whole of what "drawn first"
 * means: a nebula has to be recognisable before anybody can be asked to decide
 * whether the long way round one is worth it.
 */
const GROUND: Record<Environment, string> = {
  open: 'rgba(126, 224, 255, 0.10)',
  nebula: 'rgba(168, 130, 255, 0.30)',
  debris: 'rgba(255, 150, 90, 0.28)',
  shadow: 'rgba(10, 14, 32, 0.75)',
};

const PATH = '#ffd166';
const SPLIT = '#6ee7a8';
const GAP = '#ff5f7a';
const MARK = '#7ee0ff';
const POCKET = 'rgba(110, 231, 168, 0.55)';
const HAZARD = '#ff9a5a';
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
  // Resolved, so a sector that says "all of this is a nebula" is drawn as one:
  // the picture has to agree with what the sim will read, and the sim reads the
  // resolved pieces.
  const walks = ring.map((sector, i) =>
    walkPieces(resolvePieces(sector), poseOfAll(ring.slice(0, i))),
  );
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

  // The ground the road sits on, so the loop reads as a track and not a wire —
  // and coloured by what it is, which is the whole of "environment is drawn".
  for (const walk of walks) {
    line(ctx, view, walk.samples, GROUND.open, PATH_HALF_WIDTH * 2);
    paint(ctx, view, walk.samples, walk.length, walk.bands);
  }
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

  // Last, so nothing is drawn over the things a ship has to miss.
  for (const fixture of draft.fixtures) {
    const pose = fixturePose(draft, fixture);
    if (pose === undefined) continue;
    mark(ctx, view, pose, fixture.kind === 'mine');
  }
}

/**
 * The stretches that say something about themselves, painted over the ground.
 *
 * Bands are in the line's own distances and samples are evenly spaced along it,
 * so a band becomes a slice of the sample array — which is why the walk's own
 * length is passed in rather than measured again here.
 */
function paint(
  ctx: CanvasRenderingContext2D,
  view: View,
  samples: readonly Sample[],
  length: number,
  bands: readonly Band[],
): void {
  if (length <= 0 || samples.length < 2) return;
  for (const band of bands) {
    const from = Math.floor((band.start / length) * (samples.length - 1));
    const to = Math.ceil((band.end / length) * (samples.length - 1));
    const slice = samples.slice(Math.max(0, from), Math.min(samples.length, to + 1));
    const environment = band.properties.environment ?? 'open';
    line(ctx, view, slice, GROUND[environment], PATH_HALF_WIDTH * 2);
    // Pocket and hazard are numbers rather than places, so they read as an
    // edging on the stretch rather than as ground of their own — a stretch can
    // be a nebula *and* pay, and one colour cannot say both.
    const effect = effectOf(band.properties);
    if (effect.pocket > 0) line(ctx, view, slice, POCKET, PATH_HALF_WIDTH * 0.7, true);
    if (effect.hazard > 0) line(ctx, view, slice, HAZARD, PATH_HALF_WIDTH * 0.35, true);
  }
}

/** A fixture: a ring on the road, filled for a mine and hollow for a hole. */
function mark(
  ctx: CanvasRenderingContext2D,
  view: View,
  pose: Pose,
  filled: boolean,
): void {
  const p = at(view, pose);
  ctx.beginPath();
  ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
  ctx.strokeStyle = HAZARD;
  ctx.lineWidth = 2;
  ctx.stroke();
  if (filled) {
    ctx.fillStyle = HAZARD;
    ctx.fill();
  }
}
