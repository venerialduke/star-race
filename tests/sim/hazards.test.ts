import { describe, expect, it } from 'vitest';
import {
  NO_EFFECT,
  absorb,
  asteroidField,
  blackHole,
  gammaBurst,
  hazardEffect,
  isOneShot,
  type HazardContext,
} from '../../src/sim/hazards';
import { makeRng } from '../../src/sim/rng';
import { BASE_STATS, PARTS, resolveBuild } from '../../src/sim/ship';
import { simulate, type PlayerInput } from '../../src/sim/race';
import { makeSpline } from '../../src/sim/spline';
import { makeTrack, type Segment } from '../../src/sim/track';
import {
  ASTEROID_DAMAGE_PER_TICK,
  BLACK_HOLE_ESCAPE_HULL,
  BLACK_HOLE_SPEED_MULTIPLIER,
  GAMMA_BURST_DAMAGE,
} from '../../src/sim/tuning';

const line = makeSpline([
  { x: 0, y: 0 },
  { x: 1, y: 0 },
]);

const noInputs: readonly PlayerInput[] = [];

const seg = (name: string, lengthTicks: number, hazards: Segment['hazards'] = []): Segment => ({
  name,
  lengthTicks,
  hazards,
});

const context = (overrides: Partial<HazardContext> = {}): HazardContext => ({
  stats: BASE_STATS,
  speed: 1,
  heat: 0,
  hull: BASE_STATS.hull,
  shieldsUp: false,
  rng: makeRng(1),
  ...overrides,
});

/** Total damage from flying `ticks` ticks of field at a fixed speed. */
const fieldDamage = (speed: number, ticks: number, seed = 1): number => {
  const rng = makeRng(seed);
  let total = 0;
  for (let i = 0; i < ticks; i++) {
    total += asteroidField(context({ speed, rng })).hullDamage;
  }
  return total;
};

describe('asteroid field', () => {
  it('damages the hull and nothing else', () => {
    const effect = asteroidField(context());
    expect(effect.hullDamage).toBeGreaterThan(0);
    expect(effect.heat).toBe(0);
    expect(effect.speedMultiplier).toBe(1);
    expect(effect.destroyed).toBe(false);
  });

  it('is deterministic for a seed, and different for another', () => {
    expect(fieldDamage(1, 50, 7)).toBe(fieldDamage(1, 50, 7));
    expect(fieldDamage(1, 50, 7)).not.toBe(fieldDamage(1, 50, 8));
  });

  it('averages out near the tuned figure over many ticks', () => {
    const ticks = 5000;
    const mean = fieldDamage(1, ticks, 12345) / ticks;
    expect(mean).toBeGreaterThan(ASTEROID_DAMAGE_PER_TICK * 0.9);
    expect(mean).toBeLessThan(ASTEROID_DAMAGE_PER_TICK * 1.1);
  });

  it('never heals the ship, however the dice fall', () => {
    const rng = makeRng(999);
    for (let i = 0; i < 2000; i++) {
      expect(asteroidField(context({ rng })).hullDamage).toBeGreaterThanOrEqual(0);
    }
  });

  it('hurts more per tick the faster the ship is going', () => {
    expect(fieldDamage(1.4, 100)).toBeGreaterThan(fieldDamage(1, 100));
    expect(fieldDamage(0.6, 100)).toBeLessThan(fieldDamage(1, 100));
  });

  it('costs a slower ship less to cross the whole field', () => {
    // Crossing a 120-tick field: a slower ship spends more ticks inside, but
    // damage scales with the square of speed, so it still comes out ahead.
    const fieldLength = 120;
    const crossing = (speed: number): number =>
      fieldDamage(speed, Math.ceil(fieldLength / speed));
    expect(crossing(0.7)).toBeLessThan(crossing(1));
    expect(crossing(1)).toBeLessThan(crossing(1.4));
  });
});

