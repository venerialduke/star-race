// The heads-up display: what the ship is doing, and the two things the player
// can do about it.
//
// DOM rather than canvas, because the buttons are the one part of the game the
// player touches: real elements get real tap targets, focus and accessibility
// for free. Everything here reads sim state and reports taps back; it never
// changes the race itself.

import { ALL_ACTIVES, type ActiveId } from '../sim/actives';
import { activeOn, activeReady, type RaceState } from '../sim/race';
import { stages } from '../sim/track';
import { TICK_RATE } from '../sim/tuning';

export interface Hud {
  /** Redraw the readouts from the current race state. */
  update(state: RaceState): void;
  /** Show or hide the whole HUD, for the garage and results screens. */
  setVisible(visible: boolean): void;
}

interface Bar {
  readonly fill: HTMLElement;
  readonly label: HTMLElement;
}

const STYLE = `
.hud {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
  font: 500 14px/1.3 ui-monospace, Menlo, Consolas, monospace;
  color: #e9e4d6;
  padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom));
  box-sizing: border-box;
}
.hud[hidden] { display: none; }
.hud-top { display: flex; flex-direction: column; gap: 6px; }
.hud-stage {
  display: flex;
  justify-content: space-between;
  color: #b9b7ae;
  letter-spacing: 0.04em;
}
.hud-bar {
  position: relative;
  height: 14px;
  border-radius: 7px;
  background: rgba(233, 228, 214, 0.12);
  overflow: hidden;
}
.hud-bar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 0%;
  border-radius: 7px;
  transition: width 90ms linear;
}
.hud-bar-label {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 8px;
  font-size: 11px;
  line-height: 14px;
  color: #101c36;
  mix-blend-mode: hard-light;
}
.hud-hull .hud-bar-fill { background: #7fd48c; }
.hud-hull.is-low .hud-bar-fill { background: #e2685f; }
.hud-heat .hud-bar-fill { background: #f2a93b; }
.hud-heat.is-over .hud-bar-fill { background: #e2685f; }
.hud-shield .hud-bar-fill { background: #63d2ff; }

.hud-actives {
  display: flex;
  gap: 12px;
  pointer-events: auto;
}
.hud-button {
  flex: 1 1 0;
  min-height: 72px;
  border: 2px solid rgba(233, 228, 214, 0.3);
  border-radius: 14px;
  background: rgba(16, 28, 54, 0.85);
  color: #e9e4d6;
  font: inherit;
  font-size: 15px;
  padding: 10px 8px;
  position: relative;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  cursor: pointer;
}
.hud-button:disabled { color: #6f7b93; border-color: rgba(233, 228, 214, 0.12); cursor: default; }
.hud-button.is-on { border-color: #63d2ff; color: #63d2ff; }
.hud-button-cooldown {
  position: absolute;
  inset: auto 0 0 0;
  height: 4px;
  width: 0%;
  background: #8ea2c8;
}
.hud-button-name { display: block; }
.hud-button-hint { display: block; font-size: 11px; color: #8ea2c8; margin-top: 4px; }
`;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  return node;
}

function makeBar(root: HTMLElement, kind: string): Bar & { readonly box: HTMLElement } {
  const box = el('div', `hud-bar ${kind}`);
  const fill = el('div', 'hud-bar-fill');
  const label = el('div', 'hud-bar-label');
  box.append(fill, label);
  root.append(box);
  return { box, fill, label };
}

function setBar(bar: Bar, fraction: number, left: string, right: string): void {
  bar.fill.style.width = `${Math.max(0, Math.min(1, fraction)) * 100}%`;
  bar.label.textContent = '';
  const l = el('span');
  l.textContent = left;
  const r = el('span');
  r.textContent = right;
  bar.label.append(l, r);
}

const seconds = (ticks: number): string => `${(ticks / TICK_RATE).toFixed(1)}s`;

/**
 * Build the HUD over the canvas. `onTap` is called with the active the player
 * pressed; the caller decides which tick it lands on.
 */
export function createHud(root: HTMLElement, onTap: (active: ActiveId) => void): Hud {
  const style = el('style');
  style.textContent = STYLE;
  document.head.append(style);

  const hud = el('div', 'hud');

  const top = el('div', 'hud-top');
  const stageLine = el('div', 'hud-stage');
  const stageName = el('span');
  const clock = el('span');
  stageLine.append(stageName, clock);
  top.append(stageLine);

  const hull = makeBar(top, 'hud-hull');
  const heat = makeBar(top, 'hud-heat');
  const shield = makeBar(top, 'hud-shield');

  const actives = el('div', 'hud-actives');
  const buttons = ALL_ACTIVES.map((active) => {
    const button = el('button', 'hud-button');
    button.type = 'button';
    const name = el('span', 'hud-button-name');
    name.textContent = active.name;
    const hint = el('span', 'hud-button-hint');
    hint.textContent = active.blurb;
    const cooldown = el('div', 'hud-button-cooldown');
    button.append(name, hint, cooldown);
    // pointerdown, not click: a tap should land on the tick the finger went
    // down, not the tick it came back up.
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      onTap(active.id);
    });
    actives.append(button);
    return { active, button, cooldown, hint };
  });

  hud.append(top, actives);
  root.append(hud);

  return {
    update(state: RaceState): void {
      const stageCount = stages(state.track).length;
      stageName.textContent = `Stage ${Math.min(state.stage + 1, stageCount)} / ${stageCount}`;
      clock.textContent = seconds(state.tick);

      const maxHull = state.stats.hull;
      const hullLeft = Math.max(state.hull, 0);
      hull.box.classList.toggle('is-low', hullLeft < maxHull * 0.3);
      setBar(hull, hullLeft / maxHull, 'HULL', `${Math.ceil(hullLeft)}`);

      const tolerance = state.stats.heatTolerance;
      heat.box.classList.toggle('is-over', state.heat > tolerance);
      setBar(
        heat,
        state.heat / tolerance,
        state.heat > tolerance ? 'OVERHEATING' : 'HEAT',
        `${Math.round(state.heat)}/${Math.round(tolerance)}`,
      );

      const capacity = state.stats.shieldCapacity;
      setBar(
        shield,
        state.shieldPool / capacity,
        'SHIELDS',
        `${Math.round(state.shieldPool)}`,
      );

      buttons.forEach(({ active, button, cooldown, hint }) => {
        const ready = activeReady(state, active.id);
        const on = activeOn(state, active.id);
        button.disabled = !ready || state.over;
        button.classList.toggle('is-on', on);
        const readyAt = state.readyAt.get(active.id);
        if (on) {
          const until = state.activeUntil.get(active.id) ?? state.tick;
          hint.textContent = `on — ${seconds(until - state.tick)}`;
          cooldown.style.width = '100%';
        } else if (!ready && readyAt !== undefined) {
          const left = readyAt - state.tick;
          hint.textContent = `ready in ${seconds(left)}`;
          cooldown.style.width = `${(1 - left / active.cooldownTicks) * 100}%`;
        } else {
          hint.textContent = active.blurb;
          cooldown.style.width = '0%';
        }
      });
    },
    setVisible(visible: boolean): void {
      hud.hidden = !visible;
    },
  };
}
