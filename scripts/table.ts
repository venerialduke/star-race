// The optimum table: what entry speed each shape actually wants, flown.
//
// `npm run optimal` answers "is the swing priced right" — it compares the
// quickest way round against the quickest that stays on the golden path. This
// answers the other question, the one a navigation system exists to solve:
// **given this bend, this approach and this ship, how fast should it go in?**
//
// It sweeps the entry speed over a grid of shapes and ships and prints the
// best, as a multiple of the bend's holding speed, with what being wrong by
// 0.3 either way costs. A cell that costs nothing is a cell where the ship
// cannot reach the bend's limit in the first place, and the aim is moot.
//
// Nothing here is in `src/`: it is a measuring instrument. The game does not
// read this table — `safeAim` computes the line in closed form and the table is
// how that closed form is checked against what flying actually rewards.
//
//   npm run table                 the standard grid
//   npm run table -- --seeds 9    more seeds a point

import { safeAim, startRace, stepRace, type RaceConfig } from '../src/sim/race';
import { bareShip } from '../src/sim/ship';
import { OPEN_ROAD, B, S, assemblePlan, sector, type Piece, type Track } from '../src/sim/track';
import type { Section } from '../src/sim/section';

const flag = (name: string): string | undefined => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
};

function shapeLoop(radius: number, straight: number, sweep: number): Track | undefined {
  const n = Math.round(360 / sweep);
  if (n < 2 || Math.abs(n * sweep - 360) > 1e-9) return undefined;
  const ring: Section[] = Array.from({ length: n }, (_, i) =>
    sector(`s${i}`, `S${i}`, [S(straight), B(radius, -sweep)] as Piece[]),
  );
  try {
    return assemblePlan({ name: 'shape', shape: 'measured', par: 1, ring });
  } catch {
    return undefined;
  }
}

const seedCount = Number(flag('seeds') ?? 5);
const SEEDS = Array.from({ length: seedCount }, (_, i) => 1 + i * 8191);

function lapAt(track: Track, thrust: number, handling: number, aim: number): number {
  let total = 0;
  for (const seed of SEEDS) {
    const stats = bareShip(thrust, handling);
    let state = startRace(stats, [], 0);
    const config: RaceConfig = { track, stats, aim, seed };
    let ticks = Number.NaN;
    for (let i = 0; i < 60000; i += 1) {
      state = stepRace(state, config);
      if (state.distance >= track.length) {
        ticks = state.tick;
        break;
      }
    }
    if (!Number.isFinite(ticks)) return Number.POSITIVE_INFINITY;
    total += ticks;
  }
  return total / SEEDS.length;
}

const AIMS: number[] = [];
for (let a = 0.9; a <= 2.6001; a += 0.05) AIMS.push(Number(a.toFixed(2)));

const SHIPS: readonly (readonly [string, number, number])[] = [
  ['grippy 1.0/1.5', 1.0, 1.5],
  ['balanced 1.3/1.2', 1.3, 1.2],
  ['fast 1.6/0.9', 1.6, 0.9],
  ['reckless 1.9/0.7', 1.9, 0.7],
];

console.log(
  `Entry speed that goes round quickest, as a multiple of the bend's holding speed.\n` +
    `${SEEDS.length} seeds a point. (+N%) is the cost of being 0.3 out, the cheaper side.\n` +
    `A cell at +0% is one where the ship cannot reach the bend's limit, so the aim is moot.\n`,
);
console.log(
  'bend       approach   ' + SHIPS.map(([n]) => n.padEnd(18)).join('') + 'line',
);
console.log('─'.repeat(64 + SHIPS.length * 18));

const real: number[] = [];
for (const sweep of [60, 90, 120]) {
  for (const radius of [26, 45, 70, 110]) {
    for (const straight of [60, 200, 400]) {
      const track = shapeLoop(radius, straight, sweep);
      if (track === undefined) continue;
      const cells = SHIPS.map(([, thrust, handling]) => {
        const rows = AIMS.map((aim) => ({ aim, lap: lapAt(track, thrust, handling, aim) }));
        const best = rows.reduce((a, b) => (b.lap < a.lap ? b : a));
        const at = (x: number): number =>
          rows.reduce((a, b) => (Math.abs(b.aim - x) < Math.abs(a.aim - x) ? b : a)).lap;
        const cost = Math.min(
          ((at(best.aim - 0.3) - best.lap) / best.lap) * 100,
          ((at(best.aim + 0.3) - best.lap) / best.lap) * 100,
        );
        if (cost > 1) real.push(best.aim);
        return `${best.aim.toFixed(2)} (+${cost.toFixed(0)}%)`.padEnd(18);
      });
      console.log(
        `r${radius} ${sweep}°`.padEnd(11),
        String(straight).padEnd(10),
        ...cells,
        safeAim(OPEN_ROAD, radius).toFixed(2),
      );
    }
  }
}

console.log('─'.repeat(64 + SHIPS.length * 18));
console.log(
  `Where the aim actually matters, the optimum spans ${Math.min(...real).toFixed(2)} to ` +
    `${Math.max(...real).toFixed(2)}.\n\n` +
    `The last column is what the game itself drives: \`safeAim\`, the closed-form\n` +
    `fastest entry that still keeps a ship on the golden path. It is a lower bound on\n` +
    `the table rather than a match for it, and deliberately so — the table is the\n` +
    `fastest line, and the fastest line accepts leaving the path sometimes. A ship\n` +
    `aiming at the table's number is quicker and less reliable; one aiming at the\n` +
    `line is quicker than a ship that does not know where either of them is.`,
);
