// The game loop: which screen the player is looking at, and when the sim runs.
//
// Everything the browser provides is passed in — the clock, somewhere to draw,
// the seed — so the whole loop can be played through in a test without a canvas
// or a real frame. `main.ts` is the thin piece that supplies the real ones.
//
// A stage is flown live, tick by tick, and every tap is recorded as it lands.
// When the ship crosses the line the run replays that same stage from the same
// seed and the same taps through `runStage`, which is what actually advances the
// run. The live race is the picture; the replay is the record. They agree
// because they are the same code with the same inputs.

import type { ActiveId } from '../sim/actives';
import { stepRace, type PlayerInput, type RaceState } from '../sim/race';
import { choosePart, runStage, startRun, startStageRace, type Run } from '../sim/run';
import type { Part } from '../sim/ship';
import { SLICE_TRACK, type Track } from '../sim/track';
import { COUNTDOWN_TICKS, HOLD_AFTER_STAGE_TICKS, TICK_RATE } from '../sim/tuning';
import { createGarage } from './garage';
import { createHud } from './hud';
import { createResults } from './results';

/** What the player is looking at. */
export type Screen = 'garage' | 'countdown' | 'racing' | 'held' | 'results';

export interface GameOptions {
  /** Where the screens are attached. */
  readonly root: HTMLElement;
  /** Draw a race. The canvas lives outside the loop. */
  readonly render: (state: RaceState) => void;
  /** The first run's seed. Each later run takes the next one. */
  readonly seed: number;
  readonly track?: Track;
}

export interface Game {
  /** Advance the game to this wall-clock time, in milliseconds. */
  frame(nowMs: number): void;
  /** What the player is looking at, for tests and telemetry. */
  screen(): Screen;
  /** The run as it stands. */
  run(): Run;
  /** The race being flown, if one is. */
  race(): RaceState | undefined;
}

const TICK_MS = 1000 / TICK_RATE;
// A slow frame must not slow the race down: whatever time passed gets simulated,
// up to a second of it per frame. The cap is only there so that coming back to a
// tab that was hidden for ten minutes does not lock the page up catching up.
const MAX_BACKLOG_MS = TICK_MS * TICK_RATE;

export function createGame(options: GameOptions): Game {
  const track = options.track ?? SLICE_TRACK;
  const garage = createGarage(options.root);
  const results = createResults(options.root);
  const hud = createHud(options.root, (active) => tap(active));

  let run: Run = startRun(track, options.seed);
  let race: RaceState | undefined;
  let screen: Screen = 'garage';
  /** Ticks left before the ship launches, or before the garage opens again. */
  let waiting = 0;
  /** Taps made this stage, with the tick they landed on. */
  let recorded: PlayerInput[] = [];
  /** Taps waiting for the next tick to run. */
  let pending: ActiveId[] = [];
  let accumulator = 0;
  let last: number | undefined;

  function tap(active: ActiveId): void {
    // Taps before the flag and after the finish are not taps.
    if (screen !== 'racing' || race === undefined || race.over) return;
    pending.push(active);
    recorded.push({ tick: race.tick, active });
  }

  function openGarage(): void {
    race = undefined;
    screen = 'garage';
    hud.setVisible(false);
    results.hide();
    garage.show(run, take);
  }

  function showResults(): void {
    race = undefined;
    screen = 'results';
    hud.setVisible(false);
    garage.hide();
    results.show(run, () => {
      run = startRun(track, run.seed + 1);
      openGarage();
    });
  }

  /** A part is chosen: line up on the grid and count down. */
  function take(part: Part): void {
    run = choosePart(run, part);
    garage.hide();
    hud.setVisible(true);
    recorded = [];
    pending = [];
    race = startStageRace(run);
    screen = 'countdown';
    waiting = COUNTDOWN_TICKS;
    hud.setMessage(countdownText(waiting));
  }

  /** The stage is over: replay it into the run, then move on. */
  function closeStage(): void {
    run = runStage(run, recorded);
    hud.setMessage(null);
    if (run.phase === 'garage') openGarage();
    else showResults();
  }

  function countdownText(ticksLeft: number): string {
    const secondsLeft = Math.ceil(ticksLeft / TICK_RATE);
    return secondsLeft <= 0 ? 'GO' : String(secondsLeft);
  }

  /** One tick of whatever the player is looking at. */
  function tick(): void {
    switch (screen) {
      case 'countdown': {
        waiting--;
        if (waiting <= 0) {
          screen = 'racing';
          hud.setMessage(null);
        } else {
          hud.setMessage(countdownText(waiting));
        }
        return;
      }
      case 'racing': {
        if (race === undefined) return;
        stepRace(race, pending);
        pending = [];
        if (race.over) {
          // Hold the finished stage on screen for a beat before taking stock.
          screen = 'held';
          waiting = HOLD_AFTER_STAGE_TICKS;
        }
        return;
      }
      case 'held': {
        waiting--;
        if (waiting <= 0) closeStage();
        return;
      }
      default:
        return;
    }
  }

  openGarage();

  return {
    frame(nowMs: number): void {
      if (last === undefined) last = nowMs;
      accumulator = Math.min(accumulator + (nowMs - last), MAX_BACKLOG_MS);
      last = nowMs;

      while (accumulator >= TICK_MS) {
        tick();
        accumulator -= TICK_MS;
      }

      if (race !== undefined) {
        options.render(race);
        hud.update(race);
      }
    },
    screen: () => screen,
    run: () => run,
    race: () => race,
  };
}
