// The race: a pure, deterministic tick loop.
//
// Everything the player decides enters as an input made before the tick that
// consumes it — which is the seam a networked opponent will arrive through.
// Nothing here reads the clock, the DOM, or anything but its arguments.

import { makeRng, type Rng } from './rng';
import {
  bareShip,
  fullCondition,
  resolveBuild,
  type Condition,
  type Fitted,
} from './ship';
import {
  alongOf,
  bendOn,
  holdingSpeed,
  nextBendOn,
  rateOf,
  routeOf,
  sampleOn,
  sectorAt,
  sectorOf,
  type Route,
  type Sector,
  type Track,
} from './track';
import {
  ACCEL_PER_THRUST,
  BASE_HANDLING,
  BASE_THRUST,
  BRAKE_PER_TICK,
  CONDITION_PER_DAMAGE,
  DAMAGE_PER_EXTRA_PART,
  CARRY_SCRUB,
  CHARGE_EXCESS_BONUS,
  LIFT_MARGIN,
  PATH_HALF_WIDTH,
  GRAVITY_CHARGE_MULTIPLIER,
  GRAVITY_PER_ACCEL,
  GRAVITY_PER_CORNER,
  GRAVITY_RECOVERY,
  HAZARD_DAMAGE,
  HAZARD_FULL_EXPOSURE,
  EXCURSION_CLEAR,
  FORK_PULL,
  RECOVER_FLOOR,
  REPAIR_PER_TICK,
  RECOVER_PER_HANDLING,
  SHIELD_REGEN,
  SPEED_PER_THRUST,
  STAT_MAX,
  STAT_MIN,
  SWING_EXPONENT,
  SWING_RISE,
  SWING_SPREAD,
  WIDE_SPEED_AT_EDGE,
  WIDE_SPEED_FLOOR,
  WIDE_SPEED_PER_UNIT,
  WORN_HANDLING_LOSS,
} from './tuning';

/** What the ship does about the gap between its speed and a bend's holding speed. */
export type CornerPlan = 'lift' | 'carry' | 'charge';

export interface ShipStats {
  /** Top speed and how hard it accelerates. */
  readonly thrust: number;
  /** The holding speed of every bend, and how fast a wide ship recovers. */
  readonly handling: number;
  /** Damage the shields soak before anything on the ship is hit. */
  readonly shields: number;
  /** How long the crew lasts under gravity. */
  readonly endurance: number;
  /** Shield regeneration on the path, as a multiple of the base rate. */
  readonly shieldRegen: number;
  /** How fast the crew patches damaged parts back up, mid-race. */
  readonly repair: number;
  /** Which grades of split the ship can plan, and whether it can re-plan at a pit stop. */
  readonly nav: number;
}

/** One bend, as it happened. What the player is really watching. */
export interface SwingEvent {
  readonly tick: number;
  /** Which sector and which way through it, so the mark lands on the line flown. */
  readonly sector: number;
  readonly route: number;
  /** Where the bend starts, measured along the route it is on. */
  readonly bendStart: number;
  readonly radius: number;
  readonly entrySpeed: number;
  readonly holding: number;
  /** How much faster than the bend allowed, as a fraction of holding speed. */
  readonly excess: number;
  /** The lateral offset drawn, in track units. */
  readonly swing: number;
  readonly wentWide: boolean;
}

/** One position the ship held, kept so the renderer can draw a wake. */
export interface TrailPoint {
  readonly distance: number;
  readonly offset: number;
  /** Which way through the sector, so the wake is drawn on the line flown. */
  readonly route: number;
}

