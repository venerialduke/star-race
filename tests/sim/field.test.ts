import { describe, expect, it } from 'vitest';
import {
  flyField,
  livePositionOf,
  livePositions,
  positionOf,
  standings,
  startField,
  stepField,
  type Entry,
  type Field,
} from '../../src/sim/field';
import { raceOutcome } from '../../src/sim/race';
import { makeRng } from '../../src/sim/rng';
import { RIVALS, growRival, preferred, startingRival } from '../../src/sim/rivals';
import { PARTS, resolveBuild } from '../../src/sim/ship';
import { makeSpline } from '../../src/sim/spline';
import { SLICE_TRACK, makeTrack, type Segment } from '../../src/sim/track';

const line = makeSpline([
  { x: 0, y: 0 },
  { x: 1, y: 0 },
]);

const seg = (
  name: string,
  lengthTicks: number,
  hazards: Segment['hazards'] = [],
): Segment => ({
  name,
  lengthTicks,
  hazards,
});

const entry = (id: Entry['id'], name: string, build: Entry['build'] = []): Entry => ({
  id,
  name,
  build,
  hull: resolveBuild(build).hull,
});

const grid = (): Entry[] => [
  entry('player', 'You'),
  entry('redline', 'Redline', [PARTS.ionThruster]),
  entry('bulwark', 'Bulwark', [PARTS.ablativePlating]),
];

const fly = (track = SLICE_TRACK, seed = 1, entries = grid()): Field =>
  flyField(startField(track, entries, seed, { stage: 0 }));

describe('a field', () => {
  it('puts every entry on the grid, none of them moved', () => {
    const field = startField(SLICE_TRACK, grid(), 1, { stage: 0 });
    expect(field.racers).toHaveLength(3);
    expect(field.tick).toBe(0);
    expect(field.over).toBe(false);
    field.racers.forEach((racer) => expect(racer.state.tick).toBe(0));
  });

  it('gives the player no pilot and the rivals one each', () => {
    const field = startField(SLICE_TRACK, grid(), 1, { stage: 0 });
    const byId = new Map(field.racers.map((racer) => [racer.id, racer]));
    expect(byId.get('player')?.pilot).toBeUndefined();
    expect(byId.get('redline')?.pilot).toBeDefined();
    expect(byId.get('bulwark')?.pilot).toBeDefined();
  });

  it('steps every ship once per tick', () => {
    const field = startField(SLICE_TRACK, grid(), 1, { stage: 0 });
    stepField(field);
    stepField(field);
    expect(field.tick).toBe(2);
    field.racers.forEach((racer) => expect(racer.state.tick).toBe(2));
  });

  it('is over only when every ship is done', () => {
    const field = fly();
    expect(field.over).toBe(true);
    field.racers.forEach((racer) => expect(racer.state.over).toBe(true));
  });

  it('is deterministic: the same seed runs the same field', () => {
    const a = standings(fly(SLICE_TRACK, 4));
    const b = standings(fly(SLICE_TRACK, 4));
    expect(a).toEqual(b);
  });

  it('runs differently on a different seed', () => {
    // The dice move damage, not the clock: nothing random changes a ship's
    // speed, so on a stage with no black hole the finishing times are the same
    // whatever the seed. What differs is what the ships arrive with.
    const damage = (seed: number): number[] =>
      fly(SLICE_TRACK, seed).racers.map((racer) => raceOutcome(racer.state).damageTaken);
    expect(damage(4)).not.toEqual(damage(5));
    expect(standings(fly(SLICE_TRACK, 4)).map((row) => row.finishTicks)).toEqual(
      standings(fly(SLICE_TRACK, 5)).map((row) => row.finishTicks),
    );
  });

  it('rolls its own dice per ship: two identical builds do not take identical damage', () => {
    const twins: Entry[] = [entry('player', 'You'), entry('redline', 'Twin')];
    const field = flyField(startField(SLICE_TRACK, twins, 3, { stage: 0 }));
    const [first, second] = field.racers;
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(raceOutcome(first!.state).damageTaken).not.toBe(
      raceOutcome(second!.state).damageTaken,
    );
  });

  it('lets the ships fly straight through each other: they never interact', () => {
    // A field of three identical ships, and the same ship racing alone, cover
    // exactly the same ground — nothing about the others changes a race.
    const solo = flyField(
      startField(SLICE_TRACK, [entry('player', 'You')], 9, { stage: 0 }),
    );
    const crowd = flyField(startField(SLICE_TRACK, grid(), 9, { stage: 0 }));
    const soloPlayer = solo.racers[0];
    const crowdPlayer = crowd.racers.find((racer) => racer.id === 'player');
    expect(raceOutcome(crowdPlayer!.state)).toEqual(raceOutcome(soloPlayer!.state));
  });
});

