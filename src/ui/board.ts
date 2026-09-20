// The board: what the player does between heats. Fit the slots, spend the
// credits, set the corner plan, start. Every decision is made here, before the
// heat that consumes it.

import {
  breakDown,
  buyOffer,
  buyProgress,
  fit,
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
} from '../sim/garage';
import { PROGRESS_PRICE } from '../sim/tuning';
import { resolveBuild } from '../sim/ship';
import {
  NOT_STOCKED,
  componentById,
  discount,
  levelOf,
  slotsOf,
  upgradeCost,
  type Fitted,
} from '../sim/ship';

export interface Board {
  readonly element: HTMLElement;
  render(garage: Garage): void;
}

const label = (item: Fitted): string => {
  const component = componentById(item.componentId);
  return `<span>${component?.name ?? item.componentId} <b>L${item.level}</b></span>`;
};

const slotWord = (n: number): string => `${n} slot${n === 1 ? '' : 's'}`;

/** The stats that are worth a line in the shop, and how to say each one. */
const READOUT: readonly {
  key: 'thrust' | 'handling' | 'shields' | 'endurance' | 'repair' | 'nav' | 'weaponPower';
  name: string;
  places: number;
}[] = [
  { key: 'thrust', name: 'thrust', places: 2 },
  { key: 'handling', name: 'handling', places: 2 },
  { key: 'shields', name: 'shields', places: 0 },
  { key: 'endurance', name: 'crew', places: 2 },
  { key: 'repair', name: 'repair', places: 1 },
  { key: 'nav', name: 'nav', places: 0 },
  { key: 'weaponPower', name: 'weapons', places: 2 },
];

/**
 * What fitting `extra` on top of `base` would actually be worth — the number
 * that decides whether a part is a purchase or a waste, and which the shop did
 * not show. A build with three crews aboard has two doing nothing at all, and
 * until this the only way to find that out was to lose a season by it.
 *
 * It reads the difference rather than the part's own numbers on purpose: a crew
 * that is bettered by one already fitted adds nothing, a second engine adds less
 * than the first because copies fall off, and an ability is not a stat at all.
 */
function differenceOf(
  base: readonly Fitted[],
  extra: readonly Fitted[],
): { readonly text: string; readonly nothing: boolean } {
  const before = resolveBuild(base);
  const after = resolveBuild([...base, ...extra]);
  const parts: string[] = [];
  for (const { key, name, places } of READOUT) {
    const delta = after[key] - before[key];
    if (Math.abs(delta) < 0.005) continue;
    parts.push(`${delta > 0 ? '+' : '−'}${Math.abs(delta).toFixed(places)} ${name}`);
  }
  // An ability is a thing a part grants rather than a number it moves, so it
  // has to be named separately or a weapon reads as doing nothing.
  const grants = extra.some((item) => levelOf(item)?.grants !== undefined);
  if (grants) parts.push('an ability');
  // The two discounts are not ship stats — they are prices — so they have to be
  // read off the build rather than off what it resolves to. Without this the
  // scientists, whose whole point is cheaper upgrades, read as adding nothing.
  const cheaper = (kind: 'upgradeDiscount' | 'slotDiscount', name: string): void => {
    const gain = discount([...base, ...extra], kind) - discount(base, kind);
    if (gain > 0.005) parts.push(`${Math.round(gain * 100)}% off ${name}`);
  };
  cheaper('upgradeDiscount', 'upgrades');
  cheaper('slotDiscount', 'slots');
  if (after.collects > before.collects) parts.push('collects salvage');
  if (after.captures && !before.captures) parts.push('keeps what hits it');
  if (after.readsHoles && !before.readsHoles) parts.push('reads black holes');
  return {
    text: parts.join(' · '),
    nothing: parts.length === 0,
  };
}

