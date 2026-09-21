import { describe, expect, it } from 'vitest';
import {
  atRest,
  ceilingAhead,
  fly,
  ghostInput,
  holdingSpeed,
  makePilot,
  step,
  steerToHold,
  type Flight,
  type Ship,
} from '../../src/lab/flight';
import { GRIP_PER_HANDLING, PATH_HALF_WIDTH } from '../../src/lab/knobs';
import {
  bendEnd,
  bendStart,
  centreAt,
  curvatureAt,
  headingAt,
  placeAt,
  shapeLength,
  type Shape,
} from '../../src/lab/shape';

const SHAPE: Shape = {
  entry: 320,
  radius: 55,
  sweep: Math.PI / 2,
  exit: 320,
  hand: 1,
  halfWidth: PATH_HALF_WIDTH,
};

function shipWith(handling: number): Ship {
  return { topSpeed: 1.2, accel: 0.005, brake: 0.0075, grip: GRIP_PER_HANDLING * handling };
}

const clamp = (v: number, low: number, high: number): number =>
  v < low ? low : v > high ? high : v;

/** A driver who steers exactly what the bend asks and can ask for no more than full lock. */
function bestEffort(ship: Ship, shape: Shape) {
  return (state: Flight) => ({
    throttle: 0,
    steer: clamp(steerToHold(ship, shape, state), -1, 1),
  });
}

describe('the shape', () => {
  it('is straight, then curved by exactly one radius, then straight', () => {
    expect(curvatureAt(SHAPE, 10)).toBe(0);
    expect(curvatureAt(SHAPE, bendStart(SHAPE) + 10)).toBeCloseTo(1 / 55, 10);
    expect(curvatureAt(SHAPE, bendEnd(SHAPE) + 10)).toBe(0);
  });

  it('turns through exactly its sweep, and the centre line stays continuous', () => {
    expect(headingAt(SHAPE, bendEnd(SHAPE))).toBeCloseTo(-Math.PI / 2, 10);
    for (let d = 0; d < shapeLength(SHAPE); d += 7) {
      const here = centreAt(SHAPE, d);
      const next = centreAt(SHAPE, d + 1);
      expect(Math.hypot(next.x - here.x, next.y - here.y)).toBeCloseTo(1, 4);
    }
  });

  it('puts a positive offset to the ship’s right, which is outside a right-hand bend', () => {
    // At the top of a right-hand bend the road heads -45 degrees; the outside
    // of the turn is further from the hub, and the hub is to the right.
    const mid = bendStart(SHAPE) + (bendEnd(SHAPE) - bendStart(SHAPE)) / 2;
    const hub = { x: bendStart(SHAPE), y: -SHAPE.radius };
    const inner = placeAt(SHAPE, mid, 5);
    const outer = placeAt(SHAPE, mid, -5);
    expect(Math.hypot(inner.x - hub.x, inner.y - hub.y)).toBeLessThan(SHAPE.radius);
    expect(Math.hypot(outer.x - hub.x, outer.y - hub.y)).toBeGreaterThan(SHAPE.radius);
  });
});

describe('the model', () => {
  it('is deterministic: the same inputs fly the same line, to the last bit', () => {
    const ship = shipWith(1.2);
    const once = fly(ship, SHAPE, (s) => ghostInput(ship, SHAPE, s), atRest(0.6));
    const twice = fly(ship, SHAPE, (s) => ghostInput(ship, SHAPE, s), atRest(0.6));
    expect(twice.ticks).toBe(once.ticks);
    expect(twice.worst).toBe(once.worst);
    expect(twice.path.map((s) => s.offset)).toEqual(once.path.map((s) => s.offset));
  });

  it('holds a bend flat out at exactly sqrt(grip x radius), the game’s holding speed', () => {
    const ship = shipWith(1.3);
    const limit = holdingSpeed(ship, SHAPE.radius);
    expect(steerToHold(ship, SHAPE, { ...atRest(limit), along: bendStart(SHAPE) + 20 })).toBeCloseTo(
      1,
      10,
    );
  });

  it('arrives at a bend at about the speed the bend takes', () => {
    const ship = shipWith(1.0);
    const run = fly(ship, SHAPE, (s) => ghostInput(ship, SHAPE, s), atRest(0.4));
    const onBend = run.path.filter(
      (s) => s.along >= bendStart(SHAPE) && s.along <= bendEnd(SHAPE),
    );
    const limit = holdingSpeed(ship, SHAPE.radius);
    // Over by about 13%, and deliberately so: the ghost's throttle eases off
    // rather than switching, so it sheds the last of the speed in the first
    // few units of the bend the way a driver trails the brake in. That easing
    // is the whole reason it looks like driving rather than like a switch.
    // What matters is that the overshoot stays small and the line still holds.
    expect(Math.max(...onBend.map((s) => s.speed))).toBeLessThan(limit * 1.15);
    expect(run.worst).toBeLessThan(SHAPE.halfWidth);
  });

  it('reads a longer approach as room to carry more speed', () => {
    // A ship fast enough that its own top speed is not what limits it.
    const ship = { ...shipWith(1.2), topSpeed: 2.6 };
    const near = ceilingAhead(ship, { ...SHAPE, entry: 120 }, 0);
    const far = ceilingAhead(ship, { ...SHAPE, entry: 600 }, 0);
    expect(far).toBeGreaterThan(near);
  });

  it('holds a lower ceiling the nearer the bend gets', () => {
    const ship = { ...shipWith(1.2), topSpeed: 2.6 };
    const far = ceilingAhead(ship, SHAPE, bendStart(SHAPE) - 300);
    const near = ceilingAhead(ship, SHAPE, bendStart(SHAPE) - 30);
    expect(near).toBeLessThan(far);
    expect(ceilingAhead(ship, SHAPE, bendStart(SHAPE) + 10)).toBeCloseTo(
      holdingSpeed(ship, SHAPE.radius),
      6,
    );
  });
});

