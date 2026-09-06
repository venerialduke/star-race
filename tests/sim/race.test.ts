import { describe, expect, it } from 'vitest';
import { simulate, type PlayerInput } from '../../src/sim/race';
import { PARTS, resolveBuild, type Build } from '../../src/sim/ship';
import {
  SLICE_TRACK,
  makeTrack,
  totalLengthTicks,
  type Segment,
} from '../../src/sim/track';
import { makeSpline } from '../../src/sim/spline';
import { MAX_RACE_TICKS } from '../../src/sim/tuning';

const line = makeSpline([
  { x: 0, y: 0 },
  { x: 1, y: 0 },
]);

const seg = (name: string, lengthTicks: number): Segment => ({
  name,
  lengthTicks,
  hazards: [],
});

const bare: Build = [];
const fast: Build = [PARTS.ionThruster, PARTS.overclockedReactor];
const heavy: Build = [PARTS.ablativePlating, PARTS.ablativePlating];

const noInputs: readonly PlayerInput[] = [];

describe('simulate', () => {
  it('is deterministic: the same race twice is the same outcome', () => {
    const a = simulate(SLICE_TRACK, fast, noInputs, 99);
    const b = simulate(SLICE_TRACK, fast, noInputs, 99);
    expect(a).toEqual(b);
  });

  it('finishes the slice track, hurt but alive on a bare build', () => {
    const outcome = simulate(SLICE_TRACK, bare, noInputs, 1);
    expect(outcome.survived).toBe(true);
    expect(outcome.finishTicks).toBeGreaterThan(0);
    expect(outcome.finishTicks).toBeLessThan(MAX_RACE_TICKS);
    // The two asteroid fields cost a bare ship roughly half its hull.
    expect(outcome.damageTaken).toBeGreaterThan(0);
    expect(outcome.hullLeft).toBeGreaterThan(0);
    expect(outcome.hullLeft).toBeLessThan(outcome.stats.hull);
  });

  it('a hazard-free track costs nothing', () => {
    const clear = makeTrack([seg('clear', 200)], [], line);
    const outcome = simulate(clear, bare, noInputs, 1);
    expect(outcome.damageTaken).toBe(0);
    expect(outcome.hullLeft).toBe(outcome.stats.hull);
  });

  it('reports the build it resolved and the seed it ran with', () => {
    const outcome = simulate(SLICE_TRACK, fast, noInputs, 4242);
    expect(outcome.stats).toEqual(resolveBuild(fast));
    expect(outcome.seed).toBe(4242);
  });

  it('a faster build finishes sooner', () => {
    const quick = simulate(SLICE_TRACK, fast, noInputs, 7).finishTicks;
    const plain = simulate(SLICE_TRACK, bare, noInputs, 7).finishTicks;
    const slow = simulate(SLICE_TRACK, heavy, noInputs, 7).finishTicks;
    expect(quick).toBeLessThan(plain);
    expect(plain).toBeLessThan(slow);
  });

  it('a bare build takes about as long as the track is long', () => {
    // Base speed is 1.0 track-tick per tick, so the only extra ticks come from
    // accelerating away from the start line and from each gate.
    const outcome = simulate(SLICE_TRACK, bare, noInputs, 1);
    const length = totalLengthTicks(SLICE_TRACK);
    expect(outcome.finishTicks).toBeGreaterThan(length);
    expect(outcome.finishTicks).toBeLessThan(length * 1.5);
  });

  it('acceleration is worth buying on a course with standing starts', () => {
    // The Inertial Anchor trades a little top speed for a lot of acceleration.
    // On the slice track's three standing starts that is a net gain...
    expect(simulate(SLICE_TRACK, [PARTS.inertialAnchor], noInputs, 1).finishTicks).toBeLessThan(
      simulate(SLICE_TRACK, bare, noInputs, 1).finishTicks,
    );
    // ...and it gains more the more often the ship has to launch again.
    const stopStart = makeTrack(
      [seg('a', 20), seg('b', 20), seg('c', 20), seg('d', 20)],
      [0, 1, 2],
      line,
    );
    const oneLaunch = makeTrack([seg('a', 80)], [], line);
    const gainStopStart =
      simulate(stopStart, bare, noInputs, 1).finishTicks -
      simulate(stopStart, [PARTS.inertialAnchor], noInputs, 1).finishTicks;
    const gainOneLaunch =
      simulate(oneLaunch, bare, noInputs, 1).finishTicks -
      simulate(oneLaunch, [PARTS.inertialAnchor], noInputs, 1).finishTicks;
    expect(gainStopStart).toBeGreaterThan(gainOneLaunch);
  });

  it('does not care what order the parts were bolted on', () => {
    const a = simulate(SLICE_TRACK, [PARTS.ionThruster, PARTS.radiatorFins], noInputs, 3);
    const b = simulate(SLICE_TRACK, [PARTS.radiatorFins, PARTS.ionThruster], noInputs, 3);
    expect(a.finishTicks).toBe(b.finishTicks);
  });
});

