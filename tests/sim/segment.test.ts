// A segment is computed before it is shown. The claim that makes that safe is
// that it changes nothing: the simulation takes no input between decision
// points, so a recorded segment is the same race as a stepped one. That is
// worth a test, because if it ever stops being true the playback would be
// showing a race the standings disagree with.

import { describe, expect, it } from 'vitest';
import { makeBot } from '../../src/sim/bot';
import {
  standings,
  startField,
  stepField,
  type Entrant,
  type FieldConfig,
} from '../../src/sim/field';
import { seedFrom } from '../../src/sim/rng';
import { frameAt, orderAt, recordSegment, swingsBy, wakeAt } from '../../src/sim/segment';
import { bareShip, carryCondition } from '../../src/sim/ship';
import { KESTREL_LOOP } from '../../src/sim/track';
import { LAPS_PER_HEAT } from '../../src/sim/tuning';

const SEED = seedFrom('segment');

const entrants = (): Entrant[] => [
  { id: 'player', name: 'You', stats: bareShip(1, 1), isPlayer: true },
  makeBot(KESTREL_LOOP, SEED, 1),
  makeBot(KESTREL_LOOP, SEED, 2),
];

const config = (): FieldConfig => ({
  track: KESTREL_LOOP,
  laps: LAPS_PER_HEAT,
  seed: SEED,
});

describe('a recorded segment', () => {
  it('is the same race as one stepped live, tick for tick', () => {
    const cfg = config();
    const plans = ['charge', 'carry', 'carry'] as const;

    const recorded = recordSegment(startField(entrants(), [...plans]), cfg);

    let live = startField(entrants(), [...plans]);
    for (let i = 0; i < 20000 && live.phase === 'racing'; i += 1) {
      live = stepField(live, cfg);
    }

    expect(recorded.end.phase).toBe(live.phase);
    expect(recorded.end.ships.map((s) => s.totalTicks)).toEqual(
      live.ships.map((s) => s.totalTicks),
    );
    expect(standings(recorded.end).map((r) => r.place)).toEqual(
      standings(live).map((r) => r.place),
    );
  });

  it('ends at the decision point, with everyone in', () => {
    const segment = recordSegment(
      startField(entrants(), ['carry', 'carry', 'carry']),
      config(),
    );
    expect(segment.end.phase).toBe('pit');
    expect(segment.end.ships.every((s) => s.waiting)).toBe(true);
    expect(segment.ticks).toBeGreaterThan(0);
  });

  it('has a frame for every ship at every tick of the film', () => {
    const segment = recordSegment(
      startField(entrants(), ['carry', 'carry', 'carry']),
      config(),
    );
    expect(segment.frames).toHaveLength(3);
    for (const film of segment.frames) expect(film).toHaveLength(segment.ticks);
    expect(frameAt(segment, 0, 0)?.distance).toBe(0);
    expect(frameAt(segment, 0, segment.ticks - 1)?.distance).toBeGreaterThan(0);
  });

  it('clamps a cursor past either end rather than falling off it', () => {
    const segment = recordSegment(
      startField(entrants(), ['carry', 'carry', 'carry']),
      config(),
    );
    expect(frameAt(segment, 0, -50)).toEqual(frameAt(segment, 0, 0));
    expect(frameAt(segment, 0, segment.ticks + 999)).toEqual(
      frameAt(segment, 0, segment.ticks - 1),
    );
  });

  it('shows only what has happened by the cursor', () => {
    const segment = recordSegment(
      startField(entrants(), ['charge', 'carry', 'carry']),
      config(),
    );
    const early = swingsBy(segment, 0, 200);
    const all = swingsBy(segment, 0, segment.ticks);
    expect(early.length).toBeLessThan(all.length);
    expect(early.every((s) => s.tick <= 200)).toBe(true);
  });

  it('draws a wake from the frames just behind the cursor', () => {
    const segment = recordSegment(
      startField(entrants(), ['carry', 'carry', 'carry']),
      config(),
    );
    const wake = wakeAt(segment, 0, 500, 60);
    expect(wake).toHaveLength(60);
    expect(wake[wake.length - 1]).toEqual(frameAt(segment, 0, 500));
  });
});

describe('the tracking bar during playback', () => {
  // The segment is computed before it is watched, so `segment.end` already
  // knows who won. A bar that read it would announce the result over the race
  // being shown. These are the claims that say it does not.
  const segment = (): ReturnType<typeof recordSegment> =>
    recordSegment(startField(entrants(), ['charge', 'carry', 'carry']), config());

  it('starts the field level, with nobody behind anybody', () => {
    const order = orderAt(segment(), 0);
    expect(order.map((row) => row.place)).toEqual([1, 2, 3]);
    expect(order.every((row) => row.behind === 0)).toBe(true);
    expect(order.every((row) => row.progress === 0)).toBe(true);
    expect(order.every((row) => !row.home)).toBe(true);
  });

  it('reads only the film up to the cursor, never the end of it', () => {
    // The test for not peeking: cut the film off at the cursor and the answer
    // must not change. On this seed it visibly matters — the player runs third
    // all lap and wins at the line — so a bar that read the end would be
    // showing a different race from the one on screen.
    const film = segment();
    for (const at of [1, 400, 800, 1200]) {
      const cut = {
        ...film,
        ticks: at + 1,
        frames: film.frames.map((f) => f.slice(0, at + 1)),
      };
      expect(orderAt(cut, at)).toEqual(orderAt(film, at));
    }
  });

  it('places a ship by the road it has covered, not by how it finishes', () => {
    const film = segment();
    const mid = orderAt(film, Math.floor(film.ticks / 2));
    const end = orderAt(film, film.ticks - 1);

    // Placed by progress while the lap is running, and behind is a real gap.
    expect(mid.map((row) => row.progress)).toEqual(
      [...mid].sort((a, b) => b.progress - a.progress).map((row) => row.progress),
    );
    expect(mid[0]?.behind).toBe(0);
    expect(mid.some((row) => row.behind > 0)).toBe(true);
    expect(end.every((row) => row.behind >= 0)).toBe(true);
  });

  it('agrees with the standings once the segment has played out', () => {
    const film = segment();
    const bar = orderAt(film, film.ticks - 1);
    const truth = standings(film.end);

    expect(bar.map((row) => row.ship)).toEqual(
      truth.map((row) => film.end.ships.indexOf(row.ship)),
    );
    expect(bar.every((row) => row.home)).toBe(true);
    expect(bar.every((row) => row.progress === 1)).toBe(true);
  });
});

describe('changing the build between segments', () => {
  const part = (uid: string, componentId: string) => ({ uid, componentId, level: 1 });

  it('keeps the damage on a part you kept, and gives a new part a clean start', () => {
    const before = [part('a', 'speed-engine'), part('b', 'general-shields')];
    const condition = { parts: [0.4, 0.9] };
    const after = [part('a', 'speed-engine'), part('c', 'crew-nanites')];

    expect(carryCondition(before, condition, after).parts).toEqual([0.4, 1]);
  });

  it('does not launder damage by taking a part off and putting it back', () => {
    const before = [part('a', 'speed-engine')];
    const condition = { parts: [0.3] };
    const shuffled = [part('x', 'general-shields'), part('a', 'speed-engine')];

    expect(carryCondition(before, condition, shuffled).parts).toEqual([1, 0.3]);
  });
});
