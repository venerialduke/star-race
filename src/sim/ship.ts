// Components, and what a build adds up to.
//
// The catalogue in design/catalogue/ship-parts.md holds the components as
// arrows — `Thrust↑ Handling↓` — because the numbers are decided at build
// time, which is here. Each entry below cites the row it comes from; the
// values are this file's to choose, the mechanics are not.
//
// A component is stocked only when the race can honour what it does. Since S6
// that is nearly all of them: weapons have ships to reach, and collection has
// an economy to collect into. What is left in `NOT_STOCKED` says what it is
// still waiting for rather than quietly doing nothing.

import type { AbilityId } from './ability';
import type { ShipStats } from './race';
import {
  BASE_ENDURANCE,
  BASE_NAV,
  BASE_HANDLING,
  BASE_REPAIR,
  BASE_SHIELDS,
  BASE_THRUST,
  ABILITY_WORKS,
  STAT_MAX,
  STAT_MIN,
} from './tuning';

export type Category =
  | 'engine'
  | 'shields'
  | 'crew'
  | 'navigation'
  | 'weapons'
  | 'collection';

export interface Level {
  /** What this level adds to the ship's stats. Anything unset adds nothing. */
  readonly thrust?: number;
  readonly handling?: number;
  readonly shields?: number;
  readonly endurance?: number;
  /** A multiplier on shield regeneration, not an addition. */
  readonly shieldRegen?: number;
  /** How fast this crew patches damage back up mid-race. */
  readonly repair?: number;
  /** Navigation: which grades of split this can plan, and whether it can re-plan. */
  readonly nav?: number;
  /** A crew that makes a navigation system better. Worth nothing without one. */
  readonly navBonus?: number;
  /** A share off the price of upgrades, or of buying a slot. */
  readonly upgradeDiscount?: number;
  readonly slotDiscount?: number;
  /** An ability this level grants. Abilities fire themselves; see ability.ts. */
  readonly grants?: AbilityId;
  /** A multiplier on what this ship's weapons carry, and how far they reach. */
  readonly weaponPower?: number;
  /** Keeps the weapon that hits it at full shields, to sell when the race ends. */
  readonly captures?: boolean;
  /** Reads a black hole as a corner rather than a hazard, and takes no damage. */
  readonly readsHoles?: boolean;
  /** Gathers dark matter. At 3 it can cash it in for credits. */
  readonly collects?: number;
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
  /**
   * This particular part, as opposed to another of the same kind. Damage
   * follows the uid, so swapping your build at a pit stop does not hand you a
   * repaired ship — what you kept keeps its dents.
   */
  readonly uid: string;
  readonly componentId: string;
  /** 1, 2 or 3. */
  readonly level: number;
}

/**
 * Carry condition across a change of build: a part you kept keeps what it
 * had, a part you just fitted arrives whole.
 */
