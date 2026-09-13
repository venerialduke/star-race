// Components, and what a build adds up to.
//
// The catalogue in design/catalogue/ship-parts.md holds the components as
// arrows — `Thrust↑ Handling↓` — because the numbers are decided at build
// time, which is here. Each entry below cites the row it comes from; the
// values are this file's to choose, the mechanics are not.
//
// Only the engines are stocked. The other fifteen rows need systems the race
// does not have yet: shields need damage, navigation needs splits, weapons
// need something to hit, collection needs an economy. Stocking a component
// that quietly does nothing would be worse than leaving it out, so the shop
// says what is waiting instead.

import type { ShipStats } from './race';
import { BASE_HANDLING, BASE_THRUST, STAT_MAX, STAT_MIN } from './tuning';

export type Category = 'engine';

export interface Level {
  /** What this level adds to the ship's stats. */
  readonly thrust: number;
  readonly handling: number;
  /** Slots it occupies at this level. */
  readonly slots: number;
  /** Credits to reach this level from the one below. */
  readonly cost: number;
  /** One line for the shop. */
  readonly note: string;
}

export interface Component {
  readonly id: string;
  readonly name: string;
  readonly category: Category;
  readonly arrows: string;
  readonly levels: readonly [Level, Level, Level];
  /** Anything the catalogue gives this part that the race cannot do yet. */
  readonly waiting?: string;
}

/** A component as owned: which one, and how far it has been upgraded. */
export interface Fitted {
  readonly componentId: string;
  /** 1, 2 or 3. */
  readonly level: number;
}

export const COMPONENTS: readonly Component[] = [
  {
    id: 'speed-engine',
    name: 'Speed-focused engine',
    category: 'engine',
    arrows: 'Thrust↑ Handling↓',
    levels: [
      {
        thrust: 0.25,
        handling: -0.08,
        slots: 1,
        cost: 30,
        note: 'Moderate acceleration, low handling.',
      },
      {
        thrust: 0.4,
        handling: -0.08,
        slots: 1,
        cost: 25,
        note: 'Accelerates harder again.',
      },
      {
        thrust: 0.55,
        handling: -0.08,
        slots: 1,
        cost: 40,
        note: 'Harder again. Grants a boost.',
      },
    ],
    waiting: 'its level 3 boost — abilities arrive with S6',
  },
  {
    id: 'handling-engine',
    name: 'Handling-focused engine',
    category: 'engine',
    arrows: 'Handling↑ Thrust↓',
    levels: [
      {
        thrust: -0.04,
        handling: 0.25,
        slots: 1,
        cost: 30,
        note: 'Moderate handling, low acceleration.',
      },
      {
        thrust: -0.02,
        handling: 0.38,
        slots: 1,
        cost: 25,
        note: 'Better handling, and a little acceleration.',
      },
      {
        thrust: -0.02,
        handling: 0.52,
        slots: 2,
        cost: 40,
        note: 'Better again — and takes a second slot.',
      },
    ],
    waiting: 'its level 3 run of three perfect bends — abilities arrive with S6',
  },
  {
    id: 'balanced-engine',
    name: 'Balanced engine',
    category: 'engine',
    arrows: 'Thrust↑ Handling↑',
    levels: [
      {
        thrust: 0.15,
        handling: 0.15,
        slots: 1,
        cost: 34,
        note: 'Moderate acceleration and handling.',
      },
      {
        thrust: 0.22,
        handling: 0.22,
        slots: 1,
        cost: 28,
        note: 'A little better at both.',
      },
      {
        thrust: 0.3,
        handling: 0.3,
        slots: 1,
        cost: 44,
        note: 'Better again, with inertia dampeners.',
      },
    ],
    waiting: 'its inertia dampeners — gravity arrives with the crew',
  },
];

/** The rest of the catalogue, and what each is waiting for. Shown, not sold. */
export const NOT_STOCKED: readonly { name: string; waiting: string }[] = [
  { name: 'Shields', waiting: 'damage — nothing can hurt a ship yet' },
  { name: 'Navigation', waiting: 'splits — every sector has one way through it' },
  { name: 'Crew', waiting: 'gravity and endurance' },
  { name: 'Weapons', waiting: 'ships that can reach each other' },
  { name: 'Collection', waiting: 'an economy to collect into' },
  { name: 'Dark matter engine', waiting: 'black holes on the track' },
];

export function componentById(id: string): Component | undefined {
  return COMPONENTS.find((c) => c.id === id);
}

export function levelOf(fitted: Fitted): Level | undefined {
  return componentById(fitted.componentId)?.levels[fitted.level - 1];
}

/** What it costs to take a fitted component up one level, if it can go up. */
export function upgradeCost(fitted: Fitted): number | undefined {
  const component = componentById(fitted.componentId);
  if (component === undefined || fitted.level >= component.levels.length)
    return undefined;
  return component.levels[fitted.level]?.cost;
}

/** How many slots a fitted component takes at its current level. */
export function slotsOf(fitted: Fitted): number {
  return levelOf(fitted)?.slots ?? 0;
}

/**
 * A build, added up. Components stack: two engines is a build, not a mistake,
 * and an empty ship still flies — slowly.
 */
export function resolveBuild(fitted: readonly Fitted[]): ShipStats {
  let thrust = BASE_THRUST;
  let handling = BASE_HANDLING;
  for (const item of fitted) {
    const level = levelOf(item);
    if (level === undefined) continue;
    thrust += level.thrust;
    handling += level.handling;
  }
  const clamp = (v: number): number => Math.min(STAT_MAX, Math.max(STAT_MIN, v));
  return { thrust: clamp(thrust), handling: clamp(handling) };
}
