# Round 6 — the brief

A sharpen round iterating on round 5. Three inputs, in strict order.

## The inputs

1. **The base — `design/rounds/round-05/sharpened.md`, "Fast Ships Swing
   Wide".** The spine. Round 6 reads as that document with the notes worked
   in.
2. **The notes — `design/rounds/round-05/feedback.md`.** The owner's second
   set. These lead. Every note is visibly answered — applied, or argued with —
   never left unaddressed.
3. **The seed — `seed.md` in this folder.** The original brainstorm. The guard:
   every named system in it is accounted for, kept, altered, or flagged.

## What the notes ask for, read plainly

**The opening.** "The idea in one paragraph" framed the whole game as one
tension, and it is not. Replace it with a short summary of the mechanics: what
a stage is, what a ship does and how a build comes together, how the track
evolves.

**Speed and thrust.** How a ship's speed and acceleration are determined is
not stated. This is auto-battle: the player does not drive. The build — thrust,
crew, navigation, plus a few pre-race choices — has to determine speed and
acceleration, and the document has to say how. The owner offers three
threads: a pre-race "how to approach corners" choice about braking and
acceleration in turns; a wild thrust build being able to overshoot into a
different split of the track; and better navigation auto-choosing lines by a
goal the player sets, lap time or collection.

**Taps.** The owner is not sold. Alternative: the ship has abilities from its
build that charge during the race and fire when optimal, automatically. The
owner names the downside — targeting rivals or placing mines gets hard. Do not
fix the number of taps or abilities; list a few as examples. Fixture placement
may simply happen before the race.

**Crew maintenance.** Dead or injured crew may cost money between rounds.

**Influencing the track.** Are fixtures the only way? Some builds might add a
split of a certain type, or a track section, temporarily or permanently.

**Wanted and cops.** Remove. Keep things simple. This is a named seed system —
it goes in "What does not work" as removed at the owner's request, not silently
absent.

**Eliminations.** A set points cutoff rather than "bottom two," so the number
cut can vary. Say where points live and how they differ from credits. The
owner likes heat declarations and wants a second example beside the Long Line.

**Between-race economy.** Choices about money between races. Interest, as in
auto-chess, or other ways to hold and play long. More frequent purchase
moments: pit stops during each lap with a short window for changes, and a
fuller break between laps where opponents rotate — so a heat is one build plus
three pit stops. Interest might collect between laps or between heats.

**Open questions.** Too in the weeds last time. The document's open calls
should be about which systems exist and how they relate, not about balance.

## The readers' open items from round 5

Two things the readers raised. One is addressed by the notes; one is not.

- **Coasting had no rule under it** — nothing said a bend sheds speed, so a
  fast build never had to burn. The speed-and-thrust note addresses this
  directly: the corner-approach choice is where a bend's speed cost lives.
  Fold it in there.
- **The swing is invisible** — a player cannot tell throttle from Handling
  from the dice when they lose. The notes do not address this. Do not solve
  it; do not drop it. List it in "What does not work" as an open concern the
  readers raised and the owner has not yet spoken to.

## Length and shape

Shorter than round 5. No diagrams this pass. Mechanics in prose, brief. The
"What changed, and why" section may run as long as it needs — it is the
owner's check that every note landed. Everything else is where to cut.

## What holds regardless

1. **Deterministic simulation.** "Random" means drawn from the seeded
   generator.
2. **Fixed integer tick.**
3. **One thumb, on a phone.** The decisions are between races and at pit
   stops; a race is short enough to watch.
4. **Balance is measurable.** Bots over hundreds of runs can say whether
   choosing well pays.

## Nothing else is inherited

The existing implementation in this repository is out of scope, and so is
every round other than the three files named above.
