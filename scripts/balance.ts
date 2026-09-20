// The season-level balance harness.
//
// Everything in this game has been measured on the clock over a single heat:
// how many ticks a part gains you, against a rival built the same way. That is
// the wrong unit and it has been the wrong unit since S5. **A season pays by
// place and the cut is on points.** A part that wins races while losing time is
// a good part and a heat-clock measurement calls it bad; a part that gains ten
// ticks and never changes a finishing order is a bad part and the same
// measurement calls it good.
//
// So this runs whole seasons. A **policy** is a way of spending credits — the
// thing the player actually decides — and what comes back is how often each one
// survives the cuts and wins the season, against rivals shopping as they always
// have. Nothing here is in `src/`: it is a measuring instrument, it imports the
// simulation and never changes it.
//
//   npm run balance                  every policy, 24 seasons each
//   npm run balance -- --seasons 60  more of them
//   npm run balance -- --only armed,engines

import {
  buy,
  buyProgress,
  buyResearch,
  fit,
  researchNeeded,
  researched,
  slotsFree,
  upgrade,
  type Garage,
} from '../src/sim/garage';
import { PROGRESS_PRICE } from '../src/sim/tuning';
import {
  applyCut,
  botShopper,
  entrantFor,
  heatConfig,
  newSeason,
  nextUp,
  playerIsOut,
  racerById,
  resolveHeat,
  settleHeat,
  settlePacing,
  table,
  type Season,
  type Shopper,
} from '../src/sim/season';
import type { Track } from '../src/sim/track';
import { PHASES } from '../src/sim/tuning';

/**
 * How a player spends. A policy is a **build they are shopping toward** — a
 * short list of parts and the level they want each at — because that is what a
 * player actually holds in their head. It buys toward that list, deepens it, and
 * when the build is finished it stops and banks, since credits held earn
 * interest and spending to zero is not automatically right.
 *
 * Deliberately *not* how the first version of this worked. That one bought the
 * first affordable thing on a list every heat, and since slots grow by one per
 * finish, every policy ended the season with eleven balanced engines bolted on
 * and the differences between them washed out. That is a real dynamic and it is
 * measured below as `engine-spam` — but it is the thing being tested, not the
 * way to test it.
 */
interface Want {
  readonly id: string;
  /** The level to take it to. */
  readonly level: number;
}

interface Policy {
  readonly name: string;
  readonly note: string;
  readonly want: readonly Want[];
  /** Fill every spare slot with this, the way a player with credits to burn would. */
  readonly filler?: string;
}

/** Shop one step toward the build this policy wants, then hold. */
function shopToward(garage: Garage, policy: Policy): Garage {
  let next = garage;

  for (const want of policy.want) {
    // Owned? Deepen it toward the level wanted. Not owned? Buy and fit it.
    const at = next.fitted.findIndex((item) => item.componentId === want.id);
    if (at < 0) {
      const before = next;
      next = buy(next, want.id);
      if (next !== before) next = fit(next, next.shelf.length - 1);
      continue;
    }
    // Deepening is copies now, not credits: a level is bought by breaking
    // spares of the same component down, two for the second and four for the
    // third. A policy that kept paying at the counter would simply never reach
    // level 2, so this is not a harness embellishment — it is the only route.
    for (let step = 0; step < 3; step += 1) {
      const item = next.fitted[at];
      if (item === undefined || item.level >= want.level) break;
      const need = researchNeeded(item.level);
      if (need === undefined) break;
      let bought = next;
      for (let n = 0; n < need; n += 1) {
        if (researched(bought, want.id, item.level)) break;
        const before = bought;
        bought = buyResearch(bought, want.id);
        if (bought === before) break;
      }
      const up = upgrade(bought, at);
      // Could not afford the copies: keep the research banked and stop here.
      if (up === bought) {
        next = bought;
        break;
      }
      next = up;
    }
  }

  if (policy.filler !== undefined) {
    for (let n = 0; n < 4 && slotsFree(next) > 0; n += 1) {
      const before = next;
      next = buy(next, policy.filler);
      if (next === before) break;
      const fitted = fit(next, next.shelf.length - 1);
      // The ship carries one engine, so a filler engine now simply will not go
      // on. Buying more of them would be burning credits into a shelf nobody
      // can use, which is a measurement of nothing.
      if (fitted === next) {
        next = before;
        break;
      }
      next = fitted;
    }
  }

  // Credits with nowhere to go buy room instead. Not a policy's idea — every
  // policy does it — because it is the move the shop now offers when a build is
  // out of slots, and a harness where nobody takes it measures a world where
  // credits pile up unspent. That is the third time this file has had to learn
  // that a policy which has stopped spending is not a policy spending
  // differently: engine-spam ended a season on 473 credits it could not use.
  for (let n = 0; n < 6 && slotsFree(next) <= 0 && next.credits >= PROGRESS_PRICE; n += 1) {
    const before = next;
    next = buyProgress(next);
    if (next === before) break;
  }
  return next;
}

