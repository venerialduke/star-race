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
//
// Around both sits a **season**. A heat is no longer the whole game: the
// season says which track you are on and who you are racing, and it is the
// thing that carries credits, points, slots and parts from one heat to the
// next. Only the player's own group is watched — every other group is resolved
// by the same simulation with nobody looking, which is what makes a standings
// table mean anything.

import {
  drawField,
  insetRect,
  newScene,
  type FixtureView,
  type ShipView,
} from './render/draw';
import { grantsOf } from './sim/ability';
import { botOrders } from './sim/bot';
import type { Garage } from './sim/garage';
import {
  leavePit,
  startField,
  type Command,
  type Entrant,
  type FieldConfig,
} from './sim/field';
import { seedFrom } from './sim/rng';
import {
  frameAt,
  frameBetween,
  recordSegment,
  swingsBy,
  wakeAt,
  type Segment,
} from './sim/segment';
import {
  applyCut,
  entrantFor,
  finishesOf,
  heatConfig,
  newSeason,
  nextUp,
  offerSeed,
  playerIsOut,
  racerById,
  resolveHeat,
  settleHeat,
  pacingPay,
  settlePacing,
  type Finish,
  type Season,
} from './sim/season';
import { carryCondition, resolveBuild, type Fitted } from './sim/ship';
import { TICK_HZ } from './sim/tuning';
import { mountBoard } from './ui/board';
import { mountControls } from './ui/controls';
import { mountSeason } from './ui/season';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
const panel = document.getElementById('panel') as HTMLElement;

/** How many frames of film the wake is drawn from. */
const WAKE = 60;

/**
 * How long a shot and a hit stay on screen. Both are one tick in the
 * simulation, which is a sixtieth of a second — long enough to happen and far
 * too short to see. These are drawing numbers, not tuning: nothing in the sim
 * reads them.
 */
const SHOT_HOLD = 14;
const HIT_HOLD = 26;

let season: Season = newSeason(seedFrom('kestrel'));
let config: FieldConfig;
let entrants: readonly Entrant[];
/** One lap alone against par, rather than a heat against anyone. */
let pacing = false;
/** What to say about a result the standings cannot describe. */
let note: string | undefined;

/** The segment being played, and how far through it we are. */
let segment: Segment | undefined;
let cursor = 0;
/**
 * How far past that tick the wall clock has got, 0 to 1. The screen never
 * refreshes in step with the tick, so without this the leftover time is thrown
 * away and the ship advances one tick on some frames and none on others.
 */
let blend = 0;
/** Set once a finished heat has been paid for, so it pays only once. */
let paid = false;

const controls = mountControls(panel, {
  onGo: () => step(),
  onNewHeat: () => startSeason(),
  onSkip: () => {
    if (segment !== undefined) cursor = segment.ticks - 1;
  },
});

const seasonPanel = mountSeason(controls.seasonSlot);

const board = mountBoard(
  controls.boardSlot,
  () => garageOf(),
  (next) => {
    setGarage(next);
    board.render(next);
    seasonPanel.render(season);
    // Fitting a navigation system changes what the route planner can read.
    controls.setNav(resolveBuild(next.fitted).nav);
    // Fitting a mine rack is what makes a place to lay one worth showing.
    controls.setMines(rackLevel(next.fitted));
    controls.setAbilities(grantsOf(next.fitted).map((g) => g.id));
  },
  // Where the season is, plus how many rerolls have already been taken, so a
  // replayed season sees the same windows in the same order.
  () => offerSeed(season.seed, season.phase, season.heat) + garageOf().rerolls + 1,
);

/** The player's garage, which the season owns and everything else borrows. */
function garageOf(): Garage {
  return racerById(season, 'player')?.garage ?? newSeason(0).racers[0]!.garage;
}

function setGarage(next: Garage): void {
  season = {
    ...season,
    racers: season.racers.map((racer) =>
      racer.isPlayer ? { ...racer, garage: next } : racer,
    ),
  };
}

