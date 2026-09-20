// The garage: credits, slots, what you own and what is fitted.
//
// The shop is a place components live, not a moment they are sold in. You
// buy into the garage, fit from it, remove back into it, and sell out of it.
// Slots are the on-ship budget; credits are the off-ship one.
//
// Pure: every operation returns a new garage, or the old one when the move is
// not allowed. Nothing here knows about the screen.

import { COMPONENTS, componentById, slotsOf, upgradeCost, type Fitted } from './ship';
import { makeRng } from './rng';
import {
  PROGRESS_PRICE,
  REROLL_COST,
  RESEARCH_PER_COPY,
  RESEARCH_FOR_LEVEL,
  FIT_LIMIT,
  SELL_RETURN,
  SHOP_OFFERS,
  SLOTS_AT_START,
  SLOT_COST_BASE,
  SLOT_COST_STEP,
  SLOT_PROGRESS_PER_FINISH,
  STARTING_CREDITS,
} from './tuning';

export interface Garage {
  readonly credits: number;
  /** Counts up so every part bought gets an id of its own. */
  readonly bought: number;
  readonly slots: number;
  /** Owned and fitted, in the order they were fitted. */
  readonly fitted: readonly Fitted[];
  /** Owned and on the shelf. */
  readonly shelf: readonly Fitted[];
  /** Banked toward the next slot. Slots are bought now, not handed over. */
  readonly progress: number;
  /**
   * Research banked per component, from breaking copies of it down. An upgrade
   * spends this before it spends credits.
   */
  readonly research: Readonly<Record<string, number>>;
  /** What the shop is offering, as component ids. Empty until it is drawn. */
  readonly offer: readonly string[];
  /**
   * Rerolls taken since the offer last refreshed.
   *
   * Not a price any more — a reroll is flat — but the draw is seeded off it, so
   * this is what makes the second look at the shop show something other than
   * the first.
   */
  readonly rerolls: number;
}

export function newGarage(): Garage {
  return {
    credits: STARTING_CREDITS,
    bought: 0,
    slots: SLOTS_AT_START,
    fitted: [],
    shelf: [],
    progress: 0,
    research: {},
    offer: [],
    rerolls: 0,
  };
}

export function slotsUsed(garage: Garage): number {
  return garage.fitted.reduce((sum, item) => sum + slotsOf(item), 0);
}

export function slotsFree(garage: Garage): number {
  return garage.slots - slotsUsed(garage);
}

/** Buy a component at level 1. It lands on the shelf, not on the ship. */
export function buy(garage: Garage, componentId: string): Garage {
  const component = componentById(componentId);
  const cost = component?.levels[0]?.cost;
  if (component === undefined || cost === undefined || cost > garage.credits)
    return garage;
  return {
    ...garage,
    credits: garage.credits - cost,
    bought: garage.bought + 1,
    shelf: [...garage.shelf, { uid: `p${garage.bought}`, componentId, level: 1 }],
  };
}

/**
 * How many of this component's category are already on the ship, and how many
 * are allowed. A category nobody limited returns Infinity.
 */
export function roomFor(garage: Garage, componentId: string): number {
  const category = componentById(componentId)?.category;
  if (category === undefined) return 0;
  const limit = FIT_LIMIT[category] ?? Infinity;
  const already = garage.fitted.filter(
    (item) => componentById(item.componentId)?.category === category,
  ).length;
  return limit - already;
}

/**
 * Fit something off the shelf, if the slots are there for it and the ship is
 * allowed another of its kind.
 *
 * **A ship carries one engine.** That is the rule the slot budget was being
 * asked to enforce and never could: four tuning passes tried to price a second
 * engine out of existence, and the answer was that no price works on a part
 * whose only cost is credits. A limit is not a price.
 */
export function fit(garage: Garage, shelfIndex: number): Garage {
  const item = garage.shelf[shelfIndex];
  if (item === undefined || slotsOf(item) > slotsFree(garage)) return garage;
  if (roomFor(garage, item.componentId) <= 0) return garage;
  return {
    ...garage,
    fitted: [...garage.fitted, item],
    shelf: garage.shelf.filter((_, i) => i !== shelfIndex),
  };
}

/** Take something off the ship. It goes back on the shelf, not away. */
export function remove(garage: Garage, fittedIndex: number): Garage {
  const item = garage.fitted[fittedIndex];
  if (item === undefined) return garage;
  return {
    ...garage,
    fitted: garage.fitted.filter((_, i) => i !== fittedIndex),
    shelf: [...garage.shelf, item],
  };
}

/** What a component sells for: what was paid for it, less the shop's cut. */
export function sellValue(item: Fitted): number {
  const component = componentById(item.componentId);
  if (component === undefined) return 0;
  const paid = component.levels
    .slice(0, item.level)
    .reduce((sum, level) => sum + level.cost, 0);
  return Math.round(paid * SELL_RETURN);
}

/** Sell off the shelf. Fitted components must be removed first. */
export function sell(garage: Garage, shelfIndex: number): Garage {
  const item = garage.shelf[shelfIndex];
  if (item === undefined) return garage;
  return {
    ...garage,
    credits: garage.credits + sellValue(item),
    shelf: garage.shelf.filter((_, i) => i !== shelfIndex),
  };
}

/**
 * What it costs to take this component to its next level, in copies broken
 * down. Undefined when there is no next level.
 */
export function researchNeeded(level: number): number | undefined {
  return RESEARCH_FOR_LEVEL[level - 1];
}

/** Whether this component's next level is paid for in research already. */
export function researched(garage: Garage, componentId: string, level: number): boolean {
  const need = researchNeeded(level);
  return need !== undefined && (garage.research[componentId] ?? 0) >= need;
}

