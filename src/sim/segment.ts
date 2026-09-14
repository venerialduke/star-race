// A segment is the stretch of a race between two decision points: today, one
// lap between pit stops. It is computed **in full, before it is shown**.
//
// That is not a change of outcome — the simulation takes no input during a
// segment, so stepping it live and computing it up front give the same race,
// tick for tick. What it changes is what the rest of the program can do:
// the result is known before the playback starts, the playback can be skipped
// or replayed, and a networked heat can be resolved once and watched by
// everyone rather than kept in lockstep across three machines.
//
// The film it produces is deliberately small: what the renderer needs to draw
// a tick, and nothing else. The wake is not stored — it is the last few frames,
// which the film already has.

import { stepField, type FieldConfig, type FieldState } from './field';
import type { AbilityId } from './ability';
import type { SwingEvent } from './race';
import type { Emission, Fixture } from './world';

/** One ship at one tick: everything the screen needs and nothing it does not. */
export interface Frame {
  readonly distance: number;
  /** Which way through the current sector: the same distance is a different place. */
  readonly route: number;
  readonly offset: number;
  readonly speed: number;
  readonly wide: boolean;
  /** The average condition of what is fitted, 0 to 1. */
  readonly integrity: number;
  readonly worn: number;
  readonly shields: number;
  /** What it has to spend, 0 to 1. */
  readonly charge: number;
  /** The ability it fired on this tick, if it fired one. */
  readonly fired: AbilityId | undefined;
  /** Who it fired at, so a shot can be drawn going somewhere. */
  readonly firedAt: string | undefined;
  /** What reached it on this tick, and who sent it. */
  readonly hit: string | undefined;
  readonly hitBy: string | undefined;
}

export interface Segment {
  /** How many ticks it lasted. */
  readonly ticks: number;
  /** `frames[ship][tick]`. */
  readonly frames: readonly (readonly Frame[])[];
  /** Every bend that threw a ship, with the tick it happened on. */
  readonly swings: readonly (readonly SwingEvent[])[];
  /** Each ship's total time, in ticks, as it entered the segment. */
  readonly carried: readonly number[];
  /** What was lying on the track at each tick, so the road is drawn as it was. */
  readonly fixtures: readonly (readonly Fixture[])[];
  /** How long the lap is, so a frame's distance can be read as progress. */
  readonly lapLength: number;
  /** The field as it stands afterwards: the standings, and where the next segment starts from. */
  readonly end: FieldState;
}

/** How long a segment is allowed to run before we call it stuck. */
const RUNAWAY = 40000;

const frameOf = (ship: FieldState['ships'][number], tick: number): Frame => ({
  distance: ship.state.distance,
  route: ship.state.route,
  offset: ship.state.offset,
  speed: ship.state.speed,
  wide: ship.state.wide,
  integrity:
    ship.state.condition.parts.length === 0
      ? 1
      : ship.state.condition.parts.reduce((sum, c) => sum + c, 0) /
        ship.state.condition.parts.length,
  worn: ship.state.worn,
  shields: ship.state.shields,
  charge: ship.state.charge,
  fired: ship.state.lastFiredTick === tick ? ship.state.lastFired : undefined,
  firedAt: aimedAt(ship.state.emitted),
  // Only on the tick it happened: the screen marks a moment, not a state.
  hit: ship.state.lastHitTick === tick ? ship.state.lastHit : undefined,
  hitBy: ship.state.lastHitTick === tick ? ship.state.lastHitBy : undefined,
});

/** Who this tick's emissions were aimed at, if anybody. */
function aimedAt(emitted: readonly Emission[]): string | undefined {
  for (const emission of emitted) {
    if (emission.kind === 'push' || emission.kind === 'drag') return emission.target;
  }
  return undefined;
}

/**
 * Run a segment to its end — the next pit stop, or the finish — and record it.
 * The state handed in must be racing; what comes back is the film and the
 * field as it stands when the last ship is in.
 */
export function recordSegment(start: FieldState, config: FieldConfig): Segment {
  const frames: Frame[][] = start.ships.map(() => []);
  const fixtures: (readonly Fixture[])[] = [];
  let state = start;

  start.ships.forEach((ship, i) => frames[i]?.push(frameOf(ship, start.tick)));
  fixtures.push(start.fixtures);
  for (let i = 0; i < RUNAWAY && state.phase === 'racing'; i += 1) {
    state = stepField(state, config);
    const at = state.tick;
    state.ships.forEach((ship, s) => frames[s]?.push(frameOf(ship, at)));
    fixtures.push(state.fixtures);
  }

  return {
    ticks: frames[0]?.length ?? 0,
    frames,
    swings: state.ships.map((ship) => ship.state.swings),
    carried: start.ships.map((ship) => ship.totalTicks),
    fixtures,
    lapLength: config.track.length,
    end: state,
  };
}

/** Where every ship was at a tick of the film, clamped to its ends. */
export function frameAt(segment: Segment, ship: number, tick: number): Frame | undefined {
  const film = segment.frames[ship];
  if (film === undefined || film.length === 0) return undefined;
  const index = Math.min(film.length - 1, Math.max(0, Math.floor(tick)));
  return film[index];
}

