# Round 3 — the brief

This round starts from the owner's brainstorm, not from the game as built. It
replaces `design/BRIEF.md` for this round only.

## What this round is

On 8 September 2026 the owner wrote a page of raw ideas: ship systems, a track
that grows and can be modified, an economy of collectors and bounties, and an
elimination rule that rewards losing narrowly. Those notes are `seed.md`, in
this folder. They are the material.

The job is not to invent a game from nothing, and it is not to extend a game
that already exists. It is to take the seed seriously: evaluate it, sharpen it,
find the numbers it implies, cut the parts that do not survive contact with the
rest, and above all **connect it**. The seed is four clusters of ideas that do
not yet know about each other — a ship, a track, an economy, a season. A
framework is what they become once they do.

Where the seed is thin, develop it. Where two of its ideas pull against each
other, say so and resolve it. Where an idea is good but belongs to a different
game than the rest of the seed, say that too. Adding is allowed and expected,
but a proposal that quietly replaces the seed with something else has not done
the job.

## What you must not use

This round is deliberately unanchored. Do not read, reference, reason about, or
build on:

- `DESIGN.md`, anything under `src/`, or any file describing the game as it is
  currently implemented
- the existing vertical slice — its parts, actives, hazards, garage, stages,
  rival ships, or tuning values
- `design/BRIEF.md`, `design/LEDGER.md`, or rounds 1 and 2 in any form: their
  proposals, reviews, syntheses, critiques, or the frameworks named "The Cut,
  Two Cards" and "Raise or Clear"

If you happen to know something about that game, set it aside. An idea that
coincides with one of its mechanics is fine on its own merits; an idea
justified by "this is what the game already does" is not. Nothing is inherited.

## What holds regardless

These are constraints of the medium rather than mechanics, and every proposal
is held to them:

1. **The simulation is deterministic.** A race is a pure function of the track,
   the ships, the players' inputs and a seed. The same inputs give the same
   race, every time. Anything a player or an opponent does enters a race as an
   input, decided before or during it, never as an accident of when it ran.
2. **The race advances on a fixed integer tick.** No real time inside the
   simulation. Speeds, damage, positions and events all resolve per tick.
3. **One thumb, on a phone.** The decisions are between races. A race is short
   enough to watch and asks for at most a handful of taps.
4. **Balance is measurable.** Bots playing strategies against each other over
   hundreds of runs should be able to say whether choosing well pays, whether
   one approach dominates, and whether a run is winnable from behind.

Note the seed's "randomness" and "luck" are compatible with rule 1: random
means drawn from the seeded generator, not unpredictable.

One thing is newly open. The seed has ships damaging one another, slowing them,
and claiming bounties. Take that as permitted: **no collision physics and no
blocking** — two ships never contest the same point of space, and a race is
never decided by one ship physically obstructing another — but a ship may
affect another at range, and the aggression route is on the table. If your
design needs more than that, say so and argue for it.

## The questions the seed leaves open

These are the real tensions in the notes. A strong proposal answers most of
them with numbers, and is explicit about the ones it decides not to answer.

1. Speed and handling trade off non-linearly. What is the player actually
   choosing between, at what moment, and what does "less reaction time" mean
   for a ship that flies itself?
2. Acceleration generates gravity, which impairs crew actions. What actions?
   Does this make acceleration a cost as well as a good, and can a player feel
   that in a race they are watching?
3. Hull, shields and crew are three defensive layers. Three is a lot to hold in
   one head on a phone. Do all three earn their place, and what does each one
   protect against that the others do not?
4. If the crew dies and the navigation system carries the ship home, is a
   crewless ship a failure, a degraded state, or a build somebody chooses on
   purpose?
5. Humanoid or robot is one binary chosen at build time. Is it a genuine fork
   with two different games behind it, or a stat swap wearing a costume?
6. The golden path is faster and carries energy. What ever makes leaving it
   right? A strictly better line is not a decision.
7. The track grows each phase, and the initial layout hints at how without
   certainty. What does a player actually do with a hint, and what does it cost
   to read one wrong?
8. Track modifications apply only in the modifier's own races, and an opponent
   meets them when matched. Who benefits from a mod, and what stops it from
   being a private self-buff with extra steps?
9. Economy routes are shared pools that pay less the more ships chase them.
   How does a player learn how contested a route is — before committing, or
   only after?
10. Aggression earns bounties and raises wanted status, which draws NPC cops.
    What do the cops do, and under what circumstances is being aggressive
    actually right?
11. Margin-sensitive scoring: losing narrowly should beat being dominated.
    State the rule. Does it reward staying close without ever making winning
    less attractive, and how do the margins compound into surviving a stage?
12. Three ships per heat, three laps per heat. How many heats is a run, how
    long is a race in seconds, and how does a field larger than three get
    matched?

## What a proposal has to deliver

A framework, not a feature list: the systems, how they interlock, and the flow
of a whole session from the first decision to the final standings. Concretely,
the sections named in the round prompt, and within them:

- **The ship.** What the player assembles and tunes, how the stats and systems
  in the seed relate, what gives a ship a direction, and when that direction
  becomes visible.
- **The track.** What a course is, how it grows, what the golden path does,
  what a player can place or change and when.
- **The economy.** What is earned, when, what it buys, why it would ever be
  saved, and how the shared pools resolve.
- **The season.** Heats, laps, field size, escalation, scoring, elimination and
  recovery.
- **How the systems connect.** The point of the round. Name the couplings: which
  ship choice changes which track decision, which economy route is paid for in
  ship stats, which season pressure makes a build worth switching.
- **Other players.** How one player's choices change another's race and another's
  build. What is visible, to whom, and when.
- **A worked run.** A named field from the first decision to the final
  standings, with the decisions called out and at least one moment where one
  player's choice changed another player's race.
- **What it needs from the owner.** The calls that are taste rather than
  measurement, written as questions.

Write with numbers. A number can be wrong and then fixed; "some" cannot.
