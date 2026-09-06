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
import { RIVALS, rivalBuild, rivalStartingHull } from '../../src/sim/rivals';
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
  it('are Redline and Bulwark, with a part for every stage', () => {
    expect(RIVALS.map((rival) => rival.id)).toEqual(['redline', 'bulwark']);
    RIVALS.forEach((rival) => {
      expect(rival.schedule).toHaveLength(3);
      expect(rival.name.length).toBeGreaterThan(0);
    });
  });

  it('grow one part per stage', () => {
    RIVALS.forEach((rival) => {
      expect(rivalBuild(rival, 0)).toHaveLength(1);
      expect(rivalBuild(rival, 1)).toHaveLength(2);
      expect(rivalBuild(rival, 2)).toHaveLength(3);
    });
  });

  it('never grow past their schedule', () => {
    RIVALS.forEach((rival) => {
      expect(rivalBuild(rival, 99)).toHaveLength(rival.schedule.length);
    });
  });

  it('start with the hull their first part leaves them', () => {
    RIVALS.forEach((rival) => {
      expect(rivalStartingHull(rival)).toBe(resolveBuild(rivalBuild(rival, 0)).hull);
    });
  });

  it('have the characters the design says: Redline quick, Bulwark tough', () => {
    const redline = RIVALS.find((rival) => rival.id === 'redline');
    const bulwark = RIVALS.find((rival) => rival.id === 'bulwark');
    const quick = resolveBuild(rivalBuild(redline!, 2));
    const tough = resolveBuild(rivalBuild(bulwark!, 2));
    expect(quick.speed).toBeGreaterThan(tough.speed);
    expect(tough.hull).toBeGreaterThan(quick.hull);
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
