// Abilities: the things a ship does for itself, and the moments it does them in.
//
// **They fire automatically.** The build call on 2026-09-13 settled that: an
// ability reads a condition the ship can see for itself — a straight ahead, a
// run of bends, a rival in range — and spends its charge when that condition
// holds. The player's decision was made in the garage, when they fitted the
// part; nothing here asks them anything mid-race, which is what keeps the third
// rule true when the rival is one day a person rather than a bot.
//
// Charge is gathered **on the golden path and nowhere else**. That is the
// second reason to stay on the line, after speed, and it means a ship that
// spends a lap being thrown wide arrives at the last bend with nothing to spend.

import type { Condition, Fitted } from './ship';
import { levelOf } from './ship';
import { nextBendOn, routeOf, type Route, type Sector, type Track } from './track';
import {
  ABILITY_WORKS,
  BOOST_WANTS_CLEAR,
  PERFECT_LOOKAHEAD,
  PERFECT_WANTS_BENDS,
} from './tuning';
import { nearestAhead, type Presence, type World } from './world';

export type AbilityId =
  /** A burst of speed on a straight. */
  | 'boost'
  /** The same burst, leaving a black hole where it fired. */
  | 'dark-boost'
  /** The next three bends taken perfectly, and paid for coming quickly. */
  | 'three-bends'
  /** Pushes the rival ahead off their line. */
  | 'missile'
  /** Drags the rival ahead back toward you, which costs them speed. */
  | 'tractor'
  /** Leaves something on the road for whoever is chasing. */
  | 'mine';

/** One ability a build grants, and how deep the part granting it is. */
export interface Grant {
  readonly id: AbilityId;
  readonly level: number;
}

/**
 * What a build can do, at the level the part granting it has reached. A part
 * broken past `ABILITY_WORKS` grants nothing: it still flies, it just no longer
 * has the ability in it — which is how damage costs a ship a weapon.
 */
export function grantsOf(
  build: readonly Fitted[] | undefined,
  condition?: Condition,
): readonly Grant[] {
  if (build === undefined) return [];
  const grants: Grant[] = [];
  build.forEach((item, i) => {
    const level = levelOf(item);
    if (level?.grants === undefined) return;
    if ((condition?.parts[i] ?? 1) < ABILITY_WORKS) return;
    grants.push({ id: level.grants, level: item.level });
  });
  return grants;
}

/**
 * The order abilities are offered in, which is fixed so that two ships with the
 * same build in the same moment always do the same thing. A ship fires one
 * ability per charge; the first whose moment has come is the one it fires.
 */
const ORDER: readonly AbilityId[] = [
  'three-bends',
  'dark-boost',
  'boost',
  'missile',
  'tractor',
  'mine',
];

/** What the ship needs to know about itself to judge its own moment. */
export interface Moment {
  readonly onBend: boolean;
  readonly route: Route;
  readonly sector: Sector;
  readonly along: number;
  readonly me: Presence;
  readonly track: Track;
  readonly world: World;
  /** The way through each sector this ship planned, for looking past this one. */
  readonly routes: readonly number[] | undefined;
  /** A boost or a chain already running. A ship does not stack them. */
  readonly busy: boolean;
  /**
   * How far each weapon reaches, already scaled by the level fitted and the
   * crew working it. A weapon that is not aboard reaches nowhere.
   */
  readonly ranges: {
    readonly missile: number;
    readonly tractor: number;
    readonly mine: number;
  };
}

/**
 * Which ability, if any, this ship fires now. Pure, and readable by the ship
 * alone: everything it looks at is either its own state or the world as it
 * stood before this tick.
 */
export function fires(
  grants: readonly Grant[],
  moment: Moment,
): Grant | undefined {
  for (const id of ORDER) {
    const grant = grants.find((g) => g.id === id);
    if (grant !== undefined && wants(grant, moment)) return grant;
  }
  return undefined;
}

function wants(grant: Grant, moment: Moment): boolean {
  switch (grant.id) {
    // A burst of speed is worth nothing into a bend, so it wants a straight
    // with room to spend itself on.
    case 'boost':
    case 'dark-boost':
      return !moment.busy && !moment.onBend && clearAhead(moment) >= BOOST_WANTS_CLEAR;

    // The chain wants bends close together — one bend is not a run.
    case 'three-bends':
      return !moment.busy && bendsAhead(moment) >= PERFECT_WANTS_BENDS;

    case 'missile':
      return (
        nearestAhead(
          moment.world,
          moment.me,
          moment.ranges.missile,
          moment.track.length,
        ) !== undefined
      );

    case 'tractor':
      return (
        nearestAhead(
          moment.world,
          moment.me,
          moment.ranges.tractor,
          moment.track.length,
        ) !== undefined
      );

    // A mine is for whoever is behind you, so it wants somebody there. It is
    // the one ability aimed backwards, and the only one a leader wants.
    case 'mine':
      return moment.world.ships.some(
        (other) =>
          other.id !== moment.me.id &&
          behind(other, moment) > 0 &&
          behind(other, moment) < moment.ranges.mine,
      );
  }
}

const behind = (other: Presence, moment: Moment): number => {
  const loop = moment.track.length;
  const gap = ((moment.me.distance - other.distance) % loop + loop) % loop;
  return gap > loop / 2 ? 0 : gap;
};

/** How much clear road runs ahead before the next bend on this line. */
function clearAhead(moment: Moment): number {
  const next = nextBendOn(moment.route, moment.along);
  return next === undefined ? moment.route.length - moment.along : next.gap;
}

/**
 * How many bends lie within the chain's reach, looking past the end of this
 * line into the sector after it. Counting only the current route was the first
 * version and on a track of short sectors it never found three, so the ability
 * a whole engine is built around never fired once.
 */
function bendsAhead(moment: Moment): number {
  const { route, along, track, sector } = moment;
  let count = route.bends.filter(
    (bend) => bend.start >= along && bend.start - along <= PERFECT_LOOKAHEAD,
  ).length;
  let window = PERFECT_LOOKAHEAD - (route.length - along);
  let index = sector.index;
  // Walk forward a sector at a time until the window runs out. The line looked
  // at is the one the ship planned, since it has not reached the fork yet.
  while (window > 0) {
    index = (index + 1) % track.sectors.length;
    if (index === sector.index) break;
    const next = track.sectors[index] as Sector;
    const line = routeOf(next, moment.routes?.[index] ?? 0);
    count += line.bends.filter((bend) => bend.start <= window).length;
    window -= line.length;
  }
  return count;
}
