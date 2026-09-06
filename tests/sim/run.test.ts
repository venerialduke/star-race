import { describe, expect, it } from 'vitest';
import { offerParts } from '../../src/sim/garage';
import { makeRng } from '../../src/sim/rng';
import {
  choosePart,
  completed,
  runStage,
  startRun,
  totalDamage,
  totalTicks,
  type Run,
} from '../../src/sim/run';
import { ALL_PARTS, PARTS, resolveBuild } from '../../src/sim/ship';
import { SLICE_TRACK, stages } from '../../src/sim/track';
import { GARAGE_OFFER_SIZE } from '../../src/sim/tuning';
import { simulate, type PlayerInput } from '../../src/sim/race';

const noTaps: readonly PlayerInput[] = [];

/** Play a whole run, taking the first part offered each time. */
const playRun = (seed: number, taps: readonly PlayerInput[] = noTaps): Run => {
  let run = startRun(SLICE_TRACK, seed);
  while (run.phase !== 'done') {
    if (run.phase === 'garage') {
      const first = run.offer[0];
      expect(first).toBeDefined();
      run = choosePart(run, first!);
    } else {
      run = runStage(run, taps);
    }
  }
  return run;
};

describe('the garage offer', () => {
  it('offers three different parts', () => {
    const offer = offerParts(makeRng(1));
    expect(offer).toHaveLength(GARAGE_OFFER_SIZE);
    expect(new Set(offer.map((p) => p.id)).size).toBe(GARAGE_OFFER_SIZE);
  });

  it('offers only real parts', () => {
    offerParts(makeRng(5)).forEach((part) => expect(ALL_PARTS).toContain(part));
  });

  it('is the same for the same stream and different for another', () => {
    expect(offerParts(makeRng(3))).toEqual(offerParts(makeRng(3)));
    expect(offerParts(makeRng(3))).not.toEqual(offerParts(makeRng(4)));
  });

  it('can offer every part eventually, not just a favourite few', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      offerParts(makeRng(seed)).forEach((part) => seen.add(part.id));
    }
    expect(seen.size).toBe(ALL_PARTS.length);
  });

  it('refuses an impossible offer size', () => {
    expect(() => offerParts(makeRng(1), 0)).toThrow();
    expect(() => offerParts(makeRng(1), ALL_PARTS.length + 1)).toThrow();
  });
});

describe('starting a run', () => {
  it('opens in the garage, before stage 0, with a bare ship', () => {
    const run = startRun(SLICE_TRACK, 1);
    expect(run.phase).toBe('garage');
    expect(run.stage).toBe(0);
    expect(run.build).toEqual([]);
    expect(run.hull).toBe(resolveBuild([]).hull);
    expect(run.offer).toHaveLength(GARAGE_OFFER_SIZE);
    expect(run.alive).toBe(true);
    expect(run.results).toEqual([]);
  });

  it('offers the same parts for the same seed', () => {
    expect(startRun(SLICE_TRACK, 8).offer).toEqual(startRun(SLICE_TRACK, 8).offer);
    expect(startRun(SLICE_TRACK, 8).offer).not.toEqual(startRun(SLICE_TRACK, 9).offer);
  });
});

describe('choosing a part', () => {
  it('bolts it on and starts the stage', () => {
    const run = startRun(SLICE_TRACK, 1);
    const part = run.offer[0]!;
    const racing = choosePart(run, part);
    expect(racing.phase).toBe('racing');
    expect(racing.build).toEqual([part]);
    expect(racing.offer).toEqual([]);
  });

  it('refuses a part that was not on offer', () => {
    const run = startRun(SLICE_TRACK, 1);
    const notOffered = ALL_PARTS.find((part) => !run.offer.includes(part));
    expect(notOffered).toBeDefined();
    expect(() => choosePart(run, notOffered!)).toThrow();
  });

  it('refuses to open a garage that is not open', () => {
    const racing = choosePart(
      startRun(SLICE_TRACK, 1),
      startRun(SLICE_TRACK, 1).offer[0]!,
    );
    expect(() => choosePart(racing, racing.build[0]!)).toThrow();
  });

  it('adds the hull a part gives without repairing the damage already taken', () => {
    // Race a stage, take some damage, then take a part that raises max hull.
    let run = choosePart(startRun(SLICE_TRACK, 1), startRun(SLICE_TRACK, 1).offer[0]!);
    run = runStage(run, noTaps);
    const hurt = run.hull;
    expect(hurt).toBeLessThan(resolveBuild(run.build).hull);
    if (run.offer.includes(PARTS.ablativePlating)) {
      const plated = choosePart(run, PARTS.ablativePlating);
      expect(plated.hull).toBe(hurt + 40);
      expect(plated.hull).toBeLessThan(resolveBuild(plated.build).hull);
    }
  });
});

