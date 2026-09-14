// The garage: credits, slots, what you own and what is fitted.
//
// The shop is a place components live, not a moment they are sold in. You
// buy into the garage, fit from it, remove back into it, and sell out of it.
// Slots are the on-ship budget; credits are the off-ship one.
//
// Pure: every operation returns a new garage, or the old one when the move is
// not allowed. Nothing here knows about the screen.

import { componentById, slotsOf, upgradeCost, type Fitted } from './ship';
import { SELL_RETURN, SLOTS_AT_START, SLOT_PER_FINISH, STARTING_CREDITS } from './tuning';

export interface Garage {
  readonly credits: number;
  /** Counts up so every part bought gets an id of its own. */
  readonly bought: number;
  readonly slots: number;
  /** Owned and fitted, in the order they were fitted. */
  readonly fitted: readonly Fitted[];
  /** Owned and on the shelf. */
  readonly shelf: readonly Fitted[];
}

export function newGarage(): Garage {
  return {
    credits: STARTING_CREDITS,
    bought: 0,
    slots: SLOTS_AT_START,
    fitted: [],
    shelf: [],
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

/** Fit something off the shelf, if the slots are there for it. */
export function fit(garage: Garage, shelfIndex: number): Garage {
  const item = garage.shelf[shelfIndex];
  if (item === undefined || slotsOf(item) > slotsFree(garage)) return garage;
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
 * Upgrade a fitted component. A level that grows has to have the slot free
 * for it, which is the trade the catalogue asks for: deeper, or wider.
 */
export function upgrade(garage: Garage, fittedIndex: number): Garage {
  const item = garage.fitted[fittedIndex];
  if (item === undefined) return garage;
  const cost = upgradeCost(item);
  if (cost === undefined || cost > garage.credits) return garage;
  const next: Fitted = { ...item, level: item.level + 1 };
  const growth = slotsOf(next) - slotsOf(item);
  if (growth > slotsFree(garage)) return garage;
  return {
    ...garage,
    credits: garage.credits - cost,
    fitted: garage.fitted.map((f, i) => (i === fittedIndex ? next : f)),
  };
}

/** Finishing a race pays a slot. It is the only thing that does, so far. */
export function finishRace(garage: Garage): Garage {
  return { ...garage, slots: garage.slots + SLOT_PER_FINISH };
}
