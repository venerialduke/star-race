// A par is level data, and level data goes stale silently when the model under
// it changes. Every par that ships was authored against the swing, and under
// flight they had drifted into being *the maxed ship's lap* — Kestrel par 2100
// against 2099 for a fully built ship. Nothing failed. The pacing lap simply
// stopped being winnable, on every track, for a whole model.
//
// So these are the properties that make a par readable, rather than the
// numbers themselves: `npm run pars` measures the numbers, and this says what
// they have to be true of.

import { describe, expect, it } from 'vitest';
import { startRace, stepRace, type RaceConfig } from '../../src/sim/race';
import { seedFrom } from '../../src/sim/rng';
import { pacingPay } from '../../src/sim/season';
import { resolveBuild, type Fitted } from '../../src/sim/ship';
import { TRACKS, type Track } from '../../src/sim/track';
import { PACING_BASE, PACING_CAP, PACING_PER_TICK } from '../../src/sim/tuning';

const fit = (componentId: string, level = 1, uid = componentId): Fitted => ({
  uid,
  componentId,
  level,
});

/** The opening budget spent well: the engine and the eyes, 60 of 100 credits. */
const REFERENCE: Fitted[] = [fit('balanced-engine'), fit('nav-system')];
/** The opening budget not spent at all. */
const BARE: Fitted[] = [];
/** A ship nobody has at the pacing lap, which is the point of it. */
const MAXED: Fitted[] = [fit('balanced-engine', 3), fit('nav-system', 3)];

/** How far under par the whole pacing bonus needs — the number a par is built on. */
const FULL_BONUS = Math.round(PACING_CAP / PACING_PER_TICK);

/** Four seeds. A navigation system that is not maxed draws its own lap. */
const SEEDS = ['par0', 'par1', 'par2', 'par3'];

function lap(track: Track, build: Fitted[], seed: string): number {
  const stats = resolveBuild(build);
  const config: RaceConfig = { track, stats, build, seed: seedFrom(seed) };
  let state = startRace(stats, build);
  while (state.lap < 1 && state.tick < 40_000) state = stepRace(state, config);
  return state.tick;
}

const laps = (track: Track, build: Fitted[]): number[] =>
  SEEDS.map((seed) => lap(track, build, seed));

describe.each(TRACKS)('$name par', (track: Track) => {
  it('is beaten by an opening budget spent well, on most laps', () => {
    // Most rather than all: at level one a navigation system misjudges its own
    // pace, so a bad draw can cost the lap. Measured at 7 or 8 in 8.
    const beat = laps(track, REFERENCE).filter((ticks) => ticks < track.par);
    expect(beat.length).toBeGreaterThanOrEqual(SEEDS.length - 1);
  });

  it('is missed by a hull that spent nothing, on every lap', () => {
    expect(laps(track, BARE).every((ticks) => ticks > track.par)).toBe(true);
  });

  it('pays the whole bonus for the reference lap, and only turning up for a bare one', () => {
    const reference = laps(track, REFERENCE);
    const mean = reference.reduce((sum, ticks) => sum + ticks, 0) / reference.length;
    // Par *is* the reference lap plus the full bonus, so an average lap in the
    // reference build takes the cap. A worse-than-average one still gets some.
    expect(pacingPay(Math.round(mean), track.par)).toBe(PACING_BASE + PACING_CAP);
    expect(pacingPay(Math.max(...laps(track, BARE)), track.par)).toBe(PACING_BASE);
  });

  it('is not the ceiling: a maxed ship clears it with room to spare', () => {
    // The failure this file exists for. A par equal to what the best ship in
    // the game laps is not a benchmark, and nothing else notices.
    expect(track.par - lap(track, MAXED, SEEDS[0]!)).toBeGreaterThan(FULL_BONUS * 2);
  });
});
