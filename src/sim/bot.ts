// The rivals. A bot is a rule that reads the track and picks a build and a
// corner plan, with seeded variation so it is an opponent rather than a
// metronome.
//
// Every decision it makes is an input, chosen before the lap that consumes it
// — the same seam a real player's choices will arrive through.

import { mineLevel, type Entrant, type Orders } from './field';
import type { CornerPlan } from './race';
import { makeRng, seedFrom } from './rng';
import {
  buy,
  buyResearch,
  fit,
  newGarage,
  researchNeeded,
  researched,
  slotsFree,
  upgrade,
  type Garage,
} from './garage';
import { resolveBuild } from './ship';
import { holdingSpeed, legalRoutes, routeOf, type Route, type Track } from './track';
import {
  BOT_AGGRESSION,
  BOT_HANDLING_TILT,
  BOT_ROUTE_NERVE,
  BOT_THRIFT,
  BOT_STAT_SPREAD,
  BOT_TIGHT_HOLD,
  SPEED_PER_THRUST,
  STAT_MAX,
  STAT_MIN,
} from './tuning';

// One each, and enough of them: a season fields eight rivals, and two ships
// racing under the same name is a table nobody can read.
const NAMES = [
  'Vex Ardo',
  'Sable Rook',
  'Juno Kest',
  'Ilsa Crane',
  'Mott Rell',
  'Cass Delune',
  'Orrin Vale',
  'Thessa Kyre',
  'Piet Danser',
  'Nome Ferrik',
];

/** What a bot fills its spare slots with, once the engines are chosen. */
const SUPPORT = [
  'general-shields',
  'collector-shield',
  'crew-androids',
  'crew-engineers',
  'crew-nanites',
  'crew-scientists',
  'nav-system',
] as const;

/** What it arms itself with when it decides to be a problem for somebody. */
const WEAPONS = ['missile-rack', 'gravity-mine', 'tractor-beam'] as const;

const clamp = (v: number): number => Math.min(STAT_MAX, Math.max(STAT_MIN, v));

/**
 * How much this track asks of Handling, from 0 to 1: how far its bends sit
 * below what a stock ship could take flat out, averaged. A share of demanding
 * bends was the first version and it saturated — a coil of hairpins and a
 * mixed circuit both scored 1, and bred identical rivals.
 */
export function tightness(track: Track): number {
  if (track.bends.length === 0) return 0;
  const flatOut = SPEED_PER_THRUST * BOT_TIGHT_HOLD;
  const ease =
    track.bends.reduce(
      (sum, b) => sum + Math.min(1, holdingSpeed(b.radius, 1) / flatOut),
      0,
    ) / track.bends.length;
  return 1 - ease;
}

/**
 * A bot shops in the same garage the player does, with the same budget and the
 * same slots. It leans its engines toward what the track asks for, then fills
 * what is left with a shield or a crew on a seeded draw — so it commits to a
 * build before it knows how the bends will fall, exactly as the player must.
 */
export function makeBot(track: Track, seed: number, index: number): Entrant {
  return entrantOf(
    `bot-${index}`,
    NAMES[index % NAMES.length] as string,
    botShop(newGarage(), track, seed, index, 0),
  );
}

/** A racer as the field needs it, from whatever its garage currently holds. */
export function entrantOf(id: string, name: string, garage: Garage): Entrant {
  return {
    id,
    name,
    stats: resolveBuild(garage.fitted),
    build: garage.fitted,
    isPlayer: false,
  };
}

/** The name a rival races under, by its place in the roster. */
export function botName(index: number): string {
  return NAMES[index % NAMES.length] as string;
}

/**
 * One shopping trip. A bot spends what it has on what the track asks for —
 * Handling where the bends are tight, Thrust where they are not — then fills
 * what is left with a shield, a crew or a navigation system on a seeded draw.
 *
 * Between heats it comes back with whatever it won and does this again, which
 * is the same loop the player is in: a rival that never spends its winnings is
 * not a rival for long.
 */
export function botShop(
  garage: Garage,
  track: Track,
  seed: number,
  index: number,
  round: number,
): Garage {
  const rng = makeRng(seed).fork(index * 5381 + round * 7717);
  const tilt = tightness(track) * BOT_HANDLING_TILT;
  const wobble = (): number => (rng.unitInterval() - 0.5) * 2 * BOT_STAT_SPREAD;

  const lean = clamp(tilt + wobble());
  const engine =
    lean > 0.58 ? 'handling-engine' : lean < 0.34 ? 'speed-engine' : 'balanced-engine';
  const pick = (): string =>
    SUPPORT[Math.floor(rng.unitInterval() * SUPPORT.length)] as string;
  // Some rivals race the track and some race you. A bot that arms itself is
  // giving up a slot of pace for a slot of trouble, which is the same bet the
  // player is offered — and it has to make it before it knows who it is drawn
  // against, exactly as the player does.
  const armed = rng.unitInterval() < BOT_AGGRESSION;
  const weapon = WEAPONS[Math.floor(rng.unitInterval() * WEAPONS.length)] as string;

  let next = garage;
  // Its engine, then support, then whatever it fancies. Each buy is tried and
  // simply does not happen if the credits or the slots are not there — and the
  // ship carries one engine, so a second is never on this list. It used to be,
  // and the fit quietly failed.
  const wanted = [
    engine,
    armed ? weapon : pick(),
    pick(),
    // A crew that is good with weapons is only worth a slot to a ship that
    // brought one, which is the kind of thing a rival ought to know.
    armed && rng.unitInterval() < 0.5 ? 'crew-mercenaries' : pick(),
    pick(),
  ];
  for (const id of wanted) {
    if (slotsFree(next) <= 0) break;
    const before = next;
    next = buy(next, id);
    if (next !== before) next = fit(next, next.shelf.length - 1);
  }

  // Whatever is left goes into deepening something it already has — and
  // sometimes into nothing at all, because credits held earn interest and a
  // rival that always spends to zero never learns that.
  //
  // Deepening is copies now, not credits: a level is bought by breaking spares
  // of the same component down. A rival does what a player does, which is buy
  // the thing again. Nothing here is a special case for bots — if this were
  // left as a credit purchase they would simply never reach level 2 again.
  const thrifty = rng.unitInterval() < BOT_THRIFT;
  if (!thrifty && next.fitted.length > 0) {
    const target = Math.floor(rng.unitInterval() * next.fitted.length);
    next = deepen(next, target);
  }
  return next;
}

