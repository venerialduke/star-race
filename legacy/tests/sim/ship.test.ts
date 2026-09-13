import { describe, expect, it } from 'vitest';
import {
  ALL_PARTS,
  BASE_STATS,
  PARTS,
  partById,
  resolveBuild,
  type Part,
  type PartId,
  type StatName,
} from '../../src/sim/ship';
import {
  MIN_ACCELERATION,
  MIN_HEAT_TOLERANCE,
  MIN_HULL,
  MIN_SHIELD_CAPACITY,
  MIN_SPEED,
} from '../../src/sim/tuning';

const STAT_NAMES: readonly StatName[] = [
  'speed',
  'acceleration',
  'shieldCapacity',
  'heatTolerance',
  'hull',
];

/** What one part changed, relative to a bare hull. */
const deltaOf = (part: Part): Partial<Record<StatName, number>> => {
  const resolved = resolveBuild([part]);
  const out: Partial<Record<StatName, number>> = {};
  STAT_NAMES.forEach((stat) => {
    const change = resolved[stat] - BASE_STATS[stat];
    if (Math.abs(change) > 1e-9) out[stat] = Number(change.toFixed(6));
  });
  return out;
};

describe('base stats', () => {
  it('an empty build is exactly the base stats', () => {
    expect(resolveBuild([])).toEqual(BASE_STATS);
  });

  it('base speed is 1.0, the definition of a track tick', () => {
    // track.ts measures segments in "ticks at base speed", so this must be 1.
    expect(BASE_STATS.speed).toBe(1);
  });

  it('matches the stat table in DESIGN.md', () => {
    // DESIGN.md is the source of truth. If this fails, the doc and the code
    // disagree and one of them is a bug — fix both in the same change.
    expect(BASE_STATS).toEqual({
      speed: 1,
      acceleration: 0.02,
      shieldCapacity: 50,
      heatTolerance: 100,
      hull: 100,
    });
  });

  it('does not mutate the base stats when resolving', () => {
    const before = { ...BASE_STATS };
    resolveBuild([PARTS.ionThruster, PARTS.ablativePlating]);
    expect(BASE_STATS).toEqual(before);
  });
});

describe('the six parts', () => {
  it('there are six, with unique ids and names', () => {
    expect(ALL_PARTS).toHaveLength(6);
    expect(new Set(ALL_PARTS.map((p) => p.id)).size).toBe(6);
    expect(new Set(ALL_PARTS.map((p) => p.name)).size).toBe(6);
  });

  it('every part is keyed by its own id and reachable by lookup', () => {
    (Object.keys(PARTS) as PartId[]).forEach((id) => {
      expect(PARTS[id].id).toBe(id);
      expect(partById(id)).toBe(PARTS[id]);
    });
  });

  it('every part has an upside and a cost, and a blurb to show', () => {
    ALL_PARTS.forEach((part) => {
      const changes = Object.values(deltaOf(part));
      expect(changes.some((v) => v > 0)).toBe(true);
      expect(changes.some((v) => v < 0)).toBe(true);
      expect(part.blurb.length).toBeGreaterThan(0);
    });
  });

  it('Ion Thruster buys speed with hull', () => {
    expect(deltaOf(PARTS.ionThruster)).toEqual({ speed: 0.15, hull: -10 });
  });

  it('Ablative Plating buys hull with speed', () => {
    expect(deltaOf(PARTS.ablativePlating)).toEqual({ hull: 40, speed: -0.08 });
  });

  it('Mirror Shielding buys shield capacity and a little hull with speed', () => {
    expect(deltaOf(PARTS.mirrorShielding)).toEqual({
      shieldCapacity: 35,
      hull: 12,
      speed: -0.05,
    });
  });

  it('Radiator Fins buy heat tolerance with hull', () => {
    expect(deltaOf(PARTS.radiatorFins)).toEqual({ heatTolerance: 45, hull: -15 });
  });

  it('Inertial Anchor buys acceleration with speed', () => {
    expect(deltaOf(PARTS.inertialAnchor)).toEqual({ acceleration: 0.03, speed: -0.02 });
  });

  it('Overclocked Reactor buys speed and acceleration with heat tolerance', () => {
    expect(deltaOf(PARTS.overclockedReactor)).toEqual({
      speed: 0.1,
      acceleration: 0.015,
      heatTolerance: -30,
    });
  });

  it('touches only stats it declares', () => {
    ALL_PARTS.forEach((part) => {
      const touched = Object.keys(deltaOf(part));
      const declared = Object.keys(part.effect);
      expect(touched.sort()).toEqual(declared.sort());
    });
  });
});

