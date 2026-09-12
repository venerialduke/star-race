# Round 5 — the brief

A sharpen round that iterates on round 4. Three inputs, in a strict order.

## The inputs and what each one is for

1. **The base — `design/rounds/round-04/sharpened.md`, "Fast Ships Answer
   Late".** This is the spine. Round 5 should read as that document with the
   owner's notes worked in: same core idea, same vocabulary, changes where the
   notes ask for them and nowhere else.
2. **The notes — `design/rounds/round-04/feedback.md`.** The owner's response
   to round 4. These lead. Where a note and the base disagree, the note wins.
   Where a note conflicts with something the base is built on, apply the note
   and say plainly that the base's premise moved. Every note must be visibly
   answered — applied, or argued with — never left unaddressed.
3. **The seed — `seed.md` in this folder.** The original brainstorm. It is the
   guard: every named system in it must still be accounted for in the output,
   kept, altered, or flagged. Round 3 lost the navigation system and the space
   cops without a word; that does not happen again.

## What the notes ask for, read plainly

Two of them change how the whole document is written, and one changes the
base's premise.

**Mechanics, not values.** The owner found round 4 too heavy on numbers.
"Shields regenerate slowly" is the right register; a point value is only worth
writing when the mechanic cannot be understood without it. This applies to the
whole document, not just the parts the notes touch.

**Plain words.** Every term is defined where it first appears. "Order lands
late", "rake hit", and what causes an elimination were all unclear. If a reader
has to guess what a word means, the sentence has failed.

**Handling is not reaction lag.** The owner rejects the base's central
mechanic — a fixed delay before a tapped order executes — because a fixed
formula is something a player simply learns to tap early for. The replacement
they sketch: on a curve, a ship swings out or overshoots, with some randomness,
governed by handling and how handling interacts with speed. This is a
load-bearing change; the base's title rests on the mechanic being replaced.
Apply it, and say so.

The rest of the notes: reaction time becomes about how the crew deals with
events, not the player's reflexes — do the shields shift automatically when a
missile comes, how much does the ship collect passing through a resource zone —
possibly with a timing-window tap whose window widens with better reaction;
tapping during a race stays but is 0 to 3 taps and each must do something
worth explaining; route planning happens before the race at the splits the
player can see, with blind picks or crew-driven picks where the track is not
yet known, and the navigation system revealing more at planning time; and
multiple laps per stage stay, the track growing each lap.

## Two known defects to fix as mechanics

Round 4's readers agreed on two things wrong with it. Fix both, in the
register above.

- **The economy pointed away from racing.** An uncontested resource pool paid
  more than winning the heat, so a ship could finish third and leave richer
  than the winner. Winning a heat has to be the best business available;
  everything else is a supplement or a gamble, never a substitute.
- **Gravity was the one rule that made the crew layer matter, and its numbers
  were wrong by half.** Restate it as a mechanic: sustained hard acceleration
  wears a humanoid crew down, a robot crew ignores it, and a crew worn to
  nothing stops acting. Say what "sustained" means in the shape of a lap, not
  in points per tick.

## Length and shape

Around 1,500 words for the design, around 700 for each set of notes. Two
mermaid diagrams in the design — one of the loop, one of how the systems
connect — with plain words in the labels. No mechanic needs to be fully
specified: what is wanted is the feel, and how the systems mesh.

## What holds regardless

Constraints of the medium, not mechanics:

1. **Deterministic simulation.** "Random" means drawn from the seeded
   generator. The swing-out on a curve, a blind pick at a split, a crew's luck —
   all seeded, all reproducible.
2. **Fixed integer tick.** No real time inside the simulation.
3. **One thumb, on a phone.** Decisions between races; a race is short enough
   to watch and asks for a handful of taps at most.
4. **Balance is measurable.** Bots playing strategies against each other over
   hundreds of runs should be able to say whether choosing well pays.

## Nothing else is inherited

The existing implementation in this repository is out of scope, and so is
every round other than the three files named above.
