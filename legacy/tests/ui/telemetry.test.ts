/**
 * @vitest-environment jsdom
 *
 * Telemetry is for whoever is tuning the game, so what it says has to be true:
 * these check the numbers against the run they came from rather than against
 * hard-coded text.
 */
import { describe, expect, it } from 'vitest';
import { runReport, stageTelemetry } from '../../src/ui/telemetry';
import { choosePart, runStage, runStandings, startRun, wonRun, type Run } from '../../src/sim/run';
import { SLICE_TRACK, stages } from '../../src/sim/track';
import type { PlayerInput } from '../../src/sim/race';

const playRun = (seed: number, taps: readonly PlayerInput[] = []): Run => {
  let run = startRun(SLICE_TRACK, seed);
  while (run.phase !== 'done') {
    run = run.phase === 'garage' ? choosePart(run, run.offer[0]!) : runStage(run, taps);
  }
  return run;
};

const findRun = (wanted: (run: Run) => boolean): Run => {
  for (let seed = 0; seed < 200; seed++) {
    const run = playRun(seed);
    if (wanted(run)) return run;
  }
  throw new Error('No run matched in 200 seeds');
};

describe('stage telemetry', () => {
  it('reports nothing for a stage that was never raced', () => {
    const lost = findRun((run) => run.results.length < 3);
    expect(stageTelemetry(lost, 2)).toBeUndefined();
  });

  it('matches the outcome it came from', () => {
    const run = playRun(4);
    const telemetry = stageTelemetry(run, 0);
    const result = run.results[0];
    expect(telemetry).toBeDefined();
    expect(telemetry!.finishTicks).toBe(result!.outcome.finishTicks);
    expect(telemetry!.damageTaken).toBe(result!.outcome.damageTaken);
    expect(telemetry!.position).toBe(result!.position);
    expect(telemetry!.survived).toBe(result!.outcome.survived);
  });

  it('counts taps that fired and taps thrown away on a cooldown', () => {
    // Three taps of the same active in quick succession: one fires, two waste.
    const spam: PlayerInput[] = [
      { tick: 10, active: 'shields' },
      { tick: 11, active: 'shields' },
      { tick: 12, active: 'shields' },
    ];
    let run = startRun(SLICE_TRACK, 4);
    run = choosePart(run, run.offer[0]!);
    run = runStage(run, spam);
    const telemetry = stageTelemetry(run, 0);
    expect(telemetry!.tapsFired).toBe(1);
    expect(telemetry!.tapsWasted).toBe(2);
  });

  it('counts bursts met and how many were covered', () => {
    // Stage 2 of the slice track carries the gamma burst.
    const run = playRun(4);
    const stageTwo = stageTelemetry(run, 1);
    expect(stageTwo).toBeDefined();
    expect(stageTwo!.burstsMet).toBeGreaterThan(0);
    expect(stageTwo!.burstsShielded).toBeLessThanOrEqual(stageTwo!.burstsMet);
    // No taps were made, so nothing was covered.
    expect(stageTwo!.burstsShielded).toBe(0);
  });

  it('counts a burst as covered when shields were up for it', () => {
    let run = startRun(SLICE_TRACK, 4);
    run = choosePart(run, run.offer[0]!);
    run = runStage(run, []);
    run = choosePart(run, run.offer[0]!);
    // Raise shields around the burst, which lands about 230 ticks into stage 2.
    run = runStage(run, [{ tick: 195, active: 'shields' }]);
    const stageTwo = stageTelemetry(run, 1);
    expect(stageTwo!.burstsMet).toBe(1);
    expect(stageTwo!.burstsShielded).toBe(1);
    expect(stageTwo!.damageAbsorbed).toBeGreaterThan(0);
  });
});

describe('the run report', () => {
  it('names the run and how it ended', () => {
    const won = findRun((run) => wonRun(run));
    expect(runReport(won)[0]).toContain(String(won.seed));
    expect(runReport(won)[1]).toContain('Won');

    const beaten = findRun((run) => run.alive && !wonRun(run));
    expect(runReport(beaten)[1]).toContain('Beaten');

    const lost = findRun((run) => !run.alive);
    expect(runReport(lost)[1]).toContain('Lost in stage');
  });

  it('has a line for every stage, including ones never reached', () => {
    const lost = findRun((run) => run.results.length < 3);
    const report = runReport(lost);
    const stageLines = report.filter((line) => line.trim().startsWith('stage '));
    expect(stageLines).toHaveLength(stages(SLICE_TRACK).length);
    expect(stageLines.some((line) => line.includes('not reached'))).toBe(true);
  });

  it('reports the field in finishing order', () => {
    const run = playRun(4);
    const report = runReport(run);
    const table = runStandings(run);
    table.forEach((entry) => {
      expect(report.some((line) => line.includes(entry.name))).toBe(true);
    });
    const first = report.findIndex((line) => line.includes(table[0]!.name));
    const last = report.findIndex((line) => line.includes(table[table.length - 1]!.name));
    expect(first).toBeLessThan(last);
  });

  it('says what the ship ended up as', () => {
    const run = playRun(4);
    const report = runReport(run).join('\n');
    run.build.forEach((part) => expect(report).toContain(part.name));
  });

  it('is one readable block, not a wall', () => {
    const report = runReport(playRun(4));
    expect(report.length).toBeLessThan(15);
    report.forEach((line) => expect(line.length).toBeLessThan(140));
  });
});
