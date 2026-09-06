import { describe, expect, it } from 'vitest';
import { PASSENGER, makePilot } from '../../src/sim/pilot';
import { flyRace, startRace, type RaceOutcome } from '../../src/sim/race';
import { makeRng } from '../../src/sim/rng';
import { PARTS, type Build } from '../../src/sim/ship';
import { makeSpline } from '../../src/sim/spline';
import { SLICE_TRACK, makeTrack, type Segment } from '../../src/sim/track';
import { GAMMA_BURST_DAMAGE, PILOT_REROUTE_CLEAR_TICKS } from '../../src/sim/tuning';

const line = makeSpline([
  { x: 0, y: 0 },
  { x: 1, y: 0 },
]);

const seg = (
  name: string,
  lengthTicks: number,
  hazards: Segment['hazards'] = [],
): Segment => ({
  name,
  lengthTicks,
  hazards,
});

/** A burst 300 track-ticks in, with room either side. */
const burstTrack = makeTrack(
  [
    seg('run-up', 300),
    seg('corridor', 400, [{ kind: 'gammaBurst', startTick: 0, lengthTicks: 1 }]),
  ],
  [],
  line,
);

const openTrack = makeTrack([seg('open', 900)], [], line);

const fly = (track = burstTrack, build: Build = [], seed = 1): RaceOutcome => {
  const pilot = makePilot(track, makeRng(seed).fork());
  return flyRace(startRace(track, build, seed), (state) => pilot.taps(state));
};

const flyPassenger = (track = burstTrack, build: Build = [], seed = 1): RaceOutcome =>
  flyRace(startRace(track, build, seed), (state) => PASSENGER.taps(state));

describe('a pilot', () => {
  it('is deterministic: the same seed flies the same race', () => {
    expect(fly(burstTrack, [], 5)).toEqual(fly(burstTrack, [], 5));
  });

  it('flies differently on a different seed', () => {
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8].map(
      (seed) => fly(burstTrack, [], seed).damageTaken,
    );
    expect(new Set(seeds).size).toBeGreaterThan(1);
  });

  it('shields the burst it can see, most of the time', () => {
    let covered = 0;
    for (let seed = 0; seed < 60; seed++) {
      if (fly(burstTrack, [], seed).damageAbsorbed >= GAMMA_BURST_DAMAGE) covered++;
    }
    expect(covered).toBeGreaterThan(30);
  });

  it('misjudges it sometimes: this is not frame-perfect play', () => {
    let missed = 0;
    for (let seed = 0; seed < 60; seed++) {
      if (fly(burstTrack, [], seed).damageTaken >= GAMMA_BURST_DAMAGE) missed++;
    }
    expect(missed).toBeGreaterThan(0);
    expect(missed).toBeLessThan(60);
  });

  it('does much better than not tapping at all', () => {
    let piloted = 0;
    let passenger = 0;
    for (let seed = 0; seed < 40; seed++) {
      piloted += fly(burstTrack, [], seed).damageTaken;
      passenger += flyPassenger(burstTrack, [], seed).damageTaken;
    }
    expect(piloted).toBeLessThan(passenger);
  });

  it('never taps into a cooldown', () => {
    for (let seed = 0; seed < 20; seed++) {
      const outcome = fly(SLICE_TRACK, [PARTS.radiatorFins], seed);
      expect(outcome.log.some((e) => e.kind === 'activeIgnored')).toBe(false);
    }
  });

  it('uses rerouted power on open track', () => {
    const outcome = fly(openTrack, [], 1);
    expect(
      outcome.log.some((e) => e.kind === 'activeFired' && e.active === 'powerReroute'),
    ).toBe(true);
  });

  it('gets home sooner than a passenger on open track', () => {
    expect(fly(openTrack, [], 1).finishTicks).toBeLessThan(
      flyPassenger(openTrack, [], 1).finishTicks,
    );
  });

  it('holds the boost back when a hazard is close ahead', () => {
    // Hazards all the way to the line: there is never clear track to spend it
    // on, so the boost is never used.
    const busy = makeTrack(
      [
        seg('short', 40, [{ kind: 'gammaBurst', startTick: 20, lengthTicks: 1 }]),
        seg('rocks', 120, [{ kind: 'asteroidField', startTick: 0, lengthTicks: 120 }]),
        seg('more rocks', 120, [{ kind: 'asteroidField', startTick: 0, lengthTicks: 120 }]),
      ],
      [],
      line,
    );
    const outcome = fly(busy, [], 1);
    const rerouted = outcome.log.filter(
      (e) => e.kind === 'activeFired' && e.active === 'powerReroute',
    );
    expect(rerouted).toHaveLength(0);
    expect(PILOT_REROUTE_CLEAR_TICKS).toBeGreaterThan(40);
  });

  it('will not cook a ship that cannot take the heat', () => {
    // An Overclocked Reactor has little headroom, so the pilot leaves the boost
    // alone where a cooler ship would use it.
    const hot = fly(openTrack, [PARTS.overclockedReactor], 1);
    const cool = fly(openTrack, [PARTS.radiatorFins], 1);
    const boosts = (outcome: RaceOutcome): number =>
      outcome.log.filter((e) => e.kind === 'activeFired' && e.active === 'powerReroute')
        .length;
    expect(boosts(hot)).toBeLessThan(boosts(cool));
    expect(hot.overheatedTicks).toBe(0);
  });

  it('leaves the shields alone on a course with no bursts', () => {
    const outcome = fly(openTrack, [], 1);
    expect(
      outcome.log.some((e) => e.kind === 'activeFired' && e.active === 'shields'),
    ).toBe(false);
  });
});

describe('a passenger', () => {
  it('taps nothing at all', () => {
    const outcome = flyPassenger(SLICE_TRACK, [], 1);
    expect(outcome.log.some((e) => e.kind === 'activeFired')).toBe(false);
  });
});