/**
 * Where a ship was **between** two ticks of the film.
 *
 * The film is one frame per tick; the screen refreshes on its own schedule and
 * never lines up with that. Drawing the nearest whole tick means some display
 * frames advance the ship by one tick and some by none, which is a stutter even
 * when the race itself is perfectly smooth. Blending the two neighbouring
 * frames spends the leftover time instead of dropping it.
 *
 * Only position blends. Whether a ship is wide, and which way it went at a
 * fork, are states rather than places — half of either is not a thing.
 */
export function frameBetween(
  segment: Segment,
  ship: number,
  tick: number,
  blend: number,
): Frame | undefined {
  const here = frameAt(segment, ship, tick);
  if (here === undefined) return undefined;
  const next = frameAt(segment, ship, tick + 1);
  if (next === undefined || next === here) return here;
  const t = Math.min(1, Math.max(0, blend));
  return {
    ...here,
    distance: here.distance + (next.distance - here.distance) * t,
    offset: here.offset + (next.offset - here.offset) * t,
    speed: here.speed + (next.speed - here.speed) * t,
  };
}

/** The last few frames before a tick, which is what a wake is. */
export function wakeAt(
  segment: Segment,
  ship: number,
  tick: number,
  length: number,
): readonly Frame[] {
  const film = segment.frames[ship];
  if (film === undefined) return [];
  const end = Math.min(film.length, Math.max(1, Math.floor(tick) + 1));
  return film.slice(Math.max(0, end - length), end);
}

/** The swings a ship had taken by a tick, for the marks left on the track. */
export function swingsBy(
  segment: Segment,
  ship: number,
  tick: number,
): readonly SwingEvent[] {
  return (segment.swings[ship] ?? []).filter((swing) => swing.tick <= tick);
}

/** Where one ship stands partway through the segment. */
export interface Position {
  readonly ship: number;
  readonly place: number;
  /** How much of the lap is behind it, 0 to 1. */
  readonly progress: number;
  /** Total time so far: laps already banked, plus this one as far as it has run. */
  readonly ticks: number;
  /** Ticks behind the leader on the road — how long ago the leader was here. */
  readonly behind: number;
  /** This ship is in and waiting; the segment is over for it. */
  readonly home: boolean;
}

/** The last tick at which a film had not yet passed a distance. */
function tickAtDistance(film: readonly Frame[], distance: number): number {
  let low = 0;
  let high = film.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if ((film[mid] as Frame).distance <= distance) low = mid;
    else high = mid - 1;
  }
  return low;
}

/**
 * The order of the field at a tick of the film, read from the film alone.
 *
 * The tracking bar has to use this rather than `standings(segment.end)`: the
 * segment is computed before it is watched, so the end knows who won, and a
 * bar that read it would announce the result over the race being shown.
 */
export function orderAt(segment: Segment, tick: number): readonly Position[] {
  const cursor = Math.max(0, Math.floor(tick));

  const rows = segment.frames.map((film, ship) => {
    // A ship that crosses the line stops there and waits, frozen a little past
    // it. Its clock stops on the tick it crossed, not at the end of the film.
    const crossed = (film[film.length - 1] as Frame).distance >= segment.lapLength;
    const stop = crossed
      ? tickAtDistance(film, segment.lapLength - 1e-9) + 1
      : film.length - 1;
    const frame = frameAt(segment, ship, cursor) as Frame;
    return {
      ship,
      stop,
      progress: Math.min(1, frame.distance / Math.max(1, segment.lapLength)),
      ticks: (segment.carried[ship] ?? 0) + Math.min(cursor, stop),
      distance: frame.distance,
      home: crossed && cursor >= stop,
    };
  });

  // Least time first; ships level on time are placed by who is further round.
  const order = [...rows].sort((a, b) => a.ticks - b.ticks || b.distance - a.distance);
  const leader = order[0];

  return order.map((row, i) => ({
    ship: row.ship,
    place: i + 1,
    progress: row.progress,
    ticks: row.ticks,
    home: row.home,
    behind: leader === undefined ? 0 : Math.max(0, gap(segment, leader, row)),
  }));
}

type Row = { ship: number; stop: number; ticks: number; distance: number; home: boolean };

/**
 * How far behind the leader a ship is, in ticks. On the road that is how long
 * ago the leader was where this ship is now; once both are across the line it
 * is simply the difference in their times, because past the line each ship sits
 * frozen wherever its last tick left it and the road no longer compares.
 */
function gap(segment: Segment, leader: Row, row: Row): number {
  if (row.ship === leader.ship) return 0;
  if (row.home && leader.home) return row.ticks - leader.ticks;
  const film = segment.frames[leader.ship] as readonly Frame[];
  const was = Math.min(leader.stop, tickAtDistance(film, row.distance));
  return row.ticks - ((segment.carried[leader.ship] ?? 0) + was);
}
