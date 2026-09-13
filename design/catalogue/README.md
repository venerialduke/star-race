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

<!-- tracker:start -->

| # | Element | Under | What it is | Shape | Status | Rows |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | [Frames](frames.md) | The ship | Starting kits: the engine, shields and crew a ship begins with | catalogue | untouched | 0 |
| 2 | [Ship parts](ship-parts.md) | The ship | Components that fill the slots: engines, shields, crew, navigation, weapons and deployables, collection | catalogue | seeded | 5 |
| 3 | [Corner plans](corner-plans.md) | The ship | What the ship does at a bend: Lift, Carry, Charge, others | catalogue | untouched | 0 |
| 4 | [Nav goals](nav-goals.md) | The ship | What the navigation system optimises for | catalogue | untouched | 0 |
| 5 | [Crew types](crew-types.md) | The ship | Humanoid, robot, and whatever else | catalogue | untouched | 0 |
| 6 | [Abilities](abilities.md) | The ship | Charged moves, if components have them: boost, teleport, others — unresolved | catalogue | partial | 2 (2 stub) |
| 7 | [Ship stats](ship-stats.md) | The ship | The stats themselves and what each drives | definitions | untouched | 0 |
| 8 | [Split anatomy](split-anatomy.md) | The track | The pieces a split is made of: straights, corners, bends, banking | catalogue | seeded | 4 |
| 9 | [Off-path features](off-path-features.md) | The track | What lives on a split: hazards that hurt or move you, pockets that pay | catalogue | partial | 2 (2 stub) |
| 10 | [Fixtures](fixtures.md) | The track | Objects a player buys and places on the track | catalogue | untouched | 0 |
| 11 | [Track augments](track-augments.md) | The track | Splits or whole sectors a player adds, temporary or permanent | catalogue | partial | 2 (2 stub) |
| 12 | [Track growth](track-growth.md) | The track | How the loop grows between phases | rules | untouched | 0 |
| 13 | [Collectors](collectors.md) | Money & points | Equipment that opens a pool | catalogue | untouched | 0 |
| 14 | [Pools](pools.md) | Money & points | The shared pots and what earns a share | catalogue | untouched | 0 |
| 15 | [Declarations](declarations.md) | Money & points | Pre-heat bets: Long Line, Hold the Line, others | catalogue | untouched | 0 |
| 16 | [Economy flow](economy-flow.md) | Money & points | Every income, every cost, every shop, and when each happens | parameters | partial | 10 (3 stub) |
| 17 | [Season structure](season-structure.md) | The season | Pacing lap, phases, heats, groups, the cut | parameters | seeded | 5 |

<!-- tracker:end -->

**Status** is derived from each element's file, not typed: `untouched` — no
rows; `partial` — some rows are stubs; `seeded` — every row has a sentence.
Review status comes later.

**Shape** says what kind of table it is. A _catalogue_ is many rows of the
same kind of thing, one option per row. _Definitions_ name a fixed small set.
_Parameters_ and _rules_ are short lists, confirmed rather than invented.

The tracker above and the page at `/design/mechanics.html` are both rendered
from `index.json` and the element files by `npm run mechanics-page`. Add an
element in `index.json`; add rows in the element's file; run the script. A
row is edited in exactly one place.

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