describe('racing a run', () => {
  it('plays three stages with a garage before each', () => {
    let run = startRun(SLICE_TRACK, 4);
    const garages: number[] = [];
    const raced: number[] = [];
    while (run.phase !== 'done') {
      if (run.phase === 'garage') {
        garages.push(run.stage);
        run = choosePart(run, run.offer[0]!);
      } else {
        raced.push(run.stage);
        run = runStage(run, noTaps);
      }
    }
    expect(garages).toEqual([0, 1, 2]);
    expect(raced).toEqual([0, 1, 2]);
    expect(run.results.map((r) => r.stage)).toEqual([0, 1, 2]);
    expect(run.build).toHaveLength(stages(SLICE_TRACK).length);
  });

  it('carries hull from one stage into the next', () => {
    let run = choosePart(startRun(SLICE_TRACK, 4), startRun(SLICE_TRACK, 4).offer[0]!);
    run = runStage(run, noTaps);
    const afterStageOne = run.results[0]!.outcome.hullLeft;
    expect(run.hull).toBe(afterStageOne);
    run = choosePart(run, run.offer[0]!);
    run = runStage(run, noTaps);
    // Stage 2 started from what stage 1 left, not from a fresh hull.
    expect(run.results[1]!.outcome.hullLeft).toBeLessThanOrEqual(afterStageOne + 45);
    expect(run.hull).toBeLessThan(resolveBuild(run.build).hull);
  });

  it('is deterministic: the same seed and the same choices give the same run', () => {
    expect(playRun(12)).toEqual(playRun(12));
  });

  it('gives different runs for different seeds', () => {
    // Different parts on offer, so different ships, so different races.
    expect(startRun(SLICE_TRACK, 12).offer).not.toEqual(startRun(SLICE_TRACK, 13).offer);
    expect(playRun(12).build).not.toEqual(playRun(13).build);
  });

  it('totals ticks and damage across the stages it raced', () => {
    const run = playRun(4);
    expect(totalTicks(run)).toBe(
      run.results.reduce((sum, r) => sum + r.outcome.finishTicks, 0),
    );
    expect(totalDamage(run)).toBeGreaterThan(0);
    expect(totalTicks(run)).toBeGreaterThan(0);
  });

  it('refuses to race when the garage is open', () => {
    expect(() => runStage(startRun(SLICE_TRACK, 1), noTaps)).toThrow();
  });

  it('refuses to race a finished run', () => {
    const done = playRun(4);
    expect(() => runStage(done, noTaps)).toThrow();
  });
});

describe('a run that ends badly', () => {
  it('stops the moment the ship is lost, with no garage afterwards', () => {
    // A ship that takes every part it is offered still dies on some seeds; find
    // one and check the run ends cleanly rather than opening another garage.
    let lost: Run | undefined;
    for (let seed = 0; seed < 60 && lost === undefined; seed++) {
      const run = playRun(seed);
      if (!run.alive) lost = run;
    }
    expect(lost).toBeDefined();
    expect(lost!.phase).toBe('done');
    expect(lost!.offer).toEqual([]);
    expect(completed(lost!)).toBe(false);
    expect(lost!.results.length).toBeLessThanOrEqual(stages(SLICE_TRACK).length);
    expect(lost!.results[lost!.results.length - 1]?.outcome.survived).toBe(false);
  });

  it('counts a run that got through every stage as completed', () => {
    let finished: Run | undefined;
    for (let seed = 0; seed < 60 && finished === undefined; seed++) {
      const run = playRun(seed);
      if (run.alive) finished = run;
    }
    expect(finished).toBeDefined();
    expect(completed(finished!)).toBe(true);
    expect(finished!.results).toHaveLength(stages(SLICE_TRACK).length);
  });
});

describe('racing one stage on its own', () => {
  it('starts at the stage gate and ends at the next one', () => {
    const stageOne = simulate(SLICE_TRACK, [], noTaps, 1, { stage: 1 });
    const [first, second] = stages(SLICE_TRACK);
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    const start = first!.lengthTicks;
    const end = start + second!.lengthTicks;
    expect(stageOne.log[0]?.distance).toBe(start);
    expect(stageOne.log[stageOne.log.length - 1]?.distance).toBeGreaterThanOrEqual(end);
  });

  it('counts its ticks from zero, so taps are timed against the stage', () => {
    const stageTwo = simulate(SLICE_TRACK, [], noTaps, 1, { stage: 2 });
    expect(stageTwo.log[0]?.tick).toBe(0);
    expect(stageTwo.finishTicks).toBeLessThan(
      simulate(SLICE_TRACK, [], noTaps, 1).finishTicks,
    );
  });

  it('starts from the hull it is given', () => {
    const hurt = simulate(SLICE_TRACK, [], noTaps, 1, { stage: 0, startHull: 40 });
    const fresh = simulate(SLICE_TRACK, [], noTaps, 1, { stage: 0 });
    expect(hurt.hullLeft).toBeLessThan(fresh.hullLeft);
    expect(hurt.damageTaken).toBe(fresh.damageTaken);
  });

  it('refuses a stage that is not on the track, or a ship with no hull', () => {
    expect(() => simulate(SLICE_TRACK, [], noTaps, 1, { stage: 9 })).toThrow();
    expect(() => simulate(SLICE_TRACK, [], noTaps, 1, { startHull: 0 })).toThrow();
  });
});
