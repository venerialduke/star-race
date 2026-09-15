// The builder must not quietly rewrite a track.
//
// It is a tool for making level data, so the one thing it cannot do is change
// the thing you loaded. Both bugs this suite was written after did exactly
// that, and neither looked like a bug on screen: the Kestrel's signature 165°
// bend came back as 120° because no catalogue family covered it and it was
// clamped to the nearest one, and a zero-length bend left by a rounding error
// was clamped *up* to a corner's 45° minimum and appeared out of nowhere.

import { describe, expect, it } from 'vitest';
import { CATALOGUE, familyOf } from '../../src/sim/catalogue';
import { spanOf } from '../../src/sim/section';
import { TRACKS, type Piece, type Track } from '../../src/sim/track';
import { sourceOf } from '../../src/builder/export';
import {
  asDraft,
  closeRing,
  closure,
  draftPiece,
  newDraft,
  pieceOf,
  piecesFrom,
  trackOf,
  turnKnob,
  type Draft,
} from '../../src/builder/plan';

/** A shipped track, loaded into the builder the way the page loads it. */
function draftOf(track: Track): Draft {
  return {
    name: track.name,
    shape: track.shape,
    par: track.par,
    ring: track.sectors.map((sector, i) => ({
      id: `sector-${i + 1}`,
      name: `Sector ${i + 1}`,
      pieces: piecesFrom(track, sector.start, sector.end).map(asDraft),
    })),
    splits: [],
    fixtures: [],
  };
}

const describePiece = (piece: Piece): string =>
  piece.kind === 'straight'
    ? `S${piece.length.toFixed(3)}`
    : `B${piece.radius.toFixed(3)}/${piece.sweep.toFixed(3)}`;

describe.each(TRACKS)('$name, loaded into the builder', (track: Track) => {
  it('comes back as the same pieces it went in as', () => {
    const draft = draftOf(track);
    const out = draft.ring.flatMap((sector) => sector.pieces.map(pieceOf));
    const original = track.sectors.flatMap((sector) =>
      piecesFrom(track, sector.start, sector.end),
    );
    expect(out.map(describePiece)).toEqual(original.map(describePiece));
  });

  it('comes back as the same lap', () => {
    const draft = draftOf(track);
    const total = draft.ring.reduce(
      (sum, sector) => sum + spanOf(sector.pieces.map(pieceOf)),
      0,
    );
    expect(total).toBeCloseTo(track.length, 3);
  });

  it('is still a closed circuit, and still assembles', () => {
    const draft = draftOf(track);
    expect(closure(draft).closed).toBe(true);
    const rebuilt = trackOf(draft);
    expect(rebuilt).toBeDefined();
    expect((rebuilt as Track).length).toBeCloseTo(track.length, 3);
    expect((rebuilt as Track).sectors).toHaveLength(track.sectors.length);
  });

  it('has a shelf that can describe every piece it is made of', () => {
    // A family for every piece, or the builder offers a track it cannot edit.
    for (const sector of track.sectors) {
      for (const piece of piecesFrom(track, sector.start, sector.end)) {
        expect(familyOf(piece), `no family for ${describePiece(piece)}`).toBeDefined();
      }
    }
  });
});

describe('a piece the catalogue cannot describe', () => {
  it('is held exactly rather than squeezed into the nearest family', () => {
    // A bend far outside every range. Clamping it would rewrite the track.
    const odd: Piece = { kind: 'bend', radius: 900, sweep: 4 };
    const held = asDraft(odd);
    expect(held.exact).toBeDefined();
    expect(pieceOf(held)).toEqual(odd);
  });

  it('stops being exact the moment somebody turns a knob on it', () => {
    const held = asDraft({ kind: 'bend', radius: 900, sweep: 4 });
    const turned = turnKnob(held, 'radius', 60);
    expect(turned.exact).toBeUndefined();
    expect(pieceOf(turned).kind).toBe('bend');
  });

  it('keeps a catalogue piece as knobs, so it can still be turned', () => {
    const ordinary = asDraft({ kind: 'straight', length: 200 });
    expect(ordinary.exact).toBeUndefined();
    expect(pieceOf(turnKnob(ordinary, 'length', 120))).toEqual({
      kind: 'straight',
      length: 120,
    });
  });
});

describe('closing the loop', () => {
  it('closes whatever the shelf has been used to build', () => {
    // Pieces chosen for being an arbitrary shape, not a circuit.
    for (const start of [
      ['corner', 'straight', 'corner', 'straight', 'sweeper'],
      ['hairpin', 'straight', 'kink'],
      ['sweeper', 'sweeper'],
      ['straight'],
    ]) {
      const draft = newDraft();
      draft.ring[0] = {
        id: 'sector-1',
        name: 'Sector 1',
        pieces: start.map((id) => draftPiece(id)),
      };
      expect(closure(draft).closed).toBe(false);
      expect(closeRing(draft), `could not close ${start.join(' + ')}`).toBe(true);
      expect(closure(draft).closed).toBe(true);
      expect(trackOf(draft)).toBeDefined();
    }
  });

  it('holds the closing pieces exactly, since it invented them', () => {
    const draft = newDraft();
    draft.ring[0] = {
      id: 'sector-1',
      name: 'Sector 1',
      pieces: ['corner', 'straight', 'corner'].map((id) => draftPiece(id)),
    };
    closeRing(draft);
    const home = draft.ring[draft.ring.length - 1];
    expect(home?.pieces.some((piece) => piece.exact !== undefined)).toBe(true);
  });
});

describe('what it hands back', () => {
  it('writes source that names the track and every sector', () => {
    const draft = draftOf(TRACKS[0] as Track);
    const source = sourceOf(draft);
    expect(source).toContain(`name: '${(TRACKS[0] as Track).name}'`);
    expect(source).toContain('assemblePlan({');
    for (const sector of draft.ring) expect(source).toContain(`'${sector.id}'`);
  });

  it('offers a shelf worth reading', () => {
    // Short on purpose: a catalogue of forty entries is one nobody reads.
    expect(CATALOGUE.length).toBeGreaterThan(3);
    expect(CATALOGUE.length).toBeLessThan(10);
    for (const entry of CATALOGUE) {
      expect(entry.knobs.length).toBeGreaterThan(0);
      for (const knob of entry.knobs) expect(knob.max).toBeGreaterThan(knob.min);
    }
  });
});
