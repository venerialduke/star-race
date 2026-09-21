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
import { PATH_HALF_WIDTH } from '../src/sim/tuning';
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

/**
 * What one lap at one aim is worth, on both counts.
 *
 * **Two numbers, not one, and the order matters.** Scoring a lap on time alone
 * makes the answer a function of whatever being thrown wide currently costs —
 * so the "best" plan is an artifact of the penalty rather than a fact about
 * driving, and re-pricing the penalty silently moves the target the ship is
 * supposed to be aiming at. Driving well is *first* staying on the line, and
 * *then* carrying as much speed as that allows. `off` is the primary and
 * `ticks` breaks the tie.
 */
interface Lap {
  /** Ticks spent off the golden path — beyond PATH_HALF_WIDTH of centre. */
  readonly off: number;
  /** The whole lap. */
  readonly ticks: number;
  /** Mean |offset| over the lap, which sees wandering the corridor too. */
  readonly wander: number;
}

function lapAt(
  track: Track,
  thrust: number,
  handling: number,
  aim: number,
  seeds: readonly number[],
): Lap {
  let off = 0;
  let ticks = 0;
  let wander = 0;
  for (const seed of seeds) {
    const stats = bareShip(thrust, handling);
    let state = startRace(stats, [], 0);
    const config: RaceConfig = { track, stats, aim, seed };
    let done = false;
    let seen = 0;
    for (let i = 0; i < 60000; i += 1) {
      state = stepRace(state, config);
      const wide = Math.abs(state.offset);
      wander += wide;
      seen += 1;
      if (wide > PATH_HALF_WIDTH) off += 1;
      if (state.distance >= track.length) {
        ticks += state.tick;
        done = true;
        break;
      }
    }
    if (!done || seen === 0) {
      return { off: Number.POSITIVE_INFINITY, ticks: Number.POSITIVE_INFINITY, wander: Number.POSITIVE_INFINITY };
    }
  }
  const n = seeds.length;
  return { off: off / n, ticks: ticks / n, wander: wander / (n * (ticks / n)) };
}

/**
 * The aim a good driver would take: the quickest one that keeps the ship on the
 * golden path, give or take a tick of slack for the fact that the swing is a
 * draw and an unlucky one can put anybody out.
 */
function drivenWell(rows: readonly { aim: number; lap: Lap }[]): { aim: number; lap: Lap } {
  const cleanest = Math.min(...rows.map((r) => r.lap.off));
  const onLine = rows.filter((r) => r.lap.off <= cleanest + OFF_PATH_SLACK);
  return onLine.reduce((a, b) => (b.lap.ticks < a.lap.ticks ? b : a));
}

/** How many ticks off the line count as "still on the line", per lap. */
const OFF_PATH_SLACK = 2;

const AIMS: number[] = [];
for (let a = 0.95; a <= 3.2001; a += 0.05) AIMS.push(Number(a.toFixed(2)));

const SHIPS: readonly (readonly [string, number, number])[] = [
  ['grippy', 1.0, 1.5],
  ['balanced', 1.3, 1.2],
  ['fast', 1.6, 0.9],
];
const RADII = has('quick') ? [30, 55, 90] : [30, 55, 90];
const STRAIGHTS = has('quick') ? [240] : [80, 240];
const SWEEPS = has('quick') ? [90] : [90, 60];

const seedCount = Number(flag('seeds') ?? 5);
const SEEDS = Array.from({ length: seedCount }, (_, i) => 1 + i * 8191);

if (!has('brief')) console.log(
  `What a good driver does, found by flying it. ${SEEDS.length} seeds a point.\n\n` +
    `  ON LINE  the quickest aim that keeps the ship on the golden path — driving well\n` +
    `  FASTEST  the quickest aim full stop, whatever it costs in being thrown wide\n`,
);
if (!has('brief')) {
  console.log(
    'shape                ship       ON LINE          FASTEST          gap   cost of the gap',
  );
  console.log('─'.repeat(88));
}
const gaps: number[] = [];

const spans: number[] = [];
let agree = 0;
let cases = 0;

for (const sweep of SWEEPS) {
  for (const radius of RADII) {
    for (const straight of STRAIGHTS) {
      const track = shapeLoop(radius, straight, sweep);
      if (track === undefined) continue;
      for (const [name, thrust, handling] of SHIPS) {
        const rows = AIMS.map((aim) => ({ aim, lap: lapAt(track, thrust, handling, aim, SEEDS) }));
        const onLine = drivenWell(rows);
        const fastest = rows.reduce((a, b) => (b.lap.ticks < a.lap.ticks ? b : a));
        const cost = ((onLine.lap.ticks - fastest.lap.ticks) / fastest.lap.ticks) * 100;
        spans.push(onLine.aim);
        cases += 1;
        if (Math.abs(onLine.aim - fastest.aim) < 0.075) agree += 1;
        gaps.push(cost);
        if (!has('brief')) console.log(
          `r${radius} S${straight} ${sweep}°`.padEnd(21),
          name.padEnd(10),
          `${onLine.aim.toFixed(2)} (${onLine.lap.off.toFixed(0)} off)`.padEnd(16),
          `${fastest.aim.toFixed(2)} (${fastest.lap.off.toFixed(0)} off)`.padEnd(16),
          (fastest.aim - onLine.aim).toFixed(2).padStart(5),
          `${cost >= 0 ? '+' : ''}${cost.toFixed(1)}%`.padStart(17),
        );
        if (has('curve')) {
          const at = (aim: number) =>
            rows.reduce((a, b) => (Math.abs(b.aim - aim) < Math.abs(a.aim - aim) ? b : a));
          console.log(
            '      ' +
              [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.4, 3.2]
                .map((m) => `${m.toFixed(1)}:${at(m).lap.off.toFixed(0)}off/${at(m).lap.ticks.toFixed(0)}t`)
                .join('  '),
          );
        }
      }
    }
  }
}

const lo = Math.min(...spans);
const hi = Math.max(...spans);
const meanGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
const worstGap = Math.max(...gaps);

if (has('brief')) {
  console.log(
    `agree ${String(agree).padStart(2)}/${cases}` +
      `   span ${lo.toFixed(2)}-${hi.toFixed(2)}` +
      `   mean gap ${meanGap.toFixed(1)}%` +
      `   worst gap ${worstGap.toFixed(1)}%`,
  );
} else {
  console.log('─'.repeat(88));
  console.log(
    `The on-line aim spans ${lo.toFixed(2)}-${hi.toFixed(2)} across ${cases} cases, and it is also\n` +
      `the fastest aim in ${agree} of them. Mean cost of the gap ${meanGap.toFixed(1)}%, worst ${worstGap.toFixed(1)}%.\n\n` +
      `Where the two agree, staying on the line *is* the quick way round and the swing\n` +
      `is priced right. Where FASTEST is higher, the game is paying a ship to be thrown\n` +
      `wide - and the size of that gap is what a re-pricing has to close. The ON LINE\n` +
      `column is the one a navigation system should steer toward, because it is a fact\n` +
      `about driving rather than about what being wide currently costs.`,
  );
}