/**
 * Spend toward one more level of something already fitted, then take it.
 *
 * Bounded, because a rival should not empty its purse into one part: it buys
 * what the next level needs and stops, whether or not it got there.
 */
function deepen(garage: Garage, fittedIndex: number): Garage {
  const item = garage.fitted[fittedIndex];
  if (item === undefined) return garage;
  const need = researchNeeded(item.level);
  if (need === undefined) return garage;
  let next = garage;
  for (let n = 0; n < need; n += 1) {
    if (researched(next, item.componentId, item.level)) break;
    const before = next;
    next = buyResearch(next, item.componentId);
    if (next === before) break;
  }
  return upgrade(next, fittedIndex);
}

/**
 * What a bot flies this lap: how it takes its bends, and the way it means to
 * go at every fork. Both are settled before the lap, like everyone's.
 */
export function botOrders(
  entrant: Entrant,
  track: Track,
  seed: number,
  lap: number,
): Orders {
  return {
    plan: botPlan(entrant, seed, lap),
    routes: botRoutes(entrant, track, seed, lap),
    place: botPlace(entrant, track, seed, lap),
  };
}

/**
 * Where a bot lays the mine it brought, if it brought one. Seeded, so it is a
 * decision rather than a habit — a rival that always mines the same sector is
 * a sector you learn to avoid once.
 */
export function botPlace(
  entrant: Entrant,
  track: Track,
  seed: number,
  lap: number,
): number | undefined {
  if (mineLevel(entrant) === 0) return undefined;
  const rng = makeRng(seed ^ seedFrom(entrant.id)).fork(lap * 977 + 23);
  return Math.floor(rng.unitInterval() * track.sectors.length);
}

/**
 * Which way a bot goes at each fork it can read. A ship with handling to spare
 * takes the shorter, tighter line; one without it stays wide. It does not
 * always: a rival that always picks the same line is a metronome.
 */
export function botRoutes(
  entrant: Entrant,
  track: Track,
  seed: number,
  lap: number,
): readonly number[] {
  const rng = makeRng(seed ^ seedFrom(entrant.id)).fork(lap * 131 + 7);
  const allowed = legalRoutes(track, entrant.stats.nav);
  const spare = entrant.stats.handling - entrant.stats.thrust;

  return track.sectors.map((sector) => {
    const choices = allowed[sector.index] ?? [0];
    if (choices.length <= 1) return 0;
    // Shorter is better if you can hold it; the nerve to try is a seeded draw.
    const nerve = BOT_ROUTE_NERVE + spare;
    const main = sector.routes[0] as Route;
    // Scored once each: drawing inside the comparison would judge the same
    // line differently depending on how often it was looked at.
    const scored = choices.map((index) => {
      const route = routeOf(sector, index);
      const shorter = (main.length - route.length) / main.length;
      const tightest = route.bends.reduce(
        (least, b) => Math.min(least, b.radius),
        Infinity,
      );
      const hold = Number.isFinite(tightest)
        ? holdingSpeed(tightest, entrant.stats.handling)
        : Infinity;
      const risk = Math.max(0, 1 - hold / (SPEED_PER_THRUST * entrant.stats.thrust));
      return { index, score: shorter * 10 * nerve - risk + rng.unitInterval() * 0.35 };
    });
    return scored.reduce((best, row) => (row.score > best.score ? row : best)).index;
  });
}

/**
 * What a bot flies this lap. It leans on the plan that suits its own build —
 * a ship with handling to spare can afford to Charge — and sometimes does not.
 */
export function botPlan(entrant: Entrant, seed: number, lap: number): CornerPlan {
  // Keyed by who it is, not how long its name is: two bots must not agree.
  const rng = makeRng(seed ^ seedFrom(entrant.id)).fork(lap * 17 + 1);
  const spare = entrant.stats.handling - entrant.stats.thrust;
  const roll = rng.unitInterval();
  if (spare > 0.15) return roll < 0.75 ? 'charge' : 'carry';
  if (spare < -0.15) return roll < 0.6 ? 'carry' : roll < 0.85 ? 'charge' : 'lift';
  return roll < 0.5 ? 'carry' : roll < 0.85 ? 'charge' : 'lift';
}
