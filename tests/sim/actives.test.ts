import { describe, expect, it } from 'vitest';
import {
  ACTIVES,
  ALL_ACTIVES,
  activeById,
  isReady,
  readyAgainAt,
  type ActiveId,
} from '../../src/sim/actives';
import { simulate, type PlayerInput, type RaceEvent } from '../../src/sim/race';
import { PARTS, type Build } from '../../src/sim/ship';
import { makeSpline } from '../../src/sim/spline';
import { makeTrack, type Segment } from '../../src/sim/track';
import { GAMMA_BURST_DAMAGE } from '../../src/sim/tuning';

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

const bare: Build = [];
const noInputs: readonly PlayerInput[] = [];

/** A course with a single burst 200 track-ticks in, and room to run out. */
const burstTrack = makeTrack(
  [
    seg('run-up', 200),
    seg('corridor', 300, [{ kind: 'gammaBurst', startTick: 0, lengthTicks: 1 }]),
  ],
  [],
  line,
);

const openTrack = makeTrack([seg('open', 900)], [], line);

const firedAt = (log: readonly RaceEvent[], active: ActiveId): number[] =>
  log.filter((e) => e.kind === 'activeFired' && e.active === active).map((e) => e.tick);

const ignoredAt = (log: readonly RaceEvent[], active: ActiveId): number[] =>
  log.filter((e) => e.kind === 'activeIgnored' && e.active === active).map((e) => e.tick);

describe('the two actives', () => {
  it('are shields and power reroute, each with a duration and a cooldown', () => {
    expect(ALL_ACTIVES).toHaveLength(2);
    expect(ALL_ACTIVES.map((a) => a.id).sort()).toEqual(['powerReroute', 'shields']);
    ALL_ACTIVES.forEach((active) => {
      expect(active.durationTicks).toBeGreaterThan(0);
      expect(active.cooldownTicks).toBeGreaterThan(active.durationTicks);
      expect(active.name.length).toBeGreaterThan(0);
      expect(active.blurb.length).toBeGreaterThan(0);
    });
  });

  it('is keyed by its own id, and looks up by id', () => {
    (Object.keys(ACTIVES) as ActiveId[]).forEach((id) => {
      expect(ACTIVES[id].id).toBe(id);
      expect(activeById(id)).toBe(ACTIVES[id]);
    });
  });

  it('is ready when it has never fired, and not before its cooldown is up', () => {
    const shields = ACTIVES.shields;
    expect(isReady(undefined, 0)).toBe(true);
    const readyAgain = readyAgainAt(shields, 100);
    expect(readyAgain).toBe(100 + shields.cooldownTicks);
    expect(isReady(readyAgain, readyAgain - 1)).toBe(false);
    expect(isReady(readyAgain, readyAgain)).toBe(true);
  });
});

