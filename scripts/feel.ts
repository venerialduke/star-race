/**
 * The lab, headless.
 *
 * `lab.html` is for judging by eye; this is for the numbers behind what the
 * eye sees. Two questions, both of which the old swing model answered wrongly:
 *
 *   1. Does handling change how wide a ship runs, at the same speed?
 *   2. Is anticipating a corner worth anything, or only reacting to it?
 */

import {
  atRest,
  fly,
  ghostInput,
  holdingSpeed,
  makePilot,
  steerToHold,
  type Flight,
  type Ship,
} from '../src/lab/flight';
import {
  BUMPER_FROM,
  BUMPER_PUSH,
  BUMPER_RAMP,
  GRIP_PER_HANDLING,
  PATH_HALF_WIDTH,
} from '../src/lab/knobs';
import { bendStart, curvatureAt, type Shape } from '../src/lab/shape';

// The shape the lab itself opens with, bumpers and all, so these numbers are
// the numbers you feel rather than a different course that happens to be near.
const SHAPE: Shape = {
  entry: 320,
  radius: 55,
  sweep: Math.PI / 2,
  exit: 320,
  hand: 1,
  halfWidth: PATH_HALF_WIDTH,
  bumpers: { from: PATH_HALF_WIDTH * BUMPER_FROM, ramp: BUMPER_RAMP, push: BUMPER_PUSH },
};

const HANDLINGS = [0.7, 1.0, 1.3, 1.6, 2.0];
const ENTRIES = [0.7, 0.8, 0.9, 1.0, 1.1];
const RADII = [26, 45, 70, 110];

const clamp = (v: number, low: number, high: number): number =>
  v < low ? low : v > high ? high : v;

function shipWith(handling: number): Ship {
  return { topSpeed: 1.3, accel: 0.005, brake: 0.0075, grip: GRIP_PER_HANDLING * handling };
}

/** A driver who steers exactly what the bend asks, and cannot ask for more than full lock. */
function bestEffort(ship: Ship, shape: Shape) {
  return (state: Flight) => ({
    throttle: 0,
    steer: clamp(steerToHold(ship, shape, state), -1, 1),
  });
}

function widthTable(): void {
  console.log('\nHOW WIDE A SHIP RUNS, held at one speed through one bend (r55, 90°).');
  console.log('The driver steers exactly what the bend asks. Only handling changes.');
  console.log('The golden path is ' + PATH_HALF_WIDTH + ' either side.\n');
  console.log(
    '  handling  holds at  ' + ENTRIES.map((e) => `${(e * 60).toFixed(0)}/s`.padStart(8)).join(''),
  );
  console.log('  ' + '─'.repeat(20 + ENTRIES.length * 8));
  for (const handling of HANDLINGS) {
    const ship = shipWith(handling);
    const cells = ENTRIES.map((entry) => {
      const from: Flight = { ...atRest(entry), along: bendStart(SHAPE) - 40 };
      const worst = fly(ship, SHAPE, bestEffort(ship, SHAPE), from).worst;
      const mark = worst <= PATH_HALF_WIDTH ? ' ' : worst > PATH_HALF_WIDTH * 4 ? '!' : '·';
      return `${worst.toFixed(0)}${mark}`.padStart(8);
    });
    console.log(
      `  ${handling.toFixed(1).padStart(8)}  ${(holdingSpeed(ship, 55) * 60).toFixed(0).padStart(5)}/s  ` +
        cells.join(''),
    );
  }
  console.log('\n  (· is off the path, ! is more than four path-widths off it.)');
}

function ghostTable(): void {
  console.log('\n\nWHAT ANTICIPATION IS WORTH — the same driver, the same ship, the same');
  console.log('speed. One reads the road a steering-lag ahead; one reads it underfoot.');
  console.log('Worst distance off the line, in units. The path is ' + PATH_HALF_WIDTH + ' either side.\n');
  console.log('  bend   ' + HANDLINGS.map((h) => `h${h.toFixed(1)}`.padStart(13)).join(''));
  console.log('  ' + '─'.repeat(7 + HANDLINGS.length * 13));
  for (const radius of RADII) {
    const shape = { ...SHAPE, radius };
    const cells = HANDLINGS.map((handling) => {
      const ship = shipWith(handling);
      const ahead = fly(ship, shape, (s) => ghostInput(ship, shape, s), atRest(0.6));
      const under = fly(
        ship,
        shape,
        (s) => {
          const want = ghostInput(ship, shape, s);
          const curve = curvatureAt(shape, s.along);
          return {
            throttle: want.throttle,
            steer: clamp((curve * s.speed * s.speed) / ship.grip, -1, 1),
          };
        },
        atRest(0.6),
      );
      return `${ahead.worst.toFixed(1)} vs ${under.worst.toFixed(1)}`.padStart(13);
    });
    console.log(`  r${String(radius).padEnd(6)}${cells.join('')}`);
  }
  console.log('\n  Left of each pair anticipates; right of it reacts. Nothing else differs —');
  console.log('  not the ship, not the speed, not the line it is aiming at.');
}

