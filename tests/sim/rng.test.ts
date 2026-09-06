import { describe, expect, it } from 'vitest';
import { makeRng } from '../../src/sim/rng';

const draw = (seed: number, n: number): number[] => {
  const rng = makeRng(seed);
  return Array.from({ length: n }, () => rng.nextFloat());
};

describe('rng', () => {
  it('gives the same sequence for the same seed', () => {
    expect(draw(1234, 50)).toEqual(draw(1234, 50));
  });

  it('gives different sequences for different seeds', () => {
    expect(draw(1234, 50)).not.toEqual(draw(1235, 50));
  });

  it('keeps floats in [0, 1)', () => {
    const rng = makeRng(7);
    for (let i = 0; i < 10_000; i++) {
      const v = rng.nextFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('does not get stuck on one value', () => {
    const values = new Set(draw(99, 1000));
    expect(values.size).toBeGreaterThan(900);
  });

  it('spreads floats across the unit interval', () => {
    // Ten buckets over 10,000 draws: a uniform stream lands roughly 1,000 in
    // each. Wide bounds — this catches a broken generator, not bias.
    const buckets = new Array<number>(10).fill(0);
    const rng = makeRng(4242);
    for (let i = 0; i < 10_000; i++) {
      const bucket = Math.floor(rng.nextFloat() * 10);
      buckets[bucket] = (buckets[bucket] ?? 0) + 1;
    }
    buckets.forEach((count) => {
      expect(count).toBeGreaterThan(700);
      expect(count).toBeLessThan(1300);
    });
  });
});

describe('rng.nextInt', () => {
  it('stays inside [min, max) and reaches both ends', () => {
    const rng = makeRng(5);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = rng.nextInt(3, 8);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThan(8);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6, 7]);
  });

  it('is deterministic per seed', () => {
    const a = makeRng(11);
    const b = makeRng(11);
    for (let i = 0; i < 20; i++) {
      expect(a.nextInt(0, 100)).toBe(b.nextInt(0, 100));
    }
  });

  it('rejects an empty or non-integer range', () => {
    const rng = makeRng(1);
    expect(() => rng.nextInt(5, 5)).toThrow();
    expect(() => rng.nextInt(9, 2)).toThrow();
    expect(() => rng.nextInt(0, 1.5)).toThrow();
  });
});

describe('rng.fork', () => {
  it('produces the same child streams for the same parent seed', () => {
    const parentA = makeRng(2024);
    const parentB = makeRng(2024);
    const childA = parentA.fork();
    const childB = parentB.fork();
    expect(Array.from({ length: 20 }, () => childA.nextFloat())).toEqual(
      Array.from({ length: 20 }, () => childB.nextFloat()),
    );
  });

  it('gives each fork an independent stream', () => {
    const parent = makeRng(2024);
    const first = parent.fork();
    const second = parent.fork();
    const firstDraws = Array.from({ length: 20 }, () => first.nextFloat());
    const secondDraws = Array.from({ length: 20 }, () => second.nextFloat());
    expect(firstDraws).not.toEqual(secondDraws);
  });

  it('does not hand the child the parent stream', () => {
    const parent = makeRng(77);
    const child = parent.fork();
    expect(Array.from({ length: 20 }, () => child.nextFloat())).not.toEqual(
      Array.from({ length: 20 }, () => parent.nextFloat()),
    );
  });

  it('lets one stream draw more without changing a sibling', () => {
    // The point of forking: adding rolls to one hazard must not shift another.
    const seeded = (extraDraws: number): number[] => {
      const parent = makeRng(31337);
      const hazardA = parent.fork();
      const hazardB = parent.fork();
      for (let i = 0; i < extraDraws; i++) hazardA.nextFloat();
      return Array.from({ length: 10 }, () => hazardB.nextFloat());
    };
    expect(seeded(0)).toEqual(seeded(50));
  });
});

describe('rng seeds', () => {
  it('accepts any finite seed, coercing to 32 bits', () => {
    expect(draw(-1, 5)).toEqual(draw(0xffffffff, 5));
    expect(draw(0.5, 5)).toEqual(draw(0, 5));
  });

  it('rejects a non-finite seed', () => {
    expect(() => makeRng(NaN)).toThrow();
    expect(() => makeRng(Infinity)).toThrow();
  });
});