describe('what the ship’s stats are worth', () => {
  // This is the property the whole model exists to give: the owner's own
  // words, "the same ship, going the same speed into a curve, but with better
  // handling should deviate less".
  it('deviates less at the same entry speed the better the handling is, every time', () => {
    const entry = 0.9;
    const worsts = [0.7, 1.0, 1.3, 1.6, 2.0].map((handling) => {
      const ship = shipWith(handling);
      const from: Flight = { ...atRest(entry), along: bendStart(SHAPE) - 40 };
      return fly(ship, SHAPE, bestEffort(ship, SHAPE), from).worst;
    });
    for (let i = 1; i < worsts.length; i += 1) {
      expect(worsts[i]!).toBeLessThan(worsts[i - 1]!);
    }
    // And the range is worth seeing, not a rounding difference.
    expect(worsts[0]! / worsts[worsts.length - 1]!).toBeGreaterThan(4);
  });

  it('runs wider the faster it goes in, on one ship and one bend', () => {
    const ship = shipWith(1.2);
    const worsts = [0.6, 0.75, 0.9, 1.05].map((entry) => {
      const from: Flight = { ...atRest(entry), along: bendStart(SHAPE) - 40 };
      return fly(ship, SHAPE, bestEffort(ship, SHAPE), from).worst;
    });
    for (let i = 1; i < worsts.length; i += 1) {
      expect(worsts[i]!).toBeGreaterThan(worsts[i - 1]!);
    }
  });

  it('costs nothing in speed to run wide — the lab does not punish, it shows', () => {
    const ship = shipWith(0.7);
    const wide = fly(ship, SHAPE, () => ({ throttle: 1, steer: 0 }), atRest(0.6));
    expect(wide.worst).toBeGreaterThan(SHAPE.halfWidth * 4);
    // Flat out the whole way means top speed at the end, however far off it went.
    expect(wide.path[wide.path.length - 1]!.speed).toBeCloseTo(ship.topSpeed, 1);
  });
});

describe('the ghost, which is what a navigation system is worth', () => {
  it('holds the golden path on every ship and every bend it is given', () => {
    for (const radius of [26, 45, 70, 110]) {
      for (const handling of [0.7, 1.0, 1.4, 2.0]) {
        const shape = { ...SHAPE, radius };
        const ship = shipWith(handling);
        const run = fly(ship, shape, (s) => ghostInput(ship, shape, s), atRest(0.6));
        expect(run.finished).toBe(true);
        expect(run.worst).toBeLessThan(shape.halfWidth);
      }
    }
  });

  it('beats the same ship driven by reacting to the bend instead of anticipating it', () => {
    const ship = shipWith(1.2);
    const anticipating = fly(ship, SHAPE, (s) => ghostInput(ship, SHAPE, s), atRest(0.6));
    // The same driver, reading the road underfoot rather than a steering lag ahead.
    const reacting = fly(
      ship,
      SHAPE,
      (s) => {
        const want = ghostInput(ship, SHAPE, s);
        const curve = curvatureAt(SHAPE, s.along);
        return { throttle: want.throttle, steer: clamp((curve * s.speed * s.speed) / ship.grip, -1, 1) };
      },
      atRest(0.6),
    );
    expect(anticipating.worst).toBeLessThan(reacting.worst);
    // And by a margin worth a component slot, not a rounding difference.
    expect(reacting.worst - anticipating.worst).toBeGreaterThan(SHAPE.halfWidth / 2);
  });
});