/** How deep a mine rack the player has fitted, or 0 for none. */
function rackLevel(fitted: readonly Fitted[]): number {
  return fitted.reduce(
    (best, item) => (item.componentId === 'gravity-mine' ? Math.max(best, item.level) : best),
    0,
  );
}

/** The player's ship as the garage has it, carrying whatever damage it has. */
function playerEntrant(): Entrant {
  const me = racerById(season, 'player');
  if (me === undefined) throw new Error('the season has no player');
  return entrantFor(me);
}

/** Every ship's orders for a lap, decided before the lap that consumes it. */
function ordersFor(lap: number): Command[] {
  return entrants.map((entrant) =>
    entrant.isPlayer
      ? {
          routes: controls.settings.routes,
          place: controls.settings.place,
        }
      : botOrders(entrant, config.track, config.seed, lap),
  );
}

/**
 * The Go button. During a heat it starts the next lap; once the heat has been
 * settled it moves the season on; once the season is over it starts another.
 */
function step(): void {
  if (nextUp(season).kind === 'over') {
    startSeason();
    return;
  }
  const film = segment;
  if (film !== undefined && film.end.phase === 'done' && paid) {
    startNext();
    return;
  }
  nextSegment();
}

/** Start a season from scratch, on whatever the seed box says. */
function startSeason(): void {
  season = newSeason(seedFrom(controls.settings.seed));
  startNext();
}

/**
 * Set the game up for whatever the season is waiting for: the pacing lap, a
 * heat, the cut, or nothing because it is over.
 */
function startNext(): void {
  const up = nextUp(season);
  segment = undefined;
  cursor = 0;
  blend = 0;
  paid = false;
  note = undefined;

  if (up.kind === 'cut') {
    season = applyCut(season);
    startNext();
    return;
  }
  if (up.kind === 'over') {
    controls.toGarage();
    board.render(garageOf());
    seasonPanel.render(season);
    controls.setSeason(nextUp(season).kind, playerIsOut(season));
    return;
  }

  // One heat's races all share a seed, so every group meets the same bends.
  const seed = season.seed + season.phase * 9973 + season.heat * 131;
  pacing = up.kind === 'pacing';
  config = pacing
    ? { track: up.track, laps: 1, seed }
    : heatConfig(up.track, seed);
  entrants =
    up.kind === 'heat'
      ? (up.groups[0] ?? []).map((id) => entrantOfId(id))
      : [playerEntrant()];

  controls.setTrack(up.track);
  controls.setNav(resolveBuild(garageOf().fitted).nav);
  controls.setMines(rackLevel(garageOf().fitted));
  controls.setAbilities(grantsOf(garageOf().fitted).map((g) => g.id));
  controls.setSeason(up.kind, false);
  controls.toGarage();
  board.render(garageOf());
  seasonPanel.render(season);
}

/** A racer by id, as an entrant. Every id in a group is one of the roster. */
function entrantOfId(id: string): Entrant {
  const racer = racerById(season, id);
  if (racer === undefined) throw new Error(`no racer ${id}`);
  return entrantFor(racer);
}

/**
 * The watched race is over. Everything the player did not see happens here:
 * the other groups are resolved by the same simulation, and the season takes
 * the lot — purse, points, a slot, interest, and a shopping trip per rival.
 */
function settleWatched(): void {
  const film = segment;
  if (film === undefined) return;
  if (pacing) {
    const ticks = film.end.ships[0]?.totalTicks ?? config.track.par;
    const par = config.track.par;
    const paid = pacingPay(ticks, par);
    const margin = (Math.abs(par - ticks) / TICK_HZ).toFixed(2);
    note =
      ticks <= par
        ? `Pacing lap — ${margin}s under par, and ${paid} credits for it.`
        : `Pacing lap — ${margin}s over par. ${paid} credits for turning up.`;
    season = settlePacing(season, ticks, par);
  } else {
    const up = nextUp(season);
    const others =
      up.kind === 'heat'
        ? up.groups
            .slice(1)
            .map((ids) => resolveHeat(ids.map(entrantOfId), config))
        : [];
    const watched: readonly Finish[] = finishesOf(film.end);
    season = settleHeat(season, [watched, ...others]);
  }
  board.render(garageOf());
  seasonPanel.render(season);
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
    segment = recordSegment(startField(entrants, ordersFor(0), config.track), config);
  } else {
    const carried = leavePit(previous.end, ordersFor(previous.end.lap + 1), config.track);
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
  blend = 0;
  controls.seal();
  controls.toRace();
}

