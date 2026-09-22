/**
 * What a track's `par` should be, measured rather than guessed.
 *
 * A par is level data, and level data goes stale when the model under it
 * changes. Every par that ships was authored against the swing; under flight
 * they had drifted into being *the maxed ship's lap* — Kestrel par 2100
 * against 2099 for a fully built ship — which is not a benchmark, it is the
 * ceiling. Nobody has that ship at the pacing lap: it is the first race of the
 * season and the garage holds `STARTING_CREDITS`.
 *
 * The rule, which the old numbers already obeyed and nobody had written down:
 *
 *     par = the reference lap + PACING_CAP / PACING_PER_TICK
 *
 * So **a ship that spends its opening budget well takes the whole pacing
 * payout**, and one that spends it badly takes part of it or none. The old
 * Proving Ground says so in its own comment: a reference build flew it in 1476
 * and par sat at 1875, which is 399 ticks — the full bonus to the tick.
 *
 * The reference build is the two parts that decide a lap: an engine and a
 * navigation system, one level each, 60 of the 100 credits a season opens
 * with. Shields and a crew are the rest of a sensible opening spend and they
 * change a solo lap very little, so they are left out of the benchmark rather
 * than out of the advice.
 *
 *   npm run pars
 */

import { startRace, stepRace, type RaceConfig } from '../src/sim/race';
import { seedFrom } from '../src/sim/rng';
import { resolveBuild, type Fitted } from '../src/sim/ship';
import { TRACKS, type Track } from '../src/sim/track';
import {
  PACING_CAP,
  PACING_PER_TICK,
  STARTING_CREDITS,
  TICK_HZ,
} from '../src/sim/tuning';

const fit = (componentId: string, level = 1, uid = componentId): Fitted => ({
  uid,
  componentId,
  level,
});

/** The opening budget spent well: the engine and the eyes. */
const REFERENCE: Fitted[] = [fit('balanced-engine'), fit('nav-system')];

/**
 * The other builds are context, not the benchmark. They are here so the table
 * shows the thing a par has to be true of: the reference beats it, a hull that
 * spent nothing does not, and a maxed ship is a long way under.
 */
const BUILDS: ReadonlyArray<readonly [string, Fitted[]]> = [
  ['bare hull', []],
  ['engine, no nav', [fit('balanced-engine')]],
  ['REFERENCE', REFERENCE],
  ['two speed engines', [fit('speed-engine'), fit('speed-engine', 1, 'b')]],
  ['maxed engine + nav', [fit('balanced-engine', 3), fit('nav-system', 3)]],
];

/** How far under par the full pacing bonus needs, which is what par is built on. */
const FULL_BONUS = Math.round(PACING_CAP / PACING_PER_TICK);

/** Eight seeds, because a navigation system that is not maxed draws its own lap. */
const SEEDS = Array.from({ length: 8 }, (_, i) => `par${i}`);

function lap(track: Track, build: Fitted[], seed: string): number {
  const stats = resolveBuild(build);
  const config: RaceConfig = { track, stats, build, seed: seedFrom(seed) };
  let state = startRace(stats, build);
  while (state.lap < 1 && state.tick < 40_000) state = stepRace(state, config);
  return state.tick;
}

const meanLap = (track: Track, build: Fitted[]): number =>
  Math.round(
    SEEDS.reduce((sum, seed) => sum + lap(track, build, seed), 0) / SEEDS.length,
  );

const pad = (text: string, width: number): string => text.padStart(width);
const cell = (ticks: number): string =>
  pad(`${ticks} · ${(ticks / TICK_HZ).toFixed(0)}s`, 14);

console.log(
  `\n  A par is the reference lap plus ${FULL_BONUS} ticks — the whole pacing bonus.`,
);
console.log(
  `  Reference: an engine and a navigation system, level one each, out of ${STARTING_CREDITS}.\n`,
);

console.log(pad('build', 20) + TRACKS.map((t) => pad(t.name.slice(0, 12), 14)).join(''));
for (const [name, build] of BUILDS) {
  console.log(pad(name, 20) + TRACKS.map((t) => cell(meanLap(t, build))).join(''));
}

console.log('');
console.log(pad('par today', 20) + TRACKS.map((t) => cell(t.par)).join(''));
console.log(
  pad('par should be', 20) +
    TRACKS.map((t) => cell(meanLap(t, REFERENCE) + FULL_BONUS)).join(''),
);

console.log('\n  Paste into track.ts:\n');
for (const track of TRACKS) {
  console.log(
    `    ${track.name.padEnd(20)} par: ${meanLap(track, REFERENCE) + FULL_BONUS},`,
  );
}
console.log('');
