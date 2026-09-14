// S5: the season — phases, heats, a cut at the end of each phase.
//
// A heat used to be the whole game, so nothing it produced had to be worth
// anything afterwards. Now it does, and the claims worth holding are about
// what carries: the same seed plays the same season, the draw that decides who
// races whom is fair, a place pays what the table says, and the cut takes
// exactly one group's worth so the last phase is a single group racing for it.

import { describe, expect, it } from 'vitest';
import {
  applyCut,
  cutSize,
  entrantFor,
  groupsFor,
  interestOn,
  newSeason,
  nextUp,
  pacingPay,
  payFor,
  playerIsOut,
  racerById,
  resolveHeat,
  settleHeat,
  settlePacing,
  stillIn,
  table,
  trackAt,
  heatConfig,
  type Season,
} from '../../src/sim/season';
import {
  GROUP_SIZE,
  HEATS_PER_PHASE,
  INTEREST_CAP,
  INTEREST_RATE,
  MARGIN_POINTS,
  MARGIN_WINDOW,
  PACING_BASE,
  PACING_CAP,
  PHASES,
  POINTS_BY_PLACE,
  PURSE_BY_PLACE,
  ROSTER,
} from '../../src/sim/tuning';

/**
 * A whole season with nobody watching: every group resolved, the player
 * shopping no better than a rival. It is the only way to ask whether a season
 * is the same season twice.
 */
function playSeason(seed: number): Season {
  let season = settlePacing(newSeason(seed), 3000, 3000);
  for (let guard = 0; guard < 64; guard += 1) {
    const up = nextUp(season);
    if (up.kind === 'over') break;
    if (up.kind === 'cut') {
      season = applyCut(season);
      continue;
    }
    if (up.kind === 'pacing') {
      season = settlePacing(season, 3000, up.track.par);
      continue;
    }
    const config = heatConfig(up.track, season.seed + season.phase * 7 + season.heat);
    const results = up.groups.map((group) =>
      resolveHeat(
        group.map((id) => entrantFor(racerById(season, id)!)),
        config,
      ),
    );
    season = settleHeat(season, results);
  }
  return season;
}