describe('resolveBuild', () => {
  it('sums the deltas of several parts', () => {
    const stats = resolveBuild([PARTS.ionThruster, PARTS.ablativePlating]);
    expect(stats.speed).toBeCloseTo(BASE_STATS.speed + 0.15 - 0.08, 9);
    expect(stats.hull).toBe(BASE_STATS.hull - 10 + 40);
  });

  it('stacks the same part twice', () => {
    const once = resolveBuild([PARTS.ionThruster]);
    const twice = resolveBuild([PARTS.ionThruster, PARTS.ionThruster]);
    expect(twice.speed - once.speed).toBeCloseTo(once.speed - BASE_STATS.speed, 9);
    expect(twice.hull).toBe(BASE_STATS.hull - 20);
  });

  it('does not depend on the order parts were bolted on', () => {
    const a = resolveBuild([PARTS.radiatorFins, PARTS.inertialAnchor, PARTS.ionThruster]);
    const b = resolveBuild([PARTS.ionThruster, PARTS.radiatorFins, PARTS.inertialAnchor]);
    expect(a).toEqual(b);
  });

  it('floors speed for a stack of heavy parts', () => {
    // 15 platings is -1.2 speed against a base of 1.0.
    const heavy = Array.from({ length: 15 }, () => PARTS.ablativePlating);
    expect(resolveBuild(heavy).speed).toBe(MIN_SPEED);
  });

  it('floors heat tolerance for a stack of reactors', () => {
    const hot = Array.from({ length: 5 }, () => PARTS.overclockedReactor);
    expect(resolveBuild(hot).heatTolerance).toBe(MIN_HEAT_TOLERANCE);
  });

  it('floors hull for a stack of hull-cost parts', () => {
    const fragile = Array.from({ length: 20 }, () => PARTS.radiatorFins);
    expect(resolveBuild(fragile).hull).toBe(MIN_HULL);
  });

  it('floors acceleration and shields too, for parts that could cost them', () => {
    // No slice part lowers these, so the floor is proved with a made-up part.
    const wrecker: Part = {
      id: 'ionThruster',
      name: 'Test Wrecker',
      blurb: 'Only used to prove the floors hold.',
      effect: { acceleration: -99, shieldCapacity: -99 },
    };
    const stats = resolveBuild([wrecker]);
    expect(stats.acceleration).toBe(MIN_ACCELERATION);
    expect(stats.shieldCapacity).toBe(MIN_SHIELD_CAPACITY);
  });

  it('leaves every stat at or above its floor for any build of slice parts', () => {
    const everything = ALL_PARTS.flatMap((part) => [part, part, part]);
    const stats = resolveBuild(everything);
    expect(stats.speed).toBeGreaterThanOrEqual(MIN_SPEED);
    expect(stats.acceleration).toBeGreaterThanOrEqual(MIN_ACCELERATION);
    expect(stats.shieldCapacity).toBeGreaterThanOrEqual(MIN_SHIELD_CAPACITY);
    expect(stats.heatTolerance).toBeGreaterThanOrEqual(MIN_HEAT_TOLERANCE);
    expect(stats.hull).toBeGreaterThanOrEqual(MIN_HULL);
  });

  it('is a pure function: same build in, same stats out', () => {
    const build = [PARTS.ionThruster, PARTS.mirrorShielding];
    expect(resolveBuild(build)).toEqual(resolveBuild(build));
  });
});
