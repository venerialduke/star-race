// The rivals. A bot is a rule that reads the track and picks a build and a
// corner plan, with seeded variation so it is an opponent rather than a
// metronome.
//
// Every decision it makes is an input, chosen before the lap that consumes it
// — the same seam a real player's choices will arrive through.

import type { Entrant, Orders } from './field';
import type { CornerPlan } from './race';
import { makeRng, seedFrom } from './rng';
import { buy, fit, newGarage, slotsFree, upgrade, type Garage } from './garage';
import { resolveBuild } from './ship';
import { holdingSpeed, legalRoutes, routeOf, type Route, type Track } from './track';
import {
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
  'crew-androids',
  'crew-engineers',
  'crew-nanites',
  'crew-scientists',
  'nav-system',
] as const;

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

  let next = garage;
  // Engines first, then support, then whatever it fancies. Each buy is tried
  // and simply does not happen if the credits or the slots are not there.
  const wanted = [
    engine,
    rng.unitInterval() < 0.5 ? engine : 'balanced-engine',
    pick(),
    pick(),
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
  const thrifty = rng.unitInterval() < BOT_THRIFT;
  if (!thrifty && next.fitted.length > 0) {
    const target = Math.floor(rng.unitInterval() * next.fitted.length);
    next = upgrade(next, target);
  }
  return next;
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
  };
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
