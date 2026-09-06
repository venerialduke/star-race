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

import { flyRace, startRace, type RaceOutcome } from '../src/sim/race';
import { STANDARD_BUILDS, type StandardBuild } from '../src/sim/builds';
import { makePilot } from '../src/sim/pilot';
import { makeRng } from '../src/sim/rng';
import { resolveBuild } from '../src/sim/ship';
import { SLICE_TRACK, type Track } from '../src/sim/track';

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

/**
 * Race one build against the track for `races` seeds and summarise it. Each race
 * is flown by a pilot — the same rule that flies the rivals in a real run — so
 * the table measures how a build does in play rather than on paper.
 */
export function summarise(standard: StandardBuild, track: Track, races: number): Row {
  const outcomes: RaceOutcome[] = [];
  for (let seed = 0; seed < races; seed++) {
    const pilot = makePilot(track, makeRng(seed).fork());
    const state = startRace(track, standard.build, seed);
    outcomes.push(flyRace(state, (current) => pilot.taps(current)));
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
