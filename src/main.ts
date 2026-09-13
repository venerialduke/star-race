// Fixed timestep: wall-clock time in, whole ticks out. The only place where
// real time and the simulation meet, and the only place that knows which phase
// of a heat we are in.

import { drawField } from './render/draw';
import { botPlan, makeBot } from './sim/bot';
import {
  leavePit,
  startField,
  stepField,
  type Entrant,
  type FieldConfig,
  type FieldState,
} from './sim/field';
import type { CornerPlan } from './sim/race';
import { seedFrom } from './sim/rng';
import { LAPS_PER_HEAT, TICK_HZ } from './sim/tuning';
import { mountControls } from './ui/controls';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
const panel = document.getElementById('panel') as HTMLElement;

let field: FieldState;
let config: FieldConfig;
let entrants: readonly Entrant[];

const controls = mountControls(
  panel,
  () => {
    // Leaving the pit: every ship's plan for the next lap, chosen now.
    field = leavePit(field, plansFor(field.lap + 1));
  },
  () => startHeat(),
);

/** The player's ship, as it stands when a heat begins. */
const playerEntrant = (): Entrant => ({
  id: 'player',
  name: 'You',
  stats: { thrust: controls.settings.thrust, handling: controls.settings.handling },
  isPlayer: true,
});

/** Every ship's plan for a lap, decided before the lap that consumes it. */
function plansFor(lap: number): CornerPlan[] {
  return entrants.map((entrant) =>
    entrant.isPlayer ? controls.settings.plan : botPlan(entrant, config.seed, lap),
  );
}

function startHeat(): void {
  const track = controls.settings.track;
  const seed = seedFrom(controls.settings.seed);
  config = { track, laps: LAPS_PER_HEAT, seed };
  entrants = [playerEntrant(), makeBot(track, seed, 1), makeBot(track, seed, 2)];
  field = startField(entrants, plansFor(0));
}

startHeat();

let sized = { width: 0, height: 0 };

/**
 * Match the backing store to the canvas. Checked every frame rather than only
 * on a window resize, because the panel changes height on its own — the
 * tracking bar grows a lane — and a stale size draws the track off the screen.
 */
function resize(width: number, height: number): void {
  if (width === sized.width && height === sized.height) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  sized = { width, height };
}

const MS_PER_TICK = 1000 / TICK_HZ;
/** Never simulate more than this in one frame: a backgrounded tab must not catch up violently. */
const MAX_TICKS_PER_FRAME = 8;

let previous = performance.now();
let accumulator = 0;

function frame(now: number): void {
  accumulator += now - previous;
  previous = now;

  let ticks = 0;
  while (accumulator >= MS_PER_TICK && ticks < MAX_TICKS_PER_FRAME) {
    field = stepField(field, config);
    accumulator -= MS_PER_TICK;
    ticks += 1;
  }
  if (accumulator > MS_PER_TICK * MAX_TICKS_PER_FRAME) accumulator = 0;

  const rect = canvas.getBoundingClientRect();
  resize(rect.width, rect.height);
  drawField(ctx, config.track, field.ships, rect.width, rect.height);
  controls.update(field, config.track);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
