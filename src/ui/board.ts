// The board: what the player does between heats. Fit the slots, spend the
// credits, set the corner plan, start. Every decision is made here, before the
// heat that consumes it.

import {
  buy,
  fit,
  remove,
  sell,
  sellValue,
  slotsFree,
  slotsUsed,
  upgrade,
  type Garage,
} from '../sim/garage';
import { resolveBuild } from '../sim/ship';
import {
  COMPONENTS,
  NOT_STOCKED,
  componentById,
  slotsOf,
  upgradeCost,
  type Category,
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

export function mountBoard(
  parent: HTMLElement,
  read: () => Garage,
  write: (garage: Garage) => void,
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
        act((g) => buy(g, button.dataset['id'] as string));
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
                const canUpgrade =
                  cost !== undefined && cost <= garage.credits && grows <= free;
                return `<div class="part">
                  <span class="t">${label(item)}<em>${slotWord(slotsOf(item))}</em></span>
                  <span class="actions">
                    <button type="button" data-do="upgrade" data-index="${i}" ${canUpgrade ? '' : 'disabled'}>${
                      cost === undefined
                        ? 'Max'
                        : `L${item.level + 1} · ${cost}c${grows > 0 ? ' +slot' : ''}`
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
                  <span class="t">${label(item)}<em>${slotWord(slotsOf(item))}</em></span>
                  <span class="actions">
                    <button type="button" data-do="fit" data-index="${i}" ${slotsOf(item) > free ? 'disabled' : ''}>Fit</button>
                    <button type="button" data-do="sell" data-index="${i}">Sell ${sellValue(item)}c</button>
                  </span>
                </div>`,
              )
              .join('')}`;

      const CATEGORIES: readonly Category[] = ['engine', 'shields', 'crew'];
      const CATEGORY_NAMES: Record<Category, string> = {
        engine: 'Engines',
        shields: 'Shields',
        crew: 'Crew',
      };
      const shopRows = CATEGORIES.map((category) => {
        const rows = COMPONENTS.filter((c) => c.category === category)
          .map((component) => {
            const first = component.levels[0];
            return `<div class="part">
              <span class="t"><span>${component.name}</span><em>${component.arrows} · ${first.note}</em></span>
              <span class="actions">
                <button type="button" data-do="buy" data-id="${component.id}" ${first.cost > garage.credits ? 'disabled' : ''}>Buy ${first.cost}c</button>
              </span>
            </div>`;
          })
          .join('');
        return `<h4>${CATEGORY_NAMES[category]}</h4>${rows}`;
      }).join('');

      element.innerHTML = `
        <div class="totals">
          <span><b>${garage.credits}</b>c</span>
          <span><b>${slotsUsed(garage)}/${garage.slots}</b> slots</span>
          <span>Thrust <b>${stats.thrust.toFixed(2)}</b></span>
          <span>Handling <b>${stats.handling.toFixed(2)}</b></span>
          <span>Shields <b>${stats.shields}</b></span>
          <span>Crew <b>${stats.endurance.toFixed(2)}</b></span>
          <span>Repair <b>${stats.repair.toFixed(1)}</b></span>
        </div>
        <h3>Fitted</h3>
        ${fittedRows}
        ${shelfRows}
        <h3>Shop</h3>
        ${shopRows}
        <p class="waiting">Damage breaks whatever it hits and the part is worth less for the rest of the race; the crew patches it as you fly, and the garage puts everything right between races. Not stocked yet, and why: ${NOT_STOCKED.map((n) => `<b>${n.name}</b> — ${n.waiting}`).join(' · ')}.</p>`;
    },
  };
}
