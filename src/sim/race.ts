// The race: a pure, deterministic tick loop.
//
// Everything the player decides enters as an input made before the tick that
// consumes it — which is the seam a networked opponent will arrive through.
// Nothing here reads the clock, the DOM, or anything but its arguments.

import { makeRng, type Rng } from './rng';
import {
  holdingSpeed,
  nextBend,
  sampleAt,
  sectorAt,
  type Bend,
  type Track,
} from './track';
import {
  ACCEL_PER_THRUST,
  BRAKE_PER_TICK,
  CARRY_SCRUB,
  CHARGE_EXCESS_BONUS,
  LIFT_MARGIN,
  PATH_HALF_WIDTH,
  RECOVER_PER_HANDLING,
  SPEED_PER_THRUST,
  STAT_MAX,
  STAT_MIN,
  SWING_EXPONENT,
  SWING_RISE,
  SWING_SPREAD,
  WIDE_SPEED_PENALTY,
} from './tuning';

/** What the ship does about the gap between its speed and a bend's holding speed. */
export type CornerPlan = 'lift' | 'carry' | 'charge';

export interface ShipStats {
  /** Top speed and how hard it accelerates. */
  readonly thrust: number;
  /** The holding speed of every bend, and how fast a wide ship recovers. */
  readonly handling: number;
}

/** One bend, as it happened. What the player is really watching. */
export interface SwingEvent {
  readonly tick: number;
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

export interface RaceState {
  readonly tick: number;
  readonly distance: number;
  readonly speed: number;
  /** Lateral offset from the centreline: positive is left of travel. */
  readonly offset: number;
  readonly wide: boolean;
  readonly lap: number;
  readonly sector: number;
  readonly lapStartTick: number;
  readonly sectorStartTick: number;
  readonly lastLapTicks: number | undefined;
  readonly lastSectorTicks: number | undefined;
  readonly swings: readonly SwingEvent[];
  /** The bend currently being taken, if any. */
  readonly inBend: Bend | undefined;
  /** Where the current swing is pulling the ship. */
  readonly swingTarget: number;
}

export interface RaceConfig {
  readonly track: Track;
  readonly stats: ShipStats;
  readonly plan: CornerPlan;
  readonly seed: number;
}

const clampStat = (value: number): number =>
  Math.min(STAT_MAX, Math.max(STAT_MIN, value));

export function startRace(): RaceState {
  return {
    tick: 0,
    distance: 0,
    speed: 0,
    offset: 0,
    wide: false,
    lap: 0,
    sector: 0,
    lapStartTick: 0,
    sectorStartTick: 0,
    lastLapTicks: undefined,
    lastSectorTicks: undefined,
    swings: [],
    inBend: undefined,
    swingTarget: 0,
  };
}

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
  const thrust = clampStat(config.stats.thrust);
  const handling = clampStat(config.stats.handling);

  const topSpeed = SPEED_PER_THRUST * thrust;
  const accel = ACCEL_PER_THRUST * thrust;

  const here = sampleAt(track, state.distance);
  const onBend = here.radius > 0;
  const holding = onBend ? holdingSpeed(here.radius, handling) : Infinity;

  // 1. Speed. The corner plan decides what happens about a bend.
  let speed = state.speed;
  if (onBend) {
    if (plan === 'lift') speed = Math.min(speed, holding * LIFT_MARGIN);
    else if (plan === 'charge') speed = Math.min(topSpeed, speed + accel);
    else if (speed > holding) speed = Math.max(holding, speed - CARRY_SCRUB);
  } else {
    const ahead = nextBend(track, state.distance);
    let braking = false;
    if (plan === 'lift' && ahead !== undefined) {
      const target = holdingSpeed(ahead.bend.radius, handling) * LIFT_MARGIN;
      braking = ahead.gap <= brakingDistance(speed, target);
      if (braking) speed = Math.max(target, speed - BRAKE_PER_TICK);
    }
    if (!braking) speed = Math.min(topSpeed, speed + accel);
  }

  // 2. Entering a bend: one seeded draw decides how wide this one throws us.
  let inBend = state.inBend;
  let swingTarget = state.swingTarget;
  const swings = [...state.swings];
  const entering =
    onBend &&
    (inBend === undefined || inBend.start !== bendStartAt(track, state.distance));
  if (entering) {
    const bend = bendAt(track, state.distance);
    if (bend !== undefined) {
      inBend = bend;
      const bendHolding = holdingSpeed(bend.radius, handling);
      const rawExcess = Math.max(0, speed - bendHolding) / bendHolding;
      const excess =
        plan === 'lift' ? 0 : rawExcess + (plan === 'charge' ? CHARGE_EXCESS_BONUS : 0);
      const spread = SWING_SPREAD * Math.pow(excess, SWING_EXPONENT);
      const draw = drawFor(config.seed, bend.start, state.lap).unitInterval();
      const swing = spread * draw;
      // The swing throws the ship outward: away from the way the bend turns.
      swingTarget = -bend.turn * swing;
      swings.push({
        tick: state.tick,
        bendStart: bend.start,
        radius: bend.radius,
        entrySpeed: speed,
        holding: bendHolding,
        excess,
        swing,
        wentWide: swing > PATH_HALF_WIDTH,
      });
    }
  }
  if (!onBend) {
    inBend = undefined;
    swingTarget = 0;
  }

  // 3. Offset. It opens up through the bend and is hauled back afterwards.
  let offset = state.offset;
  if (onBend) {
    offset += (swingTarget - offset) * SWING_RISE;
  } else {
    const pull = RECOVER_PER_HANDLING * handling;
    offset = Math.abs(offset) <= pull ? 0 : offset - Math.sign(offset) * pull;
  }
  const wide = Math.abs(offset) > PATH_HALF_WIDTH;

  // 4. Move. Being off the golden path costs time, not damage.
  const effective = wide ? speed * WIDE_SPEED_PENALTY : speed;
  const distance = state.distance + effective;

  // 5. Checkpoints and laps.
  const tick = state.tick + 1;
  const lap = Math.floor(distance / track.length);
  const crossedLap = lap > state.lap;
  const sector = sectorAt(track, distance);
  const crossedSector = sector !== state.sector;

  return {
    tick,
    distance,
    speed,
    offset,
    wide,
    lap,
    sector,
    lapStartTick: crossedLap ? tick : state.lapStartTick,
    sectorStartTick: crossedSector ? tick : state.sectorStartTick,
    lastLapTicks: crossedLap ? tick - state.lapStartTick : state.lastLapTicks,
    lastSectorTicks: crossedSector ? tick - state.sectorStartTick : state.lastSectorTicks,
    swings,
    inBend,
    swingTarget,
  };
}

/** A stream of its own per bend per lap, so one bend's draw never shifts another's. */
function drawFor(seed: number, bendStart: number, lap: number): Rng {
  return makeRng(seed).fork(Math.round(bendStart) * 977 + lap * 31);
}

function bendAt(track: Track, distance: number): Bend | undefined {
  const wrapped = ((distance % track.length) + track.length) % track.length;
  return track.bends.find((b) => wrapped >= b.start && wrapped < b.end);
}

function bendStartAt(track: Track, distance: number): number | undefined {
  return bendAt(track, distance)?.start;
}

/** Run a whole race headless — for tests, and for the balance work to come. */
export function simulate(config: RaceConfig, ticks: number): RaceState {
  let state = startRace();
  for (let i = 0; i < ticks; i += 1) state = stepRace(state, config);
  return state;
}