function navTable(): void {
  const seeds = 60;
  const ship = shipWith(1.2);
  console.log('\n\nWHAT A NAVIGATION RATING BUYS. The same ship round the same bend');
  console.log('(r55, 90°), driven by its own navigation from 0 to 100, ' + seeds + ' runs each.');
  console.log('100 is the reference line and has no randomness in it at all.\n');
  console.log('  nav |  worst off: median   90th  |  ticks  |  left the path');
  console.log('  ' + '─'.repeat(62));
  for (const nav of [0, 10, 25, 40, 55, 70, 85, 95, 100]) {
    const worsts: number[] = [];
    const times: number[] = [];
    for (let seed = 0; seed < seeds; seed += 1) {
      const run = fly(ship, SHAPE, makePilot(ship, SHAPE, nav, seed * 7919 + 13), atRest(0.6));
      worsts.push(run.worst);
      times.push(run.ticks);
    }
    worsts.sort((a, b) => a - b);
    times.sort((a, b) => a - b);
    const off = worsts.filter((w) => w > SHAPE.halfWidth).length;
    console.log(
      `  ${String(nav).padStart(3)} |        ${worsts[seeds >> 1]!.toFixed(1).padStart(6)} ` +
        `${worsts[Math.floor(seeds * 0.9)]!.toFixed(1).padStart(6)}  |  ` +
        `${String(times[seeds >> 1]!).padStart(5)}  |  ${((100 * off) / seeds).toFixed(0).padStart(3)}%`,
    );
  }
  console.log('\n  The 90th column is the point: a low rating is not reliably mediocre,');
  console.log('  it is a range. Being badly navigated is mostly about the bad days.');
}

function shoveTable(): void {
  const ship = shipWith(1.2);
  console.log('\n\nBEING THROWN OFF, AND GETTING BACK. A shove of 0.3 sideways at four');
  console.log('places on the course, for a ship with each navigation rating.\n');
  console.log('  shove at          |  ' + [0, 40, 70, 100].map((n) => `nav ${String(n).padStart(3)}`).join('      '));
  console.log('  ' + '─'.repeat(68));
  const spots: [string, number][] = [
    ['the straight', 180],
    ['before turn-in', bendStart(SHAPE) - 40],
    ['mid-bend', bendStart(SHAPE) + 43],
    ['late in the bend', bendStart(SHAPE) + 75],
  ];
  for (const [name, at] of spots) {
    const shape: Shape = { ...SHAPE, bump: { at, push: 0.3 } };
    const cells = [0, 40, 70, 100].map((nav) => {
      let worst = 0;
      let back = 0;
      const seeds = nav === 100 ? 1 : 12;
      for (let seed = 0; seed < seeds; seed += 1) {
        const run = fly(ship, shape, makePilot(ship, shape, nav, seed * 7919 + 13), atRest(0.6));
        let hit = -1;
        let left = false;
        let mine = 0;
        let got = -1;
        for (const state of run.path) {
          if (hit < 0 && state.along >= at) hit = state.tick;
          if (hit < 0) continue;
          mine = Math.max(mine, Math.abs(state.offset));
          if (Math.abs(state.offset) > 3) left = true;
          if (left && got < 0 && Math.abs(state.offset) < 1) got = state.tick - hit;
        }
        worst += mine / seeds;
        back += (got < 0 ? run.ticks - hit : got) / seeds;
      }
      return `${worst.toFixed(1)}/${back.toFixed(0)}t`.padStart(11);
    });
    console.log(`  ${name.padEnd(17)} |${cells.join('')}`);
  }
  console.log('\n  Worst units off the line after the shove, then ticks to get back within');
  console.log('  one of it. Nothing in the lab punishes an excursion — it is slow because');
  console.log('  getting back spends the grip the corner was using.');
}

widthTable();
ghostTable();
navTable();
shoveTable();
console.log('');
