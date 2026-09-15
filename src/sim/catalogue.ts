// The catalogue: the pieces a track is built from, as things with names.
//
// A piece has always been a shape and some numbers. What it has not had is an
// **identity** — `{ kind: 'bend', radius: 30, sweep: 90 }` is a corner, but
// nothing says so, and nothing offers you one. A builder needs a shelf to pick
// from, and the shelf needs to know what a hairpin is and how tight a hairpin
// is allowed to get.
//
// Every entry is a **family**, not a fixed piece: a shape plus the knobs that
// vary it, with the range each knob is sensible over. That is the other half of
// the owner's framework — "if a piece can be described by basic parameters, use
// those as parameters" — and it is what lets the builder offer a slider and the
// gap-filler invent a piece of exactly the size it needs.
//
// Pure data. Nothing here knows about a screen.

import type { Piece } from './track';

/** One thing about a piece you can turn. */
export interface Knob {
  readonly key: 'length' | 'radius' | 'sweep';
  readonly name: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

/** A family of pieces: a shape, and what varies about it. */
export interface Entry {
  readonly id: string;
  readonly name: string;
  /** One line for the shelf. */
  readonly hint: string;
  readonly knobs: readonly Knob[];
  readonly defaults: Readonly<Record<string, number>>;
  /** True for anything that turns, so the builder can offer a direction. */
  readonly turns: boolean;
  make(values: Readonly<Record<string, number>>, turn: 1 | -1): Piece;
}

const length = (min: number, max: number, step = 10): Knob => ({
  key: 'length',
  name: 'length',
  min,
  max,
  step,
});
const radius = (min: number, max: number, step = 2): Knob => ({
  key: 'radius',
  name: 'radius',
  min,
  max,
  step,
});
const sweep = (min: number, max: number, step = 5): Knob => ({
  key: 'sweep',
  name: 'angle',
  min,
  max,
  step,
});

/** Clamp a knob's value to what the family allows. */
export function holdTo(knob: Knob, value: number): number {
  return Math.min(knob.max, Math.max(knob.min, value));
}

const bend =
  (id: string, name: string, hint: string, r: Knob, s: Knob): Entry => ({
    id,
    name,
    hint,
    knobs: [r, s],
    defaults: { radius: (r.min + r.max) / 2, sweep: (s.min + s.max) / 2 },
    turns: true,
    make: (values, turn) => ({
      kind: 'bend',
      radius: holdTo(r, values['radius'] ?? r.min),
      sweep: holdTo(s, values['sweep'] ?? s.min) * turn,
    }),
  });

/**
 * The shelf. Deliberately short: five shapes cover everything the three tracks
 * that ship are made of, and a builder with forty entries is a catalogue nobody
 * reads. The ranges are where each shape stops being itself — a "hairpin" that
 * opens past 45 units of radius is a corner, and a "kink" that turns more than
 * 25° is a sweeper.
 */
export const CATALOGUE: readonly Entry[] = [
  {
    id: 'straight',
    name: 'Straight',
    hint: 'Where speed is made, and where a boost is worth having.',
    knobs: [length(30, 460, 10)],
    defaults: { length: 200 },
    turns: false,
    make: (values) => ({
      kind: 'straight',
      length: holdTo(length(30, 460), values['length'] ?? 200),
    }),
  },
  bend(
    'kink',
    'Kink',
    'Barely a corner. Changes where the track is going without asking anything.',
    radius(120, 320, 10),
    sweep(5, 25, 1),
  ),
  bend(
    'sweeper',
    'Sweeper',
    'Long and open. A quick ship holds it flat; everyone else is fine anyway.',
    radius(70, 200, 5),
    sweep(30, 90, 5),
  ),
  bend(
    'corner',
    'Corner',
    'The ordinary one. Carrying too much speed in costs you the exit.',
    // Down to 24, not 38. The ranges have to *tile*: a 90° bend at radius 30 is
    // the Cinder Coil's opening corner, and it fell in the gap between this and
    // a hairpin — too tight to be a corner, too open to be a hairpin — so the
    // builder could describe neither it nor the track it belongs to.
    radius(24, 90, 2),
    sweep(45, 120, 5),
  ),
  bend(
    'hairpin',
    'Hairpin',
    'Slow, tight and punishing. Nothing survives arriving fast.',
    // Up to 65, not 45. The Kestrel's signature bend is 165° at radius 55 —
    // too open to be a hairpin under the first draft of these ranges and too
    // sharp to be a corner, so it belonged to no family at all and the builder
    // could not describe a track that ships.
    radius(20, 65, 1),
    sweep(120, 180, 5),
  ),
];

export const entryOf = (id: string): Entry | undefined =>
  CATALOGUE.find((entry) => entry.id === id);

/**
 * Which family a piece belongs to, by reading its shape back. Used when a plan
 * is loaded into the builder, so the knobs come back rather than every piece
 * arriving as an anonymous set of numbers.
 */
export function familyOf(piece: Piece): Entry | undefined {
  if (piece.kind === 'straight') return entryOf('straight');
  const turned = Math.abs(piece.sweep);
  return CATALOGUE.find(
    (entry) =>
      entry.turns &&
      entry.knobs.every((knob) =>
        knob.key === 'radius'
          ? piece.radius >= knob.min && piece.radius <= knob.max
          : knob.key === 'sweep'
            ? turned >= knob.min && turned <= knob.max
            : true,
      ),
  );
}
