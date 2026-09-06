// The two ships the player races.
//
// Rivals do not visit the garage. They bolt on one part per stage on a fixed
// schedule, so they grow at the same rate the player does and a run stays a
// contest to the last stage. Fixed, not random, because a rival is meant to have
// a character the player learns: Redline is the time to beat and sometimes does
// not finish; Bulwark is slow and always there at the end.

import type { ShipId } from './field';
import { PARTS, resolveBuild, type Build, type Part } from './ship';

export interface Rival {
  readonly id: ShipId;
  readonly name: string;
  /** One part per stage, in order. */
  readonly schedule: readonly Part[];
}

export const RIVALS: readonly Rival[] = [
  {
    id: 'redline',
    name: 'Redline',
    schedule: [PARTS.ionThruster, PARTS.overclockedReactor, PARTS.ionThruster],
  },
  {
    id: 'bulwark',
    name: 'Bulwark',
    schedule: [PARTS.ablativePlating, PARTS.radiatorFins, PARTS.ablativePlating],
  },
];

/** What a rival is flying by the time it starts this stage, counting from 0. */
export function rivalBuild(rival: Rival, stage: number): Build {
  return rival.schedule.slice(0, Math.min(stage + 1, rival.schedule.length));
}

/** The hull a rival starts the run with: whatever its first part leaves it. */
export function rivalStartingHull(rival: Rival): number {
  return resolveBuild(rivalBuild(rival, 0)).hull;
}
