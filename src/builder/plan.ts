// The draft a builder edits, and how it becomes a track.
//
// A draft is deliberately **not** a `TrackPlan`. A plan holds finished pieces —
// numbers — and once a piece is a number the knob that made it is gone: you
// cannot tell a hairpin from a corner, or know how tight this family of hairpin
// is allowed to get. A draft keeps the catalogue entry and the values, so a
// piece can still be turned after it is placed, and becomes a plan only when it
// is asked to.
//
// Nothing here draws anything. It is the state, the edits, and the export.

import { CATALOGUE, entryOf, familyOf, holdTo, type Entry } from '../sim/catalogue';
import {
  closureOf,
  connector,
  poseAfter,
  poseOfAll,
  type Pose,
  type Section,
} from '../sim/section';
import {
  assemblePlan,
  checkpointPoses,
  type Grade,
  type Piece,
  type Track,
  type TrackPlan,
} from '../sim/track';

/** A piece as the builder holds it: which family, turned how far, facing where. */
export interface DraftPiece {
  readonly entryId: string;
  readonly values: Record<string, number>;
  readonly turn: 1 | -1;
  /**
   * Held exactly, for a piece the catalogue cannot describe.
   *
   * Two things make pieces the shelf has no family for. The connector invents
   * them at whatever size a gap needs, and an existing track may be authored
   * outside any range — the Kestrel's signature bend is 165° at radius 55,
   * which is too open to be a hairpin and too sharp to be a corner.
   *
   * Without this they were run through the nearest family and **clamped**, and
   * clamping silently rewrote the track: that 165° bend came back as 120°, and
   * a zero-length bend left by a rounding error was clamped *up* to a corner's
   * 45° minimum and appeared out of nowhere. Turning any knob replaces it, which
   * is the point — it is exact until somebody edits it.
   */
  readonly exact?: Piece;
}

export interface DraftSector {
  id: string;
  name: string;
  pieces: DraftPiece[];
}

/** A road beside the ring, authored as a lead and a way back. */
export interface DraftSplit {
  id: string;
  name: string;
  from: number;
  grade: Grade;
  lead: DraftPiece[];
  /** How gently the connector is allowed to bring it home. */
  radius: number;
}

export interface Draft {
  name: string;
  shape: string;
  par: number;
  ring: DraftSector[];
  splits: DraftSplit[];
}

/** A drafted piece, resolved to the thing the simulation walks. */
export function pieceOf(draft: DraftPiece): Piece {
  if (draft.exact !== undefined) return draft.exact;
  const entry = entryOf(draft.entryId) ?? (CATALOGUE[0] as Entry);
  return entry.make(draft.values, draft.turn);
}

export const piecesOfSector = (sector: DraftSector): readonly Piece[] =>
  sector.pieces.map(pieceOf);

const sectionOf = (sector: DraftSector): Section => ({
  id: sector.id,
  name: sector.name,
  pieces: piecesOfSector(sector),
  splits: [],
});

export const ringOf = (draft: Draft): readonly Section[] => draft.ring.map(sectionOf);

/** A fresh draft: one straight, so there is something on screen to pull at. */
export function newDraft(): Draft {
  return {
    name: 'New Track',
    shape: 'unfinished',
    par: 2000,
    ring: [
      {
        id: 'sector-1',
        name: 'Sector 1',
        pieces: [{ entryId: 'straight', values: { length: 300 }, turn: 1 }],
      },
    ],
    splits: [],
  };
}

/** A piece at its family's default, ready to be turned. */
export function draftPiece(entryId: string, turn: 1 | -1 = 1): DraftPiece {
  const entry = entryOf(entryId) ?? (CATALOGUE[0] as Entry);
  return { entryId, values: { ...entry.defaults }, turn };
}

/** Turn one knob of one piece, held to what its family allows. */
export function turnKnob(piece: DraftPiece, key: string, value: number): DraftPiece {
  const entry = entryOf(piece.entryId);
  const knob = entry?.knobs.find((k) => k.key === key);
  // Editing a piece makes it a catalogue piece: whatever exact shape it was
  // carrying is what the player is now changing, so it stops being exact.
  const { exact: _dropped, ...rest } = piece;
  void _dropped;
  return {
    ...rest,
    values: { ...piece.values, [key]: knob === undefined ? value : holdTo(knob, value) },
  };
}

/** Where a split's lead leaves it, and where it has to end up. */
export function splitEnds(draft: Draft, split: DraftSplit): { from: Pose; to: Pose } {
  const poses = checkpointPoses(ringOf(draft));
  const from = poses[split.from] ?? { x: 0, y: 0, heading: 0 };
  const to = poses[(split.from + 1) % Math.max(1, poses.length)] ?? from;
  return { from, to };
}

