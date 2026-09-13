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

import { flyField, type Field } from '../src/sim/field';
import { flyRace, startRace, type PlayerInput, type RaceOutcome } from '../src/sim/race';
import { STANDARD_BUILDS, type StandardBuild } from '../src/sim/builds';
import { makePilot } from '../src/sim/pilot';
import { makeRng } from '../src/sim/rng';
import { ALL_PARTS, resolveBuild, type Part, type PartId } from '../src/sim/ship';
import {
  choosePart,
  runStage,
  runStandings,
  startRun,
  startStageField,
  totalTicks,
  wonRun,
  type Run,
} from '../src/sim/run';
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


// ---------------------------------------------------------------------------
// Whole runs, against the rivals.
//
// The race table above measures one ship against the course. This measures a
// player against the field: three stages, a garage between each, and a pilot on
// the player's own stick so the taps are as good as a rival's. What it answers
// is the only balance question that matters now — can a player win, and does
// choosing well change that?
// ---------------------------------------------------------------------------

/** How a player picks in the garage. */
interface Strategy {
  readonly name: string;
  /** Parts this player wants, best first; anything unlisted is a last resort. */
  readonly wants: readonly PartId[];
  /**
   * A player who looks at the ship before choosing. Given the run so far, it
   * returns the shopping list to use this time.
   */
  readonly adapt?: (run: Run) => readonly PartId[];
}

const STRATEGIES: readonly Strategy[] = [
  {
    name: 'First card',
    // Takes whatever is on the left. The floor: no thought at all.
    wants: [],
  },
  {
    name: 'All speed',
    wants: ['ionThruster', 'overclockedReactor', 'inertialAnchor'],
  },
  {
    name: 'All armour',
    wants: ['ablativePlating', 'radiatorFins', 'mirrorShielding'],
  },
  {
    name: 'Speed, then cover',
    wants: ['ionThruster', 'inertialAnchor', 'radiatorFins', 'mirrorShielding'],
  },
  {
    name: 'Doubles down',
    // Takes another of whatever it took first, whenever it is offered. The
    // question this answers: is stacking one part the whole game?
    wants: [],
    adapt: (run) => {
      const first = run.build[0];
      return first === undefined ? [] : [first.id];
    },
  },
  {
    name: 'Never repeats',
    // The opposite extreme: refuses a part it already has.
    wants: [],
    adapt: (run) => {
      const owned = new Set(run.build.map((part) => part.id));
      return ALL_PARTS.map((part) => part.id).filter((id) => !owned.has(id));
    },
  },
  {
    name: 'Reads the ship',
    // Buys speed while the hull can afford it, armour when it cannot. This is
    // the player the garage is supposed to reward.
    wants: [],
    adapt: (run) => {
      const stats = resolveBuild(run.build);
      const thin = run.hull < stats.hull * 0.6;
      return thin
        ? ['ablativePlating', 'mirrorShielding', 'radiatorFins', 'ionThruster']
        : ['ionThruster', 'inertialAnchor', 'overclockedReactor', 'radiatorFins'];
    },
  },
];

function pick(strategy: Strategy, offer: readonly Part[], run: Run): Part {
  const first = offer[0];
  if (first === undefined) throw new Error('An empty garage offer.');
  const wants = strategy.adapt === undefined ? strategy.wants : strategy.adapt(run);
  let best = first;
  let bestRank = wants.indexOf(best.id);
  offer.forEach((part) => {
    const rank = wants.indexOf(part.id);
    const better =
      (rank !== -1 && bestRank === -1) || (rank !== -1 && bestRank !== -1 && rank < bestRank);
    if (better) {
      best = part;
      bestRank = rank;
    }
  });
  return best;
}

/** Play one run, with a pilot flying the player's ship as well as the rivals'. */
export function playRun(strategy: Strategy, seed: number, track: Track = SLICE_TRACK): Run {
  let run = startRun(track, seed);
  while (run.phase !== 'done') {
    if (run.phase === 'garage') {
      run = choosePart(run, pick(strategy, run.offer, run));
      continue;
    }
    // Fly the stage with a pilot on the player's stick, recording what it taps,
    // then hand those taps to runStage — which replays the same stage from the
    // same seed and gets the same result.
    const pilot = makePilot(track, makeRng(run.seed + run.stage).fork());
    const field: Field = startStageField(run);
    const mine = field.racers.find((racer) => racer.id === 'player');
    if (mine === undefined) throw new Error('unreachable: the player is always on the grid');
    const taps: PlayerInput[] = [];
    flyField(field, (tick) => {
      const tapped = pilot.taps(mine.state);
      tapped.forEach((active) => taps.push({ tick, active }));
      return tapped;
    });
    run = runStage(run, taps);
  }
  return run;
}

