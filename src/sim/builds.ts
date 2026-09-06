// The three builds the balance harness and its tests race against each other.
//
// They exist so that a tuning change can be judged against the same three ships
// every time: one that buys speed, one that buys survival, and the bare hull in
// between. They are not the only sensible builds, they are the yardstick.

import { PARTS, type Build } from './ship';

export interface StandardBuild {
  readonly name: string;
  /** One line on what this ship is trying to do. */
  readonly blurb: string;
  readonly build: Build;
}

export const STANDARD_BUILDS: readonly StandardBuild[] = [
  {
    name: 'Bare hull',
    blurb: 'No parts at all. The yardstick everything else is measured against.',
    build: [],
  },
  {
    name: 'Speed',
    blurb: 'Ion Thruster and Overclocked Reactor: fast, fragile, and runs hot.',
    build: [PARTS.ionThruster, PARTS.overclockedReactor],
  },
  {
    name: 'Survival',
    blurb: 'Ablative Plating and Radiator Fins: slow, tough, and cool.',
    build: [PARTS.ablativePlating, PARTS.radiatorFins],
  },
];
