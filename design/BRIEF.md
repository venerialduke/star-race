# Star Race — the framework brief

This is the question the design rounds are answering. Proposers write against
it, reviewers score against it, and the owner's feedback amends it. `DESIGN.md`
still describes the game as it is; this describes the game we are trying to
find.

## Where we are

The vertical slice is done and playable: one track, three stages, six parts,
two actives, four hazards, two rival ships flown by pilots, a garage before each
stage, a results screen. The workflow around it works — pure sim, fixed tick,
balance harness, one PR per item, CI green, Pages live.

What it is not, yet, is fun. It does not feel like a game. Three things are
missing, and they are the same three things that make auto-battlers work.

## The three gaps

### 1. There is no build, only picks

Right now the player takes one card before each stage. Three picks, three
stages, done. Nothing connects the picks: a part is a stat delta and nothing
else, so there is no moment of "these two together do something", no build
identity, no plan that takes several rounds to come together. Auto-battlers
live on that: the fun is in assembling a build, seeing it come online, and
having it either pay off or fall apart.

We need parts (or whatever replaces them) that combine, a way for a build to
have a direction, and enough rounds for a direction to matter.

### 2. There is no economy, so there are no short-run versus long-run tradeoffs

Every choice today is free and immediate. A real economy makes the player
choose between being strong now and being stronger later — spend or save,
upgrade or bank, take the safe card or hold out for the piece the build wants.
That tension is where the decisions between rounds come from, and it is the
thing the slice most obviously lacks.

Whatever the currency is, it has to be earned in play, spent between rounds,
and have a reason to be saved.

### 3. There is no run-level health, so nothing is at stake across rounds

A stage can be lost, but the run is three stages long and a ship that survives
them all has survived. There is nothing that accumulates, nothing to protect,
no way to be knocked out for having played greedily for too long, and no way to
recover from a bad early round.

Two directions are on the table, and they are not exclusive:

- **Hull as run health.** Going for early speed over careful flying costs hull
  integrity, and a battered ship can be eliminated. This needs a slow enough
  decline that nobody dies in the first two rounds, and probably tracks that
  get harder over time so that the late game needs real manoeuvrability or
  shields to survive.
- **Standing as run health.** Your place in the overall race is the resource.
  Finish too far back too often and you are out. This lets a ship be destroyed
  in a heat while the player stays in the game, which keeps races dangerous
  without making a single crash the end of the run.

## The fourth gap: other players

This one is different in kind, and it matters most.

In a good auto-battler the fun is not how my build handles the PvE. It is how
my build stacks up against the other players' builds, and how their choices
change mine. Right now the two rivals fly the same course under the same rules
and never interact with the player at all. Their builds are invisible; nothing
they do changes what the player faces; nothing the player does changes what
they face.

We are not building ship-to-ship combat. So the question is: **if players do
not fight, how do one player's build choices change another player's race, and
therefore another player's build?**

Ideas already floated, to be developed or replaced:

- A **pacing lap** before a heat, during which players seed the track with
  conditions. Players would have some control or choice over what goes on the
  track, both in the pacing lap and in later laps of a heat. Your build then
  determines what you can put down, and what you can survive.
- **Visible builds.** My build should be legible to other players, so a player
  can see "they are going for X, so I want Y". Counter-picking needs
  information.
- Anything else that makes the field a set of opponents rather than scenery:
  shared shops, contested parts, draft rounds, track votes, hazards that punish
  one archetype and reward another.

## What survives from the slice

These are not up for debate in a proposal. A proposal that needs to break one
should say so explicitly and argue for it.

1. **The simulation is pure and deterministic.** `simulate(...) → outcome`.
   Thousands of races in a test. Everything a player or opponent does enters
   the race as an input.
2. **The race advances on a fixed integer tick.** No real time in the sim.
3. **Ships do not touch.** No collisions, no blocking, no drafting. Interaction
   happens through the track, the economy and the shop, not through contact.
4. **One thumb, on a phone.** Rounds are short and watchable. The decisions are
   between rounds; the race itself asks for a handful of timed taps.
5. **Balance is measurable.** A proposal should be testable with a harness like
   the one we have: bots playing strategies against each other over hundreds of
   runs, with a table that says whether choosing well pays.

## Parked

- **A closer, third-person view of flying the terrain.** The current top-down
  track view is functional and not fun to look at. It will need replacing, but
  it is lower priority than the systems and it does not change them. Proposals
  can note what a richer view would need from the sim (events, positions,
  named terrain) but should not spend their length on it.

## What a proposal has to deliver

A framework, not a feature list: the core loop, the systems that make it up,
and the flow of a whole session from lobby to final standings. Concretely:

- **The loop.** What a round is, what happens between rounds, how many rounds
  a run is, how it ends.
- **The build.** What the player assembles, how pieces combine, what gives a
  build a direction, how long it takes to come online.
- **The economy.** What is earned, when, what it is spent on, why you would
  save it.
- **Run health and elimination.** What you protect across rounds, how you lose
  it, how you are knocked out, how you recover.
- **Other players.** How one player's choices change another's race and build.
  What is visible to whom, and when.
- **A worked run.** Eight players (or however many), from the first decision to
  the final standings, with the decisions called out.
- **What it costs to build.** Which parts of the current sim survive, which
  change, what is new. Honest about size.
- **What it needs from the owner.** The calls that are taste rather than
  measurement.

## Reference points

Auto-battlers to draw from, without copying: Teamfight Tactics (economy,
interest, streaks, carousel, augments), Dota Auto Chess (the original loop),
Super Auto Pets (asynchronous opponents, simple pieces that combine), Backpack
Battles (spatial builds, shop rerolls). Racing games with build depth: Mario
Kart's item balance, F-Zero's boost-for-health trade, Wipeout's weapon pads.
Roguelike run structure: Slay the Spire's map, FTL's sector escalation.
