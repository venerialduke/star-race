// The two things the player actually does during a race.
//
// An active is a tap: it turns on for a fixed number of ticks and then cannot
// be used again until its cooldown has run. Everything about one is timing —
// the hazards are drawn on the course before the start, so raising shields into
// a gamma burst is a call the player makes, not a dice roll.
//
// This file is the definitions only. The race loop owns the state: when each
// active is next ready, how long the current one has left, and what it does to
// the ship while it is on.

import {
  POWER_REROUTE_COOLDOWN_TICKS,
  POWER_REROUTE_DURATION_TICKS,
  POWER_REROUTE_HEAT_PER_TICK,
  POWER_REROUTE_SPEED_MULTIPLIER,
  SHIELDS_COOLDOWN_TICKS,
  SHIELDS_DURATION_TICKS,
} from './tuning';

export type ActiveId = 'shields' | 'powerReroute';

export interface Active {
  readonly id: ActiveId;
  /** Shown on the button. */
  readonly name: string;
  /** One line saying when to use it. */
  readonly blurb: string;
  /** How many ticks it stays on for. */
  readonly durationTicks: number;
  /** Ticks from firing until it can be fired again. */
  readonly cooldownTicks: number;
}

export const ACTIVES: Readonly<Record<ActiveId, Active>> = {
  shields: {
    id: 'shields',
    name: 'Raise Shields',
    blurb: 'Soaks up damage while they hold. Time it into the burst.',
    durationTicks: SHIELDS_DURATION_TICKS,
    cooldownTicks: SHIELDS_COOLDOWN_TICKS,
  },
  powerReroute: {
    id: 'powerReroute',
    name: 'Reroute Power',
    blurb: 'A burst of speed, paid for in heat. Use it on clear track.',
    durationTicks: POWER_REROUTE_DURATION_TICKS,
    cooldownTicks: POWER_REROUTE_COOLDOWN_TICKS,
  },
};

/** Both actives, in HUD order. */
export const ALL_ACTIVES: readonly Active[] = Object.values(ACTIVES);

/** Look up an active by id, failing loudly on a typo. */
export function activeById(id: ActiveId): Active {
  const active = ACTIVES[id];
  if (active === undefined) throw new Error(`No such active: ${id}.`);
  return active;
}

/** What rerouted power does to the ship while it is on. */
export const POWER_REROUTE_EFFECT = {
  speedMultiplier: POWER_REROUTE_SPEED_MULTIPLIER,
  heatPerTick: POWER_REROUTE_HEAT_PER_TICK,
} as const;

/**
 * Can an active fire on this tick? An active is ready when it has never fired,
 * or when its cooldown has run out since it last did.
 */
export function isReady(readyAtTick: number | undefined, tick: number): boolean {
  return readyAtTick === undefined || tick >= readyAtTick;
}

/** The tick an active fired at `tick` becomes available again. */
export function readyAgainAt(active: Active, tick: number): number {
  return tick + active.cooldownTicks;
}
