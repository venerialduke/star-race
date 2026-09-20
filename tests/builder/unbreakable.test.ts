// A track cannot be broken by editing it.
//
// The builder is a tool today, and the plan is that the *game* edits a ring
// later: S4.4 has junctions opening and sectors spliced in between phases. When
// that lands, an edit will run without anybody watching the picture, so "it
// looked fine" stops being a check. This suite is the check.
//
// The thing that actually breaks is never the geometry. It is that a split and
// a fixture each hang off a sector by **index**, and every edit to the ring
// renumbers those indices. Get it wrong and nothing throws: the export still
// compiles, the road still draws, and a split is quietly beside a different
// stretch than the one it was authored against. That failure has happened three
// times in this file's history — once on delete, once on insert, once on the
// fixtures added beside them — which is why all three edits now go through one
// `carry`, and why this fuzzes that one function rather than trusting it.
//
// Seeded, because a property test that fails one run in ten tells you nothing.

import { describe, expect, it } from 'vitest';
import { makeRng, type Rng } from '../../src/sim/rng';
import { KESTREL_LOOP } from '../../src/sim/track';
import {
  asDraft,
  closeRing,
  closure,
  draftPiece,
  dropSector,
  insertSector,
  moveSector,
  newFixture,
  piecesFrom,
  roadsOf,
  trackOf,
  type Draft,
  type DraftSector,
} from '../../src/builder/plan';
import { sourceOf } from '../../src/builder/export';

function startingDraft(): Draft {
  const draft: Draft = {
    name: 'Fuzz',
    shape: 'fuzz',
    par: 2000,
    ring: KESTREL_LOOP.sectors.map((sector, i) => ({
      id: `sector-${i + 1}`,
      name: `Sector ${i + 1}`,
      pieces: piecesFrom(KESTREL_LOOP, sector.start, sector.end).map(asDraft),
    })),
    splits: [],
    fixtures: [],
  };
  draft.splits = [0, 2].map((from) => ({
    id: `split-${from}`,
    name: `Beside ${from}`,
    from,
    grade: 'clear' as const,
    lead: [draftPiece('sweeper', -1)],
    radius: 85,
  }));
  draft.fixtures = [0, 1, 3].map((sector) => ({
    ...newFixture(draft, sector),
    id: `fixture-${sector}`,
  }));
  return draft;
}

/**
 * Which sector each split and fixture is beside, **as an object** rather than
 * an index.
 *
 * This is the whole point. An index is what the edit renumbers, so checking
 * indices against indices proves nothing; the claim worth proving is that the
 * thing is still beside *the same stretch of road* it was beside before.
 */
function attachments(draft: Draft): Map<string, DraftSector | undefined> {
  const at = new Map<string, DraftSector | undefined>();
  for (const split of draft.splits) at.set(`split:${split.id}`, draft.ring[split.from]);
  for (const fix of draft.fixtures) at.set(`fix:${fix.id}`, draft.ring[fix.sector]);
  return at;
}

/** Everything that must be true of a draft, whatever has been done to it. */
function checkSound(draft: Draft, note: string): void {
  const n = draft.ring.length;

  for (const split of draft.splits) {
    expect(split.from, `${note}: split ${split.id} is beside no sector`).toBeLessThan(n);
    expect(
      split.from,
      `${note}: split ${split.id} has a negative sector`,
    ).toBeGreaterThanOrEqual(0);
  }
  for (const fix of draft.fixtures) {
    expect(fix.sector, `${note}: fixture ${fix.id} is on no sector`).toBeLessThan(n);
    expect(
      fix.sector,
      `${note}: fixture ${fix.id} has a negative sector`,
    ).toBeGreaterThanOrEqual(0);
    // A road index that is not a road would put the fixture on the golden path
    // silently, which is a different track than the one that was built.
    const roads = roadsOf(draft, fix.sector);
    expect(
      fix.route,
      `${note}: fixture ${fix.id} is on road ${fix.route} of ${roads.length}`,
    ).toBeLessThan(Math.max(1, roads.length));
  }

  const ids = draft.ring.map((s) => s.id);
  expect(new Set(ids).size, `${note}: two sectors share an id`).toBe(ids.length);

  const fixtureIds = draft.fixtures.map((f) => f.id);
  expect(new Set(fixtureIds).size, `${note}: two fixtures share an id`).toBe(
    fixtureIds.length,
  );

  // Numbering follows position, or the panel is telling the author a lie.
  draft.ring.forEach((sector, i) => {
    expect(sector.id, `${note}: sector ${i} is called ${sector.id}`).toBe(
      `sector-${i + 1}`,
    );
  });

  // The two things that read a draft must cope with whatever state it is in:
  // a track either assembles or honestly does not, and the export is always
  // writable. Neither may throw.
  expect(() => trackOf(draft), `${note}: building the track threw`).not.toThrow();
  expect(() => sourceOf(draft), `${note}: exporting threw`).not.toThrow();
}

