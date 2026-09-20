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
    return recordSegment(startField(entrants, ['carry', 'carry'], TRACKS[0]), {
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
    // Measured on this commit and on the one before the smoothing landed; all
    // nine agreed. If one of these moves, something that should only ever have
    // been drawing has reached into the race.
    //
    // Five of the nine moved once since, deliberately, when tracks became
    // sections and the checkpoints went from even fractions of the lap to the
    // joins between shapes. The geometry did not change at all — every lap is
    // the same length to four decimal places with the same six bends at the
    // same radii — but two things downstream of a checkpoint did, and it is
    // worth knowing which, because only one of them is luck.
    //
    // A bend's position *within its sector* is part of the key its swing is
    // drawn from, so every draw re-rolled. That moves Carry and Charge, and it
    // moves them a long way on a tight track: the Cinder's Carry went 1080 to
    // 1231, which sounds alarming until you measure the spread across sixty
    // seeds and find it is 1035 to 1350 with both numbers comfortably inside.
    // One seed's luck, re-rolled.
    //
    // Lift is the one that is not luck. It takes no swing, so no draw touches
    // it and its lap is deterministic — the spread across sixty seeds is a
    // single value. It still moved four ticks on the Cinder, because braking
    // looks ahead past the end of the current sector into the next one, so
    // moving a checkpoint changes which bend a ship is slowing for and when.
    // That is a real behavioural change from a real design change, and it is
    // four ticks.
    // And once more when splits became roads of their own. The golden path did
    // not move at all, but its bends are now read off the pieces that make it
    // rather than off the curvature of a sampled line, so they sit a fraction
    // differently and both the swing keys and the braking points shift with
    // them. The largest change to a lap that takes no swing at all — and so has
    // no luck in it — is **one tick**, on the Meridian.
    const expected: Record<string, [number, number, number]> = {
      'Kestrel Loop': [2066, 1911, 1797],
      'Meridian Run': [2981, 2944, 2910],
      'Cinder Coil': [1407, 1282, 1240],
      // The properties track, and the only row here that has ever moved for a
      // reason of its own. Its shape changed: the lap folds back through itself
      // now so that the one track a player meets first is the one track with a
      // hill on the line they fly. 16% longer, and its long bend is written as
      // two corners rather than one 230° sweep — the same curve to thirteen
      // decimal places, but the corner plan fires at each bend, so two in a row
      // is not the same proposition as one long one. Lift is untouched by that
      // (it brakes to a holding speed both halves share); Carry and Charge are
      // not.
      //
      // Lift still slowest and Charge still fastest, as everywhere. The gap is
      // wider than it was — 244 ticks against 145 — because there is more bend
      // to be good at. Splitting the hook is most of that: with it written as
      // one 230° sweep these read 1876, 1769, 1673, so Lift and Carry did not
      // notice and Charge found 41 ticks.
      'The Proving Ground': [1876, 1769, 1632],
    };
    for (const track of TRACKS) {
      const lap = (plan: 'lift' | 'carry' | 'charge'): number => {
        const config = { track, stats: bareShip(1, 1), plan, seed: seedFrom('kestrel') };
        let state = startRace(config.stats, []);
        while (state.lap < 1 && state.tick < 20000) state = stepRace(state, config);
        return state.tick;
      };
      expect([lap('lift'), lap('carry'), lap('charge')]).toEqual(expected[track.name]);
    }
  });
});