interface RunRow {
  readonly name: string;
  readonly runs: number;
  readonly winRate: number;
  readonly survivalRate: number;
  readonly meanPosition: number;
  /** Mean total ticks over the runs that finished — a dead run is not "quick". */
  readonly meanTicks: number;
  /** Mean total ticks Redline took in those same runs, to race against. */
  readonly rivalTicks: number;
  /** How often Redline got through all three stages. */
  readonly rivalSurvival: number;
  /** How often the player beat Redline on time, having both finished. */
  readonly beatOnTime: number;
}

function summariseRuns(strategy: Strategy, runs: number, track: Track): RunRow {
  let wins = 0;
  let survived = 0;
  let positions = 0;
  let ticks = 0;
  let rivalTicks = 0;
  let rivalFinished = 0;
  let bothFinished = 0;
  let beatOnTime = 0;
  for (let seed = 0; seed < runs; seed++) {
    const run = playRun(strategy, seed, track);
    if (wonRun(run)) wins++;
    const table = runStandings(run);
    positions += table.find((row) => row.id === 'player')?.position ?? 3;
    const redline = table.find((row) => row.id === 'redline');
    const stageCount = run.results.length;
    const redlineHome = redline !== undefined && redline.stagesFinished === 3;
    if (redlineHome) rivalFinished++;
    if (run.alive && redlineHome && stageCount === 3) {
      bothFinished++;
      if (totalTicks(run) < (redline?.totalTicks ?? Infinity)) beatOnTime++;
    }
    if (run.alive) {
      // Only finished runs have a meaningful time: a ship that died in stage 1
      // is not quick, it is gone.
      survived++;
      ticks += totalTicks(run);
      rivalTicks += table.find((row) => row.id === 'redline')?.totalTicks ?? 0;
    }
  }
  return {
    name: strategy.name,
    runs,
    winRate: wins / runs,
    survivalRate: survived / runs,
    meanPosition: positions / runs,
    meanTicks: survived === 0 ? NaN : ticks / survived,
    rivalTicks: survived === 0 ? NaN : rivalTicks / survived,
    rivalSurvival: rivalFinished / runs,
    beatOnTime: bothFinished === 0 ? NaN : beatOnTime / bothFinished,
  };
}

/** Every strategy against the field. */
export function runTheField(runs: number, track: Track = SLICE_TRACK): RunRow[] {
  return STRATEGIES.map((strategy) => summariseRuns(strategy, runs, track));
}

function formatRunTable(rows: readonly RunRow[]): string {
  const headers = [
    'Player',
    'Runs',
    'Won',
    'Survived',
    'Avg place',
    'Ticks (finished)',
    'Redline',
    'R. home',
    'Beat R. on time',
  ];
  const body = rows.map((row) => [
    row.name,
    String(row.runs),
    `${(row.winRate * 100).toFixed(1)}%`,
    `${(row.survivalRate * 100).toFixed(1)}%`,
    row.meanPosition.toFixed(2),
    Number.isNaN(row.meanTicks) ? '—' : row.meanTicks.toFixed(0),
    Number.isNaN(row.rivalTicks) ? '—' : row.rivalTicks.toFixed(0),
    `${(row.rivalSurvival * 100).toFixed(0)}%`,
    Number.isNaN(row.beatOnTime) ? '—' : `${(row.beatOnTime * 100).toFixed(0)}%`,
  ]);
  const widths = headers.map((header, i) =>
    Math.max(header.length, ...body.map((cells) => (cells[i] ?? '').length)),
  );
  const line = (cells: readonly string[]): string =>
    cells.map((cell, i) => cell.padEnd(widths[i] ?? 0)).join('  ');
  return [line(headers), widths.map((w) => '-'.repeat(w)).join('  '), ...body.map(line)].join('\n');
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

function parseCount(argv: readonly string[], flag: string, fallback: number): number {
  const at = argv.indexOf(flag);
  if (at === -1) return fallback;
  const value = Number(argv[at + 1]);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${flag} needs a positive whole number, got ${argv[at + 1]}.`);
  }
  return value;
}

const argv = process.argv.slice(2);
const races = parseRaces(argv);
const runs = parseCount(argv, '--runs', 200);
const started = Date.now();
const rows = runBalance(races);
const runRows = runTheField(runs);
const elapsed = (Date.now() - started) / 1000;

console.log(`\nStar Race — ${races} seeded races per build on the slice track\n`);
console.log(formatTable(rows));
console.log(`\nFinish times count finishers only.\n`);
console.log(`Whole runs against the rivals — ${runs} per player, pilot-flown\n`);
console.log(formatRunTable(runRows));
console.log(`\nRan in ${elapsed.toFixed(2)}s.\n`);
