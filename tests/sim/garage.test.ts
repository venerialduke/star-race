// The garage. Unlike the race, these answers are numbers rather than feel, so
// they are worth pinning: a shop that lets you fit what you cannot afford, or
// overfill your slots, is a bug you would only find by losing a heat to it.

import { describe, expect, it } from 'vitest';
import {
  breakDown,
  buy,
  buyOffer,
  buyResearch,
  buyProgress,
  drawOffer,
  fit,
  finishRace,
  newGarage,
  remove,
  reroll,
  rerollCost,
  researchNeeded,
  researched,
  roomFor,
  sell,
  sellValue,
  slotCost,
  slotsFree,
  slotsUsed,
  upgrade,
  type Garage,
} from '../../src/sim/garage';
import { COMPONENTS, resolveBuild } from '../../src/sim/ship';
import {
  BASE_HANDLING,
  BASE_THRUST,
  PROGRESS_PRICE,
  REROLL_COST,
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
    // Shields rather than engines, because a ship carries one engine now and
    // this is meant to be testing the slot budget, not that limit.
    let garage: Garage = { ...newGarage(), credits: 1000 };
    garage = stocked(garage, 'general-shields', 6);
    for (let i = 0; i < 6; i += 1) garage = fit(garage, 0);
    expect(slotsUsed(garage)).toBeLessThanOrEqual(garage.slots);
    expect(slotsFree(garage)).toBe(0);
  });

  it('upgrades a fitted component, and a growing level needs the slot free', () => {
    // Levels are paid for in copies now, so the ladder is bought before it is
    // climbed: two for the second, four for the third.
    const copies = (garage: Garage, id: string, n: number): Garage => {
      let next = garage;
      for (let i = 0; i < n; i += 1) next = buyResearch(next, id);
      return next;
    };

    let garage: Garage = { ...newGarage(), credits: 2000 };
    garage = fitted(garage, 'handling-engine');
    garage = upgrade(copies(garage, 'handling-engine', 2), 0);
    expect(garage.fitted[0]?.level).toBe(2);
    expect(slotsUsed(garage)).toBe(1);

    // Level 3 of this engine takes a second slot: it fits here, with 3 free.
    garage = upgrade(copies(garage, 'handling-engine', 4), 0);
    expect(garage.fitted[0]?.level).toBe(3);
    expect(slotsUsed(garage)).toBe(2);

    // With every other slot filled, the same upgrade is refused — the research
    // is banked and spent on nothing, which is the point of the check.
    let tight: Garage = { ...newGarage(), credits: 2000, slots: 2 };
    tight = fitted(tight, 'handling-engine');
    tight = fitted(tight, 'general-shields');
    tight = upgrade(copies(tight, 'handling-engine', 2), 0);
    expect(tight.fitted[0]?.level).toBe(2);
    tight = upgrade(copies(tight, 'handling-engine', 4), 0);
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

  it('charges the same for every reroll, however many have been taken', () => {
    // Flat on purpose. Looking again is an ordinary thing to do; the choice
    // worth making is which of the four to take.
    let garage = drawOffer({ ...newGarage(), credits: 500 }, 7);
    let seed = 8;
    for (let n = 0; n < 5; n += 1) {
      expect(rerollCost(), `reroll ${n + 1}`).toBe(REROLL_COST);
      const before = garage;
      garage = reroll(garage, seed);
      seed += 1;
      expect(garage.credits).toBe(before.credits - REROLL_COST);
      expect(garage.offer).not.toEqual(before.offer);
    }
  });

  it('is cheap against the things it is offering', () => {
    // A reroll a player has to save up for is a tax on playing with the shop.
    const cheapest = Math.min(...COMPONENTS.map((c) => c.levels[0].cost));
    expect(REROLL_COST).toBeLessThan(cheapest / 2);
  });

  it('counts rerolls so the next look is a different one, and resets each heat', () => {
    // The counter is no longer a price. It is what the draw is seeded off, so
    // without it every reroll would deal the same four again.
    const rolled = reroll(drawOffer({ ...newGarage(), credits: 500 }, 7), 8);
    expect(rolled.rerolls).toBe(1);
    expect(drawOffer(rolled, 9).rerolls).toBe(0);
  });

  it('refuses a reroll that cannot be paid for', () => {
    const broke = { ...drawOffer(newGarage(), 7), credits: REROLL_COST - 1 };
    expect(reroll(broke, 8)).toBe(broke);
  });
});

