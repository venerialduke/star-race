// What one ship is allowed to know about the others, and how it reaches them.
//
// **Ships still never touch.** What S6 adds is that they can now *reach* each
// other — a missile pushes you off your line, a mine you flew past drags you
// wide, a black hole somebody's boost left behind takes a piece out of you.
// Every one of those costs you the line you were on, which is the currency the
// swing is already paid in.
//
// The rule that keeps this deterministic is that **nothing lands on the tick it
// was fired**. A ship reads a world built from the state *before* the tick, and
// what it emits is resolved into impulses that arrive on the tick after. So no
// ship's move can depend on where another one got to this tick, and the order
// the ships happen to sit in the array cannot change the race. That is the same
// rule the whole sim already runs on — a decision is an input, fixed before the
// tick that consumes it — applied to ships instead of to players.

import { FIXTURE_ACROSS, FIXTURE_REACH } from './tuning';

/** Where a ship is, as the rest of the field is allowed to see it. */
export interface Presence {
  readonly id: string;
  /** Canonical distance, so nobody has to know which way anyone went. */
  readonly distance: number;
  readonly offset: number;
  readonly sector: number;
  readonly route: number;
  readonly speed: number;
}

export type FixtureKind = 'mine' | 'black-hole';

/** Something sitting on the track that somebody put there. */
export interface Fixture {
  readonly id: string;
  readonly kind: FixtureKind;
  /** Whose it is. A fixture never bites the ship that laid it. */
  readonly owner: string;
  readonly distance: number;
  readonly sector: number;
  /** The line it sits on. A mine on one split is no danger on the other. */
  readonly route: number;
  readonly offset: number;
  /** What it carries. Shields soak it the way they soak a weapon. */
  readonly power: number;
  /** Ticks before it fades. */
  readonly life: number;
}

/** The track as it stands this tick, before any ship has moved. */
export interface World {
  readonly ships: readonly Presence[];
  readonly fixtures: readonly Fixture[];
}

export const EMPTY_WORLD: World = { ships: [], fixtures: [] };

/** Something a ship did this tick that reaches past itself. */
export type Emission =
  | {
      readonly kind: 'push';
      readonly from: string;
      readonly target: string;
      /** Which way to shove them: -1 or 1. */
      readonly side: number;
      readonly power: number;
    }
  | {
      readonly kind: 'drag';
      readonly from: string;
      readonly target: string;
      readonly scrub: number;
    }
  | { readonly kind: 'drop'; readonly fixture: Fixture };

/** What arrives at a ship on the tick after it was fired. */
export interface Impulse {
  readonly from: string;
  /** Which way it shoves, before the shields have had their say. */
  readonly side: number;
  /** Weapon power arriving. Shields soak it; a collector keeps it. */
  readonly power: number;
  /** A share of speed taken straight off, which shields do not answer. */
  readonly scrub: number;
}

/**
 * Sort emissions into what each ship must answer next tick, and what is now
 * lying on the track. Order-independent on purpose: the result of a set of
 * emissions must not depend on the order they were collected in, or the race
 * would quietly depend on where a ship sat in the array.
 */
export function resolveEmissions(emissions: readonly Emission[]): {
  readonly incoming: ReadonlyMap<string, readonly Impulse[]>;
  readonly dropped: readonly Fixture[];
} {
  const incoming = new Map<string, Impulse[]>();
  const dropped: Fixture[] = [];
  const add = (target: string, impulse: Impulse): void => {
    const held = incoming.get(target) ?? [];
    held.push(impulse);
    incoming.set(target, held);
  };

  for (const emission of emissions) {
    if (emission.kind === 'drop') dropped.push(emission.fixture);
    else if (emission.kind === 'push')
      add(emission.target, {
        from: emission.from,
        side: emission.side,
        power: emission.power,
        scrub: 0,
      });
    else
      add(emission.target, {
        from: emission.from,
        side: 0,
        power: 0,
        scrub: emission.scrub,
      });
  }
  return { incoming, dropped };
}

/** Age every fixture by a tick and forget the ones that have faded. */
export function ageFixtures(fixtures: readonly Fixture[]): readonly Fixture[] {
  const left: Fixture[] = [];
  for (const fixture of fixtures) {
    if (fixture.life > 1) left.push({ ...fixture, life: fixture.life - 1 });
  }
  return left;
}

/**
 * The nearest rival up the road from `me`, within `range`. Up the road, because
 * a weapon is aimed at somebody you are chasing — shooting the ship behind you
 * is spite rather than racing, and the sim has no way to be spiteful.
 *
 * Distance is canonical and wraps, so a ship just over the line is near, not a
 * lap away.
 */
export function nearestAhead(
  world: World,
  me: Presence,
  range: number,
  loop: number,
): Presence | undefined {
  let best: Presence | undefined;
  let bestGap = Infinity;
  for (const other of world.ships) {
    if (other.id === me.id) continue;
    const gap = wrapGap(other.distance - me.distance, loop);
    if (gap <= 0 || gap > range || gap >= bestGap) continue;
    best = other;
    bestGap = gap;
  }
  return best;
}

/** A gap round a loop, brought into (-loop/2, loop/2]. */
export function wrapGap(raw: number, loop: number): number {
  if (loop <= 0) return raw;
  const gap = ((raw % loop) + loop) % loop;
  return gap > loop / 2 ? gap - loop : gap;
}

/**
 * Every fixture this ship has just run into: near enough along the road, near
 * enough across it, on the line it is actually flying, and not its own.
 */
export function fixturesHit(
  world: World,
  me: Presence,
  loop: number,
): readonly Fixture[] {
  return world.fixtures.filter(
    (fixture) =>
      fixture.owner !== me.id &&
      fixture.sector === me.sector &&
      fixture.route === me.route &&
      Math.abs(wrapGap(fixture.distance - me.distance, loop)) <= FIXTURE_REACH &&
      Math.abs(fixture.offset - me.offset) <= FIXTURE_ACROSS,
  );
}
