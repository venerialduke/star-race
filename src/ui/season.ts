// The season, as a thing the player can read in a glance between heats.
//
// Two questions matter here and nothing else does: **am I going to survive the
// cut**, and **who am I racing next**. So the table is points, the cut line is
// drawn across it, and the ships in the next group are marked.

import {
  cutLine,
  cutSize,
  nextUp,
  racerById,
  stillIn,
  table,
  type Season,
} from '../sim/season';
import { HEATS_PER_PHASE, PHASES, TICK_HZ } from '../sim/tuning';

export interface SeasonPanel {
  readonly element: HTMLElement;
  render(season: Season): void;
}

const seconds = (ticks: number): string => `${(ticks / TICK_HZ).toFixed(1)}s`;

export function mountSeason(parent: HTMLElement): SeasonPanel {
  const element = document.createElement('div');
  element.className = 'season';
  parent.appendChild(element);

  return {
    element,
    render(season) {
      const up = nextUp(season);
      const me = racerById(season, 'player');
      const ranked = table(season);
      const line = cutSize(season) > 0 ? cutLine(season) : undefined;
      const facing = up.kind === 'heat' ? new Set(up.groups[0] ?? []) : new Set<string>();

      const where =
        up.kind === 'over'
          ? me?.out === true
            ? 'Your season ended at the cut.'
            : 'The season is over.'
          : up.kind === 'cut'
            ? `End of phase ${season.phase + 1}. ${cutSize(season)} of ${stillIn(season).length} go out.`
            : up.kind === 'pacing'
              ? `Pacing lap on the ${up.track.name} — alone, against a par of ${seconds(up.track.par)}.`
              : `Phase ${season.phase + 1} of ${PHASES} · heat ${season.heat + 1} of ${HEATS_PER_PHASE} · ${up.track.name}`;

      // The cut line is drawn where it falls, so "one more place" is a thing
      // you can see rather than a number you have to hold in your head.
      const survivors = stillIn(season).length - cutSize(season);
      let alive = 0;
      const rows = ranked
        .map((racer) => {
          if (!racer.out) alive += 1;
          const drawLine = line !== undefined && !racer.out && alive === survivors + 1;
          const row = `<div class="racer${racer.isPlayer ? ' me' : ''}${racer.out ? ' gone' : ''}">
            <span class="r-name">${racer.name}${facing.has(racer.id) ? ' <em>·next</em>' : ''}</span>
            <span class="r-pts">${racer.points}</span>
            <span class="r-cred">${racer.out ? '—' : `${racer.garage.credits}c`}</span>
          </div>`;
          return drawLine ? `<div class="cutline">the cut</div>${row}` : row;
        })
        .join('');

      element.innerHTML = `
        <h3>The season</h3>
        <p class="hint">${where}</p>
        <div class="racers">
          <div class="racer head"><span>Racer</span><span>Pts</span><span>Credits</span></div>
          ${rows}
        </div>`;
    },
  };
}