export function carryCondition(
  before: readonly Fitted[],
  condition: Condition,
  after: readonly Fitted[],
): Condition {
  const held = new Map(before.map((item, i) => [item.uid, condition.parts[i] ?? 1]));
  return { parts: after.map((item) => held.get(item.uid) ?? 1) };
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
        grants: 'boost',
        slots: 1,
        cost: 40,
        note: 'Harder again — and it boosts down a straight when it has the charge.',
      },
    ],
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
        grants: 'three-bends',
        slots: 2,
        cost: 40,
        note: 'Better again. Takes a run of three bends perfectly, and takes a second slot.',
      },
    ],
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
      {
        shields: 22,
        slots: 1,
        cost: 26,
        note: 'General defence. Soaks the ground off the path.',
      },
      { shields: 40, slots: 1, cost: 24, note: 'More shielding.' },
      { shields: 62, slots: 1, cost: 38, note: 'More again.' },
    ],
  },
  {
    id: 'crew-engineers',
    name: 'Engineers',
    category: 'crew',
    arrows: 'endurance · Shields and abilities recharge↑',
    levels: [
      {
        endurance: 0.55,
        shieldRegen: 1.8,
        repair: 2.2,
        slots: 1,
        cost: 28,
        note: 'Regular endurance; shields recharge faster, and they patch damage well.',
      },
      {
        endurance: 0.7,
        shieldRegen: 2.3,
        repair: 2.8,
        slots: 1,
        cost: 24,
        note: 'Steadier, and faster again.',
      },
      {
        endurance: 0.85,
        shieldRegen: 3,
        repair: 3.4,
        slots: 1,
        cost: 36,
        note: 'Steadier still.',
      },
    ],
  },
  {
    id: 'crew-androids',
    name: 'Androids',
    category: 'crew',
    arrows: 'endurance↑↑↑ · Nav↑',
    levels: [
      {
        endurance: 0.95,
        repair: 1,
        navBonus: 1,
        slots: 1,
        cost: 32,
        note: 'Very strong endurance, and they read a navigation system a grade deeper. No mechanics, though.',
      },
      {
        endurance: 1.15,
        repair: 1.2,
        navBonus: 1,
        slots: 1,
        cost: 26,
        note: 'Stronger again.',
      },
      {
        endurance: 1.4,
        repair: 1.4,
        navBonus: 1,
        slots: 1,
        cost: 40,
        note: 'Unbothered.',
      },
    ],
  },
  {
    id: 'crew-scientists',
    name: 'Human scientists',
    category: 'crew',
    arrows: 'endurance↓ · upgrades cost less',
    levels: [
      {
        endurance: 0.4,
        repair: 1.3,
        upgradeDiscount: 0.25,
        slots: 1,
        cost: 24,
        note: 'Weak endurance; upgrades cost a quarter less.',
      },
      {
        endurance: 0.5,
        repair: 1.5,
        upgradeDiscount: 0.35,
        slots: 1,
        cost: 22,
        note: 'A little hardier, and cheaper still.',
      },
      {
        endurance: 0.6,
        repair: 1.7,
        upgradeDiscount: 0.45,
        slots: 1,
        cost: 34,
        note: 'Nearly half off every upgrade.',
      },
    ],
  },
  {
    id: 'crew-nanites',
    name: 'Nanites',
    category: 'crew',
    arrows: 'endurance↑ · slots cost less',
    levels: [
      {
        endurance: 0.75,
        repair: 4,
        slotDiscount: 0.25,
        slots: 1,
        cost: 30,
        note: 'Strong endurance, slots cost less — and they rebuild damage as you fly.',
      },
      {
        endurance: 0.85,
        repair: 5,
        slotDiscount: 0.35,
        slots: 1,
        cost: 26,
        note: 'Hardier, cheaper expansion, faster rebuilding.',
      },
      {
        endurance: 1,
        repair: 6.5,
        slotDiscount: 0.5,
        slots: 1,
        cost: 38,
        note: 'Slots at half price, and damage barely sticks.',
      },
    ],
  },

  {
    id: 'nav-system',
    name: 'Navigation system',
    category: 'navigation',
    arrows: 'Nav↑',
    levels: [
      {
        nav: 1,
        slots: 1,
        cost: 26,
        note: 'Reads the dim splits, so you can plan a way through them.',
      },
      {
        nav: 2,
        slots: 1,
        cost: 30,
        note: 'Reads the dark ones too: every split on the track is yours to plan.',
      },
      {
        nav: 3,
        slots: 2,
        cost: 44,
        note: 'Takes a second slot, and lets you re-plan the route at a pit stop.',
      },
    ],
  },
{
    id: 'dark-matter-engine',
    name: 'Dark matter engine',
    category: 'engine',
    arrows: 'Thrust↑ · reads black holes',
    levels: [
      {
        thrust: 0.2,
        handling: 0.05,
        readsHoles: true,
        slots: 1,
        cost: 36,
        note: 'Reads a black hole as a corner: through one faster, and unharmed.',
      },
      {
        thrust: 0.32,
        handling: 0.05,
        readsHoles: true,
        grants: 'dark-boost',
        slots: 1,
        cost: 30,
        note: 'Boosts down a straight — and leaves a small black hole behind it.',
      },
      {
        thrust: 0.46,
        handling: 0.06,
        readsHoles: true,
        grants: 'dark-boost',
        slots: 2,
        cost: 46,
        note: 'Harder again, and takes a second slot.',
      },
    ],
  },
  {
    id: 'collector-shield',
    name: 'Collector shield',
    category: 'shields',
    arrows: 'Shields↑ · collects',
    levels: [
      {
        shields: 18,
        collects: 1,
        slots: 1,
        cost: 28,
        note: 'Lighter than general shields, and gathers dark matter off a black hole.',
      },
      {
        shields: 32,
        collects: 2,
        slots: 1,
        cost: 26,
        note: 'More shielding, and gathers more.',
      },
      {
        shields: 48,
        collects: 3,
        captures: true,
        slots: 1,
        cost: 42,
        note: 'Keeps a weapon that hits it at full shields, and cashes dark matter in.',
      },
    ],
  },
  {
    id: 'missile-rack',
    name: 'Missile rack',
    category: 'weapons',
    arrows: 'reach↑ · Thrust↓',
    levels: [
      {
        thrust: -0.06,
        grants: 'missile',
        slots: 1,
        cost: 30,
        note: 'Fires at the ship ahead when it has the charge, pushing it off its line.',
      },
      {
        thrust: -0.06,
        grants: 'missile',
        slots: 1,
        cost: 26,
        note: 'Reaches further, and shoves harder.',
      },
      {
        thrust: -0.07,
        grants: 'missile',
        slots: 2,
        cost: 42,
        note: 'Further and harder again, and takes a second slot.',
      },
    ],
  },
  {
    id: 'gravity-mine',
    name: 'Gravity mines',
    category: 'weapons',
    arrows: 'leaves something behind',
    levels: [
      {
        thrust: -0.04,
        grants: 'mine',
        slots: 1,
        cost: 26,
        note: 'Drops a mine behind you when somebody is chasing. It drags them wide.',
      },
      { thrust: -0.04, grants: 'mine', slots: 1, cost: 24, note: 'Drags harder.' },
      {
        thrust: -0.05,
        grants: 'mine',
        slots: 1,
        cost: 38,
        note: 'Harder again — enough to cost a ship its split.',
      },
    ],
  },
  {
    id: 'tractor-beam',
    name: 'Tractor beam',
    category: 'weapons',
    arrows: 'holds the ship ahead back',
    levels: [
      {
        thrust: -0.05,
        grants: 'tractor',
        slots: 1,
        cost: 28,
        note: 'Pulls back on the ship ahead. It costs them speed, not their line.',
      },
      { thrust: -0.05, grants: 'tractor', slots: 1, cost: 24, note: 'Pulls harder.' },
      {
        thrust: -0.06,
        grants: 'tractor',
        slots: 2,
        cost: 40,
        note: 'Harder and further, and takes a second slot.',
      },
    ],
  },
  {
    id: 'crew-mercenaries',
    name: 'Mercenaries',
    category: 'crew',
    arrows: 'endurance · weapons↑',
    levels: [
      {
        endurance: 0.6,
        repair: 1.1,
        weaponPower: 1.3,
        slots: 1,
        cost: 30,
        note: 'Regular endurance. Every weapon aboard reaches further and hits harder.',
      },
      {
        endurance: 0.7,
        repair: 1.2,
        weaponPower: 1.55,
        slots: 1,
        cost: 26,
        note: 'Better with them again.',
      },
      {
        endurance: 0.8,
        repair: 1.3,
        weaponPower: 1.85,
        slots: 1,
        cost: 38,
        note: 'Nobody gets more out of a weapon.',
      },
    ],
  },
];

