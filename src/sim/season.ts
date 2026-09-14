// A season: several phases, each a handful of heats, with a cut at the end of
// every phase.
//
// This is where a heat stops being the whole game. A heat used to be the unit
// of everything — you built a ship, raced it, and nothing carried. Now what
// carries is credits, points, slots and the parts you bought, and the reason to
// care about finishing second rather than third is that a points line is coming.
//
// Pure and deterministic like everything in `src/sim`: a season is a value, the
// seed decides every draw in it, and the same seed plays the same season. It
// knows nothing about screens — `nextUp` says what is due and the caller either
// watches it or resolves it.

import { botOrders, botName, botShop, entrantOf } from './bot';
import {
  leavePit,
  standings,
  startField,
  stepField,
  type Entrant,
  type FieldConfig,
  type FieldState,
} from './field';
import { finishRace, newGarage, type Garage } from './garage';
import { makeRng } from './rng';
import { resolveBuild } from './ship';
import { TRACKS, type Track } from './track';
import {
  GROUP_SIZE,
  HEATS_PER_PHASE,
  INTEREST_CAP,
  INTEREST_RATE,
  LAPS_PER_HEAT,
  MARGIN_POINTS,
  MARGIN_WINDOW,
  PACING_BASE,
  PACING_CAP,
  PACING_PER_TICK,
  PHASES,
  POINTS_BY_PLACE,
  PURSE_BY_PLACE,
  ROSTER,
} from './tuning';

/** One entrant in the season, and everything it carries between heats. */
export interface Racer {
  readonly id: string;
  readonly name: string;
  readonly isPlayer: boolean;
  /** Credits, slots, and what it owns. This is the thing that carries. */
  readonly garage: Garage;
  readonly points: number;
  readonly heats: number;
  /** Cut at the end of a phase. It keeps its row; it stops racing. */
  readonly out: boolean;
}

/** What one heat did to the field. */
export interface HeatResult {
  readonly phase: number;
  readonly heat: number;
  readonly track: string;
  readonly places: readonly {
    readonly id: string;
    readonly place: number;
    readonly ticks: number;
    readonly points: number;
    readonly purse: number;
  }[];
}

export interface Season {
  readonly seed: number;
  readonly phase: number;
  readonly heat: number;
  /** False until the opening lap against par has been run. */
  readonly paced: boolean;
  readonly racers: readonly Racer[];
  readonly log: readonly HeatResult[];
}

/** What the season is waiting for. The caller watches it or resolves it. */
export type Next =
  | { readonly kind: 'pacing'; readonly track: Track }
  | {
      readonly kind: 'heat';
      readonly track: Track;
      /** Every group racing this heat. The player's is first. */
      readonly groups: readonly (readonly string[])[];
    }
  | { readonly kind: 'cut'; readonly line: number }
  | { readonly kind: 'over' };

export function newSeason(seed: number): Season {
  const opening = trackAt(seed, 0, 0);
  const racers: Racer[] = [
    {
      id: 'player',
      name: 'You',
      isPlayer: true,
      garage: newGarage(),
      points: 0,
      heats: 0,
      out: false,
    },
  ];
  for (let i = 1; i < ROSTER; i += 1) {
    racers.push({
      id: `rival-${i}`,
      name: botName(i - 1),
      isPlayer: false,
      // Rivals open the season the way the player does: one shopping trip
      // against the track the first heat is on, out of the same budget.
      garage: botShop(newGarage(), opening, seed, i, 0),
      points: 0,
      heats: 0,
      out: false,
    });
  }
  return { seed, phase: 0, heat: 0, paced: false, racers, log: [] };
}

/** Which track a given heat is on. The season decides; the player does not. */
export function trackAt(seed: number, phase: number, heat: number): Track {
  const draw = makeRng(seed)
    .fork(phase * 101 + heat * 17)
    .unitInterval();
  return TRACKS[Math.floor(draw * TRACKS.length) % TRACKS.length] as Track;
}

export const stillIn = (season: Season): readonly Racer[] =>
  season.racers.filter((racer) => !racer.out);

/** The field in order: most points first, then fewest heats taken to get them. */
export function table(season: Season): readonly Racer[] {
  return [...season.racers].sort(
    (a, b) =>
      Number(a.out) - Number(b.out) ||
      b.points - a.points ||
      b.garage.credits - a.garage.credits ||
      a.name.localeCompare(b.name),
  );
}

