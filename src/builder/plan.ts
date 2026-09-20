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
import { spanOf } from '../sim/section';
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
  saysNothing,
  walkPieces,
  type Grade,
  type Piece,
  type Properties,
  type Track,
  type TrackPlan,
} from '../sim/track';
import type { FixtureKind } from '../sim/world';

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
  /**
   * What this one piece is like, over whatever its sector says. Kept beside the
   * shape rather than inside `values`, because a knob is a number a family
   * understands and this is not — a straight and a hairpin carry properties the
   * same way, and no catalogue entry has an opinion about them.
   */
  readonly properties?: Properties;
}

export interface DraftSector {
  id: string;
  name: string;
  pieces: DraftPiece[];
  /** What the whole stretch is like. Every piece in it inherits these. */
  properties?: Properties;
}

/**
 * Something the author puts on the road, as the builder holds it.
 *
 * `route` is an index into the sector's roads — 0 is the golden path, 1 and up
 * are its splits in the order they were added — which is the same index the
 * race uses, so a fixture on a split is no danger on the main line.
 */
export interface DraftFixture {
  id: string;
  kind: FixtureKind;
  sector: number;
  route: number;
  /** How far through the sector, 0 to 1. */
  at: number;
  offset: number;
  power: number;
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
  fixtures: DraftFixture[];
}

/** A drafted piece, resolved to the thing the simulation walks. */
export function pieceOf(draft: DraftPiece): Piece {
  const entry = entryOf(draft.entryId) ?? (CATALOGUE[0] as Entry);
  const shape = draft.exact ?? entry.make(draft.values, draft.turn);
  // Properties ride on top of whichever shape came out, exact or made. A piece
  // the catalogue cannot describe is still a piece that can sit in a nebula.
  return saysNothing(draft.properties)
    ? shape
    : { ...shape, properties: draft.properties as Properties };
}

export const piecesOfSector = (sector: DraftSector): readonly Piece[] =>
  sector.pieces.map(pieceOf);

