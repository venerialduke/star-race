// The garage. Unlike the race, these answers are numbers rather than feel, so
// they are worth pinning: a shop that lets you fit what you cannot afford, or
// overfill your slots, is a bug you would only find by losing a heat to it.

import { describe, expect, it } from 'vitest';
import {
  breakDown,
  buy,
  buyOffer,
  buyProgress,
  drawOffer,
  fit,
  finishRace,
  newGarage,
  remove,
  reroll,
  rerollCost,
  researched,
  sell,
  sellValue,
  slotCost,
  slotsFree,
  slotsUsed,
  upgrade,
  type Garage,
} from '../../src/sim/garage';
import { resolveBuild, upgradeCost } from '../../src/sim/ship';
import {
  BASE_HANDLING,
  BASE_THRUST,
  PROGRESS_PRICE,
  REROLL_COST,
  REROLL_STEP,
  SHOP_OFFERS,
  SLOTS_AT_START,
  SLOT_COST_BASE,
  SLOT_PROGRESS_PER_FINISH,
} from '../../src/sim/tuning';

const stocked = (garage: Garage, id: string, times = 1): Garage => {
  let next = garage;
  for (let i = 0; i < times; i += 1) next = buy(next, id);
  return next;
};

/** Buy it and put it on the ship. */
const fitted = (garage: Garage, id: string): Garage => {
  const bought = buy(garage, id);
  return fit(bought, bought.shelf.length - 1);
};

describe('the garage', () => {
  it('opens with credits, slots and an empty ship', () => {
    const garage = newGarage();
    expect(garage.credits).toBeGreaterThan(0);
    expect(garage.slots).toBe(SLOTS_AT_START);
    expect(garage.fitted).toHaveLength(0);
    const stats = resolveBuild(garage.fitted);
    expect(stats.thrust).toBe(BASE_THRUST);
    expect(stats.handling).toBe(BASE_HANDLING);
    expect(stats.shields).toBe(0);
  });

  it('buys onto the shelf, not onto the ship', () => {
    const garage = buy(newGarage(), 'speed-engine');
    expect(garage.shelf).toHaveLength(1);
    expect(garage.fitted).toHaveLength(0);
    expect(garage.credits).toBeLessThan(newGarage().credits);
  });

  it('refuses what cannot be afforded', () => {
    const broke: Garage = { ...newGarage(), credits: 0 };
    expect(buy(broke, 'speed-engine')).toBe(broke);
  });

  it('fits, removes back to the shelf, and sells from the shelf', () => {
    const on = fitted(newGarage(), 'speed-engine');
    expect(on.fitted).toHaveLength(1);
    expect(slotsUsed(on)).toBe(1);

    const off = remove(on, 0);
    expect(off.fitted).toHaveLength(0);
    expect(off.shelf).toHaveLength(1);

    const sold = sell(off, 0);
    expect(sold.shelf).toHaveLength(0);
    expect(sold.credits).toBe(off.credits + sellValue(off.shelf[0]!));
  });

  it('never lets a build outgrow its slots', () => {
    let garage: Garage = { ...newGarage(), credits: 1000 };
    garage = stocked(garage, 'balanced-engine', 6);
    for (let i = 0; i < 6; i += 1) garage = fit(garage, 0);
    expect(slotsUsed(garage)).toBeLessThanOrEqual(garage.slots);
    expect(slotsFree(garage)).toBe(0);
  });

  it('upgrades a fitted component, and a growing level needs the slot free', () => {
    let garage: Garage = { ...newGarage(), credits: 1000 };
    garage = fitted(garage, 'handling-engine');
    garage = upgrade(garage, 0);
    expect(garage.fitted[0]?.level).toBe(2);
    expect(slotsUsed(garage)).toBe(1);

    // Level 3 of this engine takes a second slot: it fits here, with 3 free.
    garage = upgrade(garage, 0);
    expect(garage.fitted[0]?.level).toBe(3);
    expect(slotsUsed(garage)).toBe(2);

    // With every other slot filled, the same upgrade is refused.
    let tight: Garage = { ...newGarage(), credits: 1000, slots: 2 };
    tight = fitted(tight, 'handling-engine');
    tight = fitted(tight, 'speed-engine');
    tight = upgrade(tight, 0);
    tight = upgrade(tight, 0);
    expect(tight.fitted[0]?.level).toBe(2);
  });

  it('pays progress toward a slot for finishing a race, not the slot', () => {
    const once = finishRace(newGarage());
    expect(once.slots).toBe(SLOTS_AT_START);
    expect(once.progress).toBe(SLOT_PROGRESS_PER_FINISH);
  });
});