/**
 * Every policy is a **whole ship**, not a core and a pile of unspent credits.
 * The first version gave each one three parts; they finished shopping by the
 * third heat and banked three hundred credits while the degenerate build kept
 * buying, so the measurement was reading "stopped shopping" and calling it
 * "spent differently". A policy's list now runs longer than the season can pay
 * for, so credits are the constraint for all of them and what differs is the
 * order they are spent in — which is the decision the game is actually asking
 * about.
 */
const POLICIES: readonly Policy[] = [
  {
    name: 'engines',
    note: 'depth: maxed engines, one at a time',
    want: [
      { id: 'balanced-engine', level: 3 },
      { id: 'speed-engine', level: 3 },
      { id: 'crew-engineers', level: 3 },
      { id: 'general-shields', level: 3 },
    ],
  },
  {
    name: 'engine-spam',
    note: 'the degenerate one: a cheap engine in every slot the season hands you',
    want: [{ id: 'balanced-engine', level: 3 }],
    filler: 'balanced-engine',
  },
  {
    name: 'speed',
    note: 'thrust at the cost of grip',
    want: [
      { id: 'speed-engine', level: 3 },
      { id: 'crew-engineers', level: 3 },
      { id: 'balanced-engine', level: 3 },
      { id: 'general-shields', level: 3 },
    ],
  },
  {
    name: 'handling',
    note: 'grip, and the bend chain that comes at level 3',
    want: [
      { id: 'handling-engine', level: 3 },
      { id: 'balanced-engine', level: 3 },
      { id: 'crew-engineers', level: 3 },
      { id: 'general-shields', level: 3 },
    ],
  },
  {
    name: 'armed',
    note: 'an engine, a missile rack and the crew that works it',
    want: [
      { id: 'balanced-engine', level: 3 },
      { id: 'missile-rack', level: 3 },
      { id: 'crew-mercenaries', level: 3 },
      { id: 'general-shields', level: 3 },
      { id: 'speed-engine', level: 3 },
    ],
  },
  {
    name: 'mines',
    note: 'an engine and mines, laid before the heat',
    want: [
      { id: 'balanced-engine', level: 3 },
      { id: 'gravity-mine', level: 3 },
      { id: 'crew-mercenaries', level: 3 },
      { id: 'general-shields', level: 3 },
      { id: 'speed-engine', level: 3 },
    ],
  },
  {
    name: 'tractor',
    note: 'the part with no answer to "why this instead of the other two"',
    want: [
      { id: 'balanced-engine', level: 3 },
      { id: 'tractor-beam', level: 3 },
      { id: 'crew-mercenaries', level: 3 },
      { id: 'general-shields', level: 3 },
      { id: 'speed-engine', level: 3 },
    ],
  },
  {
    name: 'collector',
    note: 'salvage: a collector shield, and rivals to be shot at by',
    want: [
      { id: 'balanced-engine', level: 3 },
      { id: 'collector-shield', level: 3 },
      { id: 'crew-engineers', level: 3 },
      { id: 'speed-engine', level: 3 },
      { id: 'general-shields', level: 3 },
    ],
  },
  {
    name: 'nav',
    note: 'the route: a navigation system and the crew that reads it',
    want: [
      { id: 'balanced-engine', level: 3 },
      { id: 'nav-system', level: 3 },
      { id: 'crew-androids', level: 3 },
      { id: 'speed-engine', level: 3 },
      { id: 'general-shields', level: 3 },
    ],
  },
  {
    name: 'shields',
    note: 'survive everything: deep shields and a crew that rebuilds',
    want: [
      { id: 'balanced-engine', level: 3 },
      { id: 'general-shields', level: 3 },
      { id: 'crew-nanites', level: 3 },
      { id: 'speed-engine', level: 3 },
    ],
  },
  {
    name: 'dark',
    note: 'black holes: the engine that reads them and a collector to gather',
    want: [
      { id: 'dark-matter-engine', level: 3 },
      { id: 'collector-shield', level: 3 },
      { id: 'crew-engineers', level: 3 },
      { id: 'balanced-engine', level: 3 },
    ],
  },
  {
    name: 'bot',
    note: 'the control: a rival, shopping as rivals do',
    want: [],
  },
];

/** What one season did to one policy. */
interface Run {
  readonly won: boolean;
  readonly cutsSurvived: number;
  readonly points: number;
  readonly place: number;
  readonly credits: number;
  readonly build: string;
}

const shopperFor =
  (policy: Policy): Shopper =>
  (racer, track, s) =>
    policy.name === 'bot' ? botShopper(racer, track, s) : shopToward(racer.garage, policy);

