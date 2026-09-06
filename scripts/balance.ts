// The balance harness: run a lot of races and print what happened.
//
//   npm run balance -- --races 1000
//
// It races the three standard builds against the slice track, once per seed,
// with a reference player who raises shields into each gamma burst and reroutes
// power on clear track. The point is a table you can read before and after a
// tuning change to see what moved.
//
// This is a script, not part of the game: it may use the console and process,
// which src/sim may not.

import { simulate, type PlayerInput, type RaceOutcome } from '../src/sim/race';
import { STANDARD_BUILDS, type StandardBuild } from '../src/sim/builds';
import { resolveBuild, type Build } from '../src/sim/ship';
import { SLICE_TRACK, segmentStartTick, type Track } from '../src/sim/track';
import { ACTIVES } from '../src/sim/actives';
import { makeRng } from '../src/sim/rng';

/** How many ticks early or late the reference player's taps can land. */
const HUMAN_JITTER_TICKS = 60;

/**
 * What a decent but human player does: shields up around each burst, and
 * rerouted power on the opening straight.
 *
 * The taps are deliberately imperfect. Timing jitters by up to a shield window
 * either way, seeded from the race, so the harness answers the question that
 * matters — how often does this build survive real play? — rather than how it
 * does under frame-perfect input. A build that only lives when the tap is exact
 * shows up here as a build that mostly dies.
 */
export function referencePlay(track: Track, build: Build, seed: number): PlayerInput[] {
  const stats = resolveBuild(build);
  const rng = makeRng(seed).fork();
  const inputs: PlayerInput[] = [];

  // Shields: aim to be up when the ship reaches each burst. Distance over
  // roughly-top-speed is a good enough estimate of the tick it arrives.
  track.segments.forEach((segment, index) => {
    const segmentStart = segmentStartTick(track, index);
    segment.hazards.forEach((hazard) => {
      if (hazard.kind !== 'gammaBurst') return;
      const distance = segmentStart + hazard.startTick;
      const arrivesAbout = Math.round(distance / stats.speed);
      // Aim to raise them a third of a window early, then miss by however much
      // a human misses by.
      const aimFor = arrivesAbout - Math.round(ACTIVES.shields.durationTicks / 3);
      const jitter = rng.nextInt(-HUMAN_JITTER_TICKS, HUMAN_JITTER_TICKS + 1);
      inputs.push({ tick: Math.max(0, aimFor + jitter), active: 'shields' });
    });
  });

  // Power: one reroute on the opening straight, where there is nothing to duck.
  inputs.push({ tick: 0, active: 'powerReroute' });

  return inputs;
}

interface Row {
  readonly name: string;
  readonly races: number;
  readonly survivalRate: number;
  readonly meanTicks: number;
  readonly medianTicks: number;
  readonly meanDamage: number;
  readonly topSpeed: number;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? NaN;
  return ((sorted[middle - 1] ?? NaN) + (sorted[middle] ?? NaN)) / 2;
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return NaN;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Race one build against the track for `races` seeds and summarise it. */
export function summarise(standard: StandardBuild, track: Track, races: number): Row {
  const outcomes: RaceOutcome[] = [];
  for (let seed = 0; seed < races; seed++) {
    const inputs = referencePlay(track, standard.build, seed);
    outcomes.push(simulate(track, standard.build, inputs, seed));
  }
  // Finish times only mean something for races that finished.
  const finishes = outcomes.filter((o) => o.survived).map((o) => o.finishTicks);
  return {
    name: standard.name,
    races,
    survivalRate: outcomes.filter((o) => o.survived).length / races,
    meanTicks: mean(finishes),
    medianTicks: median(finishes),
    meanDamage: mean(outcomes.map((o) => o.damageTaken)),
    topSpeed: resolveBuild(standard.build).speed,
  };
}

/** Every standard build against a track. Used by the harness and its test. */
export function runBalance(races: number, track: Track = SLICE_TRACK): Row[] {
  return STANDARD_BUILDS.map((standard) => summarise(standard, track, races));
}

function formatTable(rows: readonly Row[]): string {
  const headers = [
    'Build',
    'Races',
    'Survived',
    'Ticks (mean)',
    'Ticks (p50)',
    'Damage (mean)',
  ];
  const body = rows.map((row) => [
    row.name,
    String(row.races),
    `${(row.survivalRate * 100).toFixed(1)}%`,
    Number.isNaN(row.meanTicks) ? '—' : row.meanTicks.toFixed(0),
    Number.isNaN(row.medianTicks) ? '—' : row.medianTicks.toFixed(0),
    row.meanDamage.toFixed(1),
  ]);
  const widths = headers.map((header, i) =>
    Math.max(header.length, ...body.map((cells) => (cells[i] ?? '').length)),
  );
  const line = (cells: readonly string[]): string =>
    cells.map((cell, i) => cell.padEnd(widths[i] ?? 0)).join('  ');
  return [
    line(headers),
    widths.map((w) => '-'.repeat(w)).join('  '),
    ...body.map(line),
  ].join('\n');
}

function parseRaces(argv: readonly string[]): number {
  const flag = argv.indexOf('--races');
  if (flag === -1) return 1000;
  const value = Number(argv[flag + 1]);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`--races needs a positive whole number, got ${argv[flag + 1]}.`);
  }
  return value;
}

const races = parseRaces(process.argv.slice(2));
const started = Date.now();
const rows = runBalance(races);
const elapsed = (Date.now() - started) / 1000;

console.log(`\nStar Race — ${races} seeded races per build on the slice track\n`);
console.log(formatTable(rows));
console.log(`\nFinish times count finishers only. Ran in ${elapsed.toFixed(2)}s.\n`);
