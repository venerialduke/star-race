// The line a camera follows has to be smooth, and the film has to be watchable
// between its own ticks. Both are drawing concerns, but both are answered by
// pure functions in the simulation, so both are testable — and both were wrong
// in a way that was obvious on screen and invisible to every other test.

import { describe, expect, it } from 'vitest';
import { makeBot } from '../../src/sim/bot';
import { startField, type Entrant } from '../../src/sim/field';
import { startRace, stepRace } from '../../src/sim/race';
import { seedFrom } from '../../src/sim/rng';
import { frameBetween, recordSegment } from '../../src/sim/segment';
import { bareShip } from '../../src/sim/ship';
import {
  placeOn,
  placeSmooth,
  sampleOn,
  shortestTurn,
  TRACKS,
  type Track,
} from '../../src/sim/track';
import { LAPS_PER_HEAT, SPEED_PER_THRUST } from '../../src/sim/tuning';

/** One tick of travel for a stock ship, which is the interval that matters. */
const TICK = SPEED_PER_THRUST;

describe.each(TRACKS)('$name, followed by a camera', (track: Track) => {
  it('moves about the same distance every tick instead of in jumps', () => {
    // Snapping to the nearest sample held the ship still for three ticks and
    // then moved it the whole 3 units at once. That is the shake.
    const steps: number[] = [];
    let prev = placeSmooth(track, 0, 0);
    for (let i = 1; i <= 600; i += 1) {
      const here = placeSmooth(track, i * TICK, 0);
      steps.push(Math.hypot(here.pos.x - prev.pos.x, here.pos.y - prev.pos.y));
      prev = here;
    }
    const most = Math.max(...steps);
    const least = Math.min(...steps);
    expect(least).toBeGreaterThan(TICK * 0.9);
    expect(most).toBeLessThan(TICK * 1.1);
  });

  it('turns a little every tick instead of all at once', () => {
    const turns: number[] = [];
    let prev = placeSmooth(track, 0, 0);
    for (let i = 1; i <= 600; i += 1) {
      const here = placeSmooth(track, i * TICK, 0);
      turns.push(Math.abs(shortestTurn(prev.heading, here.heading)));
      prev = here;
    }
    // A snapped heading turns 0 radians for two ticks and then 0.043 at once.
    // The tightest bend in the game cannot need more than this per tick.
    expect(Math.max(...turns)).toBeLessThan(0.035);
  });

  it('still says what the snapped lookup says, at a sample itself', () => {
    // It interpolates between samples; it does not move them.
    for (const sector of track.sectors) {
      const route = sector.routes[0];
      if (route === undefined) continue;
      for (const at of [sector.start, (sector.start + sector.end) / 2]) {
        const snapped = placeOn(track, at, 0);
        const smooth = placeSmooth(track, at, 0);
        expect(
          Math.hypot(smooth.pos.x - snapped.pos.x, smooth.pos.y - snapped.pos.y),
        ).toBeLessThan(3.1);
      }
    }
  });
});

describe('watching the film between its ticks', () => {
  const filmOf = () => {
    const seed = seedFrom('smooth');
    const me: Entrant = {
      id: 'player',
      name: 'You',
      stats: bareShip(1, 1),
      isPlayer: true,
    };
    const entrants = [me, makeBot(TRACKS[0] as Track, seed, 1)];
    return recordSegment(startField(entrants, [{ routes: [] }, { routes: [] }], TRACKS[0]), {
      track: TRACKS[0] as Track,
      laps: LAPS_PER_HEAT,
      seed,
    });
  };

  it('lands exactly on a tick at either end of the blend', () => {
    const film = filmOf();
    for (const tick of [0, 200, 900]) {
      expect(frameBetween(film, 0, tick, 0)?.distance).toBe(
        film.frames[0]?.[tick]?.distance,
      );
      expect(frameBetween(film, 0, tick, 1)?.distance).toBeCloseTo(
        film.frames[0]?.[tick + 1]?.distance ?? 0,
        9,
      );
    }
  });

  it('moves the ship evenly across the gap, never backwards', () => {
    const film = filmOf();
    let last = -Infinity;
    for (let tick = 100; tick < 140; tick += 1) {
      for (const blend of [0, 0.25, 0.5, 0.75]) {
        const at = frameBetween(film, 0, tick, blend)?.distance ?? 0;
        expect(at).toBeGreaterThan(last);
        last = at;
      }
    }
  });

  it('does not blend a state that has no halfway', () => {
    // Wide is a thing a ship is or is not, and which way it went at a fork is
    // a decision. Half of either is not a thing.
    const film = filmOf();
    const half = frameBetween(film, 0, 300, 0.5);
    const whole = film.frames[0]?.[300];
    expect(half?.wide).toBe(whole?.wide);
    expect(half?.route).toBe(whole?.route);
  });
});

describe('the simulation is untouched by any of it', () => {
  it('still reads the snapped sample, not the interpolated one', () => {
    // This is the invariant, not the lap times below: a bend's radius is a
    // fact about the bend and must not be averaged across its edge, so the
    // lookup the tick loop uses has to keep returning the sample itself.
    const track = TRACKS[0] as Track;
    const sector = track.sectors[0] as (typeof track.sectors)[number];
    const route = sector.routes[0];
    if (route === undefined) throw new Error('no route');
    for (const along of [7, 40.5, 123.9, 260.2]) {
      expect(route.samples).toContain(sampleOn(route, along));
    }
  });

  it('races exactly the same as it did before there was a camera', () => {
    // Measured on this commit and on the one before the smoothing landed. If
    // one of these moves, something that should only ever have been drawing has
    // reached into the race.
    //
    // It used to be three numbers a track — one per corner plan — and the
    // history of every time they moved is in this file's git log.
    //
    // These moved a long way when the swing became flight. A `bareShip` has
    // `BASE_NAV`, which is no navigation system at all, and a ship that cannot
    // see where the line is now *flies* like one: it misjudges the line and
    // its own pace, and gets home about half as fast again as the same hull
    // with a maxed navigation system. That gap is the point of the model, and
    // it is what makes these numbers what they are. Nothing here is a target —
    // the balance pass against them is still owed.
    //
    // They moved again when the misjudgement was rebalanced: most of it is now
    // spent on the pace rather than on the line, so an unguided ship saws at
    // the steering far less, stays inside the path, and is quicker for it.
    const expected: Record<string, number> = {
      'Kestrel Loop': 3675,
      'Meridian Run': 5129,
      'Cinder Coil': 2479,
      'The Proving Ground': 3354,
    };
    for (const track of TRACKS) {
      const config = { track, stats: bareShip(1, 1), seed: seedFrom('kestrel') };
      let state = startRace(config.stats, []);
      while (state.lap < 1 && state.tick < 20000) state = stepRace(state, config);
      expect(state.tick, track.name).toBe(expected[track.name]);
    }
  });
});
