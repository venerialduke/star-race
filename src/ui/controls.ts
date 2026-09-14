// The two screens, and everything around them.
//
// **Race** is playback: the track, and the tracking bar over it. **Garage** is
// every decision: the track, the corner plan, the shop and the build. The bar
// is on both, so you can watch the lap while you shop. You can open the garage
// while a segment plays — but what the segment shows was settled before you
// opened it, so nothing you do there reaches the ship until the next decision
// point. The garage says so.

import type { AbilityId } from '../sim/ability';
import { standings, type FieldState } from '../sim/field';
import type { CornerPlan } from '../sim/race';
import { frameAt, orderAt, type Segment } from '../sim/segment';
import { describeRoute, navFor, TRACKS, type Sector, type Track } from '../sim/track';
import { NAV_FOR_REPLAN, TICK_HZ } from '../sim/tuning';
import { SHIP_COLOURS } from '../render/draw';

export interface Settings {
  track: Track;
  plan: CornerPlan;
  /** The way through each sector the player means to take, one index per sector. */
  routes: number[];
  /** The sector to lay a mine in before the heat, if the ship has a rack. */
  place: number | undefined;
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
  /** The whole heat is over, not just a lap of it. */
  readonly done: boolean;
  /** What to say about the result, when the race was not a heat against anyone. */
  readonly note?: string | undefined;
}