/**
 * How many are cut at the end of this phase. The roster is a multiple of the
 * group size and stays one, so that the last phase is a single group racing
 * for the season.
 */
export function cutSize(season: Season): number {
  const left = stillIn(season).length;
  const target = Math.max(GROUP_SIZE, left - GROUP_SIZE);
  return left - target;
}

/** The points a racer must beat to survive this phase's cut. */
export function cutLine(season: Season): number {
  const size = cutSize(season);
  if (size <= 0) return 0;
  const ranked = table(season).filter((racer) => !racer.out);
  return ranked[ranked.length - size]?.points ?? 0;
}

export const playerIsOut = (season: Season): boolean =>
  racerById(season, 'player')?.out ?? false;

export function nextUp(season: Season): Next {
  if (season.phase >= PHASES) return { kind: 'over' };
  // Cut is the end of the run. The season could carry on without the player —
  // the rivals would go on racing each other — but there is nothing left to
  // decide, and a race you are not in is not a thing to be offered.
  if (playerIsOut(season)) return { kind: 'over' };
  if (!season.paced) return { kind: 'pacing', track: trackAt(season.seed, 0, 0) };
  if (season.heat >= HEATS_PER_PHASE) {
    return cutSize(season) > 0
      ? { kind: 'cut', line: cutLine(season) }
      : { kind: 'over' };
  }
  return {
    kind: 'heat',
    track: trackAt(season.seed, season.phase, season.heat),
    groups: groupsFor(season),
  };
}

/**
 * Who races whom this heat. Drawn from the seed, so a season plays out the
 * same way twice — and the player's group comes first, because that is the one
 * anybody watches.
 */
export function groupsFor(season: Season): readonly (readonly string[])[] {
  const rng = makeRng(season.seed).fork(season.phase * 977 + season.heat * 31 + 5);
  const pool = stillIn(season).map((racer) => racer.id);
  // Fisher-Yates from the seeded stream: a shuffle, not a sort by random key,
  // because a comparator fed random numbers is not a uniform shuffle.
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.unitInterval() * (i + 1));
    const held = pool[i] as string;
    pool[i] = pool[j] as string;
    pool[j] = held;
  }
  const groups: string[][] = [];
  for (let i = 0; i < pool.length; i += GROUP_SIZE) {
    groups.push(pool.slice(i, i + GROUP_SIZE));
  }
  const mine = groups.findIndex((group) => group.includes('player'));
  if (mine > 0) {
    const held = groups[0] as string[];
    groups[0] = groups[mine] as string[];
    groups[mine] = held;
  }
  return groups;
}

/** The entrant a racer takes to the line. */
export function entrantFor(racer: Racer): Entrant {
  return racer.isPlayer
    ? {
        id: racer.id,
        name: racer.name,
        stats: resolveBuild(racer.garage.fitted),
        build: racer.garage.fitted,
        isPlayer: true,
      }
    : entrantOf(racer.id, racer.name, racer.garage);
}

export const racerById = (season: Season, id: string): Racer | undefined =>
  season.racers.find((racer) => racer.id === id);

/** How long the field ran for, per ship, once a heat is over. */
export interface Finish {
  readonly id: string;
  readonly ticks: number;
}

/**
 * Run a whole heat with nobody watching. Used for every group the player is
 * not in — the same simulation, the same orders, resolved rather than played.
 */
export function resolveHeat(
  entrants: readonly Entrant[],
  config: FieldConfig,
): readonly Finish[] {
  const orders = (lap: number): ReturnType<typeof botOrders>[] =>
    entrants.map((entrant) => botOrders(entrant, config.track, config.seed, lap));

  let field: FieldState = startField(entrants, orders(0), config.track);
  for (let lap = 0; lap < config.laps; lap += 1) {
    for (let i = 0; i < 40000 && field.phase === 'racing'; i += 1) {
      field = stepField(field, config);
    }
    if (field.phase === 'pit')
      field = leavePit(field, orders(field.lap + 1), config.track);
  }
  return finishesOf(field);
}

/** A finished field, as the season wants it. */
export function finishesOf(field: FieldState): readonly Finish[] {
  return standings(field).map((row) => ({
    id: row.ship.entrant.id,
    ticks: row.ship.totalTicks,
  }));
}