/** One random edit, and what it was, so a failure can be read. */
function edit(draft: Draft, rng: Rng): string {
  const n = draft.ring.length;
  const pick = (): number => Math.floor(rng.unitInterval() * n);
  const roll = rng.unitInterval();

  if (roll < 0.3 || n < 2) {
    const at = Math.floor(rng.unitInterval() * (n + 1));
    insertSector(draft, at);
    return `insert at ${at}`;
  }
  if (roll < 0.5) {
    const at = pick();
    dropSector(draft, at);
    return `drop ${at}`;
  }
  if (roll < 0.8) {
    const from = pick();
    const to = pick();
    moveSector(draft, from, to);
    return `move ${from} -> ${to}`;
  }
  // Pieces move too. The game will be adding those mid-season, not just
  // sectors, and a sector's contents changing is what moves the checkpoints
  // every split downstream has to reach.
  const sector = draft.ring[pick()];
  if (sector === undefined) return 'nothing';
  if (roll < 0.9) {
    sector.pieces.push(draftPiece(rng.unitInterval() < 0.5 ? 'straight' : 'corner'));
    return `add a piece to ${sector.id}`;
  }
  const at = Math.floor(rng.unitInterval() * Math.max(1, sector.pieces.length));
  sector.pieces.splice(at, 1);
  return `cut piece ${at} of ${sector.id}`;
}

