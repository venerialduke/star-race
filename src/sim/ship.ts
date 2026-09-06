// The ship: five stats, six parts, and the function that turns a build into
// the numbers the race actually uses.
//
// A part is a set of additive deltas on the base stats. Resolving a build sums
// every delta onto the base and clamps each stat to its floor, so a build made
// entirely of downsides still produces a ship that can race. Resolution happens
// once, before the race starts — the race reads DerivedStats and never a part.
//
// Values live in tuning.ts; this file only says which constant belongs to which
// part.

import {
  ABLATIVE_PLATING_HULL,
  ABLATIVE_PLATING_SPEED,
  BASE_ACCELERATION,
  BASE_HEAT_TOLERANCE,
  BASE_HULL,
  BASE_SHIELD_CAPACITY,
  BASE_SPEED,
  INERTIAL_ANCHOR_ACCELERATION,
  INERTIAL_ANCHOR_SPEED,
  ION_THRUSTER_HULL,
  ION_THRUSTER_SPEED,
  MIN_ACCELERATION,
  MIN_HEAT_TOLERANCE,
  MIN_HULL,
  MIN_SHIELD_CAPACITY,
  MIN_SPEED,
  MIRROR_SHIELDING_SHIELD_CAPACITY,
  MIRROR_SHIELDING_SPEED,
  OVERCLOCKED_REACTOR_ACCELERATION,
  OVERCLOCKED_REACTOR_HEAT_TOLERANCE,
  OVERCLOCKED_REACTOR_SPEED,
  RADIATOR_FINS_HEAT_TOLERANCE,
  RADIATOR_FINS_HULL,
} from './tuning';

export interface ShipStats {
  /** Track-ticks covered per tick. Base is 1.0. */
  readonly speed: number;
  /** How much speed closes on its target each tick. */
  readonly acceleration: number;
  /** Damage absorbed while shields are up. */
  readonly shieldCapacity: number;
  /** Heat the ship can hold before it cooks. */
  readonly heatTolerance: number;
  /** Damage the ship survives. */
  readonly hull: number;
}

export type StatName = keyof ShipStats;

/** What a part does: additive deltas on any subset of the five stats. */
export type StatDelta = Readonly<Partial<Record<StatName, number>>>;

export type PartId =
  | 'ionThruster'
  | 'ablativePlating'
  | 'mirrorShielding'
  | 'radiatorFins'
  | 'inertialAnchor'
  | 'overclockedReactor';

export interface Part {
  readonly id: PartId;
  /** Shown in the garage. */
  readonly name: string;
  /** One line in the garage saying what it is for. */
  readonly blurb: string;
  readonly effect: StatDelta;
}

/** A build is the parts bolted on, in the order they were chosen. */
export type Build = readonly Part[];

/** Resolved stats for a build. Same shape as ShipStats, computed once. */
export type DerivedStats = ShipStats;

/** A bare hull, no parts. */
export const BASE_STATS: ShipStats = {
  speed: BASE_SPEED,
  acceleration: BASE_ACCELERATION,
  shieldCapacity: BASE_SHIELD_CAPACITY,
  heatTolerance: BASE_HEAT_TOLERANCE,
  hull: BASE_HULL,
};

const STAT_FLOORS: ShipStats = {
  speed: MIN_SPEED,
  acceleration: MIN_ACCELERATION,
  shieldCapacity: MIN_SHIELD_CAPACITY,
  heatTolerance: MIN_HEAT_TOLERANCE,
  hull: MIN_HULL,
};

// The six slice parts. Each one is a single upside paid for with a single
// cost; DESIGN.md says which hazard each answers.
export const PARTS: Readonly<Record<PartId, Part>> = {
  ionThruster: {
    id: 'ionThruster',
    name: 'Ion Thruster',
    blurb: 'Faster everywhere. The light frame it needs costs hull.',
    effect: { speed: ION_THRUSTER_SPEED, hull: ION_THRUSTER_HULL },
  },
  ablativePlating: {
    id: 'ablativePlating',
    name: 'Ablative Plating',
    blurb: 'Hull to spare for asteroid fields. Heavy, so slower.',
    effect: { hull: ABLATIVE_PLATING_HULL, speed: ABLATIVE_PLATING_SPEED },
  },
  mirrorShielding: {
    id: 'mirrorShielding',
    name: 'Mirror Shielding',
    blurb: 'Deeper shields for gamma bursts. Costs a little speed.',
    effect: {
      shieldCapacity: MIRROR_SHIELDING_SHIELD_CAPACITY,
      speed: MIRROR_SHIELDING_SPEED,
    },
  },
  radiatorFins: {
    id: 'radiatorFins',
    name: 'Radiator Fins',
    blurb: 'Run hotter for longer on a gravity assist. Fragile.',
    effect: { heatTolerance: RADIATOR_FINS_HEAT_TOLERANCE, hull: RADIATOR_FINS_HULL },
  },
  inertialAnchor: {
    id: 'inertialAnchor',
    name: 'Inertial Anchor',
    blurb: 'Claws speed back after a black hole drags you down. Lowers top speed.',
    effect: {
      acceleration: INERTIAL_ANCHOR_ACCELERATION,
      speed: INERTIAL_ANCHOR_SPEED,
    },
  },
  overclockedReactor: {
    id: 'overclockedReactor',
    name: 'Overclocked Reactor',
    blurb: 'Speed and acceleration at once. It runs hot, and that is the risk.',
    effect: {
      speed: OVERCLOCKED_REACTOR_SPEED,
      acceleration: OVERCLOCKED_REACTOR_ACCELERATION,
      heatTolerance: OVERCLOCKED_REACTOR_HEAT_TOLERANCE,
    },
  },
};

/** Every part, in garage order. */
export const ALL_PARTS: readonly Part[] = Object.values(PARTS);

/** Look up a part by id, failing loudly on a typo. */
export function partById(id: PartId): Part {
  const part = PARTS[id];
  if (part === undefined) throw new Error(`No such part: ${id}.`);
  return part;
}

const STAT_NAMES: readonly StatName[] = [
  'speed',
  'acceleration',
  'shieldCapacity',
  'heatTolerance',
  'hull',
];

/**
 * Sum a build's parts onto the base stats and clamp each stat to its floor.
 * Parts stack: the same part twice applies its deltas twice. An empty build
 * resolves to exactly the base stats.
 */
export function resolveBuild(build: Build): DerivedStats {
  const totals: Record<StatName, number> = { ...BASE_STATS };

  build.forEach((part) => {
    STAT_NAMES.forEach((stat) => {
      const delta = part.effect[stat];
      if (delta !== undefined) totals[stat] += delta;
    });
  });

  return {
    speed: Math.max(totals.speed, STAT_FLOORS.speed),
    acceleration: Math.max(totals.acceleration, STAT_FLOORS.acceleration),
    shieldCapacity: Math.max(totals.shieldCapacity, STAT_FLOORS.shieldCapacity),
    heatTolerance: Math.max(totals.heatTolerance, STAT_FLOORS.heatTolerance),
    hull: Math.max(totals.hull, STAT_FLOORS.hull),
  };
}