describe('a season is a value the seed decides', () => {
  it('plays the same season twice from the same seed', () => {
    const a = playSeason(4242);
    const b = playSeason(4242);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('plays a different season from a different seed', () => {
    const a = playSeason(4242);
    const b = playSeason(99);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('runs every phase and every heat in it', () => {
    const season = playSeason(4242);
    // The player may be cut early, which ends the run — but the log up to
    // that point is a whole number of phases' worth of heats.
    expect(season.log.length % HEATS_PER_PHASE).toBe(0);
    expect(season.log.length).toBeLessThanOrEqual(PHASES * HEATS_PER_PHASE);
    expect(season.log.length).toBeGreaterThan(0);
  });

  it('puts the same field on the same track for the same heat', () => {
    expect(trackAt(7, 1, 2).name).toBe(trackAt(7, 1, 2).name);
    const names = new Set<string>();
    for (let phase = 0; phase < PHASES; phase += 1) {
      for (let heat = 0; heat < HEATS_PER_PHASE; heat += 1) {
        names.add(trackAt(7, phase, heat).name);
      }
    }
    // A season that raced one track nine times would be a worse season.
    expect(names.size).toBeGreaterThan(1);
  });
});

describe('who races whom', () => {
  it('splits everyone still in into groups, the player first', () => {
    const season = { ...newSeason(11), paced: true };
    const groups = groupsFor(season);
    expect(groups).toHaveLength(ROSTER / GROUP_SIZE);
    expect(groups[0]).toContain('player');
    for (const group of groups) expect(group).toHaveLength(GROUP_SIZE);
    expect(new Set(groups.flat()).size).toBe(ROSTER);
  });

  it('draws the player a different set of rivals over a season', () => {
    const season = { ...newSeason(11), paced: true };
    const seen = new Set<string>();
    for (let heat = 0; heat < HEATS_PER_PHASE; heat += 1) {
      for (const id of groupsFor({ ...season, heat })[0] ?? []) seen.add(id);
    }
    expect(seen.size).toBeGreaterThan(GROUP_SIZE);
  });

  it('draws rivals uniformly rather than favouring the top of the list', () => {
    // A comparator fed random numbers is not a uniform shuffle, which is the
    // bug this guards. Over many draws every rival should meet the player
    // about as often as any other.
    const counts = new Map<string, number>();
    const draws = 600;
    for (let seed = 0; seed < draws; seed += 1) {
      const season = { ...newSeason(seed), paced: true };
      for (const id of groupsFor(season)[0] ?? []) {
        if (id !== 'player') counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    const expected = (draws * (GROUP_SIZE - 1)) / (ROSTER - 1);
    for (const [, n] of counts) {
      expect(Math.abs(n - expected) / expected).toBeLessThan(0.3);
    }
    expect(counts.size).toBe(ROSTER - 1);
  });
});

describe('what a heat pays', () => {
  it('pays the table by place', () => {
    for (let place = 1; place <= GROUP_SIZE; place += 1) {
      expect(payFor(place, MARGIN_WINDOW).purse).toBe(PURSE_BY_PLACE[place - 1]);
      expect(payFor(place, MARGIN_WINDOW).points).toBe(POINTS_BY_PLACE[place - 1]);
    }
  });

  it('pays a close last about twice a beaten one', () => {
    const close = payFor(GROUP_SIZE, 0).points;
    const beaten = payFor(GROUP_SIZE, MARGIN_WINDOW * 2).points;
    expect(close).toBe((POINTS_BY_PLACE[GROUP_SIZE - 1] ?? 0) + MARGIN_POINTS);
    expect(beaten).toBe(POINTS_BY_PLACE[GROUP_SIZE - 1]);
    expect(close / beaten).toBeGreaterThan(1.8);
  });

  it('never pays a margin bonus for a gap wider than the window', () => {
    expect(payFor(2, MARGIN_WINDOW).points).toBe(POINTS_BY_PLACE[1]);
    expect(payFor(2, MARGIN_WINDOW * 10).points).toBe(POINTS_BY_PLACE[1]);
  });

  it('pays interest on credits held, to a cap', () => {
    expect(interestOn(0)).toBe(0);
    expect(interestOn(100)).toBe(Math.floor(100 * INTEREST_RATE));
    expect(interestOn(100000)).toBe(INTEREST_CAP);
  });

  it('pays the pacing lap against par, with a floor and a cap', () => {
    expect(pacingPay(3000, 3000)).toBe(PACING_BASE);
    // Over par is still worth turning up for, and never less than the base.
    expect(pacingPay(4000, 3000)).toBe(PACING_BASE);
    expect(pacingPay(0, 100000)).toBe(PACING_BASE + PACING_CAP);
    expect(pacingPay(2900, 3000)).toBeGreaterThan(PACING_BASE);
  });

  it('banks the purse and a slot into the garage that carries', () => {
    const before = { ...newSeason(3), paced: true };
    const me = racerById(before, 'player')!;
    const after = settleHeat(before, [[{ id: 'player', ticks: 1000 }]]);
    const then = racerById(after, 'player')!;
    expect(then.points).toBe((POINTS_BY_PLACE[0] ?? 0) + MARGIN_POINTS);
    expect(then.garage.credits).toBeGreaterThan(me.garage.credits);
    expect(then.garage.slots).toBeGreaterThan(me.garage.slots);
    expect(then.heats).toBe(1);
  });
});

describe('the cut', () => {
  const withPoints = (seed: number, points: readonly number[]): Season => ({
    ...newSeason(seed),
    paced: true,
    heat: HEATS_PER_PHASE,
    racers: newSeason(seed).racers.map((racer, i) => ({
      ...racer,
      points: points[i] ?? 0,
    })),
  });

  it('takes exactly one group and keeps the roster a multiple of the group', () => {
    let season = withPoints(5, [9, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(cutSize(season)).toBe(GROUP_SIZE);
    season = applyCut(season);
    expect(stillIn(season).length).toBe(ROSTER - GROUP_SIZE);
    expect(stillIn(season).length % GROUP_SIZE).toBe(0);
    expect(season.phase).toBe(1);
    expect(season.heat).toBe(0);
  });

  it('cuts the bottom of the table, not the top', () => {
    const season = applyCut(withPoints(5, [9, 8, 7, 6, 5, 4, 3, 2, 1]));
    const out = season.racers.filter((racer) => racer.out).map((racer) => racer.points);
    expect(Math.max(...out)).toBeLessThan(
      Math.min(...stillIn(season).map((racer) => racer.points)),
    );
  });

  it('leaves one group racing for the season at the last phase', () => {
    let season = withPoints(5, [9, 8, 7, 6, 5, 4, 3, 2, 1]);
    for (let phase = 0; phase + 1 < PHASES; phase += 1) {
      season = applyCut({ ...season, heat: HEATS_PER_PHASE });
    }
    expect(stillIn(season).length).toBe(GROUP_SIZE);
    expect(cutSize({ ...season, heat: HEATS_PER_PHASE })).toBe(0);
  });

  it('ends the run when the player is cut', () => {
    const season = applyCut(withPoints(5, [0, 9, 8, 7, 6, 5, 4, 3, 2]));
    expect(playerIsOut(season)).toBe(true);
    expect(nextUp(season).kind).toBe('over');
  });

  it('keeps racing the player who survived', () => {
    const season = applyCut(withPoints(5, [9, 8, 7, 6, 5, 4, 3, 2, 1]));
    expect(playerIsOut(season)).toBe(false);
    expect(nextUp(season).kind).toBe('heat');
  });

  it('leaves the cut out of the table it draws the line on', () => {
    const season = applyCut(withPoints(5, [9, 8, 7, 6, 5, 4, 3, 2, 1]));
    const ranked = table(season);
    // Everyone out sits below everyone still in, whatever their points.
    const firstOut = ranked.findIndex((racer) => racer.out);
    expect(ranked.slice(firstOut).every((racer) => racer.out)).toBe(true);
  });
});

describe('what the season is waiting for', () => {
  it('asks for the pacing lap before anything else', () => {
    const up = nextUp(newSeason(2));
    expect(up.kind).toBe('pacing');
  });

  it('asks for the cut once a phase has run its heats', () => {
    const season = { ...newSeason(2), paced: true, heat: HEATS_PER_PHASE };
    expect(nextUp(season).kind).toBe('cut');
  });

  it('is over once the phases have run out', () => {
    const season = { ...newSeason(2), paced: true, phase: PHASES };
    expect(nextUp(season).kind).toBe('over');
  });
});
