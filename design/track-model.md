# The track model

**Status:** spec. Agreed 2026-09-15; built in stages, see the bottom.

A track is a **graph**, not a list. Checkpoints are its nodes, sectors are its
edges, and a split is simply a second edge between the same two nodes. That one
sentence is the whole change, and everything below follows from it.

What is there today is a list with decorations: an ordered run of sections, with
splits hung off each one as a _number_ that pushes the golden path sideways.

## The four things

### A piece

The smallest unit. A **shape** described by parameters, and **properties**
describing what the stretch is like beyond its shape.

```ts
type Shape =
  { kind: 'straight'; length: number } | { kind: 'bend'; radius: number; sweep: number }; // degrees, + turns left

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

What a stretch is _like_. Everything optional, everything additive; a piece's
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
`splits` field — because splits stop being something a sector _has_.

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
its checkpoint and arrive at the next one _at the same poses the ring has_ —
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

   A third rule came later, from the first person to use the tool. **A sector
   can be put in anywhere, and every index into the ring moves with it.** The
   builder could only append, and a ring is a loop: the end of it is the road
   immediately before the start line, which is the one place a new sector is
   never wanted. Inserting is the same edit at a chosen place — and because a
   split's only handle on the ring is a sector index, an edit that does not
   shift those indices leaves the split beside a different piece of road. It
   still exports, still draws, and is not the track that was built. `insertSector`
   and `dropSector` in `src/builder/plan.ts` own that, and are the only way the
   page is allowed to change the ring's length.

5. **Properties do something.** — **done**. A stretch resolves to an `Effect`:
   `grip` on the holding speed, `sight` on how set you are for a bend you could
   not see coming, `hazard` as damage, `pocket` as salvage. A sector's word
   reaches every piece in it and a piece may override one field of it; resolution
   happens once, at assembly, so the race tick never asks a sector anything. The
   result is a small `bands` table per line, in that line's own distances — the
   same shape `bends` has, and for the same reason: a property is a fact about a
   stretch, and a field on every sample would smear it. A stretch that says
   nothing contributes no band, so a track using none of this is bit-identical to
   what it was.

   Environment is drawn, on the map and in the builder alike, because the map is
   where a player decides whether the long way round a nebula is worth the time.

   Two things came out of building it. **A hazard bites once on the way in**, as
   the excursion hazard does; per-tick damage is a ban on a build rather than a
   risk to it, and pinning that took flying a Lift ship that spends 963 ticks
   inside a debris field and is bitten on two of them. And **the first version of
   `sight` was backwards**: it moved the braking point, which meant braking late,
   which meant carrying more speed down the straight — and since Lift clamps to
   the holding speed on the bend anyway, a track built out of shadow came out
   fractionally *quicker*. Measured, 374.2 against 372.3. Sight is a term on the
   swing's excess now, beside Charge's own, which also makes Lift immune to it:
   the plan that takes no swing has nothing for a surprise to make worse.

   The builder edits properties at both levels and places the track's own
   fixtures. A fixture is authored as a sector, a road index and a fraction — so
   `insertSector` and `dropSector` remap them exactly as they remap splits, and
   the builder's list of roads through a sector has to be counted the way the
   race indexes them or a fixture lands on the wrong road.
6. **S4.4** — the ring grows between phases.

   Groundwork done ahead of it, because the builder needed the same thing. A
   sector can be put in before or after any other, and dragged to a new place in
   the ring; **all three edits go through one `carry`**, which is the only code
   that knows how a shuffle renumbers the indices a split and a fixture hang off.
   Three separate hand-written versions of that produced the same bug three
   times, so there is now one, and `tests/builder/unbreakable.test.ts` fuzzes it
   with seeded sequences of two thousand edits rather than trusting it.

   That fuzzer immediately found two ways to make an unraceable track, both of
   which an unattended mid-season edit could have made: a ring of empty sectors
   reports itself closed and yields a lap of length zero, and a single empty
   sector puts two checkpoints in the same place so no ship is ever inside it.
   Both are refused at assembly now, and the builder says which sector is at
   fault rather than claiming a closed circuit the assembler will reject.

7. **Verticality** — **done**. Crossings are found by walking the line and given
   a bridge; see `DESIGN.md`. It lives in `src/render/height.ts` so that the
   ESLint boundary makes "this cannot affect the race" structural rather than a
   promise. What it does *not* do is fix a class of bug, because that class does
   not exist: the simulation holds a ship as a canonical distance and a lateral
   offset and never as a point on a plane, so two roads overlapping in the plan
   view were never able to interfere.