export interface Controls {
  readonly element: HTMLElement;
  readonly settings: Settings;
  readonly boardSlot: HTMLElement;
  /** Where the season's standings go, above the shop. */
  readonly seasonSlot: HTMLElement;
  /** A new heat on this track: the route resets and is open to plan again. */
  setTrack(track: Track): void;
  /** How far the build's navigation reads. Changes as parts are fitted. */
  setNav(nav: number): void;
  /** How deep a mine rack is fitted, which is whether a mine can be laid at all. */
  setMines(level: number): void;
  /** The heat has started. Without Nav 3 the route is now fixed. */
  seal(): void;
  /** What the season is waiting for, so the Go button can say it. */
  setSeason(stage: 'pacing' | 'heat' | 'cut' | 'over', playerOut: boolean): void;
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

/** What to say when an ability goes off. Held for a moment so it can be read. */
const FIRED_HOLD = 40;
const FIRED: Record<AbilityId, string> = {
  boost: 'BOOST',
  'dark-boost': 'BOOST — and a black hole left behind it',
  'three-bends': 'THREE PERFECT BENDS',
  missile: 'MISSILE AWAY',
  tractor: 'TRACTOR — holding the ship ahead',
  mine: 'MINE LAID',
};

export function mountControls(parent: HTMLElement, hooks: Hooks): Controls {
  const settings: Settings = {
    track: TRACKS[0] as Track,
    plan: 'carry',
    routes: (TRACKS[0] as Track).sectors.map(() => 0),
    place: undefined,
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
      <div id="season-slot"></div>
      <div class="plans" role="group" aria-label="Corner plan">
        ${PLANS.map(
          (p) => `<button type="button" data-plan="${p.id}" class="plan">
            <b>${p.label}</b><span>${p.hint}</span></button>`,
        ).join('')}
      </div>
      <h3 class="routes-head">The route</h3>
      <p id="route-note" class="hint"></p>
      <div id="routes" class="routes"></div>
      <div id="mines" hidden>
        <h3 class="routes-head">The mine</h3>
        <p class="hint">Laid before the start, so everyone in the heat can see it. It drags whoever flies near it further off their line — including you.</p>
        <div id="mine-row" class="routes"></div>
      </div>
      <p id="staged" class="staged" hidden></p>
      <div id="board-slot"></div>
    </div>
    <div class="seedrow">
      <label>Seed <input id="s-seed" type="text" value="kestrel" spellcheck="false" /></label>
      <button type="button" id="b-skip" hidden>Skip</button>
      <button type="button" id="b-go" class="go">Go</button>
      <button type="button" id="b-restart">New season</button>
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
  /** What the season is waiting for, which is what the Go button is offering. */
  let stage: 'pacing' | 'heat' | 'cut' | 'over' = 'heat';
  let playerOut = false;
  const garageScreen = byId<HTMLElement>('garage-screen');
  const bar = byId<HTMLElement>('bar');
  const rState = byId<HTMLElement>('r-state');
  const staged = byId<HTMLElement>('staged');
  const routeBox = byId<HTMLElement>('routes');
  const routeNote = byId<HTMLElement>('route-note');
  const mineBox = byId<HTMLElement>('mines');
  const mineRow = byId<HTMLElement>('mine-row');
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

  for (const button of element.querySelectorAll<HTMLButtonElement>('[data-plan]')) {
    button.addEventListener('click', () => {
      settings.plan = button.dataset['plan'] as CornerPlan;
      paint('[data-plan]', (b) => b.dataset['plan'] === settings.plan);
    });
  }
  paint('[data-plan]', (b) => b.dataset['plan'] === settings.plan);

  const seed = byId<HTMLInputElement>('s-seed');
  seed.addEventListener('change', () => {
    settings.seed = seed.value;
    hooks.onNewHeat();
  });
  byId<HTMLButtonElement>('b-restart').addEventListener('click', hooks.onNewHeat);
  go.addEventListener('click', hooks.onGo);
  skip.addEventListener('click', hooks.onSkip);

  /** How far the player's navigation reads, as the last render knew it. */
  let nav = 0;
  /** How deep a mine rack is fitted. Zero means there is nothing to lay. */
  let mines = 0;
  /** True once the heat has started: without Nav 3 the route is then fixed. */
  let sealed = false;

  /**
   * The route planner. One row per sector, one button per way through it — and
   * a way through it that your navigation cannot read is shown locked rather
   * than hidden, because knowing a system would buy you something is the
   * reason to buy one.
   */
  const renderRoutes = (): void => {
    const track = settings.track;
    const locked = sealed && nav < NAV_FOR_REPLAN;
    routeNote.textContent = locked
      ? 'The route is set for this heat. A level 3 navigation system would let you re-plan here.'
      : nav === 0
        ? 'Without a navigation system you can only plan the splits anyone can see.'
        : `Navigation ${nav}: planning every split up to ${nav >= 2 ? 'dark' : 'dim'}.`;

    routeBox.innerHTML = track.sectors
      .map((sector: Sector) => {
        const buttons = sector.routes
          .map((route, index) => {
            const readable = navFor(route.grade) <= nav;
            const on = (settings.routes[sector.index] ?? 0) === index;
            const disabled = !readable || locked;
            const label = readable ? route.name : `Needs Nav ${navFor(route.grade)}`;
            return `<button type="button" class="route${on ? ' on' : ''}${readable ? '' : ' unread'}"
              data-sector="${sector.index}" data-route="${index}"${disabled ? ' disabled' : ''}>
              <b>${label}</b><span>${readable ? describeRoute(sector, route) : route.grade}</span>
            </button>`;
          })
          .join('');
        return `<div class="sector"><span class="sector-n">${sector.index + 1}</span>
          <div class="route-choices">${buttons}</div></div>`;
      })
      .join('');

    for (const button of routeBox.querySelectorAll<HTMLButtonElement>('[data-route]')) {
      button.addEventListener('click', () => {
        settings.routes[Number(button.dataset['sector'])] = Number(
          button.dataset['route'],
        );
        renderRoutes();
      });
    }
  };

  /**
   * Where to lay the mine. One button per sector and one for laying none —
   * because not laying it is a real choice: a mine is on the board before the
   * start, so it tells the rest of the heat something about you.
   */
  const renderMines = (): void => {
    mineBox.hidden = mines === 0;
    if (mines === 0) {
      settings.place = undefined;
      return;
    }
    const button = (index: number | undefined, label: string): string =>
      `<button type="button" class="route${settings.place === index ? ' on' : ''}"
        data-mine="${index ?? ''}"${sealed ? ' disabled' : ''}><b>${label}</b></button>`;
    mineRow.innerHTML = `<div class="sector"><div class="route-choices">${[
      button(undefined, 'None'),
      ...settings.routes.map((_, index) => button(index, `Sector ${index + 1}`)),
    ].join('')}</div></div>`;
    for (const element of mineRow.querySelectorAll<HTMLButtonElement>('[data-mine]')) {
      element.addEventListener('click', () => {
        const raw = element.dataset['mine'];
        settings.place = raw === undefined || raw === '' ? undefined : Number(raw);
        renderMines();
      });
    }
  };

  showScreen('garage');

  return {
    element,
    settings,
    boardSlot: byId<HTMLElement>('board-slot'),
    seasonSlot: byId<HTMLElement>('season-slot'),
    setTrack(next) {
      // The season picks the track now, so this is told rather than chosen.
      // Re-planning only resets when the track actually changes underneath it.
      const changed = next !== settings.track;
      settings.track = next;
      if (changed || settings.routes.length !== next.sectors.length) {
        settings.routes = next.sectors.map(() => 0);
        settings.place = undefined;
      }
      sealed = false;
      renderRoutes();
      renderMines();
    },
    setNav(next) {
      nav = next;
      renderRoutes();
    },
    setMines(level) {
      mines = level;
      renderMines();
    },
    seal() {
      sealed = true;
      renderRoutes();
      renderMines();
    },
    setSeason(next, out) {
      stage = next;
      playerOut = out;
    },
    toRace: () => showScreen('race'),
    toGarage: () => showScreen('garage'),
    update({ field, live, settled, done: heatOver, note }) {
      // Nothing has been raced yet: the garage is the whole game.
      if (field === undefined || live === undefined) {
        bar.innerHTML = '';
        skip.hidden = true;
        go.hidden = false;
        go.textContent =
          stage === 'over'
            ? 'New season'
            : stage === 'pacing'
              ? 'Pacing lap'
              : 'Race the heat';
        staged.hidden = true;
        rState.textContent =
          stage === 'over'
            ? playerOut
              ? 'Cut. Start another season when you are ready.'
              : 'Season over.'
            : stage === 'pacing'
              ? 'One lap alone, against the track. Fit the ship, then go.'
              : 'Fit the ship, set the plan and the route, then race.';
        rState.className = 'state';
        return;
      }

      const done = field.phase === 'done';
      skip.hidden = settled;
      go.hidden = !settled;
      go.textContent = !done
        ? 'Go — next lap'
        : stage === 'over'
          ? 'New season'
          : heatOver
            ? 'Next'
            : 'Go — next lap';

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
      // An ability is over in a tick, so it is held on screen for long enough
      // to read: what the player wants to know is that the thing they bought
      // just did something, not exactly which tick it did it on.
      let recentlyFired: AbilityId | undefined;
      for (let back = 0; back <= FIRED_HOLD; back += 1) {
        const was = frameAt(live.segment, me, live.cursor - back)?.fired;
        if (was !== undefined) {
          recentlyFired = was;
          break;
        }
      }

      if (settled && done && note !== undefined) {
        rState.textContent = note;
        rState.className = 'state done';
      } else if (settled && done) {
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
      } else if (recentlyFired !== undefined) {
        rState.textContent = `${FIRED[recentlyFired]}${condition(frame)}`;
        rState.className = 'state fired';
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