describe('a slot has a price now', () => {
  it('takes several finishes to buy one, and more for the one after', () => {
    // The whole point of the change: nine heats used to buy nine slots, so the
    // slot budget never said no to anything. Now it does.
    let garage = newGarage();
    const first = slotCost(garage.slots);
    for (let i = 0; i < first; i += 1) {
      expect(garage.slots, `slot arrived after ${i} finishes`).toBe(SLOTS_AT_START);
      garage = finishRace(garage);
    }
    expect(garage.slots).toBe(SLOTS_AT_START + 1);
    expect(garage.progress).toBe(0);
    expect(slotCost(garage.slots)).toBeGreaterThan(first);
  });

  it('costs a whole season what it used to cost a third of one', () => {
    // Nine heats, every one finished. Three slots and change, against nine.
    let garage = newGarage();
    for (let i = 0; i < 9; i += 1) garage = finishRace(garage);
    expect(garage.slots).toBe(SLOTS_AT_START + 3);
    expect(garage.slots).toBeLessThan(SLOTS_AT_START + 9);
  });

  it('starts at the base price and rises by the step', () => {
    expect(slotCost(SLOTS_AT_START)).toBe(SLOT_COST_BASE);
    for (let n = SLOTS_AT_START; n < SLOTS_AT_START + 5; n += 1) {
      expect(slotCost(n + 1)).toBeGreaterThan(slotCost(n));
    }
  });

  it('lets credits buy progress, and refuses when they run out', () => {
    const rich = { ...newGarage(), credits: PROGRESS_PRICE * 2 };
    const once = buyProgress(rich);
    expect(once.progress).toBe(1);
    expect(once.credits).toBe(PROGRESS_PRICE);
    const twice = buyProgress(once);
    // Two units is a slot at the opening price, so it should have been claimed.
    expect(twice.slots).toBe(SLOTS_AT_START + 1);
    expect(twice.credits).toBe(0);
    // And nothing happens on an empty purse.
    expect(buyProgress(twice)).toBe(twice);
  });

  it('claims every slot a bulk purchase pays for, not just one', () => {
    // Buying progress in one go can cross more than one threshold. A slot owed
    // is a slot owed, which is why claiming is a loop.
    const loaded = { ...newGarage(), progress: 20 };
    const settled = finishRace(loaded);
    expect(settled.slots).toBeGreaterThan(SLOTS_AT_START + 2);
    expect(settled.progress).toBeLessThan(slotCost(settled.slots));
  });
});

describe('the shop is a window, not a catalogue', () => {
  it('offers a fixed few, drawn from the seed', () => {
    const offered = drawOffer(newGarage(), 7);
    expect(offered.offer).toHaveLength(SHOP_OFFERS);
    expect(drawOffer(newGarage(), 7).offer).toEqual(offered.offer);
    expect(drawOffer(newGarage(), 8).offer).not.toEqual(offered.offer);
  });

  it('takes what is bought out of the window', () => {
    const offered = drawOffer({ ...newGarage(), credits: 500 }, 7);
    const want = offered.offer[1];
    const bought = buyOffer(offered, 1);
    expect(bought.offer).toHaveLength(SHOP_OFFERS - 1);
    expect(bought.shelf.at(-1)?.componentId).toBe(want);
    expect(bought.credits).toBeLessThan(offered.credits);
  });

  it('will not sell what it is not offering', () => {
    const offered = drawOffer({ ...newGarage(), credits: 500 }, 7);
    expect(buyOffer(offered, SHOP_OFFERS)).toBe(offered);
    expect(buyOffer(offered, -1)).toBe(offered);
  });

  it('charges more for each reroll of the same trip', () => {
    const rich = drawOffer({ ...newGarage(), credits: 500 }, 7);
    expect(rerollCost(rich)).toBe(REROLL_COST);
    const once = reroll(rich, 8);
    expect(once.credits).toBe(rich.credits - REROLL_COST);
    expect(once.offer).not.toEqual(rich.offer);
    expect(rerollCost(once)).toBe(REROLL_COST + REROLL_STEP);
    const twice = reroll(once, 9);
    expect(twice.credits).toBe(once.credits - REROLL_COST - REROLL_STEP);
  });

  it('resets the reroll price when the window refreshes', () => {
    // Refreshing between heats is free. The rising price is for wanting a
    // different four *now*, and it should not follow you into the next heat.
    const rolled = reroll(drawOffer({ ...newGarage(), credits: 500 }, 7), 8);
    expect(rolled.rerolls).toBe(1);
    expect(drawOffer(rolled, 9).rerolls).toBe(0);
    expect(rerollCost(drawOffer(rolled, 9))).toBe(REROLL_COST);
  });

  it('refuses a reroll that cannot be paid for', () => {
    const broke = { ...drawOffer(newGarage(), 7), credits: REROLL_COST - 1 };
    expect(reroll(broke, 8)).toBe(broke);
  });
});