describe('cooldowns', () => {
  it('fires once per cooldown, however many times the player taps', () => {
    const cooldown = ACTIVES.powerReroute.cooldownTicks;
    const inputs: PlayerInput[] = [];
    for (let tick = 0; tick < 900; tick += 20)
      inputs.push({ tick, active: 'powerReroute' });
    const outcome = simulate(openTrack, bare, inputs, 1);
    const fires = firedAt(outcome.log, 'powerReroute');
    expect(fires.length).toBeGreaterThan(1);
    fires.forEach((tick, i) => {
      const previous = fires[i - 1];
      if (previous !== undefined)
        expect(tick - previous).toBeGreaterThanOrEqual(cooldown);
    });
  });

  it('ignores taps made during a cooldown, and says so in the log', () => {
    const outcome = simulate(
      openTrack,
      bare,
      [
        { tick: 10, active: 'powerReroute' },
        { tick: 11, active: 'powerReroute' },
        { tick: 50, active: 'powerReroute' },
      ],
      1,
    );
    expect(firedAt(outcome.log, 'powerReroute')).toEqual([10]);
    expect(ignoredAt(outcome.log, 'powerReroute')).toEqual([11, 50]);
  });

  it('does not queue a wasted tap: it is simply gone', () => {
    const spam = simulate(
      openTrack,
      bare,
      [
        { tick: 10, active: 'powerReroute' },
        { tick: 11, active: 'powerReroute' },
      ],
      1,
    );
    const once = simulate(openTrack, bare, [{ tick: 10, active: 'powerReroute' }], 1);
    expect(spam.finishTicks).toBe(once.finishTicks);
  });

  it('lets the same active fire again once the cooldown has run', () => {
    const cooldown = ACTIVES.shields.cooldownTicks;
    const outcome = simulate(
      openTrack,
      bare,
      [
        { tick: 0, active: 'shields' },
        { tick: cooldown, active: 'shields' },
      ],
      1,
    );
    expect(firedAt(outcome.log, 'shields')).toEqual([0, cooldown]);
  });

  it('one active on cooldown does not block the other', () => {
    const outcome = simulate(
      openTrack,
      bare,
      [
        { tick: 5, active: 'shields' },
        { tick: 6, active: 'powerReroute' },
      ],
      1,
    );
    expect(firedAt(outcome.log, 'shields')).toEqual([5]);
    expect(firedAt(outcome.log, 'powerReroute')).toEqual([6]);
    expect(ignoredAt(outcome.log, 'shields')).toEqual([]);
  });

  it('takes taps in any order the player made them', () => {
    const forwards = simulate(
      openTrack,
      bare,
      [
        { tick: 5, active: 'shields' },
        { tick: 6, active: 'powerReroute' },
      ],
      1,
    );
    const backwards = simulate(
      openTrack,
      bare,
      [
        { tick: 6, active: 'powerReroute' },
        { tick: 5, active: 'shields' },
      ],
      1,
    );
    expect(backwards.finishTicks).toBe(forwards.finishTicks);
  });
});

describe('shields', () => {
  it('stop a gamma burst dead when raised in time', () => {
    // The burst is 200 track-ticks in; a base ship is there around tick 220.
    const shielded = simulate(burstTrack, bare, [{ tick: 190, active: 'shields' }], 1);
    expect(shielded.damageTaken).toBe(0);
    expect(shielded.damageAbsorbed).toBe(GAMMA_BURST_DAMAGE);
  });

  it('let the burst through when raised too early', () => {
    const tooEarly = simulate(burstTrack, bare, [{ tick: 0, active: 'shields' }], 1);
    expect(tooEarly.damageTaken).toBe(GAMMA_BURST_DAMAGE);
    expect(tooEarly.damageAbsorbed).toBe(0);
  });

  it('let the burst through when raised too late', () => {
    const tooLate = simulate(burstTrack, bare, [{ tick: 260, active: 'shields' }], 1);
    expect(tooLate.damageTaken).toBe(GAMMA_BURST_DAMAGE);
  });

  it('cost nothing but the tap: no time, no heat', () => {
    const shielded = simulate(burstTrack, bare, [{ tick: 190, active: 'shields' }], 1);
    const unshielded = simulate(burstTrack, bare, noInputs, 1);
    expect(shielded.finishTicks).toBe(unshielded.finishTicks);
    expect(shielded.heatLeft).toBe(unshielded.heatLeft);
  });

  it('also soak up asteroid damage while they hold', () => {
    const belt = makeTrack(
      [seg('belt', 300, [{ kind: 'asteroidField', startTick: 0, lengthTicks: 300 }])],
      [],
      line,
    );
    const shielded = simulate(belt, bare, [{ tick: 0, active: 'shields' }], 7);
    const bareRun = simulate(belt, bare, noInputs, 7);
    expect(shielded.damageTaken).toBeLessThan(bareRun.damageTaken);
    expect(shielded.damageAbsorbed).toBeGreaterThan(0);
  });

  it('drop whatever is left in the pool when they run out', () => {
    // Raised at the start, so they are long gone by the burst at ~tick 220.
    const outcome = simulate(burstTrack, bare, [{ tick: 0, active: 'shields' }], 1);
    expect(outcome.damageTaken).toBe(GAMMA_BURST_DAMAGE);
  });

  it('are deeper with Mirror Shielding, which covers more than one hit', () => {
    // Two bursts inside one shield window: 90 points of damage against a base
    // pool of 50 and a Mirror Shielding pool of 85.
    const doubleBurst = makeTrack(
      [
        seg('run-up', 200),
        seg('corridor', 300, [
          { kind: 'gammaBurst', startTick: 0, lengthTicks: 1 },
          { kind: 'gammaBurst', startTick: 30, lengthTicks: 1 },
        ]),
      ],
      [],
      line,
    );
    const plain = simulate(doubleBurst, bare, [{ tick: 190, active: 'shields' }], 3);
    const deep = simulate(doubleBurst, [PARTS.mirrorShielding], [{ tick: 190, active: 'shields' }], 3);
    expect(plain.damageTaken).toBeGreaterThan(0);
    expect(deep.damageAbsorbed).toBeGreaterThan(plain.damageAbsorbed);
    expect(deep.damageTaken).toBeLessThan(plain.damageTaken);
  });
});