describe('gamma-ray burst', () => {
  it('takes a large bite out of the hull in one tick', () => {
    const effect = gammaBurst();
    expect(effect.hullDamage).toBe(GAMMA_BURST_DAMAGE);
    expect(effect.hullDamage).toBeGreaterThan(BASE_STATS.hull * 0.4);
    expect(effect.heat).toBe(0);
    expect(effect.speedMultiplier).toBe(1);
  });

  it('is the same burst every time: no dice, no context, no speed to duck it', () => {
    // The burst takes no arguments at all — that is the point of it. Nothing
    // about the ship changes what arrives; only whether shields are up.
    expect(gammaBurst()).toEqual(gammaBurst());
  });

  it('is survivable unshielded on a fresh hull, but only just', () => {
    expect(GAMMA_BURST_DAMAGE).toBeLessThan(BASE_STATS.hull);
  });

  it('is a one-shot: it fires once, not once per overlapping tick', () => {
    expect(isOneShot('gammaBurst')).toBe(true);
    expect(isOneShot('asteroidField')).toBe(false);
    expect(isOneShot('blackHole')).toBe(false);
    expect(isOneShot('ringedPlanet')).toBe(false);
  });

  it('hits a ship exactly once however fast it crosses the burst', () => {
    // A ship moving about one track-tick per tick overlaps a one-tick window on
    // two consecutive ticks. It must still only be hit once.
    const burstTrack = makeTrack(
      [
        seg('run-up', 60),
        seg('corridor', 200, [{ kind: 'gammaBurst', startTick: 100, lengthTicks: 1 }]),
      ],
      [],
      line,
    );
    [
      [],
      [PARTS.ionThruster],
      [PARTS.ablativePlating],
      [PARTS.overclockedReactor],
    ].forEach((build) => {
      expect(simulate(burstTrack, build, noInputs, 1).damageTaken).toBe(
        GAMMA_BURST_DAMAGE,
      );
    });
  });

  it('costs nothing if the burst is not on the course', () => {
    const clear = makeTrack([seg('run-up', 60), seg('corridor', 200)], [], line);
    expect(simulate(clear, [], noInputs, 1).damageTaken).toBe(0);
  });
});

describe('shields against a burst', () => {
  const burst = gammaBurst().hullDamage;

  it('an unshielded ship eats the whole burst', () => {
    expect(absorb(burst, 0)).toEqual({ toHull: burst, poolLeft: 0 });
  });

  it('a shielded ship with capacity to spare takes nothing', () => {
    const capacity = resolveBuild([PARTS.mirrorShielding]).shieldCapacity;
    expect(capacity).toBeGreaterThanOrEqual(burst);
    expect(absorb(burst, capacity).toHull).toBe(0);
  });

  it('base shields blunt a burst without stopping it', () => {
    const capacity = BASE_STATS.shieldCapacity;
    const { toHull, poolLeft } = absorb(burst, capacity);
    expect(toHull).toBe(burst - capacity);
    expect(toHull).toBeGreaterThan(0);
    expect(poolLeft).toBe(0);
  });

  it('leaves what it did not need in the pool', () => {
    expect(absorb(5, 30)).toEqual({ toHull: 0, poolLeft: 25 });
  });

  it('survives a burst that a bare hull would not', () => {
    // 45 damage against a hull already down to 30: fatal bare, fine shielded.
    const hurtHull = 30;
    expect(hurtHull - absorb(burst, 0).toHull).toBeLessThan(0);
    expect(
      hurtHull -
        absorb(burst, resolveBuild([PARTS.mirrorShielding]).shieldCapacity).toHull,
    ).toBeGreaterThan(0);
  });
});

describe('hazard dispatch', () => {
  it('routes asteroid fields to the asteroid field', () => {
    const shared = makeRng(3);
    const viaDispatch = hazardEffect('asteroidField', context({ rng: shared }));
    const direct = asteroidField(context({ rng: makeRng(3) }));
    expect(viaDispatch).toEqual(direct);
  });

  it('routes gamma bursts to the burst', () => {
    expect(hazardEffect('gammaBurst', context())).toEqual(gammaBurst());
  });

  it('routes black holes to the black hole', () => {
    expect(hazardEffect('blackHole', context())).toEqual(blackHole(context()));
  });

  it('leaves the hazards that have not landed yet inert', () => {
    expect(hazardEffect('ringedPlanet', context())).toEqual(NO_EFFECT);
  });
});

describe('asteroid fields in a race', () => {
  const fieldTrack = makeTrack(
    [
      seg('run-up', 60),
      seg('belt', 200, [{ kind: 'asteroidField', startTick: 0, lengthTicks: 200 }]),
    ],
    [],
    line,
  );

  it('costs hull, and the same seed costs exactly the same hull', () => {
    const a = simulate(fieldTrack, [], noInputs, 42);
    const b = simulate(fieldTrack, [], noInputs, 42);
    expect(a.damageTaken).toBe(b.damageTaken);
    expect(a.damageTaken).toBeGreaterThan(0);
  });

  it('costs different hull on a different seed', () => {
    expect(simulate(fieldTrack, [], noInputs, 1).damageTaken).not.toBe(
      simulate(fieldTrack, [], noInputs, 2).damageTaken,
    );
  });

  it('a slower, tougher ship takes less damage and keeps more hull', () => {
    const plated = simulate(fieldTrack, [PARTS.ablativePlating], noInputs, 5);
    const bare = simulate(fieldTrack, [], noInputs, 5);
    const quick = simulate(fieldTrack, [PARTS.ionThruster], noInputs, 5);
    expect(plated.damageTaken).toBeLessThan(bare.damageTaken);
    expect(quick.damageTaken).toBeGreaterThan(bare.damageTaken);
    expect(plated.hullLeft).toBeGreaterThan(bare.hullLeft);
  });

  it('a long enough field destroys the ship, and the race stops there', () => {
    const deadly = makeTrack(
      [
        seg('grinder', 3000, [
          { kind: 'asteroidField', startTick: 0, lengthTicks: 3000 },
        ]),
      ],
      [],
      line,
    );
    const outcome = simulate(deadly, [], noInputs, 3);
    expect(outcome.survived).toBe(false);
    expect(outcome.hullLeft).toBe(0);
    expect(outcome.log[outcome.log.length - 1]?.kind).toBe('destroyed');
    expect(outcome.damageTaken).toBeGreaterThanOrEqual(resolveBuild([]).hull);
  });

  it('only bites inside the field', () => {
    const clear = makeTrack([seg('run-up', 60), seg('belt', 200)], [], line);
    expect(simulate(clear, [], noInputs, 42).damageTaken).toBe(0);
  });
});

