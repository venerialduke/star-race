// Components, and what a build adds up to.
//
// The catalogue in design/catalogue/ship-parts.md holds the components as
// arrows — `Thrust↑ Handling↓` — because the numbers are decided at build
// time, which is here. Each entry below cites the row it comes from; the
// values are this file's to choose, the mechanics are not.
//
// A component is stocked only when the race can honour what it does. Engines,
// shields and crew are. Navigation still needs splits, weapons need something
// to hit, collection needs an economy — those say what they are waiting for
// instead of quietly doing nothing.

import type { ShipStats } from './race';
import {
  BASE_ENDURANCE,
  BASE_HANDLING,
  BASE_HULL,
  BASE_SHIELDS,
  BASE_THRUST,
  STAT_MAX,
  STAT_MIN,
} from './tuning';

export type Category = 'engine' | 'shields' | 'crew';

export interface Level {
  /** What this level adds to the ship's stats. Anything unset adds nothing. */
  readonly thrust?: number;
  readonly handling?: number;
  readonly shields?: number;
  readonly endurance?: number;
  /** A multiplier on shield regeneration, not an addition. */
  readonly shieldRegen?: number;
  /** A share off the price of upgrades, or of buying a slot. */
  readonly upgradeDiscount?: number;
  readonly slotDiscount?: number;
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
    waiting: 'its inertia dampeners',
  },
  {
    id: 'general-shields',
    name: 'General shields',
    category: 'shields',
    arrows: 'Shields↑',
    levels: [
      { shields: 22, slots: 1, cost: 26, note: 'General defence. Soaks the ground off the path.' },
      { shields: 40, slots: 1, cost: 24, note: 'More shielding.' },
      { shields: 62, slots: 1, cost: 38, note: 'More again.' },
    ],
  },
  {
    id: 'crew-engineers',
    name: 'Engineers',
    category: 'crew',
    arrows: 'endurance · Shields recharge↑',
    levels: [
      { endurance: 0.55, shieldRegen: 1.8, slots: 1, cost: 28, note: 'Regular endurance; shields recharge faster.' },
      { endurance: 0.7, shieldRegen: 2.3, slots: 1, cost: 24, note: 'Steadier, and faster again.' },
      { endurance: 0.85, shieldRegen: 3, slots: 1, cost: 36, note: 'Steadier still.' },
    ],
    waiting: 'the ability half of "shields and abilities recharge faster"',
  },
  {
    id: 'crew-androids',
    name: 'Androids',
    category: 'crew',
    arrows: 'endurance↑↑↑',
    levels: [
      { endurance: 0.95, slots: 1, cost: 32, note: 'Very strong endurance. Gravity barely touches them.' },
      { endurance: 1.15, slots: 1, cost: 26, note: 'Stronger again.' },
      { endurance: 1.4, slots: 1, cost: 40, note: 'Unbothered.' },
    ],
    waiting: 'their better navigation — navigation needs splits',
  },
  {
    id: 'crew-scientists',
    name: 'Human scientists',
    category: 'crew',
    arrows: 'endurance↓ · upgrades cost less',
    levels: [
      { endurance: 0.4, upgradeDiscount: 0.25, slots: 1, cost: 24, note: 'Weak endurance; upgrades cost a quarter less.' },
      { endurance: 0.5, upgradeDiscount: 0.35, slots: 1, cost: 22, note: 'A little hardier, and cheaper still.' },
      { endurance: 0.6, upgradeDiscount: 0.45, slots: 1, cost: 34, note: 'Nearly half off every upgrade.' },
    ],
  },
  {
    id: 'crew-nanites',
    name: 'Nanites',
    category: 'crew',
    arrows: 'endurance↑ · slots cost less',
    levels: [
      { endurance: 0.75, slotDiscount: 0.25, slots: 1, cost: 30, note: 'Strong endurance; slots cost a quarter less.' },
      { endurance: 0.85, slotDiscount: 0.35, slots: 1, cost: 26, note: 'Hardier, and cheaper expansion.' },
      { endurance: 1, slotDiscount: 0.5, slots: 1, cost: 38, note: 'Slots at half price.' },
    ],
  },
];

/** The rest of the catalogue, and what each is waiting for. Shown, not sold. */
export const NOT_STOCKED: readonly { name: string; waiting: string }[] = [
  { name: 'Navigation', waiting: 'splits — every sector has one way through it' },
  { name: 'Weapons', waiting: 'ships that can reach each other' },
  { name: 'Collection', waiting: 'an economy to collect into' },
  { name: 'Deflector shields', waiting: 'hazards as objects, not as ground' },
  { name: 'Collector shield', waiting: 'dark matter to collect' },
  { name: 'Mercenaries', waiting: 'weapons for them to be good with' },
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
  let shields = BASE_SHIELDS;
  let endurance = BASE_ENDURANCE;
  let shieldRegen = 1;
  for (const item of fitted) {
    const level = levelOf(item);
    if (level === undefined) continue;
    thrust += level.thrust ?? 0;
    handling += level.handling ?? 0;
    shields += level.shields ?? 0;
    // Crews do not stack their endurance: the ship is flown by the best of them.
    endurance = Math.max(endurance, level.endurance ?? 0);
    shieldRegen = Math.max(shieldRegen, level.shieldRegen ?? 1);
  }
  const clamp = (v: number): number => Math.min(STAT_MAX, Math.max(STAT_MIN, v));
  return {
    thrust: clamp(thrust),
    handling: clamp(handling),
    shields,
    hull: BASE_HULL,
    endurance,
    shieldRegen,
  };
}

/**
 * A bare ship with the two stats named and nothing else fitted — no shields,
 * no crew. Bots and tests use it to talk about a build without shopping.
 */
export function bareShip(thrust: number, handling: number): ShipStats {
  return {
    thrust,
    handling,
    shields: BASE_SHIELDS,
    hull: BASE_HULL,
    endurance: BASE_ENDURANCE,
    shieldRegen: 1,
  };
}

/** The best discount fitted, as a share off. Discounts do not stack either. */
export function discount(
  fitted: readonly Fitted[],
  kind: 'upgradeDiscount' | 'slotDiscount',
): number {
  return fitted.reduce((best, item) => Math.max(best, levelOf(item)?.[kind] ?? 0), 0);
}
