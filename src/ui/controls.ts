// The controls, the readouts and the tracking bar. One thumb, bottom of the
// screen. The bar is the thing that says who is winning: a lane per ship, its
// place, how far round the lap it is, and what it is giving away on total time.

import { standings, type FieldState, type ShipProgress } from '../sim/field';
import type { CornerPlan } from '../sim/race';
import { integrity } from '../sim/ship';
import { TRACKS, type Track } from '../sim/track';
import { TICK_HZ } from '../sim/tuning';
import { SHIP_COLOURS } from '../render/draw';

export interface Settings {
  track: Track;
  plan: CornerPlan;
  seed: string;
}

export interface Controls {
  readonly element: HTMLElement;
  readonly settings: Settings;
  /** Where the board mounts: the panel owns the layout, the board owns its own markup. */
  readonly boardSlot: HTMLElement;
  update(field: FieldState | undefined, track: Track): void;
}

const PLANS: readonly { id: CornerPlan; label: string; hint: string }[] = [
  { id: 'lift', label: 'Lift', hint: 'brake to the bend · no swing' },
  { id: 'carry', label: 'Carry', hint: 'take the swing that comes' },
  { id: 'charge', label: 'Charge', hint: 'keep burning · widest swing' },
];

const seconds = (ticks: number): string => `${(ticks / TICK_HZ).toFixed(2)}s`;

/** How intact the ship is, what the shields have left, how spent the crew is. */
function condition(me: ShipProgress | undefined): string {
  if (me === undefined) return '';
  const parts = [`ship ${Math.round(integrity(me.state.condition) * 100)}%`];
  if (me.state.shields > 0.5) parts.push(`shields ${Math.round(me.state.shields)}`);
  if (me.state.worn > 0.25) parts.push(`crew ${Math.round((1 - me.state.worn) * 100)}%`);
  return ` · ${parts.join(' · ')}`;
}

const gap = (ticks: number): string =>
  ticks <= 0.5 ? 'leader' : `+${(ticks / TICK_HZ).toFixed(2)}`;

