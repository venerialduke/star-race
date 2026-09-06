// The garage: three parts, one tap, next stage.
//
// This is where the run is actually decided, so the cards say plainly what a
// part gives and what it costs — no icons to decode, no hidden numbers. The
// screen also shows the ship as it stands, because "should I take more hull?"
// is not answerable without knowing how much is left.

import { drawCourse } from '../render/draw';
import { runStandings, type Run } from '../sim/run';
import type { Part, StatName } from '../sim/ship';
import { resolveBuild } from '../sim/ship';
import { stages } from '../sim/track';
import { TICK_RATE } from '../sim/tuning';

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
.garage-map {
  width: 100%;
  height: 34vh;
  min-height: 140px;
  border-radius: 12px;
  background: #101c36;
  display: block;
}
.garage-standings {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 13px;
  color: #8ea2c8;
}
.garage-standings .is-player { color: #f2a93b; }
.garage-standings .is-out { color: #6f7b93; }

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

const seconds = (ticks: number): string => `${(ticks / TICK_RATE).toFixed(1)}s`;

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
  // The course the player is about to fly, with the next stage picked out. The
  // design bet is that you can see the black hole coming and build for it, and
  // that only works if the course is in front of you while you choose.
  const map = el('canvas', 'garage-map');
  const standings = el('div', 'garage-standings');
  const cards = el('div', 'garage-cards');
  screen.append(title, ship, map, standings, cards);
  root.append(screen);

  /** Draw the course into the little map. Silent where there is no canvas. */
  function drawMap(run: Run): void {
    const width = map.clientWidth || map.width || 0;
    const height = map.clientHeight || map.height || 0;
    if (width === 0 || height === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    map.width = Math.round(width * dpr);
    map.height = Math.round(height * dpr);
    const ctx = map.getContext('2d');
    // jsdom has no canvas, and a browser can refuse a context under memory
    // pressure. The garage still works without its map.
    if (ctx === null) return;
    // No HUD over this one, so it gets nearly the whole canvas.
    drawCourse(ctx, run.track, run.stage, {
      width,
      height,
      dpr,
      insetTop: 6,
      insetBottom: 6,
    });
  }

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

      // Where the race stands, so "speed or armour?" is answerable. Nothing to
      // show before the first stage: everyone is level on the grid.
      standings.textContent = '';
      if (run.results.length > 0) {
        runStandings(run).forEach((entry) => {
          const chip = el('span');
          chip.textContent = `${entry.position}. ${entry.name} ${seconds(entry.totalTicks)}`;
          if (entry.id === 'player') chip.className = 'is-player';
          if (entry.stagesFinished < run.results.length) chip.className = 'is-out';
          standings.append(chip);
        });
      }

      cards.textContent = '';
      run.offer.forEach((part) => cards.append(cardFor(part, onChoose)));
      screen.hidden = false;
      // After it is visible, so the canvas has a size to measure.
      drawMap(run);
    },
    hide(): void {
      screen.hidden = true;
    },
  };
}
