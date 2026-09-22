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
   * How much engine to give it.
   *
   * `bareShip` carries `BASE_NAV`, which is none at all, so a ship here is
   * always flying badly — it misjudges where the line is and how fast it may
   * go, and a big engine turns that into a real excursion. That is how a test
   * about being thrown wide asks for a ship that gets thrown wide, now that
   * nothing can be forced off the line by fiat.
   */
  thrust = 1,
): void => {
  const config = { track, stats: bareShip(thrust, handling), seed: seedFrom(seed) };
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

describe('what actually holds a ship in', () => {
  it('is the bumpers, and the wall is a backstop nothing reaches', () => {
    // The wall was the answer while a swing could throw a ship 128 units off
    // the line. It is not what holds one in any more: the bumpers lean on a
    // ship from the edge of the golden path, and across every track, engine
    // and handling this suite flies, the widest anybody gets is about fifteen
    // units against a wall at twenty-six. The wall is still there and still
    // clamps — see below — but it is now a thing that never happens.
    //
    // Which is worth saying out loud rather than deleting: it means the
    // corridor is currently doing no work, and whether the bumpers should be
    // moved out to give it some is a tuning question, recorded in BACKLOG.md.
    let widest = 0;
    let left = 0;
    for (const track of TRACKS as Track[]) {
      for (const thrust of [1, 2, 3]) {
        for (const handling of [0.5, 1, 1.5]) {
          for (const seed of seeds.slice(0, 4)) {
            overALap(
              track,
              handling,
              seed,
              (state) => {
                widest = Math.max(widest, Math.abs(state.offset));
                if (Math.abs(state.offset) > PATH_HALF_WIDTH) left += 1;
              },
              thrust,
            );
          }
        }
      }
    }
    // Ships do leave the path — that is the whole game — and none of them
    // reaches the wall doing it.
    expect(left).toBeGreaterThan(0);
    expect(widest).toBeGreaterThan(PATH_HALF_WIDTH);
    expect(widest).toBeLessThan(TRACK_HALF_WIDTH);
  });

  it('still clamps and scrubs anything that does reach the wall', () => {
    // Nothing flies itself out there any more, so the rule is tested by
    // putting a ship there: a weapon or a fixture can still shove one, and if
    // it ever happens the corridor has to hold.
    const config = {
      track: TRACKS[2] as Track,
      stats: bareShip(2, 1),
      seed: seedFrom('wall'),
    };
    let state = startRace(config.stats, []);
    for (let i = 0; i < 400; i += 1) state = stepRace(state, config);
    const flung = stepRace(
      { ...state, offset: TRACK_HALF_WIDTH * 3, onWall: false },
      config,
    );
    expect(Math.abs(flung.offset)).toBeLessThanOrEqual(TRACK_HALF_WIDTH);
    expect(flung.onWall).toBe(true);
    // And hitting it costs speed, once.
    expect(flung.speed).toBeLessThan(state.speed);
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