describe('breaking a component down for research', () => {
  const spares = (garage: Garage, id: string, n: number): Garage => {
    let next = garage;
    for (let i = 0; i < n; i += 1) next = buyResearch(next, id);
    return next;
  };

  it('takes two copies for the second level and four for the third', () => {
    expect(researchNeeded(1)).toBe(2);
    expect(researchNeeded(2)).toBe(4);
    // There is no fourth level to reach.
    expect(researchNeeded(3)).toBeUndefined();
  });

  it('will not upgrade on one copy, and will on two', () => {
    let garage = fitted({ ...newGarage(), credits: 2000 }, 'speed-engine');
    garage = spares(garage, 'speed-engine', 1);
    expect(upgrade(garage, 0)).toBe(garage);

    garage = spares(garage, 'speed-engine', 1);
    const up = upgrade(garage, 0);
    expect(up.fitted[0]?.level).toBe(2);
    // Spent, not kept.
    expect(up.research['speed-engine']).toBe(0);
  });

  it('costs six copies in all to reach the top', () => {
    let garage = fitted({ ...newGarage(), credits: 2000 }, 'speed-engine');
    garage = upgrade(spares(garage, 'speed-engine', 2), 0);
    expect(garage.fitted[0]?.level).toBe(2);
    garage = upgrade(spares(garage, 'speed-engine', 3), 0);
    // Three is not four.
    expect(garage.fitted[0]?.level).toBe(2);
    garage = upgrade(spares(garage, 'speed-engine', 1), 0);
    expect(garage.fitted[0]?.level).toBe(3);
  });

  it('never lets credits buy a level, however many there are', () => {
    // The rule this replaced. A rich ship with no copies goes nowhere.
    const rich = fitted({ ...newGarage(), credits: 100000 }, 'speed-engine');
    const after = upgrade(rich, 0);
    expect(after).toBe(rich);
    expect(after.credits).toBe(rich.credits);
  });

  it('researches the component it was, not whatever is being upgraded', () => {
    let garage = fitted({ ...newGarage(), credits: 2000 }, 'speed-engine');
    garage = spares(garage, 'handling-engine', 2);
    expect(researched(garage, 'handling-engine', 1)).toBe(true);
    expect(researched(garage, 'speed-engine', 1)).toBe(false);
    expect(upgrade(garage, 0)).toBe(garage);
  });

  it('ignores a shelf index that is not there', () => {
    const garage = newGarage();
    expect(breakDown(garage, 0)).toBe(garage);
    expect(breakDown(garage, -1)).toBe(garage);
  });

  it('buys and breaks down in one move, which is what a rival does', () => {
    const before = { ...newGarage(), credits: 500 };
    const after = buyResearch(before, 'speed-engine');
    expect(after.shelf).toHaveLength(0);
    expect(after.research['speed-engine']).toBe(1);
    expect(after.credits).toBeLessThan(before.credits);
    // And nothing happens on an empty purse.
    const broke = { ...newGarage(), credits: 0 };
    expect(buyResearch(broke, 'speed-engine')).toBe(broke);
  });
});

describe('a ship carries one engine', () => {
  it('refuses the second, whatever the slots say', () => {
    // The rule the slot budget was being asked to enforce and never could.
    let garage = fitted({ ...newGarage(), credits: 2000, slots: 20 }, 'speed-engine');
    garage = buy(garage, 'balanced-engine');
    expect(slotsFree(garage)).toBeGreaterThan(0);
    const after = fit(garage, garage.shelf.length - 1);
    expect(after).toBe(garage);
    expect(after.fitted).toHaveLength(1);
  });

  it('refuses another of the very same engine too', () => {
    let garage = fitted({ ...newGarage(), credits: 2000, slots: 20 }, 'speed-engine');
    garage = buy(garage, 'speed-engine');
    expect(fit(garage, garage.shelf.length - 1)).toBe(garage);
  });

  it('lets the engine come off and a different one go on', () => {
    // A limit, not a lock. Swapping the engine is exactly the decision it
    // exists to make interesting.
    let garage = fitted({ ...newGarage(), credits: 2000, slots: 20 }, 'speed-engine');
    garage = buy(garage, 'handling-engine');
    garage = remove(garage, 0);
    const swapped = fit(garage, garage.shelf.findIndex((f) => f.componentId === 'handling-engine'));
    expect(swapped.fitted).toHaveLength(1);
    expect(swapped.fitted[0]?.componentId).toBe('handling-engine');
  });

  it('leaves shields unlimited, because two shields is a build', () => {
    // The framework is explicit about this, and a collector's storage scales
    // with the ship's total shielding. Only engines are capped.
    let garage = { ...newGarage(), credits: 2000, slots: 20 };
    garage = fitted(garage, 'general-shields');
    garage = fitted(garage, 'collector-shield');
    expect(garage.fitted).toHaveLength(2);
    expect(roomFor(garage, 'general-shields')).toBe(Infinity);
    expect(roomFor(garage, 'speed-engine')).toBe(1);
  });

  it('says there is no room before a fit is attempted, so the shop can say so', () => {
    const garage = fitted({ ...newGarage(), credits: 2000, slots: 20 }, 'speed-engine');
    expect(roomFor(garage, 'balanced-engine')).toBe(0);
    expect(roomFor(garage, 'crew-androids')).toBe(Infinity);
    expect(roomFor(garage, 'no-such-part')).toBe(0);
  });
});
