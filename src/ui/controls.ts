// The two screens, and everything around them.
//
// **Race** is playback: the track, and the tracking bar over it. **Garage** is
// every decision: the track, the corner plan, the shop and the build. The bar
// is on both, so you can watch the lap while you shop. You can open the garage
// while a segment plays — but what the segment shows was settled before you
// opened it, so nothing you do there reaches the ship until the next decision
// point. The garage says so.

import { standings, type FieldState } from '../sim/field';
import type { CornerPlan } from '../sim/race';
import { frameAt, orderAt, type Segment } from '../sim/segment';
import { TRACKS, type Track } from '../sim/track';
import { TICK_HZ } from '../sim/tuning';
import { SHIP_COLOURS } from '../render/draw';

export interface Settings {
  track: Track;
  plan: CornerPlan;
  seed: string;
}

export interface Hooks {
  /** Start the next segment with whatever the garage now holds. */
  onGo(): void;
  onNewHeat(): void;
  /** Jump to the end of the segment being played. */
  onSkip(): void;
}

export interface Update {
  /** The field as it stands at the end of the segment on screen. */
  readonly field: FieldState | undefined;
  readonly live: { segment: Segment; cursor: number } | undefined;
  /** The segment has played out and the next decision is due. */
  readonly settled: boolean;
}

export interface Controls {
  readonly element: HTMLElement;
  readonly settings: Settings;
  readonly boardSlot: HTMLElement;
  toRace(): void;
  toGarage(): void;
  update(state: Update): void;
}

const PLANS: readonly { id: CornerPlan; label: string; hint: string }[] = [
  { id: 'lift', label: 'Lift', hint: 'brake to the bend · no swing' },
  { id: 'carry', label: 'Carry', hint: 'take the swing that comes' },
  { id: 'charge', label: 'Charge', hint: 'keep burning · widest swing' },
];

const seconds = (ticks: number): string => `${(ticks / TICK_HZ).toFixed(2)}s`;

