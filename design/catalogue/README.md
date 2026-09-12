# The catalogue

The framework is settled enough to populate. This folder holds every concrete
option for every mechanic in it — the parts, the crews, the fixtures, the
abilities — as tables the owner dictates and edits. It is a living document;
git is its history. Nothing here is a round.

**Framework:** [round 7, "Fast Ships Swing Wide"](../rounds/round-07/sharpened.md).
The catalogue is written against that document. If dictation changes a
mechanic rather than populating one, it goes in `mechanics-notes.md` and is
flagged, so the framework and the catalogue never silently diverge.

**The build is clean slate.** Nothing here is costed against, or shaped by,
the code in `src/`.

## Tracker

| #   | Element                     | Under               | What it is                                                                             | Shape       | Status        | Rows |
| --- | --------------------------- | ------------------- | -------------------------------------------------------------------------------------- | ----------- | ------------- | ---- |
| 1   | [Ship parts](ship-parts.md) | The ship            | What you bolt on: drives, frames, nav units, shield generators                         | catalogue   | **untouched** | 0    |
| 2   | Corner plans                | The ship            | What the ship does at a bend: Lift, Carry, Charge, and any others                      | catalogue   | untouched     | 0    |
| 3   | Nav goals                   | The ship            | What the navigation system optimises for: lap time, collection, safety, others         | catalogue   | untouched     | 0    |
| 4   | Crew types                  | Crew                | Humanoid, robot, and whatever else — what each is good and bad at                      | catalogue   | untouched     | 0    |
| 5   | Abilities                   | Abilities           | Self-firing moves charged by the golden path: Brace, Rake, Burn, Scoop, others         | catalogue   | untouched     | 0    |
| 6   | Section types               | The track           | The building blocks a track is assembled from: bend kinds, straight kinds, split kinds | catalogue   | untouched     | 0    |
| 7   | Off-path features           | The track           | What lives wide of the path: hazards that hurt, pockets that pay                       | catalogue   | untouched     | 0    |
| 8   | Fixtures                    | Fixtures and splits | Things a player buys and places on a section: Beacon, Slick, Mine, Relay, others       | catalogue   | untouched     | 0    |
| 9   | Player splits               | Fixtures and splits | Routes a player buys and splices in: pocket split, cut split, temporary, permanent     | catalogue   | untouched     | 0    |
| 10  | Collectors                  | Money               | Equipment that opens a pool: Solar Vane, Dark Matter Scoop, Grapple                    | catalogue   | untouched     | 0    |
| 11  | Pools                       | Money               | The shared pots and what earns a share of each: solar, dark matter, bounty             | catalogue   | untouched     | 0    |
| 12  | Declarations                | Points              | Pre-heat bets: Long Line, Hold the Line, others                                        | catalogue   | untouched     | 0    |
| 13  | Ship stats                  | The ship            | The stats themselves — what each one is and what it drives                             | definitions | untouched     | 0    |
| 14  | Season structure            | Season              | Phases, heats per phase, group size, where the cut falls                               | parameters  | untouched     | 0    |
| 15  | Economy flow                | Money               | Every income and every cost, and when each is paid                                     | parameters  | untouched     | 0    |
| 16  | Track growth                | The track           | How the loop grows between phases and on purchase                                      | rules       | untouched     | 0    |

**Status** is one of: `untouched` — nothing dictated yet; `seeded` — the
owner has given a first pass and every row has at least a name and a sentence;
`partial` — some rows are stubs; `reviewed` — a review pass has run against it
(not yet; reviews come after seeding).

**Shape** says what kind of table it is. A _catalogue_ is many rows of the
same kind of thing, one option per row. _Definitions_ name a fixed small set.
_Parameters_ and _rules_ are short and may not be tables at all.

Elements 1–12 are the ones to dictate. 13–16 are mostly already said in the
framework and need confirming rather than inventing.

Rows 10 and 1 may merge: a collector could be a ship part with `slot: collector`.
Decide when dictating collectors.

## How to dictate

Say the element, then talk. Loose prose is fine. For example:

> Ship parts. There's a basic thruster, cheap, more thrust, nothing else. Then
> an overcharged one — a lot more thrust but it wears the crew faster, so it's a
> robot-crew part really. A heavy frame that's all hull, slows you in bends…

That becomes rows in the element's table, with the shape that element's file
defines. The rules of transcription:

- **Nothing is invented.** Every row comes from something said. If a column
  can't be filled from what was said, it is left blank, not guessed.
- **Stats are arrows, not numbers.** `Thrust↑↑ Handling↓` says what a part
  does; the numbers are decided at build time, not here.
- **Mechanics changes are flagged, not absorbed.** If dictation says "actually
  bends should also…", that is a framework change. It goes in
  `mechanics-notes.md` with the date, and the framework stays pinned until the
  owner moves it.
- **Cuts are kept.** A struck row stays with `status: cut` so the record shows
  what was considered.
- **Edits by voice:** "cut the heavy frame", "rename X to Y", "the overcharged
  thruster pairs with Charge", "add a note to Rake: …". Any of these is enough.

Each element's file has its schema at the top, the table, and a **Notes**
section underneath for anything said that does not fit a column. Notes are
kept verbatim-ish; they are the raw material the schema may not have a slot
for yet.

## What happens after seeding

Once every element in 1–12 is `seeded`, three review passes run against the
whole catalogue — rules and interactions, the shape of the option space, and
build planning — and then a build plan is cut from it. Reviewers propose in a
separate table; nothing enters a catalogue without the owner. That is later.