describe('the finishing order', () => {
  it('puts the quickest finisher first', () => {
    const order = standings(fly());
    const finishers = order.filter((row) => row.survived);
    finishers.forEach((row, i) => {
      const next = finishers[i + 1];
      if (next === undefined) return;
      expect(row.finishTicks).toBeLessThanOrEqual(next.finishTicks);
    });
  });

  it('numbers positions from one, with no gaps', () => {
    const order = standings(fly());
    expect(order.map((row) => row.position)).toEqual([1, 2, 3]);
  });

  it('puts a lost ship behind every ship that finished', () => {
    // A course that kills the fragile ship and not the armoured one.
    const brutal = makeTrack(
      [seg('grinder', 900, [{ kind: 'asteroidField', startTick: 0, lengthTicks: 900 }])],
      [],
      line,
    );
    const order = standings(
      flyField(
        startField(
          brutal,
          [entry('player', 'You'), entry('bulwark', 'Bulwark', [PARTS.ablativePlating])],
          2,
        ),
      ),
    );
    const lost = order.filter((row) => !row.survived);
    const finished = order.filter((row) => row.survived);
    expect(lost.length).toBeGreaterThan(0);
    finished.forEach((row) => {
      lost.forEach((loser) => expect(row.position).toBeLessThan(loser.position));
    });
  });

  it('ranks two lost ships by how far they got', () => {
    const brutal = makeTrack(
      [
        seg('grinder', 4000, [
          { kind: 'asteroidField', startTick: 0, lengthTicks: 4000 },
        ]),
      ],
      [],
      line,
    );
    const order = standings(
      flyField(
        startField(
          brutal,
          [entry('player', 'You'), entry('bulwark', 'Bulwark', [PARTS.ablativePlating])],
          2,
        ),
      ),
    );
    expect(order.every((row) => !row.survived)).toBe(true);
    expect(order[0]?.distance).toBeGreaterThan(order[1]?.distance ?? Infinity);
  });

  it('can say where one ship came', () => {
    const order = standings(fly());
    expect(positionOf(order, 'player')).toBeGreaterThanOrEqual(1);
    expect(positionOf(order, 'player')).toBeLessThanOrEqual(3);
    expect(() => positionOf(order, 'redline')).not.toThrow();
  });
});

