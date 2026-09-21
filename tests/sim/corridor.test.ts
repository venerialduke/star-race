// The drivable corridor.
//
// A swing used to be able to throw a ship any distance at all: on the Cinder
// Coil a low-handling ship charging its hairpins wanted to go 128 units off
// the golden path, which is seven times the width of the path and nowhere that
// could reasonably be called a track. The corridor is the answer — something
// solid either side, near enough invisible until you meet it.

import { describe, expect, it } from 'vitest';
import { startRace, stepRace, type RaceState } from '../../src/sim/race';
import { seedFrom } from '../../src/sim/rng';
import { bareShip } from '../../src/sim/ship';
import { TRACKS, type Track } from '../../src/sim/track';
import { PATH_HALF_WIDTH, TRACK_HALF_WIDTH } from '../../src/sim/tuning';

const overALap = (
  track: Track,
  handling: number,
  seed: string,
  watch: (state: RaceState) => void,
  /**
   * Force the entry speed instead of letting the ship work it out.
   *
   * A ship drives its own line now, and the line is on the path by
   * construction — so a test about what happens when one is thrown miles wide
   * has to ask for a ship that is driving badly, which is what a high aim is.
   */
  aim?: number,
): void => {
  const config = { track, stats: bareShip(1, handling), seed: seedFrom(seed), aim };
  let state = startRace(config.stats, []);
  while (state.lap < 1 && state.tick < 30000) {
    state = stepRace(state, config);
    watch(state);
  }
};

const seeds = Array.from({ length: 12 }, (_, i) => `wall${i}`);

describe.each(TRACKS)('$name, inside the corridor', (track: Track) => {
  it('never puts a ship outside it, however badly the bend goes', () => {
    let widest = 0;
    for (const handling of [0.6, 1, 1.5]) {
      for (const seed of seeds) {
        overALap(track, handling, seed, (state: RaceState) => {
          widest = Math.max(widest, Math.abs(state.offset));
        });
      }
    }
    expect(widest).toBeLessThanOrEqual(TRACK_HALF_WIDTH + 1e-9);
  });

  it('leaves room to be thrown well off the path before it bites', () => {
    // The corridor is a limit, not a lane. A ship has to be able to go wide —
    // that is the whole bet — and only the extremes should ever find the wall.
    expect(TRACK_HALF_WIDTH).toBeGreaterThan(PATH_HALF_WIDTH * 2);
  });
});

describe('what the wall costs', () => {
  it('still lets the swing reach past it, so a huge one is not a safe one', () => {
    // The position is capped; the cost is not. `swingTarget` is where the bend
    // wanted to throw the ship, and damage is charged on that rather than on
    // where it got to — otherwise the wall would make the worst swing in the
    // game cheaper than a merely bad one.
    let reach = 0;
    for (const seed of seeds) {
      overALap(
        TRACKS[2] as Track,
        0.6,
        seed,
        (state) => {
          reach = Math.max(reach, Math.abs(state.swingTarget));
        },
        // Driving badly: never lifting off, which is what a ship with no
        // navigation at all is doing its best not to do.
        3.0,
      );
    }
    expect(reach).toBeGreaterThan(TRACK_HALF_WIDTH * 2);
  });

  it('takes speed off the ship, once for each time it hits', () => {
    // Per tick was the first version, and it was a death spiral: a ship pinned
    // through a long bend scrubbed every tick, hit the speed floor, and could
    // not finish the lap.
    // The Coil at low handling, never lifting off through its hairpins: the
    // worst case in the game, and the one that produced the 128-unit swing.
    const coil = TRACKS[2] as Track;
    let hits = 0;
    let finished = 0;
    let pinned = 0;
    let worstRun = 0;
    for (const seed of seeds) {
      let wasOn = false;
      let last = 0;
      let run = 0;
      overALap(
        coil,
        0.6,
        seed,
        (state) => {
          if (state.onWall && !wasOn) hits += 1;
          wasOn = state.onWall;
          // The floor the scrub cannot take a ship below. Sitting on it is the
          // spiral; passing through it on the way back up is a bad corner.
          run = state.speed <= 0.1 + 1e-9 ? run + 1 : 0;
          worstRun = Math.max(worstRun, run);
          pinned += state.speed <= 0.1 + 1e-9 ? 1 : 0;
          last = state.lap;
        },
        3.0,
      );
      finished += last;
    }
    expect(hits).toBeGreaterThan(0);
    // Every lap finishes. That is the claim: the per-tick version could not
    // manage it at all, because the scrub outran the engine.
    expect(finished).toBe(seeds.length);
    // The ship touches the floor coming out of a bad corner and climbs off it
    // again — under half a second at worst, not a spiral it cannot leave.
    expect(worstRun).toBeLessThan(60);
    expect(pinned).toBeLessThan(seeds.length * 60);
  });

  it('lets a ship get on with it inside a bend it is already slow enough for', () => {
    // Carry and Lift used to do nothing at all on a bend they were under the
    // limit for, which never showed while every route began on a straight —
    // and left a ship at a standstill forever the moment one did not.
    const track = TRACKS[0] as Track;
    for (const plan of [{ routes: [] }, { routes: [] }] as const) {
      const config = { track, stats: bareShip(1, 1), plan, seed: seedFrom('start') };
      let state = startRace(config.stats, []);
      for (let i = 0; i < 120; i += 1) state = stepRace(state, config);
      expect(state.speed).toBeGreaterThan(0.1);
      expect(state.distance).toBeGreaterThan(0);
    }
  });
});
