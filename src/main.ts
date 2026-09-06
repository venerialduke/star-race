// Wires the browser to the sim: fixed timestep in, canvas frames out.
//
// The sim advances in whole ticks and knows nothing about frames, wall-clock
// time or the DOM. This file is the only place the two meet, and the only place
// that decides which screen the player is looking at.
//
// A stage is flown live, tick by tick, and every tap is recorded as it lands.
// When the ship crosses the line the run replays that same stage from the same
// seed and the same taps through `runStage`, which is what actually advances the
// run. The live race is the picture; the replay is the record. They agree
// because they are the same code with the same inputs.

import type { ActiveId } from './sim/actives';
import { stepRace, type PlayerInput, type RaceState } from './sim/race';
import { choosePart, runStage, startRun, startStageRace, type Run } from './sim/run';
import type { Part } from './sim/ship';
import { SLICE_TRACK } from './sim/track';
import { TICK_RATE } from './sim/tuning';
import { draw, type Viewport } from './render/draw';
import { createHud } from './ui/hud';
import { createGarage } from './ui/garage';
import { createResults } from './ui/results';

function getCanvas(): HTMLCanvasElement {
  const el = document.getElementById('game');
  if (!(el instanceof HTMLCanvasElement)) throw new Error('Missing <canvas id="game">');
  return el;
}

function getContext(el: HTMLCanvasElement): CanvasRenderingContext2D {
  const c = el.getContext('2d');
  if (c === null) throw new Error('Canvas 2D context unavailable');
  return c;
}

const canvas: HTMLCanvasElement = getCanvas();
const ctx: CanvasRenderingContext2D = getContext(canvas);

let viewport: Viewport = { width: 0, height: 0, dpr: 1 };

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  viewport = { width, height, dpr };
}
window.addEventListener('resize', resize);
resize();

const garage = createGarage(document.body);
const results = createResults(document.body);
const hud = createHud(document.body, (active) => tap(active));

let run: Run = startRun(SLICE_TRACK, Math.floor(Date.now() % 100000));
let race: RaceState | undefined;
/** Taps made this stage, with the tick they landed on. */
let recorded: PlayerInput[] = [];
/** Taps waiting for the next tick to run. */
let pending: ActiveId[] = [];
let finishedAt: number | undefined;

function tap(active: ActiveId): void {
  if (race === undefined || race.over) return;
  pending.push(active);
  recorded.push({ tick: race.tick, active });
}

function openGarage(): void {
  race = undefined;
  hud.setVisible(false);
  results.hide();
  garage.show(run, take);
}

function showResults(): void {
  race = undefined;
  hud.setVisible(false);
  garage.hide();
  results.show(run, () => {
    run = startRun(SLICE_TRACK, run.seed + 1);
    openGarage();
  });
}

function take(part: Part): void {
  run = choosePart(run, part);
  garage.hide();
  hud.setVisible(true);
  recorded = [];
  pending = [];
  finishedAt = undefined;
  race = startStageRace(run);
}

/** The stage is over: replay it into the run, then move on. */
function closeStage(): void {
  run = runStage(run, recorded);
  if (run.phase === 'garage') openGarage();
  else showResults();
}

openGarage();

// Fixed timestep: the sim advances in whole ticks regardless of frame rate.
const TICK_MS = 1000 / TICK_RATE;
// A slow frame must not slow the race down: whatever time passed gets simulated,
// up to a second of it per frame. The cap is only there so that coming back to a
// tab that was hidden for ten minutes does not lock the page up catching up.
const MAX_TICKS_PER_FRAME = TICK_RATE;
const MAX_BACKLOG_MS = TICK_MS * MAX_TICKS_PER_FRAME;
/** How long a finished stage stays on screen before the garage opens. */
const HOLD_AFTER_STAGE_MS = 1400;

let accumulator = 0;
let last = performance.now();

function frame(now: number): void {
  accumulator = Math.min(accumulator + (now - last), MAX_BACKLOG_MS);
  last = now;

  while (accumulator >= TICK_MS) {
    if (race !== undefined && !race.over) {
      stepRace(race, pending);
      pending = [];
    }
    accumulator -= TICK_MS;
  }

  if (race !== undefined) {
    draw(ctx, race, viewport);
    hud.update(race);

    // Hold the finished stage on screen for a beat, then take stock.
    if (race.over) {
      if (finishedAt === undefined) finishedAt = now;
      else if (now - finishedAt > HOLD_AFTER_STAGE_MS) closeStage();
    }
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