describe('the rivals', () => {
  it('are Redline and Bulwark, each with something it reaches for', () => {
    expect(RIVALS.map((rival) => rival.id)).toEqual(['redline', 'bulwark']);
    RIVALS.forEach((rival) => {
      expect(rival.wants.length).toBeGreaterThan(0);
      expect(rival.name.length).toBeGreaterThan(0);
    });
  });

  it('takes the part nearest the top of its list', () => {
    const redline = RIVALS[0]!;
    const bulwark = RIVALS[1]!;
    const offer = [PARTS.ablativePlating, PARTS.ionThruster, PARTS.mirrorShielding];
    expect(preferred(redline, offer)).toBe(PARTS.ionThruster);
    expect(preferred(bulwark, offer)).toBe(PARTS.ablativePlating);
  });

  it('takes something even when the offer holds nothing it wants', () => {
    const redline = RIVALS[0]!;
    const offer = [PARTS.mirrorShielding, PARTS.ablativePlating];
    expect(offer).toContain(preferred(redline, offer));
  });

  it('shops in the same garage the player does, one part at a time', () => {
    RIVALS.forEach((rival) => {
      const first = growRival(rival, [], makeRng(1));
      const second = growRival(rival, first, makeRng(2));
      expect(first).toHaveLength(1);
      expect(second).toHaveLength(2);
      expect(second.slice(0, 1)).toEqual(first);
    });
  });

  it('draws the same parts from the same stream, and different from another', () => {
    const rival = RIVALS[0]!;
    expect(growRival(rival, [], makeRng(5))).toEqual(growRival(rival, [], makeRng(5)));
    const draws = [1, 2, 3, 4, 5, 6, 7, 8].map(
      (seed) => growRival(rival, [], makeRng(seed))[0]?.id,
    );
    expect(new Set(draws).size).toBeGreaterThan(1);
  });

  it('starts the run with the hull its first part leaves it', () => {
    RIVALS.forEach((rival) => {
      const start = startingRival(rival, makeRng(3));
      expect(start.hull).toBe(resolveBuild(start.build).hull);
    });
  });

  it('keeps its character across many draws: Redline quicker, Bulwark tougher', () => {
    // Any single draw is luck; over many, the wish lists show through.
    let quick = 0;
    let tough = 0;
    for (let seed = 0; seed < 60; seed++) {
      const redline = resolveBuild(growRival(RIVALS[0]!, [], makeRng(seed)));
      const bulwark = resolveBuild(growRival(RIVALS[1]!, [], makeRng(seed)));
      quick += redline.speed;
      tough += bulwark.hull;
    }
    const redlineHull = Array.from({ length: 60 }, (_, seed) =>
      resolveBuild(growRival(RIVALS[0]!, [], makeRng(seed))).hull,
    ).reduce((a, b) => a + b, 0);
    const bulwarkSpeed = Array.from({ length: 60 }, (_, seed) =>
      resolveBuild(growRival(RIVALS[1]!, [], makeRng(seed))).speed,
    ).reduce((a, b) => a + b, 0);
    expect(quick).toBeGreaterThan(bulwarkSpeed);
    expect(tough).toBeGreaterThan(redlineHull);
  });
});

describe('the order mid-race', () => {
  it('puts the ship that is furthest along in front', () => {
    const field = startField(SLICE_TRACK, grid(), 1, { stage: 0 });
    for (let i = 0; i < 200; i++) stepField(field);
    const order = livePositions(field);
    const byId = new Map(field.racers.map((racer) => [racer.id, racer.state.distance]));
    order.forEach((id, i) => {
      const next = order[i + 1];
      if (next === undefined) return;
      expect(byId.get(id) ?? 0).toBeGreaterThanOrEqual(byId.get(next) ?? 0);
    });
  });

  it('is the quick ship in front on open track', () => {
    const field = startField(SLICE_TRACK, grid(), 1, { stage: 0 });
    for (let i = 0; i < 200; i++) stepField(field);
    expect(livePositions(field)[0]).toBe('redline');
  });

  it('drops a lost ship behind everything still flying', () => {
    const brutal = makeTrack(
      [seg('grinder', 900, [{ kind: 'asteroidField', startTick: 0, lengthTicks: 900 }])],
      [],
      line,
    );
    const field = flyField(
      startField(
        brutal,
        [entry('player', 'You'), entry('bulwark', 'Bulwark', [PARTS.ablativePlating])],
        2,
      ),
    );
    const order = livePositions(field);
    const lost = field.racers.filter((racer) => racer.state.destroyed).map((r) => r.id);
    expect(lost.length).toBeGreaterThan(0);
    lost.forEach((id) => expect(order.indexOf(id)).toBe(order.length - 1));
  });

  it('can say where the player is right now', () => {
    const field = startField(SLICE_TRACK, grid(), 1, { stage: 0 });
    stepField(field);
    expect(livePositionOf(field, 'player')).toBeGreaterThanOrEqual(1);
    expect(livePositionOf(field, 'player')).toBeLessThanOrEqual(3);
    expect(() => livePositionOf(field, 'redline')).not.toThrow();
  });
});