export interface RaceState {
  readonly tick: number;
  readonly distance: number;
  readonly speed: number;
  /** Lateral offset from the centreline: positive is left of travel. */
  readonly offset: number;
  readonly wide: boolean;
  readonly lap: number;
  readonly sector: number;
  /** Which way through the current sector the ship is taking. */
  readonly route: number;
  readonly lapStartTick: number;
  readonly sectorStartTick: number;
  readonly lastLapTicks: number | undefined;
  readonly lastSectorTicks: number | undefined;
  readonly swings: readonly SwingEvent[];
  /** What is left of the shields. */
  readonly shields: number;
  /** How intact each fitted part is. Damage lands here and nowhere else. */
  readonly condition: Condition;
  /** The ship's stats as they are right now, with damage counted. */
  readonly stats: ShipStats;
  /** What the last hit broke, for the readout. */
  readonly lastBroken: string | undefined;
  /** Gravity the crew is carrying, 0 to 1. At 1 they are spent. */
  readonly worn: number;
  /**
   * An excursion is in progress: the ship crossed the edge and has not yet
   * settled back well inside it. Without this the ship pays for the same
   * excursion over and over, because the offset hovers across the line.
   */
  readonly outside: boolean;
  /**
   * The bend currently being taken, named so that the same bend on two routes
   * is not mistaken for one. Undefined on a straight.
   */
  readonly bendKey: string | undefined;
  /** Where the current swing is pulling the ship. */
  readonly swingTarget: number;
  /** Recent positions, oldest first. Bounded, so a long race stays cheap. */
  readonly trail: readonly TrailPoint[];
}

export interface RaceConfig {
  readonly track: Track;
  /** The undamaged ship. What it is worth right now lives in the state. */
  readonly stats: ShipStats;
  /** What it is built from, so damage knows what there is to break. */
  readonly build?: readonly Fitted[];
  readonly plan: CornerPlan;
  /**
   * The way through each sector, decided before the lap that flies it — one
   * index per sector. A ship can still be thrown onto a different line at the
   * fork, but never choose one there.
   */
  readonly routes?: readonly number[];
  readonly seed: number;
}

const clampStat = (value: number): number =>
  Math.min(STAT_MAX, Math.max(STAT_MIN, value));

/**
 * A ship at the line. The starting route matters: a route is chosen on crossing
 * into a sector, and a ship never crosses into the one it starts in — so
 * without this the plan for sector 0 was quietly ignored on the first lap.
 */
export function startRace(
  stats?: ShipStats,
  build: readonly Fitted[] = [],
  route = 0,
): RaceState {
  return {
    tick: 0,
    distance: 0,
    speed: 0,
    offset: 0,
    wide: false,
    lap: 0,
    sector: 0,
    route,
    lapStartTick: 0,
    sectorStartTick: 0,
    lastLapTicks: undefined,
    lastSectorTicks: undefined,
    swings: [],
    shields: stats?.shields ?? 0,
    condition: fullCondition(build),
    stats: stats ?? bareShip(BASE_THRUST, BASE_HANDLING),
    lastBroken: undefined,
    worn: 0,
    outside: false,
    bendKey: undefined,
    swingTarget: 0,
    trail: [],
  };
}

/** How many positions the wake remembers. Structural: the size of a buffer. */
const TRAIL_LENGTH = 60;

/** How far it takes to slow from `from` to `to`. */
function brakingDistance(from: number, to: number): number {
  if (from <= to) return 0;
  return (from * from - to * to) / (2 * BRAKE_PER_TICK);
}

/**
 * One tick. Pure: the same state, config and tick number always produce the
 * same next state, because every draw comes from a stream keyed by the seed
 * and the bend it belongs to.
 */
