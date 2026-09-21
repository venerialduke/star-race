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
  steerToHold,
  type Flight,
  type Ship,
} from '../src/lab/flight';
import { GRIP_PER_HANDLING, PATH_HALF_WIDTH } from '../src/lab/knobs';
import { bendStart, curvatureAt, type Shape } from '../src/lab/shape';

const SHAPE: Shape = {
  entry: 320,
  radius: 55,
  sweep: Math.PI / 2,
  exit: 320,
  hand: 1,
  halfWidth: PATH_HALF_WIDTH,
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

widthTable();
ghostTable();
console.log('');