startSeason();

/** What the two views keep between frames: the camera's lag, and the sky. */
const scene = newScene();

// Tapping the small view swaps it with the big one. The chase camera answers a
// different question from the map, and which one you want changes lap by lap.
canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const inset = insetRect(rect.width, rect.height);
  const inside =
    x >= inset.x &&
    x <= inset.x + inset.width &&
    y >= inset.y &&
    y <= inset.y + inset.height;
  if (inside) scene.big = scene.big === 'chase' ? 'map' : 'chase';
});

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
    const now = frameBetween(segment as Segment, ship, cursor, blend);
    // A shot and a hit are one tick each. Look back over the last few so the
    // screen can hold them long enough to be seen.
    let shotAt: number | undefined;
    let struck = 0;
    for (let back = 0; back <= HIT_HOLD; back += 1) {
      const was = frameAt(segment as Segment, ship, cursor - back);
      if (shotAt === undefined && back <= SHOT_HOLD && was?.firedAt !== undefined) {
        const lane = entrants.findIndex((e) => e.id === was.firedAt);
        if (lane >= 0) shotAt = lane;
      }
      if (struck === 0 && was?.hit !== undefined) struck = 1 - back / HIT_HOLD;
    }
    return {
      distance: now?.distance ?? 0,
      route: now?.route ?? 0,
      offset: now?.offset ?? 0,
      wide: now?.wide ?? false,
      isPlayer: entrants[ship]?.isPlayer ?? false,
      wake,
      swings: swingsBy(segment as Segment, ship, cursor),
      shotAt,
      struck,
    };
  });
}

/**
 * What is lying on the track at the tick being watched. Read off the film like
 * everything else, so the road shows the mines that had been laid by then and
 * not the ones that are coming.
 */
function fixtureViews(): readonly FixtureView[] {
  if (segment === undefined) return [];
  const at = Math.max(0, Math.min(segment.fixtures.length - 1, cursor));
  return (segment.fixtures[at] ?? []).map((fixture) => ({
    kind: fixture.kind,
    distance: fixture.distance,
    route: fixture.route,
    offset: fixture.offset,
    mine: fixture.owner === 'player',
  }));
}

function frame(now: number): void {
  const elapsed = now - previousTime;
  accumulator += elapsed;
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
  // Whatever is left over is where between two ticks the ship actually is.
  blend = playing ? Math.min(1, accumulator / MS_PER_TICK) : 0;

  // The segment has played out: its end is the decision point.
  const film = segment;
  const atRest = film !== undefined && cursor >= film.ticks - 1;
  if (atRest && film.end.phase === 'done' && !paid) {
    paid = true;
    settleWatched();
  }

  const rect = canvas.getBoundingClientRect();
  resize(rect.width, rect.height);
  drawField(
    ctx,
    config.track,
    views(),
    { planned: controls.settings.routes, nav: resolveBuild(garageOf().fitted).nav },
    fixtureViews(),
    scene,
    // Clamped: a backgrounded tab comes back with a huge gap, and the camera
    // must ease in from where it was rather than teleport.
    Math.min(0.1, elapsed / 1000),
    rect.width,
    rect.height,
  );
  controls.update({
    field: segment?.end,
    live: segment === undefined ? undefined : { segment, cursor },
    settled: atRest,
    done: atRest && film?.end.phase === 'done',
    note,
  });
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
