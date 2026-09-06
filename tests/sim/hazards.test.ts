import { describe, expect, it } from 'vitest';
import {
  NO_EFFECT,
  asteroidField,
  hazardEffect,
  type HazardContext,
} from '../../src/sim/hazards';
import { makeRng } from '../../src/sim/rng';
import { BASE_STATS, PARTS, resolveBuild } from '../../src/sim/ship';
import { simulate, type PlayerInput } from '../../src/sim/race';
import { makeSpline } from '../../src/sim/spline';
import { makeTrack, type Segment } from '../../src/sim/track';
import { ASTEROID_DAMAGE_PER_TICK } from '../../src/sim/tuning';

const line = makeSpline([
  { x: 0, y: 0 },
  { x: 1, y: 0 },
]);

const noInputs: readonly PlayerInput[] = [];

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

describe('hazard dispatch', () => {
  it('routes asteroid fields to the asteroid field', () => {
    const shared = makeRng(3);
    const viaDispatch = hazardEffect('asteroidField', context({ rng: shared }));
    const direct = asteroidField(context({ rng: makeRng(3) }));
    expect(viaDispatch).toEqual(direct);
  });

  it('leaves the hazards that have not landed yet inert', () => {
    expect(hazardEffect('gammaBurst', context())).toEqual(NO_EFFECT);
    expect(hazardEffect('blackHole', context())).toEqual(NO_EFFECT);
    expect(hazardEffect('ringedPlanet', context())).toEqual(NO_EFFECT);
  });
});

describe('asteroid fields in a race', () => {
  const seg = (
    name: string,
    lengthTicks: number,
    hazards: Segment['hazards'] = [],
  ): Segment => ({
    name,
    lengthTicks,
    hazards,
  });

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
