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
import {
  BUMPER_FROM,
  BUMPER_PUSH,
  BUMPER_RAMP,
  GRIP_PER_HANDLING,
  MOST_YAW,
  PATH_HALF_WIDTH,
} from '../../src/lab/knobs';
import {
  bendEnd,
  bendStart,
  bumperPush,
  centreAt,
  crossedBump,
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

describe('the shove on the course', () => {
  it('is crossed, not sat in', () => {
    const shape: Shape = { ...SHAPE, bump: { at: 100, push: 0.3 } };
    expect(crossedBump(shape, 98, 101)).toEqual({ at: 100, push: 0.3 });
    expect(crossedBump(shape, 101, 104)).toBeUndefined();
    expect(crossedBump(shape, 90, 99)).toBeUndefined();
    expect(crossedBump(SHAPE, 98, 101)).toBeUndefined();
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
    // A ship fast enough that its own top speed is not what limits it, and
    // going fast enough to be reading a long way ahead: what a pilot can see
    // is a number of *ticks* of road, so it scales with speed.
    const ship = { ...shipWith(1.2), topSpeed: 2.6 };
    const near = ceilingAhead(ship, { ...SHAPE, entry: 120 }, 0, 2.6);
    const far = ceilingAhead(ship, { ...SHAPE, entry: 600 }, 0, 2.6);
    expect(far).toBeGreaterThan(near);
  });

  it('holds a lower ceiling the nearer the bend gets', () => {
    const ship = { ...shipWith(1.2), topSpeed: 2.6 };
    const far = ceilingAhead(ship, SHAPE, bendStart(SHAPE) - 300, 2.6);
    const near = ceilingAhead(ship, SHAPE, bendStart(SHAPE) - 30, 2.6);
    expect(near).toBeLessThan(far);
    expect(ceilingAhead(ship, SHAPE, bendStart(SHAPE) + 10, 2.6)).toBeCloseTo(
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

  it('keeps a well-navigated ship on the path, and lets a badly navigated one off it', () => {
    const off = (nav: number): number =>
      spread(nav).filter((worst) => worst > SHAPE.halfWidth).length;
    expect(off(100)).toBe(0);
    expect(off(85)).toBe(0);
    // Measured at 5 laps in 25. It used to be most of them: a bad navigation
    // system believed the line was up to 14 units out, when the path is 9
    // wide, and sawed at the steering chasing it. Most of the misjudgement is
    // spent on the pace now, so leaving the path is something that happens to
    // an unguided ship on a bend it takes badly rather than on every bend.
    expect(off(0)).toBeGreaterThan(spread(0).length * 0.1);
    expect(median(spread(0))).toBeGreaterThan(median(spread(85)) * 4);
  });

  it('is inconsistent when it is bad, not merely worse', () => {
    // The point of the wander: a low rating is a range of outcomes, not a
    // reliably mediocre one. A high rating has almost no range at all.
    const range = (nav: number): number => {
      const xs = spread(nav);
      return Math.max(...xs) - Math.min(...xs);
    };
    // Measured at about 22 units of spread at 0 against none at all at 100.
    expect(range(100)).toBeLessThan(0.5);
    expect(range(0)).toBeGreaterThan(SHAPE.halfWidth * 1.5);
  });

  it('puts real distance between no navigation and half of it', () => {
    // The owner's complaint: 0 and 50 felt like the same ship. They are not
    // allowed to be again. Both the line and the clock have to separate.
    //
    // Measured at 2.5× on the line and 11% on the clock over this one bend.
    // The clock gap used to be wider: a pilot now believes at worst
    // `PACE_LEAST` of its own ceiling, so it can no longer lose a bend by
    // nearly stopping on it — which was most of what a low rating cost, and
    // was exactly the thing that read as a ship going either flat out or
    // nowhere. The separation that is left is a pilot that is late on the
    // brakes, slow off them and further off the line, which is what it should
    // have been.
    const none = median(spread(0));
    const half = median(spread(50));
    expect(none).toBeGreaterThan(half * 2);

    const lap = (nav: number): number => {
      const ticks = Array.from({ length: 25 }, (_, i) =>
        fly(ship, SHAPE, makePilot(ship, SHAPE, nav, i * 7919 + 13), atRest(0.6)).ticks,
      );
      return median(ticks);
    };
    expect(lap(0)).toBeGreaterThan(lap(50) * 1.08);
    expect(lap(50)).toBeGreaterThan(lap(100) * 1.12);
  });
});

describe('a shove, and what navigation does about it', () => {
  const ship = shipWith(1.2);
  const SHOVE = 0.3;
  const shoved = (at: number, nav = 100): { worst: number; back: number; ticks: number } => {
    const shape: Shape = { ...SHAPE, bump: { at, push: SHOVE } };
    const run = fly(ship, shape, makePilot(ship, shape, nav, 5), atRest(0.6));
    let hit = -1;
    let worst = 0;
    let left = false;
    let back = -1;
    for (const state of run.path) {
      if (hit < 0 && state.along >= at) hit = state.tick;
      if (hit < 0) continue;
      worst = Math.max(worst, Math.abs(state.offset));
      if (Math.abs(state.offset) > 3) left = true;
      if (left && back < 0 && Math.abs(state.offset) < 1) back = state.tick - hit;
    }
    return { worst, back, ticks: run.ticks };
  };

  it('does nothing at all until the ship reaches it, and then throws it off', () => {
    const at = bendStart(SHAPE) - 120;
    const shape: Shape = { ...SHAPE, bump: { at, push: SHOVE } };
    const run = fly(ship, shape, makePilot(ship, shape, 100, 5), atRest(0.6));
    const before = run.path.filter((s) => s.along < at);
    expect(Math.max(...before.map((s) => Math.abs(s.offset)))).toBeLessThan(1);
    expect(shoved(at).worst).toBeGreaterThan(4);
  });

  it('fires exactly once, however fast the ship is going over it', () => {
    // A crossing, not a proximity: a quick ship cannot step over it and a slow
    // one cannot sit in it being shoved every tick.
    const at = 200;
    const shape: Shape = { ...SHAPE, bump: { at, push: SHOVE } };
    const run = fly(ship, shape, makePilot(ship, shape, 100, 5), atRest(0.6));
    const jumps = run.path.filter((s, i) => {
      const was = run.path[i - 1];
      return was !== undefined && Math.abs(s.yaw - was.yaw) > 0.1;
    });
    expect(jumps.length).toBe(1);
  });

  it('gets a perfectly navigated ship back on the line wherever it is shoved', () => {
    for (const at of [180, bendStart(SHAPE) - 40, bendStart(SHAPE) + 43, bendStart(SHAPE) + 75]) {
      const run = shoved(at);
      // Thrown off, but never further than a path-width and a half, and back.
      expect(run.worst).toBeLessThan(SHAPE.halfWidth * 1.5);
      expect(run.back).toBeGreaterThan(0);
    }
  });

  it('costs time to be off the line, without anything punishing it for being off', () => {
    // The only reason an excursion is slow: getting back spends the grip the
    // corner was using, so the ship has to be slower through the corner.
    const clean = fly(ship, SHAPE, makePilot(ship, SHAPE, 100, 5), atRest(0.6)).ticks;
    expect(shoved(bendStart(SHAPE) - 40).ticks).toBeGreaterThan(clean);
  });

  it('recovers worse the less navigation it has', () => {
    const at = bendStart(SHAPE) - 40;
    expect(shoved(at, 0).worst).toBeGreaterThan(shoved(at, 100).worst);
  });

  it('still gets a ship with no navigation round, slower and untidily', () => {
    const bad = fly(ship, SHAPE, makePilot(ship, SHAPE, 0, 3), atRest(0.6));
    const good = fly(ship, SHAPE, makePilot(ship, SHAPE, 100, 3), atRest(0.6));
    expect(bad.finished).toBe(true);
    expect(bad.ticks).toBeGreaterThan(good.ticks);
  });
});

describe('the bumpers', () => {
  const ship = shipWith(1.2);
  const WALLED: Shape = {
    ...SHAPE,
    bumpers: { from: BUMPER_FROM, ramp: BUMPER_RAMP, push: BUMPER_PUSH },
  };

  it('does nothing on the path, pushes back off it, and saturates', () => {
    expect(bumperPush(WALLED, 0)).toBe(0);
    expect(bumperPush(WALLED, PATH_HALF_WIDTH)).toBe(0);
    // Off to the right is pushed left, and the other way round.
    expect(bumperPush(WALLED, PATH_HALF_WIDTH + 3)).toBeLessThan(0);
    expect(bumperPush(WALLED, -(PATH_HALF_WIDTH + 3))).toBeGreaterThan(0);
    // It eases in, then stops growing however far out the ship is.
    const near = Math.abs(bumperPush(WALLED, PATH_HALF_WIDTH + 2));
    const far = Math.abs(bumperPush(WALLED, PATH_HALF_WIDTH + BUMPER_RAMP));
    expect(near).toBeLessThan(far);
    expect(Math.abs(bumperPush(WALLED, 400))).toBeCloseTo(far, 10);
  });

  it('leaves a clean lap exactly as it was', () => {
    const bare = fly(ship, SHAPE, makePilot(ship, SHAPE, 100, 5), atRest(0.6));
    const walled = fly(ship, WALLED, makePilot(ship, WALLED, 100, 5), atRest(0.6));
    expect(walled.ticks).toBe(bare.ticks);
    expect(walled.path.map((s) => s.offset)).toEqual(bare.path.map((s) => s.offset));
  });

  it('bounds how far a shove can throw a ship', () => {
    const at = bendStart(SHAPE) - 40;
    const bump = { at, push: 0.45 };
    const bare = fly(ship, { ...SHAPE, bump }, makePilot(ship, SHAPE, 100, 5), atRest(0.6));
    const walled = fly(
      ship,
      { ...WALLED, bump },
      makePilot(ship, WALLED, 100, 5),
      atRest(0.6),
    );
    expect(walled.worst).toBeLessThan(bare.worst);
  });

  it('keeps the tail off a badly navigated ship', () => {
    // The bumpers bound how far *anybody* gets, so what a low rating costs
    // moves off the ruler and onto the clock. Both halves of that are checked.
    const spread = (shape: Shape): number[] =>
      Array.from({ length: 20 }, (_, i) =>
        fly(ship, shape, makePilot(ship, shape, 20, i * 7919 + 13), atRest(0.6)).worst,
      );
    expect(Math.max(...spread(WALLED))).toBeLessThan(Math.max(...spread(SHAPE)));
  });
});

describe('recovery is firm, not violent', () => {
  const ship = shipWith(1.2);
  const WALLED: Shape = {
    ...SHAPE,
    bumpers: { from: BUMPER_FROM, ramp: BUMPER_RAMP, push: BUMPER_PUSH },
  };

  // The regression that must not come back. A shove used to send the ship back
  // across the centre and out the far side by nine units, then back again, and
  // the tuning pass that caused it scored "ticks until back within one unit" —
  // which rewards a fast first crossing and says nothing about what follows.
  it('does not swing past the centre line and out the other side', () => {
    for (const at of [180, bendStart(SHAPE) - 40, bendStart(SHAPE) + 43]) {
      const shape: Shape = { ...WALLED, bump: { at, push: 0.45 } };
      const run = fly(ship, shape, makePilot(ship, shape, 100, 5), atRest(0.6));
      const after = run.path.filter((s) => s.along >= at);
      // The shove pushes right, so the ship must not end up far to the left.
      const past = Math.max(0, ...after.map((s) => -s.offset));
      expect(past).toBeLessThan(PATH_HALF_WIDTH / 2);
    }
  });

  it('spends almost none of a recovery pinned fully sideways', () => {
    const at = bendStart(SHAPE) + 43;
    const shape: Shape = { ...WALLED, bump: { at, push: 0.45 } };
    const run = fly(ship, shape, makePilot(ship, shape, 100, 5), atRest(0.6));
    const after = run.path.filter((s) => s.along >= at).slice(0, 260);
    const pinned = after.filter((s) => Math.abs(s.yaw) > MOST_YAW - 0.01).length;
    expect(pinned).toBeLessThan(15);
  });
});
