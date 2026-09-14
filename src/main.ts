// Where real time meets the game, and the only place that knows which screen
// the player is looking at.
//
// A **segment** — the stretch between two decision points, today one lap — is
// computed in full before any of it is shown. Wall-clock time then advances a
// playback cursor through that film. The simulation takes no input during a
// segment, so this is the same race either way; what it buys is that the
// result exists before the playback does, and that a heat could as easily be
// resolved somewhere else and watched here.
//
// Two screens: the **race**, which is playback, and the **garage**, which is
// every decision. You can open the garage while a segment plays, but nothing
// you buy or fit reaches the ship until the next decision point — the segment
// on screen was settled before you opened it.

import { drawField, type ShipView } from './render/draw';
import { botPlan, makeBot } from './sim/bot';
import { finishRace, newGarage, type Garage } from './sim/garage';
import { leavePit, startField, type Entrant, type FieldConfig } from './sim/field';
import type { CornerPlan } from './sim/race';
import { seedFrom } from './sim/rng';
import { recordSegment, wakeAt, swingsBy, type Segment } from './sim/segment';
import { carryCondition, resolveBuild } from './sim/ship';
import { LAPS_PER_HEAT, TICK_HZ } from './sim/tuning';
import { mountBoard } from './ui/board';
import { mountControls } from './ui/controls';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
const panel = document.getElementById('panel') as HTMLElement;

/** How many frames of film the wake is drawn from. */
const WAKE = 60;

let garage: Garage = newGarage();
let config: FieldConfig;
let entrants: readonly Entrant[];

/** The segment being played, and how far through it we are. */
let segment: Segment | undefined;
let cursor = 0;
/** Set once a finished heat has been paid for, so it pays only once. */
let paid = false;

const controls = mountControls(panel, {
  onGo: () => nextSegment(),
  onNewHeat: () => startHeat(),
  onSkip: () => {
    if (segment !== undefined) cursor = segment.ticks - 1;
  },
});

const board = mountBoard(
  controls.boardSlot,
  () => garage,
  (next) => {
    garage = next;
    board.render(garage);
  },
);

/** The player's ship as the garage has it, carrying whatever damage it has. */
function playerEntrant(): Entrant {
  return {
    id: 'player',
    name: 'You',
    stats: resolveBuild(garage.fitted),
    build: garage.fitted,
    isPlayer: true,
  };
}

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
  segment = undefined;
  cursor = 0;
  paid = false;
  controls.toGarage();
  board.render(garage);
}

/**
 * Compute and start the next segment. The player's ship is rebuilt from the
 * garage here and nowhere else, which is what makes a purchase mid-playback
 * land on the next lap rather than this one — and its damage is carried onto
 * the parts it still has.
 */
function nextSegment(): void {
  const previous = segment;
  const before = entrants.find((e) => e.isPlayer)?.build ?? [];
  const player = playerEntrant();
  entrants = entrants.map((entrant) => (entrant.isPlayer ? player : entrant));

  if (previous === undefined) {
    segment = recordSegment(startField(entrants, plansFor(0)), config);
  } else {
    const carried = leavePit(previous.end, plansFor(previous.end.lap + 1));
    const ships = carried.ships.map((ship) =>
      ship.entrant.isPlayer
        ? {
            ...ship,
            entrant: player,
            state: {
              ...ship.state,
              condition: carryCondition(before, ship.state.condition, player.build ?? []),
              stats: player.stats,
              shields: player.stats.shields,
            },
          }
        : ship,
    );
    segment = recordSegment({ ...carried, ships }, config);
  }
  cursor = 0;
  controls.toRace();
}

startHeat();

let sized = { width: 0, height: 0 };

/** Match the backing store to the canvas, which changes height with the screen. */
function resize(width: number, height: number): void {
  if (width === sized.width && height === sized.height) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  sized = { width, height };
}

const MS_PER_TICK = 1000 / TICK_HZ;
/** Never advance more than this in one frame: a backgrounded tab must not lurch. */
const MAX_TICKS_PER_FRAME = 8;

let previousTime = performance.now();
let accumulator = 0;

/** What the renderer draws: the film at the cursor, not the simulation. */
function views(): readonly ShipView[] {
  if (segment === undefined) return [];
  return segment.frames.map((_, ship) => {
    const wake = wakeAt(segment as Segment, ship, cursor, WAKE);
    const now = wake[wake.length - 1];
    return {
      distance: now?.distance ?? 0,
      offset: now?.offset ?? 0,
      wide: now?.wide ?? false,
      isPlayer: entrants[ship]?.isPlayer ?? false,
      wake,
      swings: swingsBy(segment as Segment, ship, cursor),
    };
  });
}

function frame(now: number): void {
  accumulator += now - previousTime;
  previousTime = now;

  const playing = segment !== undefined && cursor < segment.ticks - 1;
  if (playing) {
    let ticks = 0;
    while (accumulator >= MS_PER_TICK && ticks < MAX_TICKS_PER_FRAME) {
      cursor += 1;
      accumulator -= MS_PER_TICK;
      ticks += 1;
    }
  }
  if (accumulator > MS_PER_TICK * MAX_TICKS_PER_FRAME) accumulator = 0;

  // The segment has played out: its end is the decision point.
  const film = segment;
  const atRest = film !== undefined && cursor >= film.ticks - 1;
  if (atRest && film.end.phase === 'done' && !paid) {
    garage = finishRace(garage);
    paid = true;
    board.render(garage);
  }

  const rect = canvas.getBoundingClientRect();
  resize(rect.width, rect.height);
  drawField(ctx, config.track, views(), rect.width, rect.height);
  controls.update({
    field: segment?.end,
    live: segment === undefined ? undefined : { segment, cursor },
    settled: atRest,
  });
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
