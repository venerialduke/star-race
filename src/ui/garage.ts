// The garage: three parts, one tap, next stage.
//
// This is where the run is actually decided, so the cards say plainly what a
// part gives and what it costs — no icons to decode, no hidden numbers. The
// screen also shows the ship as it stands, because "should I take more hull?"
// is not answerable without knowing how much is left.

import type { Run } from '../sim/run';
import type { Part, StatName } from '../sim/ship';
import { resolveBuild } from '../sim/ship';
import { stages } from '../sim/track';

export interface Garage {
  /** Show the offer for this run. */
  show(run: Run, onChoose: (part: Part) => void): void;
  hide(): void;
}

const STAT_LABEL: Readonly<Record<StatName, string>> = {
  speed: 'speed',
  acceleration: 'acceleration',
  shieldCapacity: 'shield capacity',
  heatTolerance: 'heat tolerance',
  hull: 'hull',
};

const STYLE = `
.garage {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: max(16px, env(safe-area-inset-top)) 14px max(16px, env(safe-area-inset-bottom));
  box-sizing: border-box;
  background: #101c36;
  color: #e9e4d6;
  font: 500 15px/1.4 ui-monospace, Menlo, Consolas, monospace;
  overflow-y: auto;
}
.garage[hidden] { display: none; }
.garage-title { font-size: 20px; letter-spacing: 0.04em; }
.garage-ship { color: #8ea2c8; font-size: 13px; }
.garage-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1 1 auto;
  justify-content: center;
}
.garage-card {
  display: block;
  width: 100%;
  text-align: left;
  border: 2px solid rgba(233, 228, 214, 0.3);
  border-radius: 14px;
  background: rgba(233, 228, 214, 0.04);
  color: inherit;
  font: inherit;
  padding: 14px;
  min-height: 96px;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  cursor: pointer;
}
.garage-card:active { border-color: #f2a93b; }
.garage-card-name { font-size: 17px; }
.garage-card-blurb { color: #b9b7ae; font-size: 13px; margin: 6px 0 8px; }
.garage-card-stats { display: flex; flex-wrap: wrap; gap: 10px; font-size: 13px; }
.garage-gain { color: #7fd48c; }
.garage-cost { color: #e2685f; }
`;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  return node;
}

/** "+40 hull", "−0.08 speed" — signed, in the stat's own units. */
function describeDelta(stat: StatName, delta: number): string {
  const rounded =
    Math.abs(delta) < 1 ? delta.toFixed(3).replace(/0+$/, '') : String(delta);
  const sign = delta > 0 ? '+' : '−';
  return `${sign}${rounded.replace('-', '')} ${STAT_LABEL[stat]}`;
}

function cardFor(part: Part, onChoose: (part: Part) => void): HTMLButtonElement {
  const card = el('button', 'garage-card');
  card.type = 'button';

  const name = el('div', 'garage-card-name');
  name.textContent = part.name;
  const blurb = el('div', 'garage-card-blurb');
  blurb.textContent = part.blurb;
  const stats = el('div', 'garage-card-stats');

  (Object.keys(part.effect) as StatName[]).forEach((stat) => {
    const delta = part.effect[stat];
    if (delta === undefined || delta === 0) return;
    const chip = el('span', delta > 0 ? 'garage-gain' : 'garage-cost');
    chip.textContent = describeDelta(stat, delta);
    stats.append(chip);
  });

  card.append(name, blurb, stats);
  card.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    onChoose(part);
  });
  return card;
}

/** Build the garage screen. It starts hidden. */
export function createGarage(root: HTMLElement): Garage {
  const style = el('style');
  style.textContent = STYLE;
  document.head.append(style);

  const screen = el('div', 'garage');
  screen.hidden = true;
  const title = el('div', 'garage-title');
  const ship = el('div', 'garage-ship');
  const cards = el('div', 'garage-cards');
  screen.append(title, ship, cards);
  root.append(screen);

  return {
    show(run: Run, onChoose: (part: Part) => void): void {
      const stageCount = stages(run.track).length;
      title.textContent = `Garage — before stage ${run.stage + 1} of ${stageCount}`;

      const stats = resolveBuild(run.build);
      const parts =
        run.build.length === 0
          ? 'nothing bolted on yet'
          : run.build.map((p) => p.name).join(', ');
      ship.textContent = `Hull ${Math.round(run.hull)}/${Math.round(stats.hull)} · speed ${stats.speed.toFixed(2)} · ${parts}`;

      cards.textContent = '';
      run.offer.forEach((part) => cards.append(cardFor(part, onChoose)));
      screen.hidden = false;
    },
    hide(): void {
      screen.hidden = true;
    },
  };
}