describe('a ring survives being edited', () => {
  it('stays sound through two thousand random edits', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const rng = makeRng(seed);
      const draft = startingDraft();
      checkSound(draft, `seed ${seed} start`);
      for (let step = 0; step < 100; step += 1) {
        const what = edit(draft, rng);
        checkSound(draft, `seed ${seed} step ${step} (${what})`);
      }
    }
  });

  it('never moves a split or a fixture onto a different stretch of road', () => {
    // The failure this whole file exists for, and the one that cannot be seen
    // by looking: the index is renumbered correctly *or* the thing silently
    // ends up beside another sector. Identity is the only way to tell.
    for (let seed = 1; seed <= 20; seed += 1) {
      const rng = makeRng(seed * 977);
      const draft = startingDraft();
      for (let step = 0; step < 60; step += 1) {
        const before = attachments(draft);
        const what = edit(draft, rng);
        const after = attachments(draft);
        for (const [key, sector] of after) {
          const was = before.get(key);
          // Something new cannot have appeared: these edits never add a split
          // or a fixture.
          expect(before.has(key), `seed ${seed} step ${step}: ${key} appeared`).toBe(
            true,
          );
          expect(sector, `seed ${seed} step ${step} (${what}): ${key} moved road`).toBe(
            was,
          );
        }
      }
    }
  });

  it('only ever loses the things whose sector went with them', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const rng = makeRng(seed * 31 + 7);
      const draft = startingDraft();
      for (let step = 0; step < 60; step += 1) {
        const before = attachments(draft);
        const beforeRing = new Set(draft.ring);
        const what = edit(draft, rng);
        const after = attachments(draft);
        for (const [key, sector] of before) {
          if (after.has(key)) continue;
          // It is gone. The only acceptable reason is that the sector it was
          // beside is gone too.
          expect(
            sector === undefined || !draft.ring.includes(sector),
            `seed ${seed} step ${step} (${what}): ${key} vanished but its sector is still here`,
          ).toBe(true);
          expect(beforeRing.has(sector as never) || sector === undefined).toBe(true);
        }
      }
    }
  });

  it('builds a real track whenever it claims to have one', () => {
    // `trackOf` returning a track is a promise that the thing can be raced.
    // Anything less has to come back undefined rather than half-built.
    //
    // Reordering a closed ring almost never leaves it closed, so the ring is
    // closed deliberately after each edit rather than waited on — which is also
    // how the builder is used, and how the game would use it: change the ring,
    // then ask for the way home.
    for (let seed = 1; seed <= 12; seed += 1) {
      const rng = makeRng(seed * 13 + 1);
      const draft = startingDraft();
      let built = 0;
      for (let step = 0; step < 50; step += 1) {
        edit(draft, rng);
        const shut = structuredClone(draft) as Draft;
        // Fill anything hollow first. Inserting a sector makes an empty one on
        // purpose — it is the thing you are about to put pieces in — so a ring
        // mid-edit routinely has them, and a track never may.
        for (const sector of shut.ring) {
          if (sector.pieces.length === 0) sector.pieces.push(draftPiece('straight'));
        }
        if (!closure(shut).closed) closeRing(shut);
        const track = trackOf(shut);
        if (track === undefined) continue;
        built += 1;
        expect(track.sectors).toHaveLength(shut.ring.length);
        expect(track.length).toBeGreaterThan(0);
        expect(track.checkpoints).toHaveLength(track.sectors.length);
        // Checkpoints climb and the last one leaves a lap still to run, which
        // is what every `sectorAt` in the race assumes.
        track.checkpoints.forEach((at, i) => {
          if (i > 0) expect(at).toBeGreaterThan(track.checkpoints[i - 1] as number);
        });
        expect(track.checkpoints[track.checkpoints.length - 1]).toBeLessThan(track.length);
        for (const sector of track.sectors) {
          expect(sector.routes.length).toBeGreaterThan(0);
          for (const route of sector.routes) {
            expect(route.samples.length).toBeGreaterThan(0);
          }
        }
        for (const fixture of track.fixtures) {
          expect(track.sectors[fixture.sector]).toBeDefined();
        }
      }
      // If the fuzzer never once produced a raceable track the checks above are
      // vacuous, so say so rather than passing quietly.
      expect(built, `seed ${seed} never produced a track`).toBeGreaterThan(0);
    }
  });

  it('refuses an empty sector rather than stacking two checkpoints', () => {
    // Also found by the fuzzer. An empty sector contributes no length, so its
    // checkpoint compares equal to the next one — `sectorAt` never returns it,
    // no ship is ever *in* it, and a fixture placed there could never bite.
    const draft = startingDraft();
    insertSector(draft, 2);
    expect(trackOf(draft)).toBeUndefined();

    draft.ring[2]!.pieces.push(draftPiece('straight'));
    closeRing(draft);
    const track = trackOf(draft);
    expect(track).toBeDefined();
    track?.checkpoints.forEach((at, i) => {
      if (i > 0) expect(at).toBeGreaterThan(track.checkpoints[i - 1] as number);
    });
  });

  it('refuses a ring that goes nowhere rather than handing back a lap of zero', () => {
    // Found by the fuzzer: empty every sector and the ring finishes exactly
    // where it started, so it called itself closed. Canonical distance is a
    // fraction of the lap, so a lap of zero divides by zero everywhere.
    const draft = startingDraft();
    for (const sector of draft.ring) sector.pieces = [];
    draft.splits = [];

    expect(closure(draft).length).toBe(0);
    expect(closure(draft).closed).toBe(false);
    expect(trackOf(draft)).toBeUndefined();
  });
});

describe('moving a sector', () => {
  it('takes its split and its fixtures with it', () => {
    const draft = startingDraft();
    const wasBeside = draft.ring[0];

    const now = moveSector(draft, 0, 2);

    expect(now).toBe(2);
    expect(draft.ring[2]).toBe(wasBeside);
    expect(draft.splits.find((s) => s.id === 'split-0')?.from).toBe(2);
    expect(draft.fixtures.find((f) => f.id === 'fixture-0')?.sector).toBe(2);
  });

  it('slides the sectors it passed over the other way', () => {
    const draft = startingDraft();
    const order = [...draft.ring];

    moveSector(draft, 3, 1);

    expect(draft.ring).toEqual([order[0], order[3], order[1], order[2]]);
    // And what pointed at old 2 now points at 3.
    expect(draft.splits.find((s) => s.id === 'split-2')?.from).toBe(3);
  });

  it('is a no-op when it goes nowhere, or comes from nowhere', () => {
    const draft = startingDraft();
    const before = [...draft.ring];
    expect(moveSector(draft, 1, 1)).toBe(1);
    expect(moveSector(draft, 99, 0)).toBe(99);
    expect(draft.ring).toEqual(before);
  });

  it('clamps a target past the end rather than leaving a hole', () => {
    const draft = startingDraft();
    const moved = draft.ring[0];
    expect(moveSector(draft, 0, 99)).toBe(draft.ring.length - 1);
    expect(draft.ring[draft.ring.length - 1]).toBe(moved);
    expect(draft.ring.filter((s) => s === undefined)).toHaveLength(0);
  });
});
