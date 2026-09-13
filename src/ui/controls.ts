// The controls and the readouts. One thumb, bottom of the screen.

import type { CornerPlan, RaceState } from '../sim/race';
import { TICK_HZ } from '../sim/tuning';

export interface Settings {
  plan: CornerPlan;
  thrust: number;
  handling: number;
  seed: string;
}

export interface Controls {
  readonly element: HTMLElement;
  readonly settings: Settings;
  update(state: RaceState): void;
}

const PLANS: readonly { id: CornerPlan; label: string; hint: string }[] = [
  { id: 'lift', label: 'Lift', hint: 'brake to the bend · no swing' },
  { id: 'carry', label: 'Carry', hint: 'take the swing that comes' },
  { id: 'charge', label: 'Charge', hint: 'keep burning · widest swing' },
];

const seconds = (ticks: number | undefined): string =>
  ticks === undefined ? '—' : `${(ticks / TICK_HZ).toFixed(2)}s`;

export function mountControls(
  parent: HTMLElement,
  onChange: () => void,
  onRestart: () => void,
): Controls {
  const settings: Settings = { plan: 'carry', thrust: 1, handling: 1, seed: 'kestrel' };

  const element = document.createElement('div');
  element.className = 'panel';
  element.innerHTML = `
    <div class="readouts">
      <div class="r"><b id="r-speed">0.00</b><span>speed</span></div>
      <div class="r"><b id="r-swing">—</b><span>last swing</span></div>
      <div class="r"><b id="r-sector">1</b><span>sector</span></div>
      <div class="r"><b id="r-lap">—</b><span>last lap</span></div>
    </div>
    <div id="r-state" class="state">on the path</div>
    <div class="plans" role="group" aria-label="Corner plan">
      ${PLANS.map(
        (p) => `<button type="button" data-plan="${p.id}" class="plan">
          <b>${p.label}</b><span>${p.hint}</span></button>`,
      ).join('')}
    </div>
    <div class="sliders">
      <label>Thrust <input id="s-thrust" type="range" min="0.5" max="1.6" step="0.01" value="1" />
        <output id="o-thrust">1.00</output></label>
      <label>Handling <input id="s-handling" type="range" min="0.5" max="1.6" step="0.01" value="1" />
        <output id="o-handling">1.00</output></label>
    </div>
    <div class="seedrow">
      <label>Seed <input id="s-seed" type="text" value="kestrel" spellcheck="false" /></label>
      <button type="button" id="b-restart">Restart</button>
    </div>`;
  parent.appendChild(element);

  const byId = <T extends HTMLElement>(id: string): T =>
    element.querySelector(`#${id}`) as T;

  const planButtons = Array.from(
    element.querySelectorAll<HTMLButtonElement>('[data-plan]'),
  );
  const paintPlans = (): void => {
    for (const button of planButtons) {
      button.classList.toggle('on', button.dataset['plan'] === settings.plan);
    }
  };
  for (const button of planButtons) {
    button.addEventListener('click', () => {
      settings.plan = button.dataset['plan'] as CornerPlan;
      paintPlans();
      onChange();
    });
  }
  paintPlans();

  const thrust = byId<HTMLInputElement>('s-thrust');
  const handling = byId<HTMLInputElement>('s-handling');
  const outThrust = byId<HTMLOutputElement>('o-thrust');
  const outHandling = byId<HTMLOutputElement>('o-handling');
  const bind = (
    input: HTMLInputElement,
    out: HTMLOutputElement,
    key: 'thrust' | 'handling',
  ): void => {
    input.addEventListener('input', () => {
      settings[key] = Number(input.value);
      out.textContent = settings[key].toFixed(2);
      onChange();
    });
  };
  bind(thrust, outThrust, 'thrust');
  bind(handling, outHandling, 'handling');

  const seed = byId<HTMLInputElement>('s-seed');
  seed.addEventListener('change', () => {
    settings.seed = seed.value;
    onRestart();
  });
  byId<HTMLButtonElement>('b-restart').addEventListener('click', onRestart);

  const rSpeed = byId<HTMLElement>('r-speed');
  const rSwing = byId<HTMLElement>('r-swing');
  const rSector = byId<HTMLElement>('r-sector');
  const rLap = byId<HTMLElement>('r-lap');
  const rState = byId<HTMLElement>('r-state');

  return {
    element,
    settings,
    update(state) {
      rSpeed.textContent = state.speed.toFixed(2);
      rSector.textContent = String(state.sector + 1);
      rLap.textContent = seconds(state.lastLapTicks);
      const last = state.swings[state.swings.length - 1];
      rSwing.textContent = last === undefined ? '—' : last.swing.toFixed(1);
      rState.textContent = state.wide
        ? 'WIDE — off the golden path, losing time'
        : 'on the path';
      rState.classList.toggle('wide', state.wide);
    },
  };
}