/** A split's whole road: the lead it was given, and the way back. */
export function splitPieces(
  draft: Draft,
  split: DraftSplit,
): readonly Piece[] | undefined {
  const { from, to } = splitEnds(draft, split);
  const lead = split.lead.map(pieceOf);
  const tail = connector(poseAfter(lead, from), to, split.radius);
  return tail === undefined ? undefined : [...lead, ...tail];
}

/** How far the ring is from closing. */
export const closure = (draft: Draft): ReturnType<typeof closureOf> =>
  closureOf(ringOf(draft));

/**
 * Close the ring: a sector running from wherever it has got to back to the
 * start line. Gentle radii first, because a wide one makes a road you would
 * want to drive and a tight one makes a hook.
 */
export function closeRing(draft: Draft, radii = [200, 140, 100, 70, 50, 34]): boolean {
  const ring = ringOf(draft);
  for (const radius of radii) {
    const pieces = connector(poseOfAll(ring), { x: 0, y: 0, heading: 0 }, radius);
    if (pieces === undefined) continue;
    draft.ring.push({
      id: `sector-${draft.ring.length + 1}`,
      name: 'The run home',
      pieces: pieces.map(asDraft),
    });
    return true;
  }
  return false;
}

/**
 * A finished piece read back into a draft one. The connector invents pieces at
 * whatever size a gap needs, which will not be a catalogue default and may not
 * even sit inside a catalogue range — so the family is a best guess and the
 * values are whatever they are.
 */
export function asDraft(piece: Piece): DraftPiece {
  const entry = familyOf(piece);
  const values: Record<string, number> =
    piece.kind === 'straight'
      ? { length: piece.length }
      : { radius: piece.radius, sweep: Math.abs(piece.sweep) };
  const turn: 1 | -1 = piece.kind === 'straight' || piece.sweep >= 0 ? 1 : -1;
  const id = entry?.id ?? (piece.kind === 'straight' ? 'straight' : 'corner');
  // A piece the shelf can describe is held as knobs, so it can be turned. One
  // it cannot is held exactly, because the alternative is quietly rewriting it.
  const described =
    entry !== undefined &&
    entry.knobs.every((knob) => {
      const value = values[knob.key];
      return value !== undefined && value >= knob.min && value <= knob.max;
    });
  return described ? { entryId: id, values, turn } : { entryId: id, values, turn, exact: piece };
}

/**
 * The pieces of the golden path between two distances, read back off its bends.
 *
 * A built `Track` keeps the line and the bends, not the pieces that made them,
 * so loading one into the builder means reconstructing them: every bend in the
 * range becomes a bend piece, and the ground between bends becomes a straight.
 * It round-trips the three tracks exactly because they are made of nothing else.
 */
export function piecesFrom(track: Track, start: number, end: number): Piece[] {
  const pieces: Piece[] = [];
  let at = start;
  // A tolerance, because a bend that ends exactly on a checkpoint compares as
  // ending a hair after it, and a zero-length bend is not a bend.
  const NUDGE = 1e-6;
  for (const bend of track.bends) {
    if (bend.end <= start + NUDGE || bend.start >= end - NUDGE) continue;
    const from = Math.max(start, bend.start);
    const to = Math.min(end, bend.end);
    if (from > at + 0.5) pieces.push({ kind: 'straight', length: from - at });
    const sweep = (((to - from) / bend.radius) * 180) / Math.PI;
    if (sweep > NUDGE) {
      pieces.push({ kind: 'bend', radius: bend.radius, sweep: sweep * bend.turn });
    }
    at = to;
  }
  if (end > at + 0.5) pieces.push({ kind: 'straight', length: end - at });
  return pieces;
}

/** The draft as a plan, or undefined while it is not yet a circuit. */
export function planOf(draft: Draft): TrackPlan | undefined {
  if (!closure(draft).closed) return undefined;
  const splits = [];
  for (const split of draft.splits) {
    const pieces = splitPieces(draft, split);
    if (pieces === undefined) continue;
    splits.push({
      from: split.from,
      grade: split.grade,
      sector: { id: split.id, name: split.name, pieces, splits: [] },
    });
  }
  return {
    name: draft.name,
    shape: draft.shape,
    par: draft.par,
    ring: ringOf(draft),
    splits,
  };
}

/** The draft as a track, or undefined while it is not yet one. */
export function trackOf(draft: Draft): Track | undefined {
  const plan = planOf(draft);
  if (plan === undefined) return undefined;
  try {
    return assemblePlan(plan);
  } catch {
    return undefined;
  }
}