export function mountControls(
  parent: HTMLElement,
  onGo: () => void,
  onRestart: () => void,
  onRace: () => void,
): Controls {
  const settings: Settings = {
    track: TRACKS[0] as Track,
    plan: 'carry',
    seed: 'kestrel',
  };

  const element = document.createElement('div');
  element.className = 'panel';
  element.innerHTML = `
    <div id="bar" class="bar"></div>
    <div id="r-state" class="state">on the path</div>
    <div class="tracks" role="group" aria-label="Track">
      ${TRACKS.map(
        (t, i) =>
          `<button type="button" data-track="${i}" class="track"><b>${t.name}</b><span>${t.shape}</span></button>`,
      ).join('')}
    </div>
    <div class="plans" role="group" aria-label="Corner plan">
      ${PLANS.map(
        (p) => `<button type="button" data-plan="${p.id}" class="plan">
          <b>${p.label}</b><span>${p.hint}</span></button>`,
      ).join('')}
    </div>
    <div id="board-slot"></div>
    <div class="seedrow">
      <label>Seed <input id="s-seed" type="text" value="kestrel" spellcheck="false" /></label>
      <button type="button" id="b-go" class="go" hidden>Go</button>
      <button type="button" id="b-race" class="go">Race</button>
      <button type="button" id="b-restart">New heat</button>
    </div>`;
  parent.appendChild(element);

  const byId = <T extends HTMLElement>(id: string): T =>
    element.querySelector(`#${id}`) as T;

  const paint = (
    selector: string,
    isOn: (button: HTMLButtonElement) => boolean,
  ): void => {
    for (const button of element.querySelectorAll<HTMLButtonElement>(selector)) {
      button.classList.toggle('on', isOn(button));
    }
  };
  const paintTracks = (): void =>
    paint('[data-track]', (b) => TRACKS[Number(b.dataset['track'])] === settings.track);
  const paintPlans = (): void =>
    paint('[data-plan]', (b) => b.dataset['plan'] === settings.plan);

  for (const button of element.querySelectorAll<HTMLButtonElement>('[data-track]')) {
    button.addEventListener('click', () => {
      settings.track = TRACKS[Number(button.dataset['track'])] as Track;
      paintTracks();
      onRestart();
    });
  }
  for (const button of element.querySelectorAll<HTMLButtonElement>('[data-plan]')) {
    button.addEventListener('click', () => {
      settings.plan = button.dataset['plan'] as CornerPlan;
      paintPlans();
    });
  }
  paintTracks();
  paintPlans();

  const seed = byId<HTMLInputElement>('s-seed');
  seed.addEventListener('change', () => {
    settings.seed = seed.value;
    onRestart();
  });
  byId<HTMLButtonElement>('b-restart').addEventListener('click', onRestart);
  const go = byId<HTMLButtonElement>('b-go');
  go.addEventListener('click', onGo);
  const race = byId<HTMLButtonElement>('b-race');
  race.addEventListener('click', onRace);
  const boardSlot = byId<HTMLElement>('board-slot');

  const bar = byId<HTMLElement>('bar');
  const rState = byId<HTMLElement>('r-state');

  return {
    element,
    settings,
    boardSlot,
    update(field, track) {
      // No heat yet: the board is the whole screen.
      if (field === undefined) {
        bar.innerHTML = '';
        boardSlot.hidden = false;
        race.hidden = false;
        go.hidden = true;
        rState.textContent = 'Fit the ship, set the plan, then Race.';
        rState.className = 'state';
        return;
      }
      boardSlot.hidden = true;
      race.hidden = field.phase !== 'done';
      const rows = standings(field);
      const leader = rows[0];
      bar.innerHTML = rows
        .map((row) => {
          const lane = field.ships.indexOf(row.ship);
          const colour = SHIP_COLOURS[lane % SHIP_COLOURS.length] as string;
          const progress = row.ship.waiting
            ? 1
            : Math.min(1, row.ship.state.distance / track.length);
          const behind = leader === undefined ? 0 : row.ticks - leader.ticks;
          const time =
            field.phase === 'done' || field.phase === 'pit'
              ? seconds(row.ship.totalTicks)
              : gap(behind);
          const who = row.ship.entrant.isPlayer ? 'You' : row.ship.entrant.name;
          return `<div class="lane${row.ship.entrant.isPlayer ? ' me' : ''}">
            <span class="pip" style="background:${colour}"></span>
            <span class="who">${row.place}. ${who}</span>
            <span class="track-bar"><i style="width:${(progress * 100).toFixed(1)}%;background:${colour}"></i></span>
            <span class="gap">${time}</span>
          </div>`;
        })
        .join('');

      const me = field.ships.find((s) => s.entrant.isPlayer);
      const mine = rows.find((r) => r.ship.entrant.isPlayer);
      go.hidden = field.phase !== 'pit';

      if (field.phase === 'pit') {
        rState.textContent = `Pit stop — everyone restarts level, the clock keeps running. Change the plan, then Go.`;
        rState.className = 'state pit';
      } else if (field.phase === 'done') {
        const result =
          mine === undefined
            ? 'Heat over.'
            : mine.place === 1
              ? `Won the heat — ${seconds(mine.ship.totalTicks)} on total time.`
              : `P${mine.place} of ${rows.length} — ${seconds(mine.ticks - (leader?.ticks ?? 0))} off the win.`;
        rState.textContent = `${result} +1 slot. Race again to spend it.`;
        rState.className = 'state done';
      } else if (me?.state.wide === true) {
        rState.textContent = `WIDE — off the path${condition(me)}`;
        rState.className = 'state wide';
      } else {
        rState.textContent = `Lap ${field.lap + 1}${condition(me)}`;
        rState.className = 'state';
      }
    },
  };
}