describe('breaking a component down for research', () => {
  it('turns a spare into a level of the thing you already fly', () => {
    let garage = { ...newGarage(), credits: 500 };
    garage = fitted(garage, 'speed-engine');
    garage = buy(garage, 'speed-engine');
    expect(researched(garage, 'speed-engine')).toBe(false);

    garage = breakDown(garage, garage.shelf.length - 1);
    expect(garage.shelf).toHaveLength(0);
    expect(researched(garage, 'speed-engine')).toBe(true);

    const before = garage.credits;
    const up = upgrade(garage, 0);
    expect(up.fitted[0]?.level).toBe(2);
    // Paid for already, so the counter takes nothing.
    expect(up.credits).toBe(before);
    expect(researched(up, 'speed-engine')).toBe(false);
  });

  it('is worth more than selling the same spare, which is the point', () => {
    let garage = { ...newGarage(), credits: 500 };
    garage = fitted(garage, 'speed-engine');
    garage = buy(garage, 'speed-engine');
    const spare = garage.shelf[garage.shelf.length - 1]!;
    const backIfSold = sellValue(spare);
    const savedIfBroken = upgradeCost(garage.fitted[0]!) ?? 0;
    expect(savedIfBroken).toBeGreaterThan(backIfSold);
  });

  it('researches the component it was, not whatever is being upgraded', () => {
    let garage = { ...newGarage(), credits: 500 };
    garage = fitted(garage, 'speed-engine');
    garage = buy(garage, 'handling-engine');
    garage = breakDown(garage, garage.shelf.length - 1);
    expect(researched(garage, 'handling-engine')).toBe(true);
    expect(researched(garage, 'speed-engine')).toBe(false);
    // So the speed engine still costs credits.
    const before = garage.credits;
    expect(upgrade(garage, 0).credits).toBeLessThan(before);
  });

  it('leaves a rival paying credits, because it never breaks anything down', () => {
    // The rivals still shop the whole catalogue and never research. Nothing
    // about this change may reach them, or the balance harness stops comparing
    // like with like — which it already only just does.
    let bot = { ...newGarage(), credits: 500 };
    bot = fitted(bot, 'speed-engine');
    const cost = upgradeCost(bot.fitted[0]!) ?? 0;
    expect(upgrade(bot, 0).credits).toBe(bot.credits - cost);
    expect(bot.research).toEqual({});
  });

  it('ignores a shelf index that is not there', () => {
    const garage = newGarage();
    expect(breakDown(garage, 0)).toBe(garage);
    expect(breakDown(garage, -1)).toBe(garage);
  });
});

describe('a build', () => {
  it('is the sum of what is fitted, and stacks', () => {
    const one = fitted(newGarage(), 'speed-engine');
    const two = fitted(one, 'speed-engine');
    expect(resolveBuild(one.fitted).thrust).toBeGreaterThan(BASE_THRUST);
    expect(resolveBuild(two.fitted).thrust).toBeGreaterThan(
      resolveBuild(one.fitted).thrust,
    );
  });

  it('trades: the speed engine costs handling, the handling engine costs speed', () => {
    const fast = resolveBuild(fitted(newGarage(), 'speed-engine').fitted);
    const nimble = resolveBuild(fitted(newGarage(), 'handling-engine').fitted);
    expect(fast.thrust).toBeGreaterThan(nimble.thrust);
    expect(nimble.handling).toBeGreaterThan(fast.handling);
    expect(fast.handling).toBeLessThan(BASE_HANDLING);
  });

  it('gets better as it is upgraded', () => {
    let garage = { ...newGarage(), credits: 1000 };
    garage = fitted(garage, 'speed-engine');
    const level1 = resolveBuild(garage.fitted).thrust;
    garage = upgrade(garage, 0);
    expect(resolveBuild(garage.fitted).thrust).toBeGreaterThan(level1);
  });
});