export function stepRace(state: RaceState, config: RaceConfig): RaceState {
  const { track, plan } = config;
  // What the ship is worth this tick: its build, less whatever is broken. A
  // damaged engine gives less thrust, a damaged crew repairs more slowly, and
  // a shot shield soaks less — so one bad excursion is felt for the rest of
  // the race.
  // A ship with no build to break flies on its stats alone: there is nothing
  // fitted for a hazard to take a piece out of.
  const stats =
    config.build === undefined
      ? config.stats
      : resolveBuild(config.build, state.condition);

  const thrust = clampStat(stats.thrust);
  // A worn crew flies worse: the ship is being held by whatever is left of
  // them, and by the nav system, which the framework says drifts wide.
  const handling = clampStat(stats.handling) * (1 - state.worn * WORN_HANDLING_LOSS);

  const topSpeed = SPEED_PER_THRUST * thrust;
  const accel = ACCEL_PER_THRUST * thrust;

  // Where the ship is: which sector, which way through it, and how far along
  // that line. Canonical distance stays on the main line so laps and standings
  // never care which way anyone went; the route decides the geometry.
  const sector = sectorOf(track, state.distance);
  const route = routeOf(sector, state.route);
  const along = alongOf(track, sector, route, state.distance);

  const here = sampleOn(route, along);
  const onBend = here.radius > 0;
  const holding = onBend ? holdingSpeed(here.radius, handling) : Infinity;

  // 1. Speed. The corner plan decides what happens about a bend.
  let speed = state.speed;
  if (onBend) {
    if (plan === 'lift') speed = Math.min(speed, holding * LIFT_MARGIN);
    else if (plan === 'charge') speed = Math.min(topSpeed, speed + accel);
    else if (speed > holding) speed = Math.max(holding, speed - CARRY_SCRUB);
  } else {
    const ahead = lookAhead(track, sector, route, along, config.routes);
    let braking = false;
    if (plan === 'lift' && ahead !== undefined) {
      const target = holdingSpeed(ahead.bend.radius, handling) * LIFT_MARGIN;
      braking = ahead.gap <= brakingDistance(speed, target);
      if (braking) speed = Math.max(target, speed - BRAKE_PER_TICK);
    }
    if (!braking) speed = Math.min(topSpeed, speed + accel);
  }

  // 1b. Gravity: what the crew actually feels. A bend taken fast is lateral
  // load — speed squared over the radius, which is why a tight corner at pace
  // is the thing that empties a crew — and the engine adds its own when it is
  // pushing. Charging a bend does both at once.
  //
  // Measuring acceleration alone was the first attempt and it was backwards:
  // a Charge that holds top speed never "accelerates", so it read as the
  // gentlest plan in the game.
  const cornering = onBend ? (speed * speed) / here.radius : 0;
  const pushing =
    Math.max(0, speed - state.speed) + (onBend && plan === 'charge' ? accel : 0);
  const load =
    (cornering * GRAVITY_PER_CORNER + pushing * GRAVITY_PER_ACCEL) *
    (onBend && plan === 'charge' ? GRAVITY_CHARGE_MULTIPLIER : 1);
  const endurance = Math.max(0.05, stats.endurance);
  // Coasting is what recovers a crew, so the two never cancel each other out.
  const worn = Math.min(
    1,
    Math.max(
      0,
      load > 0 ? state.worn + load / (endurance * 100) : state.worn - GRAVITY_RECOVERY,
    ),
  );

  // 2. Entering a bend: one seeded draw decides how wide this one throws us.
  const bend = onBend ? bendOn(route, along) : undefined;
  // The same bend on two routes is not the same bend, so the name carries both.
  const key =
    bend === undefined
      ? undefined
      : `${sector.index}:${state.route}:${Math.round(bend.start)}`;
  let bendKey = state.bendKey;
  let swingTarget = state.swingTarget;
  const swings = [...state.swings];
  if (bend !== undefined && key !== bendKey) {
    bendKey = key;
    const bendHolding = holdingSpeed(bend.radius, handling);
    const rawExcess = Math.max(0, speed - bendHolding) / bendHolding;
    const excess =
      plan === 'lift' ? 0 : rawExcess + (plan === 'charge' ? CHARGE_EXCESS_BONUS : 0);
    const spread = SWING_SPREAD * Math.pow(excess, SWING_EXPONENT);
    const draw = drawFor(config.seed, key as string, state.lap).unitInterval();
    const swing = spread * draw;
    // The swing throws the ship outward: away from the way the bend turns.
    swingTarget = -bend.turn * swing;
    swings.push({
      tick: state.tick,
      sector: sector.index,
      route: state.route,
      bendStart: bend.start,
      radius: bend.radius,
      entrySpeed: speed,
      holding: bendHolding,
      excess,
      swing,
      wentWide: swing > PATH_HALF_WIDTH,
    });
  }
  if (!onBend) {
    bendKey = undefined;
    swingTarget = 0;
  }

  // 3. Offset. It opens up through the bend and is hauled back afterwards.
  let offset = state.offset;
  if (onBend) {
    offset += (swingTarget - offset) * SWING_RISE;
  } else {
    const pull = Math.max(
      RECOVER_FLOOR,
      Math.abs(offset) * RECOVER_PER_HANDLING * handling,
    );
    offset = Math.abs(offset) <= pull ? 0 : offset - Math.sign(offset) * pull;
  }
  const over = Math.abs(offset) - PATH_HALF_WIDTH;
  const wide = over > 0;

  // 3b. The ground off the path holds things that hurt — and you hit them on
  // the way out, not by the second. Damage lands once per excursion, the tick
  // the ship crosses the edge, scaled by how hard it was thrown and how fast
  // it was going.
  //
  // Charging it per tick was the first version, and it punished a low-handling
  // build by the clock: a ship that spends most of a lap wide died every time,
  // which is a ban rather than a risk.
  const crossed = wide && !state.outside;
  const outside = wide || Math.abs(offset) > PATH_HALF_WIDTH * EXCURSION_CLEAR;
  const exposure = Math.min(1, Math.abs(state.swingTarget) / HAZARD_FULL_EXPOSURE);
  const hit = crossed ? HAZARD_DAMAGE * exposure * (speed / SPEED_PER_THRUST) : 0;
  const soaked = Math.min(state.shields, hit);
  const shields = crossed
    ? state.shields - soaked
    : Math.min(
        stats.shields,
        state.shields + (wide ? 0 : SHIELD_REGEN * stats.shieldRegen),
      );

  // What the shields did not stop breaks things. A bigger hit finds more to
  // break, and which parts it finds is a seeded draw — so the same excursion
  // always costs you the same, and two ships never share the damage.
  const through = hit - soaked;
  const repaired = repair(state.condition, stats.repair);
  const { condition, broken } =
    through > 0
      ? breakSomething(repaired, through, config.seed, state.tick, config.build)
      : { condition: repaired, broken: undefined };

  // 4. Move. Being off the golden path costs time, not damage — and the
  // further out the ship is thrown, the more of its speed it loses.
  const keep = wide
    ? Math.max(WIDE_SPEED_FLOOR, WIDE_SPEED_AT_EDGE - over * WIDE_SPEED_PER_UNIT)
    : 1;
  // A short line buys canonical distance faster than a long one: that, and
  // the bends it hands you, is the whole of what a split is worth.
  const distance = state.distance + speed * keep * rateOf(sector, route);

  // 5. Checkpoints, laps, and the fork.
  const tick = state.tick + 1;
  const lap = Math.floor(distance / track.length);
  const crossedLap = lap > state.lap;
  const nextSector = sectorAt(track, distance);
  const crossedSector = nextSector !== state.sector;
  // At a fork the ship takes the line it planned — unless it arrives thrown far
  // enough sideways that it is already pointing at another one.
  const nextRoute = crossedSector
    ? chooseRoute(track.sectors[nextSector] as Sector, config.routes, offset)
    : state.route;

  return {
    tick,
    distance,
    speed,
    offset,
    wide,
    lap,
    sector: nextSector,
    route: nextRoute,
    lapStartTick: crossedLap ? tick : state.lapStartTick,
    sectorStartTick: crossedSector ? tick : state.sectorStartTick,
    lastLapTicks: crossedLap ? tick - state.lapStartTick : state.lastLapTicks,
    lastSectorTicks: crossedSector ? tick - state.sectorStartTick : state.lastSectorTicks,
    swings,
    shields,
    condition,
    stats,
    lastBroken: broken ?? state.lastBroken,
    worn,
    outside,
    bendKey,
    swingTarget,
    trail: [...state.trail, { distance, offset, route: nextRoute }].slice(-TRAIL_LENGTH),
  };
}