export function mountBoard(
  parent: HTMLElement,
  read: () => Garage,
  write: (garage: Garage) => void,
  /**
   * A seed for the next reroll. The shop is part of the simulation and has to
   * be replayable, so the number cannot come from a clock or a counter here —
   * `main.ts` derives it from where the season is.
   */
  rerollSeed: () => number,
): Board {
  const element = document.createElement('div');
  element.className = 'board';
  parent.appendChild(element);

  const act = (change: (garage: Garage) => Garage): void => {
    write(change(read()));
  };

  element.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-do]');
    if (button === null) return;
    const index = Number(button.dataset['index']);
    switch (button.dataset['do']) {
      case 'buy':
        act((g) => buyOffer(g, index));
        break;
      case 'reroll':
        act((g) => reroll(g, rerollSeed()));
        break;
      case 'research':
        act((g) => breakDown(g, index));
        break;
      case 'progress':
        act(buyProgress);
        break;
      case 'fit':
        act((g) => fit(g, index));
        break;
      case 'remove':
        act((g) => remove(g, index));
        break;
      case 'sell':
        act((g) => sell(g, index));
        break;
      case 'upgrade':
        act((g) => upgrade(g, index));
        break;
      default:
        break;
    }
  });

  return {
    element,
    render(garage) {
      const stats = resolveBuild(garage.fitted);
      const free = slotsFree(garage);

      const fittedRows =
        garage.fitted.length === 0
          ? `<p class="empty">Nothing fitted. An empty ship flies, slowly.</p>`
          : garage.fitted
              .map((item, i) => {
                const cost = upgradeCost(item);
                const next = { ...item, level: item.level + 1 };
                const grows = cost === undefined ? 0 : slotsOf(next) - slotsOf(item);
                // Credits cannot buy a level. Copies can: two for the second,
                // four for the third, broken down.
                const need = researchNeeded(item.level);
                const held = garage.research[item.componentId] ?? 0;
                const paidFor = researched(garage, item.componentId, item.level);
                const canUpgrade = cost !== undefined && paidFor && grows <= free;
                // What this part is worth *here*: the build without it, against
                // the build with it. A duplicate crew reads as nothing, which is
                // the whole point.
                const without = garage.fitted.filter((_, at) => at !== i);
                const worth = differenceOf(without, [item]);
                return `<div class="part${worth.nothing ? ' idle' : ''}">
                  <span class="t">${label(item)}<em>${slotWord(slotsOf(item))} · ${
                    worth.nothing ? 'adding nothing to this build' : worth.text
                  }</em></span>
                  <span class="actions">
                    <button type="button" data-do="upgrade" data-index="${i}" ${canUpgrade ? '' : 'disabled'}>${
                      cost === undefined
                        ? 'Max'
                        : `L${item.level + 1} · ${held}/${need ?? 0} researched${grows > 0 ? ' +slot' : ''}`
                    }</button>
                    <button type="button" data-do="remove" data-index="${i}">Off</button>
                  </span>
                </div>`;
              })
              .join('');

      const shelfRows =
        garage.shelf.length === 0
          ? ''
          : `<h3>On the shelf</h3>${garage.shelf
              .map(
                (item, i) => `<div class="part">
                  <span class="t">${label(item)}<em>${slotWord(slotsOf(item))} · ${
                    differenceOf(garage.fitted, [item]).text || 'would add nothing'
                  }</em></span>
                  <span class="actions">
                    <button type="button" data-do="fit" data-index="${i}" ${
                      slotsOf(item) > free || roomFor(garage, item.componentId) <= 0
                        ? 'disabled'
                        : ''
                    } title="${
                      roomFor(garage, item.componentId) <= 0
                        ? 'One of these is all a ship carries'
                        : 'Put it on the ship'
                    }">Fit</button>
                    <button type="button" data-do="research" data-index="${i}" title="Break it down: a level of this component, instead of credits back">Research</button>
                    <button type="button" data-do="sell" data-index="${i}">Sell ${sellValue(item)}c</button>
                  </span>
                </div>`,
              )
              .join('')}`;

      // The shop is four things drawn from the catalogue, not the catalogue.
      // What it offers is the decision; what it costs to see four more is the
      // other one.
      const shopRows =
        garage.offer.length === 0
          ? '<div class="part idle"><span class="t"><em>Nothing on offer until the next heat.</em></span></div>'
          : garage.offer
              .map((id, i) => {
                const component = componentById(id);
                const first = component?.levels[0];
                if (component === undefined || first === undefined) return '';
                const would = differenceOf(garage.fitted, [
                  { uid: 'preview', componentId: id, level: 1 },
                ]);
                const owned = garage.fitted.some((f) => f.componentId === id);
                const noRoom = roomFor(garage, id) <= 0;
                return `<div class="part${would.nothing ? ' idle' : ''}">
              <span class="t"><span>${component.name}</span><em>${
                would.nothing
                  ? owned
                    ? 'already aboard — buy it to break down toward its next level'
                    : 'adds nothing to your build as it stands'
                  : noRoom
                    ? `no room for another — break it down toward a level instead`
                    : `<b class="gain">${would.text}</b> · ${first.note}`
              }</em></span>
              <span class="actions">
                <button type="button" data-do="buy" data-index="${i}" ${first.cost > garage.credits ? 'disabled' : ''}>Buy ${first.cost}c</button>
              </span>
            </div>`;
              })
              .join('');

      const rerollRow = `<div class="part">
          <span class="t"><span>Another four</span><em>a fresh window; the price rises each time, and resets next heat</em></span>
          <span class="actions">
            <button type="button" data-do="reroll" ${rerollCost(garage) > garage.credits ? 'disabled' : ''}>Reroll ${rerollCost(garage)}c</button>
          </span>
        </div>`;

      const toNext = slotCost(garage.slots);
      const slotRow = `<div class="part">
          <span class="t"><span>Next slot</span><em>${garage.progress}/${toNext} — a finish pays ${
            1
          }, and each slot costs more than the last</em></span>
          <span class="actions">
            <button type="button" data-do="progress" ${PROGRESS_PRICE > garage.credits ? 'disabled' : ''}>Buy 1 for ${PROGRESS_PRICE}c</button>
          </span>
        </div>`;

      element.innerHTML = `
        <div class="totals">
          <span><b>${garage.credits}</b>c</span>
          <span><b>${slotsUsed(garage)}/${garage.slots}</b> slots</span>
          <span><b>${garage.progress}/${slotCost(garage.slots)}</b> to next</span>
          <span>Thrust <b>${stats.thrust.toFixed(2)}</b></span>
          <span>Handling <b>${stats.handling.toFixed(2)}</b></span>
          <span>Shields <b>${stats.shields}</b></span>
          <span>Crew <b>${stats.endurance.toFixed(2)}</b></span>
          <span>Repair <b>${stats.repair.toFixed(1)}</b></span>
          <span>Nav <b>${stats.nav}</b></span>
        </div>
        <h3>Fitted</h3>
        ${fittedRows}
        ${shelfRows}
        <h3>Next slot</h3>
        ${slotRow}
        <h3>Shop</h3>
        ${shopRows}
        ${rerollRow}
        <p class="waiting">Damage breaks whatever it hits and the part is worth less for the rest of the race; the crew patches it as you fly, and the garage puts everything right between races. Not stocked yet, and why: ${NOT_STOCKED.map((n) => `<b>${n.name}</b> — ${n.waiting}`).join(' · ')}.</p>`;
    },
  };
}
