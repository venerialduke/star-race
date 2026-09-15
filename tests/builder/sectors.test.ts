// Sectors move, and the things pointing at them move too.
//
// A ring is a loop, so appending a sector puts it at the one place nobody means
// — immediately before the start line. Inserting puts it where it was asked
// for, and that makes every index below it wrong by one. A split hangs off a
// checkpoint by index and nothing else, so if it does not move with the sectors
// it quietly ends up beside a different piece of road: the export still
// compiles, the picture still draws, and the track is not the one that was
// built. That is what this suite is watching.

import { describe, expect, it } from 'vitest';
import {
  B,
  P,
  S,
  assemblePlan,
  checkpointPoses,
  sector,
  splitThrough,
} from '../../src/sim/track';
import {
  asDraft,
  closure,
  draftPiece,
  dropSector,
  insertSector,
  newFixture,
  piecesFrom,
  ringOf,
  roadsOf,
  setProperty,
  trackOf,
  type Draft,
  type DraftFixture,
  type DraftSplit,
} from '../../src/builder/plan';
import { sourceOf } from '../../src/builder/export';
import { KESTREL_LOOP } from '../../src/sim/track';

/** The Kestrel in the builder, which is a real closed ring to cut into. */
function kestrel(): Draft {
  return {
    name: KESTREL_LOOP.name,
    shape: KESTREL_LOOP.shape,
    par: KESTREL_LOOP.par,
    ring: KESTREL_LOOP.sectors.map((sector, i) => ({
      id: `sector-${i + 1}`,
      name: `Sector ${i + 1}`,
      pieces: piecesFrom(KESTREL_LOOP, sector.start, sector.end).map(asDraft),
    })),
    splits: [],
    fixtures: [],
  };
}

const split = (from: number, id: string): DraftSplit => ({
  id,
  name: id,
  from,
  grade: 'clear',
  lead: [draftPiece('sweeper', -1)],
  radius: 85,
});