const sectionOf = (sector: DraftSector): Section => ({
  id: sector.id,
  name: sector.name,
  pieces: piecesOfSector(sector),
  ...(saysNothing(sector.properties) ? {} : { properties: sector.properties }),
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
    fixtures: [],
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
 * Why this draft is not a track yet, in one sentence, or undefined when it is.
 *
 * Closure is not the only thing that stops a ring being raceable, and since
 * inserting a sector deliberately makes an empty one, "closed" on its own became
 * a misleading thing to show: the panel would say *closed circuit* about a ring
 * that `assemblePlan` refuses. Whatever refuses it should be what the panel
 * says, so this asks the real thing rather than guessing alongside it.
 */
export function faultOf(draft: Draft): string | undefined {
  const hollow = draft.ring.findIndex((s) => spanOf(piecesOfSector(s)) <= 0);
  if (hollow >= 0) return `Sector ${hollow + 1} is empty — put a piece in it`;
  const state = closure(draft);
  if (!state.closed) return undefined;
  try {
    assemblePlan(planOf(draft) as TrackPlan);
    return undefined;
  } catch (thrown) {
    return thrown instanceof Error ? thrown.message : 'cannot be assembled';
  }
}

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
  const kept = saysNothing(piece.properties) ? {} : { properties: piece.properties };
  return described
    ? { entryId: id, values, turn, ...kept }
    : { entryId: id, values, turn, exact: piece, ...kept };
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
      sector: { id: split.id, name: split.name, pieces },
    });
  }
  return {
    name: draft.name,
    shape: draft.shape,
    par: draft.par,
    ring: ringOf(draft),
    splits,
    fixtures: draft.fixtures.filter((f) => draft.ring[f.sector] !== undefined),
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

const AUTO_NAME = /^Sector \d+$/;

/**
 * Ids and default names follow position.
 *
 * The panel numbers rows by where they are, so a sector still called
 * "Sector 3" sitting at row 4 is a lie, and two sectors sharing an id would
 * both be exported as `sector('sector-3', …)`. A name somebody chose — the
 * closer's "The run home" — is left alone; only the default is rewritten.
 */
function renumber(draft: Draft): void {
  draft.ring.forEach((sector, i) => {
    sector.id = `sector-${i + 1}`;
    if (AUTO_NAME.test(sector.name)) sector.name = `Sector ${i + 1}`;
  });
}

/**
 * Where every old sector index ended up: its new index, or `undefined` if the
 * sector is gone.
 *
 * **Every edit to the ring goes through one of these.** Insert, remove and move
 * are three different shuffles of the same list, and each one was written by
 * hand the first time — which produced the same bug three times over, because a
 * split and a fixture both hang off a sector by *index* and both have to be
 * carried along. One description of the shuffle, one place that applies it, and
 * the property tests hammer that one place instead of three.
 */
type Moved = readonly (number | undefined)[];

/** Carry everything that points at a sector through a shuffle of the ring. */
function carry(draft: Draft, moved: Moved): void {
  // A split whose sector is gone has nothing left to be beside: the two
  // checkpoints it ran between are now one checkpoint. Same for a fixture —
  // there is no road left for it to sit on.
  draft.splits = draft.splits.flatMap((split) => {
    const to = moved[split.from];
    return to === undefined ? [] : [{ ...split, from: to }];
  });
  draft.fixtures = draft.fixtures.flatMap((fixture) => {
    const to = moved[fixture.sector];
    return to === undefined ? [] : [{ ...fixture, sector: to }];
  });
  renumber(draft);
}

/**
 * A sector put in at a position, and everything past it moved up.
 *
 * Appending is not the same edit. A ring is a loop, so "the end" is the stretch
 * of road immediately *before* the start line, which is almost never where a
 * sector was meant to go. Inserting puts it where it was asked for.
 *
 * The new sector is empty, which costs no distance — the geometry only moves
 * once pieces go into it.
 *
 * Returns the index the new sector landed at.
 */
export function insertSector(draft: Draft, at: number): number {
  const index = Math.max(0, Math.min(Math.trunc(at), draft.ring.length));
  const was = draft.ring.length;
  draft.ring.splice(index, 0, {
    id: `sector-${index + 1}`,
    name: `Sector ${index + 1}`,
    pieces: [],
  });
  carry(
    draft,
    Array.from({ length: was }, (_, k) => (k < index ? k : k + 1)),
  );
  return index;
}

/**
 * A sector taken out, and everything past it moved down.
 *
 * Whatever pointed at the removed sector goes with it; everything after shifts.
 * The first version kept whichever splits happened to still be in range and
 * left their indices alone, which slid every later split one sector up the
 * track without saying so.
 */
export function dropSector(draft: Draft, at: number): void {
  const index = Math.trunc(at);
  const was = draft.ring.length;
  if (draft.ring[index] === undefined) return;
  draft.ring.splice(index, 1);
  carry(
    draft,
    Array.from({ length: was }, (_, k) =>
      k === index ? undefined : k < index ? k : k - 1,
    ),
  );
}

/**
 * A sector picked up and put down somewhere else in the ring.
 *
 * The shuffle is worked out by doing it to a list of indices rather than by
 * reasoning about which way things shift — move one item in a list and the
 * items between the two positions all slide by one, in a direction that depends
 * on which way it went. Reasoning about that is how the off-by-one gets in;
 * splicing a list of indices and reading off where each landed cannot be wrong.
 *
 * A split moves **with** its sector, because a split is the road beside that
 * stretch and not the road beside that position. Note that the geometry does
 * not come along quietly: reordering a closed ring almost always opens it, and
 * a split whose checkpoints have moved may no longer reach the next one. Both
 * show in the panel rather than passing silently.
 *
 * Returns where the sector ended up.
 */
export function moveSector(draft: Draft, from: number, to: number): number {
  const n = draft.ring.length;
  if (draft.ring[from] === undefined) return from;
  const target = Math.max(0, Math.min(Math.trunc(to), n - 1));
  if (target === from) return from;

  const order = Array.from({ length: n }, (_, i) => i);
  order.splice(target, 0, ...order.splice(from, 1));
  const sector = draft.ring.splice(from, 1)[0] as DraftSector;
  draft.ring.splice(target, 0, sector);

  const moved: (number | undefined)[] = Array.from({ length: n }, () => undefined);
  order.forEach((old, now) => {
    moved[old] = now;
  });
  carry(draft, moved);
  return target;
}

/**
 * Every road through a sector, in the order the race indexes them: the golden
 * path first, then its splits.
 *
 * It skips a split that cannot reach its checkpoint for the same reason
 * `planOf` does, and that matching matters more than it looks — a fixture is
 * authored against a route *index*, so if the builder counted a broken split
 * and the track did not, every fixture past it would sit on the wrong road.
 */
export function roadsOf(
  draft: Draft,
  sector: number,
): readonly { readonly name: string; readonly pieces: readonly Piece[] }[] {
  const here = draft.ring[sector];
  if (here === undefined) return [];
  const roads = [{ name: 'The golden path', pieces: piecesOfSector(here) }];
  for (const split of draft.splits) {
    if (split.from !== sector) continue;
    const pieces = splitPieces(draft, split);
    if (pieces !== undefined) roads.push({ name: split.name, pieces });
  }
  return roads;
}

/** Where a fixture sits and which way the road faces there, for drawing it. */
export function fixturePose(draft: Draft, fixture: DraftFixture): Pose | undefined {
  const roads = roadsOf(draft, fixture.sector);
  const road = roads[fixture.route] ?? roads[0];
  const from = checkpointPoses(ringOf(draft))[fixture.sector];
  if (road === undefined || from === undefined) return undefined;
  const samples = walkPieces(road.pieces, from).samples;
  if (samples.length === 0) return undefined;
  const at = Math.min(1, Math.max(0, fixture.at));
  const sample = samples[Math.round(at * (samples.length - 1))];
  if (sample === undefined) return undefined;
  const n = { x: -Math.sin(sample.heading), y: Math.cos(sample.heading) };
  return {
    x: sample.pos.x + n.x * fixture.offset,
    y: sample.pos.y + n.y * fixture.offset,
    heading: sample.heading,
  };
}

/** A fixture at its default: half way down the golden path, on the line. */
export function newFixture(draft: Draft, sector: number): DraftFixture {
  // The first free number, not the count. A fixture's id is what the race keys
  // "already bitten by this" on, so two sharing one means the second never
  // bites anybody — and counting would hand out a duplicate the moment one in
  // the middle is deleted.
  const taken = new Set(draft.fixtures.map((f) => f.id));
  let n = 1;
  while (taken.has(`fixture-${n}`)) n += 1;
  return {
    id: `fixture-${n}`,
    kind: 'mine',
    sector,
    route: 0,
    at: 0.5,
    offset: 0,
    power: DEFAULT_FIXTURE_POWER,
  };
}

/**
 * What a fixture carries when it is first placed. Level data rather than
 * balance: it is the number a builder immediately drags, and every track will
 * have a different answer.
 */
const DEFAULT_FIXTURE_POWER = 30;

/**
 * Set one field of a set of properties, dropping it when it goes back to
 * nothing. Properties that say nothing are left absent rather than written as
 * zeroes, so a sector that has never been touched exports as a sector rather
 * than as a sector with three empty opinions.
 */
export function setProperty(
  properties: Properties | undefined,
  key: 'environment' | 'pocket' | 'hazard',
  value: string | number,
): Properties | undefined {
  const next: Record<string, string | number> = { ...properties };
  if (value === '' || value === 0 || value === 'open') delete next[key];
  else next[key] = value;
  const cleaned = next as Properties;
  return saysNothing(cleaned) ? undefined : cleaned;
}
