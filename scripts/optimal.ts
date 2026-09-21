// What the best way round a bend actually is, found by flying it.
//
// The game used to ask the player to choose a **corner plan** — Lift, Carry or
// Charge — which is a decision nobody has the information to make. What speed
// to take a bend at is not a matter of taste: given the ship and the shape,
// there is an answer, and it can be computed.
//
// This finds it. A **shape** is a bend with a straight in front of it, closed
// into a loop of identical copies so a lap of the loop is that shape flown over
// and over. For a grid of shapes and ships it sweeps the **aim** — the speed to
// enter the bend at, as a multiple of the bend's holding speed — and reports
// which one is quickest, and what being wrong costs.
//
// Nothing here is in `src/`: it is a measuring instrument, it imports the
// simulation and never changes it.
//
//   npm run optimal                    the standard grid
//   npm run optimal -- --curve         print the whole cost curve per case
//   npm run optimal -- --seeds 11      more seeds a point (the swing is drawn)

import { startRace, stepRace, type RaceConfig } from '../src/sim/race';
import { bareShip } from '../src/sim/ship';
import {
  B,
  S,
  assemblePlan,
  sector,
  type Piece,
  type Track,
} from '../src/sim/track';
import type { Section } from '../src/sim/section';

const flag = (name: string): string | undefined => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
};
const has = (name: string): boolean => process.argv.includes(`--${name}`);

/**
 * A shape, closed into a loop: N copies of [straight, bend], each sweeping
 * 360/N, so the ring closes exactly and every bend on it is the shape.
 *
 * A loop rather than a single corner because the simulation races laps, and
 * because a bend's worth includes what it costs on the way out — a ship thrown
 * wide is still recovering when the next straight starts.
 */
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

/** Ticks for one lap at an aim, averaged over seeds. The swing is a draw. */
function lapAt(
  track: Track,
  thrust: number,
  handling: number,
  aim: number,
  seeds: readonly number[],
): number {
  let total = 0;
  for (const seed of seeds) {
    const stats = bareShip(thrust, handling);
    let state = startRace(stats, [], 0);
    const config: RaceConfig = { track, stats, plan: 'carry', aim, seed };
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
  return total / seeds.length;
}

const AIMS: number[] = [];
for (let a = 0.95; a <= 3.2001; a += 0.05) AIMS.push(Number(a.toFixed(2)));

const SHIPS: readonly (readonly [string, number, number])[] = [
  ['grippy', 1.0, 1.5],
  ['balanced', 1.3, 1.2],
  ['fast', 1.6, 0.9],
];
const RADII = [30, 55, 90];
const STRAIGHTS = [80, 240];
const SWEEPS = [90, 60];

const seedCount = Number(flag('seeds') ?? 5);
const SEEDS = Array.from({ length: seedCount }, (_, i) => 1 + i * 8191);

console.log(
  `Optimal entry speed, as a multiple of the bend's holding speed.\n` +
    `${SEEDS.length} seeds a point · 1.00 = brake to the limit · 3.20 = never lift off\n`,
);
console.log(
  'shape                ship       best   lap    too slow (1.00)   too fast (3.20)',
);
console.log('─'.repeat(82));

const bests: number[] = [];
let twoSided = 0;
let cases = 0;

for (const sweep of SWEEPS) {
  for (const radius of RADII) {
    for (const straight of STRAIGHTS) {
      const track = shapeLoop(radius, straight, sweep);
      if (track === undefined) continue;
      for (const [name, thrust, handling] of SHIPS) {
        const rows = AIMS.map((aim) => ({ aim, lap: lapAt(track, thrust, handling, aim, SEEDS) }));
        const best = rows.reduce((a, b) => (b.lap < a.lap ? b : a));
        const at = (aim: number): number =>
          rows.reduce((a, b) => (Math.abs(b.aim - aim) < Math.abs(a.aim - aim) ? b : a)).lap;
        const under = ((at(1.0) - best.lap) / best.lap) * 100;
        const over = ((at(3.2) - best.lap) / best.lap) * 100;
        bests.push(best.aim);
        cases += 1;
        if (over > 6) twoSided += 1;
        console.log(
          `r${radius} S${straight} ${sweep}°`.padEnd(21),
          name.padEnd(10),
          best.aim.toFixed(2).padStart(5),
          best.lap.toFixed(0).padStart(6),
          `+${under.toFixed(0)}%`.padStart(16),
          `+${over.toFixed(0)}%`.padStart(17),
        );
        if (has('curve')) {
          const marks = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.4, 3.2];
          console.log(
            '      ' +
              marks
                .map((m) => `${m.toFixed(1)}:+${(((at(m) - best.lap) / best.lap) * 100).toFixed(0)}%`)
                .join('  '),
          );
        }
      }
    }
  }
}

const lo = Math.min(...bests);
const hi = Math.max(...bests);
console.log('─'.repeat(82));
console.log(
  `The optimum spans ${lo.toFixed(2)}–${hi.toFixed(2)}, and being too fast costs more than\n` +
    `6% in ${twoSided} of ${cases} cases.\n\n` +
    `Both numbers matter, and they pull against each other. A wide span means the\n` +
    `best plan really does depend on the ship and the shape, which is what makes a\n` +
    `computed plan worth computing. A high two-sided count means being wrong in the\n` +
    `fast direction costs something, which is what makes a navigation system that\n` +
    `gets closer to the answer worth a slot. A tuning that buys one by giving up the\n` +
    `other has not solved this.`,
);
