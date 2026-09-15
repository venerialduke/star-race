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
import { checkpointPoses } from '../../src/sim/track';
import {
  asDraft,
  closure,
  draftPiece,
  dropSector,
  insertSector,
  piecesFrom,
  ringOf,
  type Draft,
  type DraftSplit,
} from '../../src/builder/plan';
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