/** The rest of the catalogue, and what each is waiting for. Shown, not sold. */
export const NOT_STOCKED: readonly { name: string; waiting: string }[] = [
  { name: 'Deflector shields', waiting: 'hazards as objects, not as ground' },
  { name: 'Augments', waiting: 'a track that can be built from pieces' },
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
export function resolveBuild(
  fitted: readonly Fitted[],
  condition: Condition = { parts: [] },
): ShipStats {
  let thrust = BASE_THRUST;
  let handling = BASE_HANDLING;
  let shields = BASE_SHIELDS;
  let endurance = BASE_ENDURANCE;
  let shieldRegen = 1;
  let repair = BASE_REPAIR;
  let nav = BASE_NAV;
  let navBonus = 0;
  let weaponPower = 1;
  let captures = false;
  let readsHoles = false;
  let collects = 0;
  fitted.forEach((item, i) => {
    const level = levelOf(item);
    if (level === undefined) return;
    // A damaged component gives less of whatever it gives.
    const worth = condition.parts[i] ?? 1;
    thrust += (level.thrust ?? 0) * worth;
    handling += (level.handling ?? 0) * worth;
    shields += (level.shields ?? 0) * worth;
    // Crews do not stack: the ship is flown by the best of them, and a hurt
    // crew is worth less than a whole one.
    endurance = Math.max(endurance, (level.endurance ?? 0) * worth);
    shieldRegen = Math.max(shieldRegen, (level.shieldRegen ?? 1) * worth);
    repair = Math.max(repair, (level.repair ?? 0) * worth);
    // Navigation is a gate, not a quantity: the best system aboard flies the
    // ship. A broken one reads less far, so damage can cost you a split.
    nav = Math.max(nav, Math.floor((level.nav ?? 0) * worth));
    navBonus = Math.max(navBonus, (level.navBonus ?? 0) * worth);
    // Weapons crews do not stack either: the best of them works every weapon.
    weaponPower = Math.max(weaponPower, (level.weaponPower ?? 1) * worth);
    // What a part *is* rather than what it adds: a broken one stops being it.
    const working = worth >= ABILITY_WORKS;
    captures = captures || (level.captures === true && working);
    readsHoles = readsHoles || (level.readsHoles === true && working);
    collects = Math.max(collects, working ? (level.collects ?? 0) : 0);
  });
  const clamp = (v: number): number => Math.min(STAT_MAX, Math.max(STAT_MIN, v));
  return {
    thrust: clamp(thrust),
    handling: clamp(handling),
    shields: Math.max(0, shields),
    endurance,
    shieldRegen,
    repair,
    // A crew that reads navigation well is worth nothing without one to read.
    nav: nav > 0 ? nav + Math.floor(navBonus) : 0,
    weaponPower,
    captures,
    readsHoles,
    collects,
  };
}

/**
 * A bare ship with the two stats named and nothing else fitted — no shields,
 * no crew. Tests use it to talk about a build without shopping.
 */
export function bareShip(thrust: number, handling: number): ShipStats {
  return {
    thrust,
    handling,
    shields: BASE_SHIELDS,
    endurance: BASE_ENDURANCE,
    shieldRegen: 1,
    repair: BASE_REPAIR,
    nav: BASE_NAV,
    weaponPower: 1,
    captures: false,
    readsHoles: false,
    collects: 0,
  };
}

/**
 * How intact each fitted part is. Damage is only ever about what a part is
 * still worth — there is no hull and no frame behind it, because a second
 * pool of integrity was bookkeeping that changed nothing the player could
 * see. Everything is repaired between races.
 */
export interface Condition {
  readonly parts: readonly number[];
}

export function fullCondition(fitted: readonly Fitted[]): Condition {
  return { parts: fitted.map(() => 1) };
}

/** The average of every part, for a readout that has to be one number. */
export function integrity(condition: Condition): number {
  if (condition.parts.length === 0) return 1;
  return condition.parts.reduce((sum, c) => sum + c, 0) / condition.parts.length;
}

/** The best discount fitted, as a share off. Discounts do not stack either. */
export function discount(
  fitted: readonly Fitted[],
  kind: 'upgradeDiscount' | 'slotDiscount',
): number {
  return fitted.reduce((best, item) => Math.max(best, levelOf(item)?.[kind] ?? 0), 0);
}
