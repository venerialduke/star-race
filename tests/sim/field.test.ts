// The heat. S2 is judged by eye like S1, so these cover the properties the
// rest of the game will stand on: lockstep, independence, and that the pit
// stop resets the line without resetting the clock.

import { describe, expect, it } from 'vitest';
import { botPlan, makeBot, tightness } from '../../src/sim/bot';
import {
  leavePit,
  standings,
  startField,
  stepField,
  type Entrant,
  type FieldConfig,
  type FieldState,
} from '../../src/sim/field';
import type { CornerPlan } from '../../src/sim/race';
import { seedFrom } from '../../src/sim/rng';
import { CINDER_COIL, KESTREL_LOOP, MERIDIAN_RUN } from '../../src/sim/track';
import { LAPS_PER_HEAT } from '../../src/sim/tuning';

const SEED = seedFrom('heat');

const entrants = (): Entrant[] => [
  { id: 'player', name: 'You', stats: { thrust: 1, handling: 1 }, isPlayer: true },
  makeBot(KESTREL_LOOP, SEED, 1),
  makeBot(KESTREL_LOOP, SEED, 2),
];

const config = (): FieldConfig => ({
  track: KESTREL_LOOP,
  laps: LAPS_PER_HEAT,
  seed: SEED,
});

/** Run until the phase stops being 'racing', or give up. */
function runLap(state: FieldState, cfg: FieldConfig): FieldState {
  let next = state;
  for (let i = 0; i < 20000 && next.phase === 'racing'; i += 1) {
    next = stepField(next, cfg);
  }
  return next;
}

/** A whole heat, answering the pit stop with the same plans. */
function runHeat(plans: CornerPlan[]): FieldState {
  const cfg = config();
  let state = startField(entrants(), plans);
  for (let lap = 0; lap < cfg.laps; lap += 1) {
    state = runLap(state, cfg);
    if (state.phase === 'pit') state = leavePit(state, plans);
  }
  return state;
}

describe('a heat', () => {
  it('runs two laps and finishes', () => {
    const done = runHeat(['carry', 'carry', 'carry']);
    expect(done.phase).toBe('done');
    expect(done.ships.every((s) => s.lapTicks.length === LAPS_PER_HEAT)).toBe(true);
  });

  it('pauses at the pit stop with everyone in', () => {
    const cfg = config();
    const pit = runLap(startField(entrants(), ['carry', 'carry', 'carry']), cfg);
    expect(pit.phase).toBe('pit');
    expect(pit.ships.every((s) => s.waiting)).toBe(true);
    expect(pit.ships.every((s) => s.lapTicks.length === 1)).toBe(true);
  });

  it('resets the line at the pit stop but not the clock', () => {
    const cfg = config();
    const pit = runLap(startField(entrants(), ['carry', 'carry', 'carry']), cfg);
    const carried = pit.ships.map((s) => s.totalTicks);
    const out = leavePit(pit, ['carry', 'carry', 'carry']);
    expect(out.ships.map((s) => s.state.distance)).toEqual([0, 0, 0]);
    expect(out.ships.map((s) => s.state.speed)).toEqual([0, 0, 0]);
    expect(out.ships.map((s) => s.totalTicks)).toEqual(carried);
    expect(out.tick).toBe(0);
    expect(out.lap).toBe(pit.lap + 1);
  });

  it('decides the heat on total time, not on who crossed last', () => {
    const done = runHeat(['charge', 'carry', 'carry']);
    const rows = standings(done);
    const times = rows.map((r) => r.ticks);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(rows[0]?.ticks).toBe(Math.min(...done.ships.map((s) => s.totalTicks)));
  });

  it('replays identically from the same seed, and differs from another', () => {
    const a = runHeat(['carry', 'carry', 'carry']);
    const b = runHeat(['carry', 'carry', 'carry']);
    expect(a.ships.map((s) => s.totalTicks)).toEqual(b.ships.map((s) => s.totalTicks));

    const other = { ...config(), seed: seedFrom('another heat') };
    let c = startField(entrants(), ['charge', 'charge', 'charge']);
    c = runLap(c, other);
    const first = runLap(
      startField(entrants(), ['charge', 'charge', 'charge']),
      config(),
    );
    expect(c.ships[0]?.totalTicks).not.toBe(first.ships[0]?.totalTicks);
  });

  it('gives each ship its own luck: one ship swinging does not move another', () => {
    const cfg = config();
    const withWildPlayer = runLap(
      startField(entrants(), ['charge', 'carry', 'carry']),
      cfg,
    );
    const withCautiousPlayer = runLap(
      startField(entrants(), ['lift', 'carry', 'carry']),
      cfg,
    );
    expect(withWildPlayer.ships[1]?.totalTicks).toBe(
      withCautiousPlayer.ships[1]?.totalTicks,
    );
    expect(withWildPlayer.ships[0]?.totalTicks).not.toBe(
      withCautiousPlayer.ships[0]?.totalTicks,
    );
  });
});

describe('the bots', () => {
  it('read the track: tighter tracks want more handling', () => {
    expect(tightness(CINDER_COIL)).toBeGreaterThan(tightness(KESTREL_LOOP));
    expect(tightness(KESTREL_LOOP)).toBeGreaterThan(tightness(MERIDIAN_RUN));

    const nimble = makeBot(CINDER_COIL, SEED, 1);
    const quick = makeBot(MERIDIAN_RUN, SEED, 1);
    expect(nimble.stats.handling).toBeGreaterThan(nimble.stats.thrust);
    expect(quick.stats.thrust).toBeGreaterThan(quick.stats.handling);
  });

  it('are not the same ship as each other', () => {
    const one = makeBot(KESTREL_LOOP, SEED, 1);
    const two = makeBot(KESTREL_LOOP, SEED, 2);
    expect(one.stats).not.toEqual(two.stats);
  });

  it('pick a plan deterministically, and change their minds between laps', () => {
    const bot = makeBot(KESTREL_LOOP, SEED, 1);
    expect(botPlan(bot, SEED, 0)).toBe(botPlan(bot, SEED, 0));
    const laps = [0, 1, 2, 3, 4, 5].map((lap) => botPlan(bot, SEED, lap));
    expect(new Set(laps).size).toBeGreaterThan(1);
  });
});