describe('stage gates', () => {
  const gated = makeTrack([seg('a', 100), seg('b', 100)], [0], line);
  const ungated = makeTrack([seg('a', 100), seg('b', 100)], [], line);

  it('costs no ticks of its own, but the ship restarts from a standstill', () => {
    const withGate = simulate(gated, bare, noInputs, 1);
    const withoutGate = simulate(ungated, bare, noInputs, 1);
    // Same distance either way; the gate's cost is the second launch, not a
    // pause on the clock.
    expect(withGate.finishTicks).toBeGreaterThan(withoutGate.finishTicks);
    const relaunchCost = withGate.finishTicks - withoutGate.finishTicks;
    expect(relaunchCost).toBeGreaterThan(0);
    expect(relaunchCost).toBeLessThan(withoutGate.finishTicks);
  });

  it('logs one stage end per gate, in order, at the gate line', () => {
    const outcome = simulate(SLICE_TRACK, bare, noInputs, 1);
    const ends = outcome.log.filter((e) => e.kind === 'stageEnd');
    expect(ends).toHaveLength(SLICE_TRACK.gates.length);
    expect(ends.map((e) => e.stage)).toEqual([0, 1]);
    ends.forEach((end, i) => {
      const previous = ends[i - 1];
      if (previous !== undefined) expect(end.tick).toBeGreaterThan(previous.tick);
    });
    // Stage 1 ends exactly at the end of segment 2: 120 + 180 + 120.
    expect(ends[0]?.distance).toBe(420);
    // Stage 2 ends exactly at the end of segment 5: + 150 + 160 + 140.
    expect(ends[1]?.distance).toBe(870);
  });

  it('opens with a start event and closes with a finish event', () => {
    const outcome = simulate(SLICE_TRACK, bare, noInputs, 1);
    const first = outcome.log[0];
    const last = outcome.log[outcome.log.length - 1];
    expect(first?.kind).toBe('start');
    expect(first?.tick).toBe(0);
    expect(last?.kind).toBe('finish');
    expect(last?.tick).toBe(outcome.finishTicks);
    expect(last?.distance).toBeGreaterThanOrEqual(totalLengthTicks(SLICE_TRACK));
  });

  it('a track with no gates runs as one stage', () => {
    const outcome = simulate(ungated, bare, noInputs, 1);
    expect(outcome.log.filter((e) => e.kind === 'stageEnd')).toHaveLength(0);
    expect(outcome.log[outcome.log.length - 1]?.stage).toBe(0);
  });

  it('more gates on the same distance means more launches, so more ticks', () => {
    const once = makeTrack([seg('a', 60), seg('b', 60), seg('c', 60)], [], line);
    const twice = makeTrack([seg('a', 60), seg('b', 60), seg('c', 60)], [0, 1], line);
    expect(simulate(twice, bare, noInputs, 1).finishTicks).toBeGreaterThan(
      simulate(once, bare, noInputs, 1).finishTicks,
    );
  });
});

describe('the tick loop', () => {
  it('never overshoots the ship’s top speed', () => {
    const stats = resolveBuild(fast);
    const outcome = simulate(SLICE_TRACK, fast, noInputs, 1);
    // Distance can only accumulate at most top speed per tick.
    expect(outcome.log[outcome.log.length - 1]?.distance).toBeLessThanOrEqual(
      stats.speed * outcome.finishTicks + 1e-9,
    );
  });

  it('gives up rather than looping forever', () => {
    // One tick of track is impossible to finish only if the loop is broken;
    // an enormous track exercises the cap instead.
    const huge = makeTrack([seg('endless', MAX_RACE_TICKS * 2)], [], line);
    const outcome = simulate(huge, bare, noInputs, 1);
    expect(outcome.finishTicks).toBe(MAX_RACE_TICKS);
    expect(outcome.survived).toBe(false);
    expect(outcome.log[outcome.log.length - 1]?.kind).toBe('abandoned');
  });

  it('an empty tap list and no taps at all are the same race', () => {
    expect(simulate(SLICE_TRACK, bare, [], 5)).toEqual(simulate(SLICE_TRACK, bare, noInputs, 5));
  });

  it('taps change the race: what the player does matters', () => {
    const inputs: readonly PlayerInput[] = [{ tick: 10, active: 'powerReroute' }];
    expect(simulate(SLICE_TRACK, bare, inputs, 5).finishTicks).not.toBe(
      simulate(SLICE_TRACK, bare, noInputs, 5).finishTicks,
    );
  });
});