describe('inserting a sector', () => {
  it('lands where it was asked for, not at the end', () => {
    const draft = kestrel();
    const before = draft.ring.length;
    const names = draft.ring.map((s) => s.pieces.length);

    const at = insertSector(draft, 2);

    expect(at).toBe(2);
    expect(draft.ring).toHaveLength(before + 1);
    expect(draft.ring[2]?.pieces).toEqual([]);
    // What was sector 3 is sector 4 now, with its pieces intact.
    expect(draft.ring.map((s) => s.pieces.length)).toEqual([
      ...names.slice(0, 2),
      0,
      ...names.slice(2),
    ]);
  });

  it('costs no distance, so a closed ring stays closed', () => {
    const draft = kestrel();
    expect(closure(draft).closed).toBe(true);
    const poses = checkpointPoses(ringOf(draft));

    insertSector(draft, 2);

    expect(closure(draft).closed).toBe(true);
    // Every old checkpoint is still exactly where it was; the new one sits on
    // top of the one it was inserted before.
    const after = checkpointPoses(ringOf(draft));
    expect(after[2]).toEqual(poses[2]);
    expect(after[3]).toEqual(poses[2]);
    expect(after.slice(4)).toEqual(poses.slice(3));
  });

  it('carries the splits at or past it up with the sectors', () => {
    const draft = kestrel();
    draft.splits = [split(0, 'early'), split(2, 'on-the-seam'), split(3, 'late')];

    insertSector(draft, 2);

    expect(draft.splits.map((s) => [s.id, s.from])).toEqual([
      ['early', 0],
      ['on-the-seam', 3],
      ['late', 4],
    ]);
  });

  it('appends when asked for the end, and clamps a silly index', () => {
    const draft = kestrel();
    const n = draft.ring.length;
    expect(insertSector(draft, n)).toBe(n);
    expect(insertSector(draft, 999)).toBe(n + 1);
    expect(insertSector(draft, -4)).toBe(0);
  });

  it('leaves no two sectors sharing an id', () => {
    const draft = kestrel();
    insertSector(draft, 1);
    insertSector(draft, 3);
    const ids = draft.ring.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('renumbers the default names so a row is called what it is', () => {
    const draft = kestrel();
    draft.ring[draft.ring.length - 1]!.name = 'The run home';

    insertSector(draft, 1);

    const names = draft.ring.map((s) => s.name);
    expect(names.slice(0, -1)).toEqual(
      names.slice(0, -1).map((_, i) => `Sector ${i + 1}`),
    );
    expect(names[names.length - 1]).toBe('The run home');
  });
});

describe('removing a sector', () => {
  it('takes the split across it and moves the rest down', () => {
    const draft = kestrel();
    draft.splits = [split(0, 'early'), split(2, 'across-it'), split(3, 'late')];

    dropSector(draft, 2);

    expect(draft.splits.map((s) => [s.id, s.from])).toEqual([
      ['early', 0],
      ['late', 2],
    ]);
  });

  it('does not leave a late split pointing at the wrong road', () => {
    // The old code kept any split still in range and left its index alone, so
    // dropping sector 1 slid every later split one sector up the track without
    // saying so. This is that bug.
    const draft = kestrel();
    draft.splits = [split(4, 'last')];
    const wasBeside = draft.ring[4];

    dropSector(draft, 1);

    expect(draft.splits[0]?.from).toBe(3);
    // The split still runs beside the same stretch of road, which is now at 3.
    expect(draft.ring[3]?.pieces).toEqual(wasBeside?.pieces);
    expect(draft.ring).toHaveLength(KESTREL_LOOP.sectors.length - 1);
  });

  it('ignores an index that is not a sector', () => {
    const draft = kestrel();
    const n = draft.ring.length;
    dropSector(draft, n);
    dropSector(draft, -1);
    expect(draft.ring).toHaveLength(n);
  });
});

describe('properties in the builder', () => {
  it('carry a sector word down to every piece of the track it builds', () => {
    const draft = kestrel();
    draft.ring[0]!.properties = { environment: 'nebula' };

    const track = trackOf(draft);
    const main = track?.sectors[0]?.routes[0];
    // One band, not one per piece: the sector is one nebula.
    expect(main?.bands).toHaveLength(1);
    expect(main?.bands[0]?.properties.environment).toBe('nebula');
    expect(main?.bands[0]?.end).toBeCloseTo(main?.length ?? 0, 4);
  });

  it('let a piece answer back without cancelling the sector', () => {
    const draft = kestrel();
    draft.ring[0]!.properties = { environment: 'nebula' };
    const first = draft.ring[0]!.pieces[0]!;
    draft.ring[0]!.pieces[0] = { ...first, properties: { pocket: 7 } };

    const band = trackOf(draft)?.sectors[0]?.routes[0]?.bands[0];
    expect(band?.properties).toEqual({ environment: 'nebula', pocket: 7 });
  });

  it('survive the export, so what is pasted is what was built', () => {
    const draft = kestrel();
    draft.ring[1]!.properties = { environment: 'debris', hazard: 3 };
    const source = sourceOf(draft);
    expect(source).toContain("{ environment: 'debris', hazard: 3 }");
  });

  it('are left out of the export entirely when nothing is said', () => {
    // A track that uses none of this has to export exactly as short as it did
    // before any of it existed.
    expect(sourceOf(kestrel())).not.toContain('environment');
  });

  it('set and unset one field at a time', () => {
    const held = setProperty(setProperty(undefined, 'pocket', 5), 'hazard', 2);
    expect(held).toEqual({ pocket: 5, hazard: 2 });
    // Back to zero takes the field away rather than writing a zero, so the
    // piece exports as a bare shape again.
    expect(setProperty(held, 'pocket', 0)).toEqual({ hazard: 2 });
    expect(setProperty({ pocket: 5 }, 'pocket', 0)).toBeUndefined();
    expect(setProperty({ environment: 'nebula' }, 'environment', 'open')).toBeUndefined();
  });
});

describe('fixtures in the builder', () => {
  const trap = (sector: number, id: string): DraftFixture => ({
    id,
    kind: 'mine',
    sector,
    route: 0,
    at: 0.5,
    offset: 0,
    power: 30,
  });

  it('move with their sector when one is put in front of them', () => {
    const draft = kestrel();
    draft.fixtures = [trap(0, 'early'), trap(2, 'late')];

    insertSector(draft, 2);

    expect(draft.fixtures.map((f) => [f.id, f.sector])).toEqual([
      ['early', 0],
      ['late', 3],
    ]);
  });

  it('go with the sector they were on when it is removed', () => {
    const draft = kestrel();
    draft.fixtures = [trap(1, 'on-it'), trap(3, 'after')];

    dropSector(draft, 1);

    expect(draft.fixtures.map((f) => [f.id, f.sector])).toEqual([['after', 2]]);
  });

  it('reach the built track, where the race can meet them', () => {
    const draft = kestrel();
    draft.fixtures = [trap(2, 'trap')];
    expect(trackOf(draft)?.fixtures).toHaveLength(1);
    expect(trackOf(draft)?.fixtures[0]?.sector).toBe(2);
  });

  it('count the roads of a sector the way the race indexes them', () => {
    // A fixture is authored against a route index, so the builder's list of
    // roads and the track's have to agree or a fixture sits on the wrong one.
    const draft = kestrel();
    draft.splits = [split(1, 'beside-it')];
    const roads = roadsOf(draft, 1);
    expect(roads).toHaveLength(2);
    expect(roads[0]?.name).toBe('The golden path');
    expect(trackOf(draft)?.sectors[1]?.routes).toHaveLength(2);
  });
});

describe('what the export writes', () => {
  it('only ever calls helpers that track.ts actually exports', () => {
    // The export's whole job is to be pasted into `track.ts`. A paste that does
    // not compile is not an export, and the way that breaks is the export
    // learning a new helper — `P` for a piece with properties was exactly that
    // — which nothing in `track.ts` defines.
    const draft = kestrel();
    draft.ring[0]!.properties = { environment: 'shadow' };
    const first = draft.ring[0]!.pieces[0]!;
    draft.ring[0]!.pieces[0] = { ...first, properties: { pocket: 8 } };
    draft.splits = [split(1, 'beside')];
    draft.fixtures = [
      { id: 'trap', kind: 'mine', sector: 2, route: 0, at: 0.4, offset: 3, power: 35 },
    ];

    const source = sourceOf(draft);
    const vocabulary: Record<string, unknown> = { P, S, B, sector, assemblePlan, splitThrough };
    const called = new Set(source.match(/\b([A-Za-z_]\w*)\(/g)?.map((m) => m.slice(0, -1)));
    for (const name of called) {
      expect(vocabulary[name], `${name} is called but not exported`).toBeTypeOf('function');
    }
    // And it really did write the new things, or the check above is vacuous.
    expect(called).toContain('P');
    expect(source).toContain('fixtures: [');
  });
});

describe('a new fixture', () => {
  it('never takes an id another one already has', () => {
    // A fixture's id is what the race keys "already bitten by this" on, so two
    // sharing one means the second never bites anybody. Counting the list hands
    // out a duplicate the moment one in the middle is deleted.
    const draft = kestrel();
    // One at a time, the way the panel adds them — each one has to see the ones
    // already there.
    for (let i = 0; i < 3; i += 1) draft.fixtures.push(newFixture(draft, 0));
    draft.fixtures.splice(1, 1);
    draft.fixtures.push(newFixture(draft, 0));

    const ids = draft.fixtures.map((f) => f.id);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(ids.length);
    // The gap left by the delete is reused rather than skipped past.
    expect(ids).toContain('fixture-2');
  });
});