/**
 * Upgrade a fitted component. A level that grows has to have the slot free
 * for it, which is the trade the catalogue asks for: deeper, or wider.
 *
 * **Credits cannot buy a level.** The only way up is more of the same
 * component, broken down — two copies for the second level, four for the
 * third. Paying for depth in money made deep parts a matter of income; paying
 * for it in copies makes them a matter of what the shop has been offering, and
 * of being willing to spend a window on something you already own.
 */
export function upgrade(garage: Garage, fittedIndex: number): Garage {
  const item = garage.fitted[fittedIndex];
  if (item === undefined) return garage;
  // No next level to reach.
  if (upgradeCost(item) === undefined) return garage;
  const need = researchNeeded(item.level);
  const had = garage.research[item.componentId] ?? 0;
  if (need === undefined || had < need) return garage;
  const next: Fitted = { ...item, level: item.level + 1 };
  const growth = slotsOf(next) - slotsOf(item);
  if (growth > slotsFree(garage)) return garage;
  return {
    ...garage,
    research: { ...garage.research, [item.componentId]: had - need },
    fitted: garage.fitted.map((f, i) => (i === fittedIndex ? next : f)),
  };
}

/**
 * What the next slot costs, in progress.
 *
 * Rising with the number already held, so the ship that has the most room pays
 * the most for more of it. A flat price would mean the slot budget stops
 * mattering exactly when a build is big enough for it to matter most.
 */
export function slotCost(slots: number): number {
  return SLOT_COST_BASE + SLOT_COST_STEP * Math.max(0, slots - SLOTS_AT_START);
}

/** Turn banked progress into slots, as many as it pays for. */
function claim(garage: Garage): Garage {
  let { slots, progress } = garage;
  // A loop rather than one step, because buying progress in bulk can cross
  // more than one threshold and a slot owed is a slot owed.
  while (progress >= slotCost(slots)) {
    progress -= slotCost(slots);
    slots += 1;
  }
  return progress === garage.progress ? garage : { ...garage, slots, progress };
}

/**
 * Finishing a race banks progress toward the next slot.
 *
 * It used to hand over the slot itself. That is the change: a slot is the only
 * budget in the game that ever says no to a build, and one arriving every heat
 * said no to nothing.
 */
export function finishRace(garage: Garage): Garage {
  return claim({ ...garage, progress: garage.progress + SLOT_PROGRESS_PER_FINISH });
}

/** Buy a unit of progress toward the next slot. Credits are the other budget. */
export function buyProgress(garage: Garage): Garage {
  if (PROGRESS_PRICE > garage.credits) return garage;
  return claim({
    ...garage,
    credits: garage.credits - PROGRESS_PRICE,
    progress: garage.progress + 1,
  });
}

/**
 * What the shop is offering: components drawn at random, not the whole
 * catalogue.
 *
 * **Drawn with replacement, on purpose.** A duplicate in the same window is
 * not a wasted offer — it is what `breakDown` turns into an upgrade, which is
 * the whole reason the draw and the research ladder belong in the same change.
 */
export function drawOffer(garage: Garage, seed: number): Garage {
  const rng = makeRng(seed);
  const offer = Array.from(
    { length: SHOP_OFFERS },
    () => (COMPONENTS[Math.floor(rng.unitInterval() * COMPONENTS.length)] as { id: string }).id,
  );
  return { ...garage, offer, rerolls: 0 };
}

/** What a reroll costs. The same every time, however many you have taken. */
export function rerollCost(): number {
  return REROLL_COST;
}

/** Pay for a fresh set of offers. The price rises within a trip. */
export function reroll(garage: Garage, seed: number): Garage {
  const cost = rerollCost();
  if (cost > garage.credits) return garage;
  const rolled = drawOffer(garage, seed);
  return {
    ...rolled,
    credits: garage.credits - cost,
    rerolls: garage.rerolls + 1,
  };
}

/**
 * Buy one of the things on offer. It leaves the window when it is taken.
 *
 * Separate from `buy` rather than replacing it, because the rivals still shop
 * from the whole catalogue and the balance harness shops as they do. When that
 * changes, this is the function they move to.
 */
export function buyOffer(garage: Garage, offerIndex: number): Garage {
  const componentId = garage.offer[offerIndex];
  if (componentId === undefined) return garage;
  const bought = buy(garage, componentId);
  if (bought === garage) return garage;
  return { ...bought, offer: garage.offer.filter((_, i) => i !== offerIndex) };
}

/**
 * Break a component on the shelf down into research toward its own next level.
 *
 * What a duplicate is for. Selling one back returns a fraction of its credits;
 * breaking it down returns nothing spendable and buys a level of the thing you
 * already fly, which is the better deal whenever you have somewhere to put it.
 */
export function breakDown(garage: Garage, shelfIndex: number): Garage {
  const item = garage.shelf[shelfIndex];
  if (item === undefined) return garage;
  const had = garage.research[item.componentId] ?? 0;
  return {
    ...garage,
    shelf: garage.shelf.filter((_, i) => i !== shelfIndex),
    research: { ...garage.research, [item.componentId]: had + RESEARCH_PER_COPY },
  };
}

/**
 * Buy a copy and break it straight down: research, in one move.
 *
 * What the rivals and the balance policies use, because a bot has no hands and
 * the two-step version is a thing a player does with two clicks. It is the same
 * two operations in the same order.
 */
export function buyResearch(garage: Garage, componentId: string): Garage {
  const bought = buy(garage, componentId);
  if (bought === garage) return garage;
  return breakDown(bought, bought.shelf.length - 1);
}