/** Everything a crew can reach, patched a little further back toward whole. */
function repair(condition: Condition, rate: number): Condition {
  const step = REPAIR_PER_TICK * rate;
  if (step <= 0) return condition;
  return { parts: condition.parts.map((c) => Math.min(1, c + step)) };
}

/**
 * Spread a hit across the ship: one part for a glancing blow, more for a bad
 * one. A ship with nothing fitted has nothing to break — it is also far too
 * slow to be a build, so that costs nobody anything.
 */
function breakSomething(
  condition: Condition,
  damage: number,
  seed: number,
  tick: number,
  build: readonly Fitted[] | undefined,
): { condition: Condition; broken: string | undefined } {
  const parts = [...condition.parts];
  if (parts.length === 0) return { condition, broken: undefined };

  const targets = 1 + Math.floor(damage / DAMAGE_PER_EXTRA_PART);
  const each = (damage / targets) * CONDITION_PER_DAMAGE;
  const rng = makeRng(seed).fork(tick * 31 + 7);
  let broken: string | undefined;

  for (let i = 0; i < targets; i += 1) {
    const choice = Math.floor(rng.unitInterval() * parts.length);
    parts[choice] = Math.max(0, (parts[choice] ?? 1) - each);
    broken ??= build?.[choice]?.componentId;
  }
  return { condition: { parts }, broken };
}

