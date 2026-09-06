// The results screen: what just happened, and one tap to go again.
//
// The design's success test is "you play three runs and want to try a different
// build", so this screen is written to send the player back to the garage: what
// each stage cost, what the ship ended up as, and — when it ends badly — what
// actually killed it, named plainly.

import type { LossCause } from '../sim/race';
import { completed, totalDamage, totalTicks, type Run } from '../sim/run';
import { stages } from '../sim/track';
import { TICK_RATE } from '../sim/tuning';

export interface Results {
  show(run: Run, onAgain: () => void): void;
  hide(): void;
}

const LOSS_TEXT: Readonly<Record<LossCause, string>> = {
  blackHole:
    'The black hole took the ship. It arrived with too little hull to pull away.',
  overheated: 'The ship cooked itself. Too much heat, for too long.',
  hull: 'The hull gave out.',
};

const STYLE = `
.results {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: max(16px, env(safe-area-inset-top)) 14px max(16px, env(safe-area-inset-bottom));
  box-sizing: border-box;
  background: #101c36;
  color: #e9e4d6;
  font: 500 15px/1.4 ui-monospace, Menlo, Consolas, monospace;
  overflow-y: auto;
}
.results[hidden] { display: none; }
.results-title { font-size: 22px; letter-spacing: 0.04em; }
.results-title.is-lost { color: #e2685f; }
.results-note { color: #b9b7ae; font-size: 14px; }
.results-table { display: flex; flex-direction: column; gap: 6px; font-size: 14px; }
.results-row { display: flex; justify-content: space-between; gap: 10px; }
.results-row.is-total { border-top: 1px solid rgba(233, 228, 214, 0.25); padding-top: 6px; }
.results-row.is-unraced { color: #6f7b93; }
.results-label { color: #b9b7ae; }
.results-build { color: #8ea2c8; font-size: 13px; }
.results-spacer { flex: 1 1 auto; }
.results-again {
  width: 100%;
  min-height: 64px;
  border: 2px solid #f2a93b;
  border-radius: 14px;
  background: rgba(242, 169, 59, 0.12);
  color: #f2a93b;
  font: inherit;
  font-size: 17px;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  cursor: pointer;
}
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

function row(label: string, value: string, className = ''): HTMLElement {
  const line = el('div', `results-row ${className}`.trim());
  const left = el('span', 'results-label');
  left.textContent = label;
  const right = el('span');
  right.textContent = value;
  line.append(left, right);
  return line;
}

/** Build the results screen. It starts hidden. */
export function createResults(root: HTMLElement): Results {
  const style = el('style');
  style.textContent = STYLE;
  document.head.append(style);

  const screen = el('div', 'results');
  screen.hidden = true;
  const title = el('div', 'results-title');
  const note = el('div', 'results-note');
  const table = el('div', 'results-table');
  const build = el('div', 'results-build');
  const spacer = el('div', 'results-spacer');
  const again = el('button', 'results-again');
  again.type = 'button';
  again.textContent = 'Run again';
  screen.append(title, note, table, build, spacer, again);
  root.append(screen);

  let onAgain: () => void = () => {};
  again.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    onAgain();
  });

  return {
    show(run: Run, again_: () => void): void {
      onAgain = again_;
      const stageCount = stages(run.track).length;
      const finished = completed(run);
      const lastResult = run.results[run.results.length - 1];

      title.textContent = finished
        ? 'Run complete'
        : `Lost in stage ${run.results.length}`;
      title.classList.toggle('is-lost', !finished);

      if (finished) {
        note.textContent = `Three stages, ${seconds(totalTicks(run))}, ${Math.round(run.hull)} hull left.`;
      } else {
        const cause = lastResult?.outcome.lostTo;
        note.textContent =
          cause === undefined ? 'The ship did not make it.' : LOSS_TEXT[cause];
      }

      table.textContent = '';
      for (let stage = 0; stage < stageCount; stage++) {
        const result = run.results[stage];
        if (result === undefined) {
          table.append(row(`Stage ${stage + 1}`, 'not reached', 'is-unraced'));
          continue;
        }
        const { outcome } = result;
        const value = outcome.survived
          ? `${seconds(outcome.finishTicks)} · ${Math.round(outcome.damageTaken)} damage`
          : `lost · ${Math.round(outcome.damageTaken)} damage`;
        table.append(row(`Stage ${stage + 1}`, value));
      }
      table.append(
        row(
          'Total',
          `${seconds(totalTicks(run))} · ${Math.round(totalDamage(run))} damage`,
          'is-total',
        ),
      );

      build.textContent =
        run.build.length === 0
          ? 'Ship: nothing bolted on.'
          : `Ship: ${run.build.map((part) => part.name).join(', ')}.`;

      screen.hidden = false;
    },
    hide(): void {
      screen.hidden = true;
    },
  };
}
