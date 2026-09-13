// Fixed timestep: wall-clock time in, whole ticks out. The only place where
// real time and the simulation meet.

import { drawRace } from './render/draw';
import { seedFrom } from './sim/rng';
import { startRace, stepRace, type RaceConfig, type RaceState } from './sim/race';

import { TICK_HZ } from './sim/tuning';
import { mountControls } from './ui/controls';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
const panel = document.getElementById('panel') as HTMLElement;

let state: RaceState = startRace();

const controls = mountControls(
  panel,
  () => {
    /* settings are read fresh every tick */
  },
  () => {
    state = startRace();
  },
);

const configNow = (): RaceConfig => ({
  track: controls.settings.track,
  stats: { thrust: controls.settings.thrust, handling: controls.settings.handling },
  plan: controls.settings.plan,
  seed: seedFrom(controls.settings.seed),
});

function resize(): void {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}
window.addEventListener('resize', resize);
resize();

const MS_PER_TICK = 1000 / TICK_HZ;
/** Never simulate more than this in one frame: a backgrounded tab must not catch up violently. */
const MAX_TICKS_PER_FRAME = 8;

let previous = performance.now();
let accumulator = 0;

function frame(now: number): void {
  accumulator += now - previous;
  previous = now;

  const config = configNow();
  let ticks = 0;
  while (accumulator >= MS_PER_TICK && ticks < MAX_TICKS_PER_FRAME) {
    state = stepRace(state, config);
    accumulator -= MS_PER_TICK;
    ticks += 1;
  }
  if (accumulator > MS_PER_TICK * MAX_TICKS_PER_FRAME) accumulator = 0;

  const rect = canvas.getBoundingClientRect();
  drawRace(ctx, controls.settings.track, state, rect.width, rect.height);
  controls.update(state);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
