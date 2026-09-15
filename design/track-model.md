# The track model

**Status:** spec. Agreed 2026-09-15; built in stages, see the bottom.

A track is a **graph**, not a list. Checkpoints are its nodes, sectors are its
edges, and a split is simply a second edge between the same two nodes. That one
sentence is the whole change, and everything below follows from it.

What is there today is a list with decorations: an ordered run of sections, with
splits hung off each one as a *number* that pushes the golden path sideways.

## The four things

### A piece

The smallest unit. A **shape** described by parameters, and **properties**
describing what the stretch is like beyond its shape.

```ts
type Shape =
  | { kind: 'straight'; length: number }
  | { kind: 'bend'; radius: number; sweep: number };   // degrees, + turns left

interface Piece {
  readonly shape: Shape;
  /** Half-width of the golden path here. The track's default when unset. */
  readonly halfWidth?: number;
  readonly properties?: Properties;
}
```

Shapes stay parametric, which is what lets the builder offer a slider rather
than a text field, and what lets the closer below invent a piece of exactly the
size a gap needs.

### Properties

What a stretch is *like*. Everything optional, everything additive; a piece's
own properties override the sector's.

```ts
interface Properties {
  /** What surrounds it. Drawn, and eventually what lives there. */
  readonly environment?: 'open' | 'nebula' | 'debris' | 'shadow';
  /** Pays a ship that flies it: dark matter, salvage. */
  readonly pocket?: number;
  /** Danger **on** the path, rather than only off it. */
  readonly hazard?: number;
}
```

This is new. Nothing today can say anything about a stretch of track except its
shape, which is exactly why every split has had to be balanced on the clock —
the backlog has wanted "a split worth taking because it is safer, or because it
holds resources" since S4 and there has been no way to express it.

### A sector

Pieces in order, with properties of its own.

```ts
interface Sector {
  readonly id: string;
  readonly name: string;
  readonly pieces: readonly Piece[];
  readonly properties?: Properties;
}
```

This is `Section` renamed to the owner's word, plus properties, minus the
`splits` field — because splits stop being something a sector *has*.

### A track

```ts
interface TrackPlan {
  readonly name: string;
  readonly shape: string;
  readonly par: number;
  /** The golden path in order. A checkpoint falls between consecutive sectors. */
  readonly ring: readonly Sector[];
  readonly splits: readonly SplitEdge[];
}

interface SplitEdge {
  readonly sector: Sector;
  /** The checkpoint it leaves, as an index into the ring. */
  readonly from: number;
  readonly grade: Grade;
}
```

**Checkpoint poses are derived, never authored.** Walk the ring and they fall
out. Authoring both the ring and the checkpoint positions would be two sources
of truth that can disagree, and the disagreement would be silent.

## What this fixes

**A split stops being a number whose meaning depends on where a boundary
happens to sit.** Today a split is `{ bulge: 46 }` and `routeFrom` samples the
golden path and shoves each sample sideways. Move the checkpoint and the split
silently becomes a different road — which is exactly what happened when sections
landed: the Kestrel's "The needle" had to be re-measured and changed from 46 to
55 to get its character back. Under this model that cannot happen. A split is
authored geometry; it either still connects its two checkpoints or it is
invalid, and something says so.

**Splits stop being near-duplicates.** These tracks are one half walked twice,
so "The cut" and "The needle" now sit on identical shapes and differ only by
four units of bulge. Authored split sectors make them different roads.

**A whole derivation disappears.** `bendsOfCurve` exists because a split is a
deformed polyline with no bends of its own, so V1.2 had to read curvature back
off the samples to find them — and that reading lied about exactly the corners
that mattered, turning a 42-radius hairpin into a 60. A split sector has
authored bends with authored radii. The problem stops existing.

**Growing the loop becomes ordinary.** S4.4 — junctions opening, sectors spliced
in from a season seed — is "add a node, add edges" rather than anything special.

## Snapping and closing

Unchanged in principle, and already built:

- `closureOf(sectors)` says how far a run is from coming home, in units and
  degrees.
- `closingSection(sectors, radius)` builds the run home: the shortest
  curve-straight-curve path between two poses, of the four that exist.

What changes is that **the same machinery serves splits**. A split has to leave
its checkpoint and arrive at the next one *at the same poses the ring has* —
which is a start pose and a goal pose, which is the problem the closer already
solves. So authoring a split is: lay some pieces, then close back to the
checkpoint. One mechanism, two uses.

The builder's "fill the gap" is therefore always available and always minimal:
at most a bend, a straight and a bend, at whatever radius keeps it gentle.

## What it costs

Named up front, because all three are real.

1. **Nine splits have to be re-authored as geometry.** Their character will
   change, so the split measurements from V1.2 are void. Balance is parked, so
   this lands as "recorded, not re-tuned".
2. **Per-piece width touches the racing maths**, not just the track. The swing's
   wide threshold, the corridor, and the fork pull all key off the global
   `PATH_HALF_WIDTH` / `TRACK_HALF_WIDTH`. This is the one with the widest blast
   radius and it comes last.
3. **The pinned lap times will move again.** They moved when sections landed;
   re-authored splits will move them once more. Same treatment: re-pin, and say
   which part is luck and which part is a real change.

## What is deliberately not in it

**A split that skips a checkpoint.** The graph allows an edge spanning two
nodes, and it is a genuinely interesting road — a shortcut that bypasses a whole
sector. But lap counting, `sectorAt` and canonical distance all assume every
ship crosses every checkpoint. `SplitEdge` therefore has no `spans` field yet.
When it gets one, that assumption is the work, not the geometry.

## Stages

1. **Pieces gain properties**, inert. Nothing reads them yet.
2. **Splits become sectors.** Routes built by walking pieces; `routeFrom` and
   `bendsOfCurve` retired; the three tracks' splits re-authored as geometry.
3. **Checkpoints become poses**, and a validator that says which split does not
   meet its checkpoint and by how much.
4. **The catalogue, and the builder.** — **done**. `builder.html`, its own page
   on the same site. Five piece families on a shelf, each a shape plus the knobs
   that vary it; sectors built from them; the loop drawn live with its
   checkpoints; "close the loop" when it is open; and an export that writes the
   TypeScript to paste into `track.ts`.

   Two rules came out of building it, both learned by getting them wrong.
   **The catalogue must not clamp a piece it cannot describe** — the connector
   invents pieces at whatever size a gap needs, and a track may be authored
   outside every range, so squeezing them into the nearest family silently
   rewrites the track. A piece with no family is held exactly and stops being
   exact the moment a knob is turned. And **the ranges have to tile**: a 90°
   bend at radius 30 was too tight for a corner and too open for a hairpin, so
   the Cinder Coil contained a piece the builder could not name.
5. **Properties do something.** Environment drawn first, since it is visible and
   safe; pocket and hazard after, since they are balance.
6. **S4.4** — the ring grows between phases.
