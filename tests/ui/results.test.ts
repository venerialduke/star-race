/**
 * @vitest-environment jsdom
 *
 * The results screen has one job beyond reporting: send the player back to the
 * garage wanting a different build. So it has to say what killed them.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createResults, type Results } from '../../src/ui/results';
import { choosePart, runStage, startRun, type Run } from '../../src/sim/run';
import { SLICE_TRACK } from '../../src/sim/track';
import { TICK_RATE } from '../../src/sim/tuning';

const screen = (): HTMLElement => {
  const el = document.querySelector<HTMLElement>('.results');
  if (el === null) throw new Error('No results screen on the page');
  return el;
};

const text = (selector: string): string =>
  document.querySelector(selector)?.textContent ?? '';

const rows = (): string[] =>
  Array.from(document.querySelectorAll('.results-row')).map((r) => r.textContent ?? '');

/** Play a run to its end, taking the first part offered each time. */
const playRun = (seed: number): Run => {
  let run = startRun(SLICE_TRACK, seed);
  while (run.phase !== 'done') {
    run = run.phase === 'garage' ? choosePart(run, run.offer[0]!) : runStage(run, []);
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

describe('the results screen', () => {
  let results: Results;

  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    results = createResults(document.body);
  });

  it('starts hidden, shows on demand, and hides again', () => {
    expect(screen().hidden).toBe(true);
    results.show(playRun(1), () => {});
    expect(screen().hidden).toBe(false);
    results.hide();
    expect(screen().hidden).toBe(true);
  });

  it('reports a completed run with its total time', () => {
    const finished = findRun((run) => run.alive);
    results.show(finished, () => {});
    expect(text('.results-title')).toBe('Run complete');
    expect(document.querySelector('.results-title')?.classList.contains('is-lost')).toBe(
      false,
    );
    expect(text('.results-note')).toContain('Three stages');
  });

  it('lists every stage, with time and damage', () => {
    const finished = findRun((run) => run.alive);
    const lines = rows();
    results.show(finished, () => {});
    expect(lines).toEqual([]); // nothing before it is shown
    expect(rows()).toHaveLength(4); // three stages and a total
    expect(rows()[0]).toContain('Stage 1');
    expect(rows()[0]).toContain('damage');
    expect(rows()[3]).toContain('Total');
  });

  it('adds up the stage times into the total', () => {
    const finished = findRun((run) => run.alive);
    results.show(finished, () => {});
    const total = finished.results.reduce((sum, r) => sum + r.outcome.finishTicks, 0);
    expect(rows()[3]).toContain(`${(total / TICK_RATE).toFixed(1)}s`);
  });

  it('says which stage a lost run ended in, and marks it', () => {
    const lost = findRun((run) => !run.alive);
    results.show(lost, () => {});
    expect(text('.results-title')).toBe(`Lost in stage ${lost.results.length}`);
    expect(document.querySelector('.results-title')?.classList.contains('is-lost')).toBe(
      true,
    );
  });

  it('names what killed the ship', () => {
    const lost = findRun((run) => !run.alive);
    const cause = lost.results[lost.results.length - 1]?.outcome.lostTo;
    expect(cause).toBeDefined();
    results.show(lost, () => {});
    const note = text('.results-note');
    expect(note.length).toBeGreaterThan(0);
    if (cause === 'blackHole') expect(note).toContain('black hole');
    if (cause === 'overheated') expect(note).toContain('heat');
    if (cause === 'hull') expect(note).toContain('hull');
  });

  it('marks stages the run never reached', () => {
    const lost = findRun((run) => !run.alive && run.results.length < 3);
    results.show(lost, () => {});
    const unreached = document.querySelectorAll('.results-row.is-unraced');
    expect(unreached.length).toBe(3 - lost.results.length);
    expect(unreached[0]?.textContent).toContain('not reached');
  });

  it('shows the build the run ended with', () => {
    const finished = findRun((run) => run.alive);
    results.show(finished, () => {});
    finished.build.forEach((part) => {
      expect(text('.results-build')).toContain(part.name);
    });
  });

  it('runs again on a tap', () => {
    let again = 0;
    results.show(playRun(1), () => (again += 1));
    const button = document.querySelector<HTMLButtonElement>('.results-again');
    expect(button).toBeDefined();
    button!.dispatchEvent(
      new window.Event('pointerdown', { bubbles: true, cancelable: true }),
    );
    expect(again).toBe(1);
  });

  it('re-targets the run-again tap when shown a second time', () => {
    let first = 0;
    let second = 0;
    results.show(playRun(1), () => (first += 1));
    results.show(playRun(2), () => (second += 1));
    document
      .querySelector<HTMLButtonElement>('.results-again')!
      .dispatchEvent(
        new window.Event('pointerdown', { bubbles: true, cancelable: true }),
      );
    expect(first).toBe(0);
    expect(second).toBe(1);
  });
});