describe('black hole', () => {
  it('drags at the ship without touching its hull', () => {
    const effect = blackHole(context());
    expect(effect.speedMultiplier).toBe(BLACK_HOLE_SPEED_MULTIPLIER);
    expect(effect.speedMultiplier).toBeLessThan(1);
    expect(effect.hullDamage).toBe(0);
    expect(effect.heat).toBe(0);
    expect(effect.destroyed).toBe(false);
  });

  it('rolls no dice: the pull is the same every tick', () => {
    expect(blackHole(context({ rng: makeRng(1) }))).toEqual(
      blackHole(context({ rng: makeRng(2) })),
    );
  });

  it('takes a battered ship: below the escape threshold it is lost', () => {
    const doomed = blackHole(context({ hull: BLACK_HOLE_ESCAPE_HULL - 1 }));
    expect(doomed.destroyed).toBe(true);
  });

  it('lets a ship exactly on the threshold pull away', () => {
    expect(blackHole(context({ hull: BLACK_HOLE_ESCAPE_HULL })).destroyed).toBe(false);
  });

  it('does not care how much hull the ship started with, only what is left', () => {
    // Plating raises max hull but not the number you have to beat.
    const plated = resolveBuild([PARTS.ablativePlating]);
    expect(
      blackHole(context({ stats: plated, hull: BLACK_HOLE_ESCAPE_HULL - 1 })).destroyed,
    ).toBe(true);
  });
});

describe('black holes in a race', () => {
  const holeTrack = makeTrack(
    [
      seg('approach', 60),
      seg('hole', 200, [{ kind: 'blackHole', startTick: 20, lengthTicks: 130 }]),
      seg('run-out', 100),
    ],
    [],
    line,
  );
  const clearTrack = makeTrack(
    [seg('approach', 60), seg('hole', 200), seg('run-out', 100)],
    [],
    line,
  );

  it('costs time, not hull', () => {
    const pulled = simulate(holeTrack, [], noInputs, 1);
    const clear = simulate(clearTrack, [], noInputs, 1);
    expect(pulled.finishTicks).toBeGreaterThan(clear.finishTicks);
    expect(pulled.damageTaken).toBe(0);
    expect(pulled.survived).toBe(true);
  });

  it('acceleration is what gets the time back afterwards', () => {
    // Climbing out of the pull is an acceleration problem, so the anchor gives
    // back more time through the hole than it does on a clear run.
    const gainClear =
      simulate(clearTrack, [], noInputs, 1).finishTicks -
      simulate(clearTrack, [PARTS.inertialAnchor], noInputs, 1).finishTicks;
    const gainPulled =
      simulate(holeTrack, [], noInputs, 1).finishTicks -
      simulate(holeTrack, [PARTS.inertialAnchor], noInputs, 1).finishTicks;
    expect(gainPulled).toBeGreaterThan(gainClear);
  });

  it('swallows a ship that arrives already battered', () => {
    const battered = makeTrack(
      [
        seg('grinder', 800, [{ kind: 'asteroidField', startTick: 0, lengthTicks: 800 }]),
        seg('hole', 200, [{ kind: 'blackHole', startTick: 0, lengthTicks: 200 }]),
      ],
      [],
      line,
    );
    const outcome = simulate(battered, [], noInputs, 4);
    expect(outcome.hullLeft).toBeLessThan(BLACK_HOLE_ESCAPE_HULL);
    expect(outcome.survived).toBe(false);
    expect(outcome.log[outcome.log.length - 1]?.kind).toBe('destroyed');
  });

  it('a ship that armoured up gets through the same course', () => {
    const battered = makeTrack(
      [
        seg('grinder', 800, [{ kind: 'asteroidField', startTick: 0, lengthTicks: 800 }]),
        seg('hole', 200, [{ kind: 'blackHole', startTick: 0, lengthTicks: 200 }]),
      ],
      [],
      line,
    );
    const outcome = simulate(battered, [PARTS.ablativePlating, PARTS.ablativePlating], noInputs, 4);
    expect(outcome.survived).toBe(true);
    expect(outcome.hullLeft).toBeGreaterThanOrEqual(BLACK_HOLE_ESCAPE_HULL);
  });
});