export function mountControls(parent: HTMLElement, hooks: Hooks): Controls {
  const settings: Settings = {
    track: TRACKS[0] as Track,
    plan: 'carry',
    seed: 'kestrel',
  };

  const element = document.createElement('div');
  element.className = 'panel';
  element.innerHTML = `
    <div class="screens" role="tablist">
      <button type="button" data-screen="race" class="screen">Race</button>
      <button type="button" data-screen="garage" class="screen">Garage</button>
    </div>
    <div id="bar" class="bar"></div>
    <div id="r-state" class="state">on the path</div>
    <div id="garage-screen">
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
      <p id="staged" class="staged" hidden></p>
      <div id="board-slot"></div>
    </div>
    <div class="seedrow">
      <label>Seed <input id="s-seed" type="text" value="kestrel" spellcheck="false" /></label>
      <button type="button" id="b-skip" hidden>Skip</button>
      <button type="button" id="b-go" class="go">Go</button>
      <button type="button" id="b-restart">New heat</button>
    </div>`;
  parent.appendChild(element);

  const byId = <T extends HTMLElement>(id: string): T =>
    element.querySelector(`#${id}`) as T;

  const paint = (selector: string, isOn: (b: HTMLButtonElement) => boolean): void => {
    for (const button of element.querySelectorAll<HTMLButtonElement>(selector)) {
      button.classList.toggle('on', isOn(button));
    }
  };

  let screen: 'race' | 'garage' = 'garage';
  const garageScreen = byId<HTMLElement>('garage-screen');
  const bar = byId<HTMLElement>('bar');
  const rState = byId<HTMLElement>('r-state');
  const staged = byId<HTMLElement>('staged');
  const go = byId<HTMLButtonElement>('b-go');
  const skip = byId<HTMLButtonElement>('b-skip');

  const showScreen = (which: 'race' | 'garage'): void => {
    screen = which;
    // The page reads this to give whichever screen is up the whole window.
    element.dataset['screen'] = which;
    garageScreen.hidden = which !== 'garage';
    // The tracking bar stays on both: it is what you want to see while you
    // shop, and it is read off the film, so it cannot get ahead of the lap.
    paint('[data-screen]', (b) => b.dataset['screen'] === which);
  };

  for (const button of element.querySelectorAll<HTMLButtonElement>('[data-screen]')) {
    button.addEventListener('click', () =>
      showScreen(button.dataset['screen'] as 'race' | 'garage'),
    );
  }

  for (const button of element.querySelectorAll<HTMLButtonElement>('[data-track]')) {
    button.addEventListener('click', () => {
      settings.track = TRACKS[Number(button.dataset['track'])] as Track;
      paint('[data-track]', (b) => TRACKS[Number(b.dataset['track'])] === settings.track);
      hooks.onNewHeat();
    });
  }
  for (const button of element.querySelectorAll<HTMLButtonElement>('[data-plan]')) {
    button.addEventListener('click', () => {
      settings.plan = button.dataset['plan'] as CornerPlan;
      paint('[data-plan]', (b) => b.dataset['plan'] === settings.plan);
    });
  }
  paint('[data-track]', (b) => TRACKS[Number(b.dataset['track'])] === settings.track);
  paint('[data-plan]', (b) => b.dataset['plan'] === settings.plan);

  const seed = byId<HTMLInputElement>('s-seed');
  seed.addEventListener('change', () => {
    settings.seed = seed.value;
    hooks.onNewHeat();
  });
  byId<HTMLButtonElement>('b-restart').addEventListener('click', hooks.onNewHeat);
  go.addEventListener('click', hooks.onGo);
  skip.addEventListener('click', hooks.onSkip);

  showScreen('garage');

  return {
    element,
    settings,
    boardSlot: byId<HTMLElement>('board-slot'),
    toRace: () => showScreen('race'),
    toGarage: () => showScreen('garage'),
    update({ field, live, settled }) {
      // Nothing has been raced yet: the garage is the whole game.
      if (field === undefined || live === undefined) {
        bar.innerHTML = '';
        skip.hidden = true;
        go.hidden = false;
        go.textContent = 'Race';
        staged.hidden = true;
        rState.textContent = 'Fit the ship, set the plan, then Race.';
        rState.className = 'state';
        return;
      }

      const done = field.phase === 'done';
      skip.hidden = settled;
      go.hidden = !settled;
      go.textContent = done ? 'Next heat' : 'Go — next lap';

      // What is waiting for the next decision point, said plainly.
      staged.hidden = !(screen === 'garage' && !settled);
      staged.textContent =
        'The lap on screen was settled before you opened this. Anything you buy or fit takes effect at the next pit stop.';

      // Mid-playback the bar is read off the film, never off `field`: the
      // segment was computed before it was watched, so its end already knows
      // who won, and reading it would announce the result over the race.
      const rows = settled
        ? standings(field).map((row) => ({
            lane: field.ships.indexOf(row.ship),
            place: row.place,
            progress: 1,
            time: seconds(row.ship.totalTicks),
          }))
        : orderAt(live.segment, live.cursor).map((row) => ({
            lane: row.ship,
            place: row.place,
            progress: row.progress,
            // Only one ship leads, however close the one behind it is.
            time: row.place === 1 ? 'leader' : `+${(row.behind / TICK_HZ).toFixed(2)}`,
          }));

      bar.innerHTML = rows
        .map(({ lane, place, progress, time }) => {
          const entrant = field.ships[lane]?.entrant;
          const colour = SHIP_COLOURS[lane % SHIP_COLOURS.length] as string;
          const who = entrant?.isPlayer === true ? 'You' : (entrant?.name ?? '');
          return `<div class="lane${entrant?.isPlayer === true ? ' me' : ''}">
            <span class="pip" style="background:${colour}"></span>
            <span class="who">${place}. ${who}</span>
            <span class="track-bar"><i style="width:${(progress * 100).toFixed(1)}%;background:${colour}"></i></span>
            <span class="gap">${time}</span>
          </div>`;
        })
        .join('');

      const me = field.ships.findIndex((s) => s.entrant.isPlayer);
      const frame = frameAt(live.segment, me, live.cursor);

      if (settled && done) {
        const final = standings(field);
        const mine = final.find((r) => r.ship.entrant.isPlayer);
        const won = final[0];
        rState.textContent =
          mine === undefined
            ? 'Heat over.'
            : mine.place === 1
              ? `Won the heat — ${seconds(mine.ship.totalTicks)} on total time.`
              : `P${mine.place} of ${final.length} — ${seconds(mine.ticks - (won?.ticks ?? 0))} off the win.`;
        rState.className = 'state done';
      } else if (settled) {
        rState.textContent = `Pit stop — everyone restarts level, the clock keeps running. Change the plan, then Go.`;
        rState.className = 'state pit';
      } else if (frame?.wide === true) {
        rState.textContent = `WIDE — off the path${condition(frame)}`;
        rState.className = 'state wide';
      } else {
        rState.textContent = `Lap ${field.lap + 1}${condition(frame)}`;
        rState.className = 'state';
      }
    },
  };
}

/** How intact the ship is, what the shields have left, how spent the crew is. */
function condition(
  frame: { integrity: number; shields: number; worn: number } | undefined,
): string {
  if (frame === undefined) return '';
  const parts = [`ship ${Math.round(frame.integrity * 100)}%`];
  if (frame.shields > 0.5) parts.push(`shields ${Math.round(frame.shields)}`);
  if (frame.worn > 0.25) parts.push(`crew ${Math.round((1 - frame.worn) * 100)}%`);
  return ` · ${parts.join(' · ')}`;
}