describe('the feel', () => {
  it('spends real time between stopped and flat out, rather than snapping', () => {
    const ship = shipWith(1.2);
    const long = { ...SHAPE, entry: 700 };
    const run = fly(ship, long, () => ({ throttle: 1, steer: 0 }), atRest(0));
    const speeds = run.path.map((s) => s.speed / ship.topSpeed);
    // Most of the launch is spent somewhere in between, which is the whole
    // complaint the model was rewritten to answer.
    const between = speeds.filter((v) => v > 0.1 && v < 0.9).length;
    expect(between).toBeGreaterThan(speeds.length * 0.25);
  });

  it('keeps going sideways until something turns it back', () => {
    const ship = shipWith(1.2);
    const straight: Shape = { ...SHAPE, radius: 55, sweep: 0, entry: 900, exit: 0 };
    let state = atRest(0.9);
    // Steer for a moment, then let go.
    for (let i = 0; i < 40; i += 1) state = step(ship, straight, state, { throttle: 0, steer: 1 });
    const turning = state.offset;
    for (let i = 0; i < 120; i += 1) state = step(ship, straight, state, { throttle: 0, steer: 0 });
    // Hands off does not mean back on the line: the ship keeps its drift, and
    // getting back costs room and an input of its own.
    expect(state.offset).toBeGreaterThan(turning + 5);
  });
});

describe('the navigation rating', () => {
  const ship = shipWith(1.2);
  const median = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
  const spread = (nav: number, seeds = 25): number[] =>
    Array.from({ length: seeds }, (_, i) =>
      fly(ship, SHAPE, makePilot(ship, SHAPE, nav, i * 7919 + 13), atRest(0.6)).worst,
    );

  it('is the reference line at 100, with no randomness left in it at all', () => {
    const perfect = fly(ship, SHAPE, (s) => ghostInput(ship, SHAPE, s), atRest(0.6));
    // Any seed, because at 100 the wanders are multiplied by zero.
    for (const seed of [1, 2, 99999]) {
      const rated = fly(ship, SHAPE, makePilot(ship, SHAPE, 100, seed), atRest(0.6));
      expect(rated.ticks).toBe(perfect.ticks);
      expect(rated.path.map((s) => s.offset)).toEqual(perfect.path.map((s) => s.offset));
    }
  });

  it('replays a seed exactly, and draws differently on another', () => {
    const once = fly(ship, SHAPE, makePilot(ship, SHAPE, 40, 7), atRest(0.6));
    const twice = fly(ship, SHAPE, makePilot(ship, SHAPE, 40, 7), atRest(0.6));
    expect(twice.path.map((s) => s.offset)).toEqual(once.path.map((s) => s.offset));
    const other = fly(ship, SHAPE, makePilot(ship, SHAPE, 40, 8), atRest(0.6));
    expect(other.path.map((s) => s.offset)).not.toEqual(once.path.map((s) => s.offset));
  });

  it('runs wider the lower it is, all the way down', () => {
    const worsts = [100, 85, 70, 55, 40, 25, 10, 0].map((nav) => median(spread(nav)));
    for (let i = 1; i < worsts.length; i += 1) {
      expect(worsts[i]!).toBeGreaterThan(worsts[i - 1]!);
    }
  });

  it('keeps a well-navigated ship on the path and puts a badly navigated one off it', () => {
    const off = (nav: number): number =>
      spread(nav).filter((worst) => worst > SHAPE.halfWidth).length;
    expect(off(100)).toBe(0);
    expect(off(85)).toBe(0);
    expect(off(0)).toBeGreaterThan(spread(0).length * 0.6);
  });

  it('is inconsistent when it is bad, not merely worse', () => {
    // The point of the wander: a low rating is a range of outcomes, not a
    // reliably mediocre one. A high rating has almost no range at all.
    const range = (nav: number): number => {
      const xs = spread(nav);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(range(0)).toBeGreaterThan(range(100) + SHAPE.halfWidth * 3);
  });

  it('still gets a ship with no navigation round, slower and untidily', () => {
    const bad = fly(ship, SHAPE, makePilot(ship, SHAPE, 0, 3), atRest(0.6));
    const good = fly(ship, SHAPE, makePilot(ship, SHAPE, 100, 3), atRest(0.6));
    expect(bad.finished).toBe(true);
    expect(bad.ticks).toBeGreaterThan(good.ticks);
  });
});