/** A stream of its own per bend per lap, so one bend's draw never shifts another's. */
function drawFor(seed: number, key: string, lap: number): Rng {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  }
  return makeRng(seed).fork(((hash >>> 0) % 1000003) + lap * 31);
}

/**
 * The next bend a ship will meet, looking past the end of its own line into
 * the sector after it — which is the one it planned, since it has not reached
 * the fork yet and cannot know what it will be thrown into.
 */
function lookAhead(
  track: Track,
  sector: Sector,
  route: Route,
  along: number,
  routes: readonly number[] | undefined,
): { bend: { radius: number }; gap: number } | undefined {
  const here = nextBendOn(route, along);
  if (here !== undefined) return here;
  const after = track.sectors[(sector.index + 1) % track.sectors.length] as Sector;
  const line = routeOf(after, routes?.[after.index] ?? 0);
  const next = nextBendOn(line, 0);
  if (next === undefined) return undefined;
  return { bend: next.bend, gap: route.length - along + next.gap };
}

/**
 * Which way through a sector a ship actually goes. It planned one line; if it
 * arrives at the fork thrown far enough sideways to be pointing at another,
 * that is the one it takes. This is the swing costing a route rather than time.
 */
export function chooseRoute(
  sector: Sector,
  routes: readonly number[] | undefined,
  offset: number,
): number {
  const planned = routes?.[sector.index] ?? 0;
  // Arrive anywhere near the line and you make the fork you meant to make.
  if (Math.abs(offset) <= FORK_PULL) return planned;

  // Thrown further than that, the ship goes where it is pointing — but only if
  // another line is clearly nearer than the one it planned, or a ship would
  // lose its route to every stray wobble.
  let best = planned;
  let bestGap = Math.abs(routeOf(sector, planned).entryOffset - offset);
  sector.routes.forEach((line, i) => {
    const gap = Math.abs(line.entryOffset - offset);
    if (gap < bestGap - FORK_PULL) {
      best = i;
      bestGap = gap;
    }
  });
  return best;
}

/** Run a whole race headless — for tests, and for the balance work to come. */
export function simulate(config: RaceConfig, ticks: number): RaceState {
  let state = startRace(config.stats, config.build ?? []);
  for (let i = 0; i < ticks; i += 1) state = stepRace(state, config);
  return state;
}
