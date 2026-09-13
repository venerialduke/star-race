// The garage. Unlike the race, these answers are numbers rather than feel, so
// they are worth pinning: a shop that lets you fit what you cannot afford, or
// overfill your slots, is a bug you would only find by losing a heat to it.

import { describe, expect, it } from 'vitest';
import {
  buy,
  fit,
  finishRace,
  newGarage,
  remove,
  sell,
  sellValue,
  slotsFree,
  slotsUsed,
  upgrade,
  type Garage,
} from '../../src/sim/garage';
import { resolveBuild } from '../../src/sim/ship';
import { BASE_HANDLING, BASE_THRUST, SLOTS_AT_START } from '../../src/sim/tuning';

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
    expect(resolveBuild(garage.fitted)).toEqual({
      thrust: BASE_THRUST,
      handling: BASE_HANDLING,
    });
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

  it('pays a slot for finishing a race', () => {
    expect(finishRace(newGarage()).slots).toBe(SLOTS_AT_START + 1);
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