describe('power reroute', () => {
  it('gets the ship home sooner', () => {
    const boosted = simulate(openTrack, bare, [{ tick: 100, active: 'powerReroute' }], 1);
    expect(boosted.finishTicks).toBeLessThan(
      simulate(openTrack, bare, noInputs, 1).finishTicks,
    );
  });

  it('is paid for in heat', () => {
    const boosted = simulate(openTrack, bare, [{ tick: 100, active: 'powerReroute' }], 1);
    expect(boosted.overheatedTicks).toBeGreaterThan(0);
    expect(boosted.damageTaken).toBeGreaterThan(0);
    expect(simulate(openTrack, bare, noInputs, 1).damageTaken).toBe(0);
  });

  it('costs a ship with Radiator Fins far less', () => {
    const hot = simulate(openTrack, bare, [{ tick: 100, active: 'powerReroute' }], 1);
    const cool = simulate(
      openTrack,
      [PARTS.radiatorFins],
      [{ tick: 100, active: 'powerReroute' }],
      1,
    );
    expect(cool.overheatedTicks).toBeLessThan(hot.overheatedTicks);
    expect(cool.damageTaken).toBeLessThan(hot.damageTaken);
  });

  it('stacks with a gravity assist rather than replacing it', () => {
    const assist = makeTrack(
      [seg('planet', 300, [{ kind: 'ringedPlanet', startTick: 0, lengthTicks: 300 }])],
      [],
      line,
    );
    const both = simulate(assist, bare, [{ tick: 0, active: 'powerReroute' }], 1);
    const assistOnly = simulate(assist, bare, noInputs, 1);
    expect(both.finishTicks).toBeLessThan(assistOnly.finishTicks);
  });

  it('runs out on its own, and the ship settles back', () => {
    const duration = ACTIVES.powerReroute.durationTicks;
    const outcome = simulate(openTrack, bare, [{ tick: 0, active: 'powerReroute' }], 1);
    const fires = firedAt(outcome.log, 'powerReroute');
    expect(fires).toEqual([0]);
    // Heat stops climbing once the boost ends, and has bled off by the finish.
    expect(outcome.finishTicks).toBeGreaterThan(duration);
    expect(outcome.heatLeft).toBe(0);
  });
});

describe('actives in a whole race', () => {
  it('are deterministic: the same taps give the same race', () => {
    const inputs: readonly PlayerInput[] = [
      { tick: 100, active: 'powerReroute' },
      { tick: 600, active: 'shields' },
    ];
    expect(simulate(burstTrack, bare, inputs, 11)).toEqual(
      simulate(burstTrack, bare, inputs, 11),
    );
  });

  it('a well-timed shield is the difference between finishing and not', () => {
    // A hull that cannot afford the burst on top of the rock it has already
    // taken: shielded it lives, unshielded it does not.
    const thin = makeTrack(
      [
        seg('grind', 500, [{ kind: 'asteroidField', startTick: 0, lengthTicks: 500 }]),
        seg('corridor', 300, [{ kind: 'gammaBurst', startTick: 100, lengthTicks: 1 }]),
        seg('hole', 200, [{ kind: 'blackHole', startTick: 0, lengthTicks: 200 }]),
      ],
      [],
      line,
    );
    const unshielded = simulate(thin, bare, noInputs, 9);
    const shielded = simulate(thin, bare, [{ tick: 600, active: 'shields' }], 9);
    expect(unshielded.survived).toBe(false);
    expect(shielded.survived).toBe(true);
    expect(shielded.damageAbsorbed).toBeGreaterThan(0);
  });
});