/**
 * What a place is worth. The margin bonus is the reason to keep racing once
 * the win is gone: a third that finished on the winner's tail is worth about
 * twice one that was beaten out of sight.
 */
export function payFor(
  place: number,
  behind: number,
): { readonly points: number; readonly purse: number } {
  const base = POINTS_BY_PLACE[place - 1] ?? 0;
  const purse = PURSE_BY_PLACE[place - 1] ?? 0;
  const closeness = Math.max(0, 1 - behind / MARGIN_WINDOW);
  return { points: base + Math.round(MARGIN_POINTS * closeness), purse };
}

/**
 * Settle every group's finishes into the season: purse, points, a slot for
 * finishing, interest on what was not spent, and a shopping trip for each
 * rival. Then the heat counter moves on.
 */
export function settleHeat(
  season: Season,
  results: readonly (readonly Finish[])[],
): Season {
  const track = trackAt(season.seed, season.phase, season.heat);
  const paid = new Map<
    string,
    { place: number; ticks: number; points: number; purse: number }
  >();

  for (const group of results) {
    const winner = group[0]?.ticks ?? 0;
    group.forEach((finish, i) => {
      const { points, purse } = payFor(i + 1, finish.ticks - winner);
      paid.set(finish.id, { place: i + 1, ticks: finish.ticks, points, purse });
    });
  }

  const racers = season.racers.map((racer) => {
    const row = paid.get(racer.id);
    if (row === undefined) return racer;
    const banked = finishRace(racer.garage);
    const earned = {
      ...banked,
      credits: banked.credits + row.purse + interestOn(banked.credits),
    };
    return {
      ...racer,
      points: racer.points + row.points,
      heats: racer.heats + 1,
      // A rival spends its winnings; the player is handed theirs and chooses.
      garage: racer.isPlayer
        ? earned
        : botShop(earned, track, season.seed, seedOfRival(racer.id), racer.heats + 1),
    };
  });

  const log: HeatResult = {
    phase: season.phase,
    heat: season.heat,
    track: track.name,
    places: [...paid.entries()]
      .map(([id, row]) => ({ id, ...row }))
      .sort((a, b) => a.place - b.place || a.ticks - b.ticks),
  };

  return { ...season, racers, heat: season.heat + 1, log: [...season.log, log] };
}

/** Interest on credits held rather than spent, to a cap. */
export function interestOn(credits: number): number {
  return Math.min(INTEREST_CAP, Math.floor(credits * INTEREST_RATE));
}

const seedOfRival = (id: string): number => Number(id.replace('rival-', '')) || 1;

/**
 * The pacing lap: the player alone on the opening track, paid against the
 * track's own benchmark rather than against anyone. It is the first sight of
 * the track and the first credits of the season.
 */
export function settlePacing(season: Season, ticks: number, par: number): Season {
  const under = Math.max(0, par - ticks);
  const paid = PACING_BASE + Math.min(PACING_CAP, Math.round(under * PACING_PER_TICK));
  return {
    ...season,
    paced: true,
    racers: season.racers.map((racer) =>
      racer.isPlayer
        ? { ...racer, garage: { ...racer.garage, credits: racer.garage.credits + paid } }
        : racer,
    ),
  };
}

/** What the pacing lap paid, so the board can say it. */
export function pacingPay(ticks: number, par: number): number {
  return (
    PACING_BASE +
    Math.min(PACING_CAP, Math.round(Math.max(0, par - ticks) * PACING_PER_TICK))
  );
}

/**
 * The cut. Everyone below the line is out, and the phase turns over. A season
 * whose player was cut is still a well-formed value — the rivals keep their
 * points and their rows — but `nextUp` has nothing left to offer it.
 */
export function applyCut(season: Season): Season {
  const size = cutSize(season);
  if (size <= 0) return { ...season, phase: season.phase + 1, heat: 0 };
  const doomed = new Set(
    table(season)
      .filter((racer) => !racer.out)
      .slice(-size)
      .map((racer) => racer.id),
  );
  return {
    ...season,
    phase: season.phase + 1,
    heat: 0,
    racers: season.racers.map((racer) =>
      doomed.has(racer.id) ? { ...racer, out: true } : racer,
    ),
  };
}

/** A heat is this many laps. Re-exported so a caller needs one import. */
export const heatConfig = (track: Track, seed: number): FieldConfig => ({
  track,
  laps: LAPS_PER_HEAT,
  seed,
});
