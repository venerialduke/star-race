# Round 4 — the brief

A **sharpen** round, not a framework round. The difference matters.

## What this round is

`seed.md` in this folder is the owner's brainstorm — the same notes round 3
worked from. Round 3 was a divergence round: four proposers were each told to
pick a design and commit to it, and they produced four different games. The
owner's verdict was that it drifted: the notes became raw material for new
frameworks rather than an idea made sharper.

This round does the opposite. **One designer develops the seed in place.** The
job is to keep the core principle and the feel of the notes intact while making
them into a feasible game: tidy the systems so they mesh, fill in the numbers
the notes leave blank, and present it so the owner can get the feel of it in a
few minutes and say yes, no, or change this.

The test the round is judged by: **the owner should finish reading and
recognise their own idea, sharper.** Not a better idea. Theirs.

## What the designer may and may not do

May:

- Say plainly that part of the idea does not work, and why.
- Propose an addition that makes the rest hold together.
- Choose numbers, name things, decide what the notes left open.
- Cut a detail that is redundant once the rest is tightened.

May not:

- Replace the core principle with a different one, however clever.
- Rename the seed's ideas into a new vocabulary. A golden path stays a golden
  path.
- **Silently drop a named system.** This is the specific failure to design
  against. In round 3 the navigation system and the NPC space cops went from
  the notes to nowhere without ever being argued away, and the crew layer
  survived as a word with no rule that could kill a crew. Every named system in
  the seed must appear in the sharpened design — kept, altered, or flagged in
  "What does not work" with a reason and a suggested replacement.

## Length and shape

Short. Around 1,500 words for the design, around 700 for each set of notes. No
mechanic needs to be fully specified: what is wanted is the feel of each system
and how it meshes with the others, with enough concrete numbers to argue about.
A mechanic sketched in a paragraph with two numbers in it is more useful here
than the same mechanic specified over a page.

**Diagrams are part of the deliverable, not decoration.** The design carries two
mermaid diagrams: one of the loop, one of how the systems connect. They are the
fastest way for a reader on a phone to see how the thing fits together, and
round 3 produced 34,575 words with not one picture in them.

## What holds regardless

Constraints of the medium, not mechanics:

1. **Deterministic simulation.** A race is a pure function of the course, the
   ships, the players' inputs and a seed. "Random" means drawn from the seeded
   generator, never unpredictable.
2. **Fixed integer tick.** No real time inside the simulation.
3. **One thumb, on a phone.** Decisions between races; a race is short enough to
   watch and asks for a handful of taps at most.
4. **Balance is measurable.** Bots playing strategies against each other over
   hundreds of runs should be able to say whether choosing well pays.

The seed has ships damaging one another for bounties. Take that as permitted:
no collision physics and no blocking, but a ship may affect another at range.

## Nothing is inherited

The existing implementation in this repository is out of scope, and so is every
earlier round. Do not read `DESIGN.md`, `src/`, the global brief, the ledger, or
any round folder but this one. An idea that coincides with something built
before is fine on its merits; an idea justified by "this is what the game
already does" is not.
