# Round 7 — the brief

A sharpen round iterating on round 6. This pass is a **vocabulary and
structure correction**, not a new direction. Three inputs, in strict order.

## The inputs

1. **The base — `design/rounds/round-06/sharpened.md`.** The spine.
2. **The notes — `design/rounds/round-06/feedback.md`.** The owner's third
   set. These lead.
3. **The seed — `seed.md` in this folder.** The original brainstorm. The guard.

## What this pass is

Round 6's readers were confused by laps, heats and pit stops, and the owner's
diagnosis is that the document was carrying older meanings for those words.
The notes now define them. The job is to make the document say these things
the same way everywhere, and to fix whatever downstream mechanics were built
on the old meanings.

The definitions, exactly as the owner gave them:

- **The track** is the foundation. It has **checkpoints**. The path or paths
  between checkpoint A and checkpoint B are a **section**. A section may
  **split** into different routes, but every route ends at the same next
  checkpoint. Some sections have no split. Certain checkpoints are also **pit
  stops**, where the player can make purchase choices.
- **A heat** is **two laps** of the track against the **same set of
  opponents**. There is always a pit stop at the end of each lap.
- **A pit stop resynchronises every ship** — all start again together — but
  **total time accrues across every section**, and a tracking bar at the
  bottom of the screen shows who is leading.
- **The time to watch ships move through the sections between pit stops is
  short: thirty seconds at most.**
- **The season is divided into phases**, with several heats in each. The track
  grows and changes between phases, and also when a player buys a track
  extension or modifier between heats. **Eliminations happen at phase
  boundaries.**

## What this closes from round 6

Both readers asked what a ship keeps across a lap boundary, whether nine ships
share one loop, and how long a heat is. The notes answer all three: a pit stop
resets the start line but not the clock; a heat is one group of opponents for
two laps; a lap's worth of sections plays out in thirty seconds or less. The
per-lap reshuffle from round 6 is gone — the same opponents for the whole
heat. Say so in "What changed".

## The one thing that is a question, not an instruction

The owner says eliminations happen at phases, and then adds that they are open
to more frequent elimination moments — maybe between heats. That is thinking
aloud, not a decision. Treat it as a tension to explore: say what changes if
the cut moves from phase boundaries to heat boundaries — what it does to
recovery, to the margin rule, to how a phase feels — and leave it in "What
needs your call" as a systems-level question. Do not pick a side.

## Length and shape

Short. No diagrams. The mechanics prose is where to cut; the note-by-note
"What changed" section may run as long as it needs.

## What holds regardless

1. **Deterministic simulation.** "Random" means drawn from the seeded
   generator.
2. **Fixed integer tick.**
3. **One thumb, on a phone.** The decisions are at pit stops and between
   heats; a section run is short enough to watch.
4. **Balance is measurable.** Bots over hundreds of runs can say whether
   choosing well pays.

## Nothing else is inherited

The existing implementation in this repository is out of scope, and so is
every round other than the three files named above.
