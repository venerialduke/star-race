// The two ships the player races.
//
// Rivals do not visit the garage as a screen, but they shop in the same one: at
// every stage a rival is offered three parts from the same pool the player draws
// from, and takes the one nearest the top of its wish list. That matters for
// fairness. When rivals simply bolted on a hand-picked build, Redline had the
// best speed parts in the game every single run and the player had whatever
// three cards turned up — so the player could not out-race it, only outlive it,
// and choosing well in the garage barely changed a run.
//
// Their character lives in the wish list instead: Redline always reaches for
// speed, Bulwark always reaches for armour. They are still themselves, they just
// have to take what the galaxy offers, the same as the player.

import type { ShipId } from './field';
import { offerParts } from './garage';
import type { Rng } from './rng';
import { resolveBuild, type Build, type Part, type PartId } from './ship';

export interface Rival {
  readonly id: ShipId;
  readonly name: string;
  /** What it reaches for, best first. Anything unlisted is a last resort. */
  readonly wants: readonly PartId[];
}

export const RIVALS: readonly Rival[] = [
  {
    id: 'redline',
    name: 'Redline',
    wants: ['ionThruster', 'overclockedReactor', 'inertialAnchor', 'radiatorFins'],
  },
  {
    id: 'bulwark',
    name: 'Bulwark',
    wants: ['ablativePlating', 'radiatorFins', 'mirrorShielding', 'inertialAnchor'],
  },
];

/** The part this rival takes from an offer: the one nearest the top of its list. */
export function preferred(rival: Rival, offer: readonly Part[]): Part {
  const first = offer[0];
  if (first === undefined) throw new Error(`${rival.name} was offered nothing.`);
  let best = first;
  let bestRank = rival.wants.indexOf(best.id);
  offer.forEach((part) => {
    const rank = rival.wants.indexOf(part.id);
    const better =
      (rank !== -1 && bestRank === -1) ||
      (rank !== -1 && bestRank !== -1 && rank < bestRank);
    if (better) {
      best = part;
      bestRank = rank;
    }
  });
  return best;
}

/** One more part for a rival, drawn from its own offer. */
export function growRival(rival: Rival, build: Build, rng: Rng): Build {
  return [...build, preferred(rival, offerParts(rng))];
}

/** What a rival is flying at the start of the run, and the hull it brings. */
export function startingRival(
  rival: Rival,
  rng: Rng,
): { readonly build: Build; readonly hull: number } {
  const build = growRival(rival, [], rng);
  return { build, hull: resolveBuild(build).hull };
}