/**
 * One season. The player follows `policy`; every rival follows one of
 * `against`, dealt round the roster. When `against` is empty the rivals are
 * bots, which is the old measurement and a weaker one — a coherent build beats
 * a bot at almost anything, so a field of bots says only that the player
 * shopped on purpose.
 */
function playSeason(
  policy: Policy,
  seed: number,
  against: readonly Policy[] = [],
): Run {
  let season: Season = newSeason(seed);
  let cutsSurvived = 0;

  // Deal the rivals their policies, offset by the seed so the same policy is
  // not always in the same seat.
  const dealt = new Map<string, Policy>();
  season.racers.forEach((racer, i) => {
    if (racer.isPlayer || against.length === 0) return;
    dealt.set(racer.id, against[(i + seed) % against.length] as Policy);
  });
  const shop: Shopper = (racer, track, s) => {
    const theirs = dealt.get(racer.id);
    return theirs === undefined
      ? botShopper(racer, track, s)
      : shopperFor(theirs)(racer, track, s);
  };

  const shopPlayer = (track: Track): void => {
    const me = racerById(season, 'player');
    if (me === undefined) return;
    const after =
      policy.name === 'bot'
        ? botShopper(me, track, seed)
        : shopToward(me.garage, policy);
    season = {
      ...season,
      racers: season.racers.map((r) => (r.isPlayer ? { ...r, garage: after } : r)),
    };
  };

  for (let guard = 0; guard < 128; guard += 1) {
    const up = nextUp(season);
    if (up.kind === 'over') break;
    if (up.kind === 'cut') {
      season = applyCut(season);
      if (!playerIsOut(season)) cutsSurvived += 1;
      continue;
    }
    if (up.kind === 'pacing') {
      shopPlayer(up.track);
      // Six per cent over par: a competent lap, not a heroic one.
      season = settlePacing(season, Math.round(up.track.par * 1.06), up.track.par);
      continue;
    }
    shopPlayer(up.track);
    const config = heatConfig(up.track, season.seed + season.phase * 7 + season.heat);
    const results = up.groups.map((group) =>
      resolveHeat(
        group.map((id) => entrantFor(racerById(season, id) as never)),
        config,
      ),
    );
    season = settleHeat(season, results, shop);
  }

  const ranked = table(season);
  const me = racerById(season, 'player');
  return {
    won: me?.out !== true && ranked[0]?.id === 'player',
    cutsSurvived,
    points: me?.points ?? 0,
    place: ranked.findIndex((r) => r.id === 'player') + 1,
    credits: me?.garage.credits ?? 0,
    build: (me?.garage.fitted ?? [])
      .map((item) => `${item.componentId.replace(/-.*/, '')}${item.level}`)
      .join('+'),
  };
}

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : undefined;
};
const seasons = Number(flag('seasons') ?? 24);
const only = flag('only')?.split(',');
const chosen = only === undefined ? POLICIES : POLICIES.filter((p) => only.includes(p.name));
/**
 * By default every policy races the others. Pass `--vs bots` for the weaker
 * measurement, where the rivals are the bots they have always been.
 */
const versus = flag('vs') ?? 'policies';
const rivals =
  versus === 'bots' ? [] : POLICIES.filter((p) => p.name !== 'bot' && p.name !== 'engine-spam');

console.log(
  `${seasons} seasons a policy · ${PHASES} phases · ` +
    `rivals: ${rivals.length === 0 ? 'bots' : `the other ${rivals.length} policies`}\n`,
);
console.log('policy      won   survived both   mean pts   mean place   credits left');
console.log('─'.repeat(74));

const rows = chosen.map((policy) => {
  const runs = Array.from({ length: seasons }, (_, i) =>
    playSeason(policy, i * 101 + 13, rivals),
  );
  const mean = (f: (r: Run) => number): number =>
    runs.reduce((sum, r) => sum + f(r), 0) / runs.length;
  return {
    policy,
    wins: runs.filter((r) => r.won).length,
    survived: runs.filter((r) => r.cutsSurvived >= PHASES - 1).length,
    points: mean((r) => r.points),
    place: mean((r) => r.place),
    credits: mean((r) => r.credits),
    build: runs[runs.length - 1]?.build ?? '',
  };
});

for (const row of rows.sort((a, b) => b.wins - a.wins)) {
  console.log(
    `${row.policy.name.padEnd(11)} ${String(row.wins).padStart(2)}/${seasons}` +
      `      ${String(row.survived).padStart(2)}/${seasons}` +
      `       ${row.points.toFixed(0).padStart(4)}` +
      `        ${row.place.toFixed(2).padStart(5)}` +
      `          ${row.credits.toFixed(0).padStart(4)}`,
  );
}
console.log('\nwhat each policy buys, and what it ended the last season as:');
for (const row of rows) {
  console.log(`  ${row.policy.name.padEnd(11)} ${row.policy.note}`);
  console.log(`  ${''.padEnd(11)} → ${row.build || '(nothing fitted)'}`);
}
