# Star Race — design

This document is the source of truth for the game's rules. If the code and
this document disagree, the document wins and the code is a bug. Any PR that
changes a rule updates this file in the same change.

## The game

Auto-chess meets racing. You build the ship between stages; the ship flies
the course; you spend the run making a handful of split-second calls.

A run is one star system. The track is drawn through it before you start, so
you can see the black hole in stage 3 and plan for it. Between stages you are
in the **garage**, choosing parts that change speed, acceleration, shield
capacity, heat tolerance and so on. During a stage the ship flies the track on
its own; you have two or three **active** controls (raise shields, reroute
power, dump heat) that you time against the hazards you saw coming.

The design bet is the one auto-battlers make: the interesting decisions are
between rounds, and the round itself should be watchable, legible and short.

## The two rules

1. **The simulation is pure and deterministic.**
   A race is `simulate(track, shipBuild, playerInputs, seed) → outcome`.
   No rendering, no timers, no randomness outside the seed. Thousands of
   races can be run in a test.
2. **The race advances on a fixed integer tick.** Speed, heat, shields and
   hazards all update per tick. This makes replay, tests and balance tuning
   trivial.

## The vertical slice (S1 to S4)

One system, three stages, three ships, six parts, two actives, four hazard
types. Not
balanced, not pretty, but a complete loop: build, race, build, race, build,
race, result screen. Playable on a phone, one thumb.

Success test: you play three runs and want to try a different build.

### Track

One star system, one visible track, three stages. Hazard placement is visible
before the run starts: you can see the black hole in stage 3 from the start
line and build for it.

A track is an ordered list of **segments**. A segment has:

- a **name**, shown in the garage and in logs;
- a **length in ticks at base speed** — a whole number. A ship faster than base
  crosses it in fewer ticks, a slowed ship in more, so segment length is a
  distance, not a duration;
- a list of **hazard placements**, each a hazard kind plus a start tick
  measured from the beginning of the segment and a length in ticks. A placement
  must lie entirely inside its segment. An instantaneous hazard, such as the
  gamma-ray burst, has length 1.

**Stage gates** are segment indices at whose end the race pauses and the player
returns to the garage. Gates are sorted and unique, and the final segment never
carries one — the race ends there rather than pausing. Three stages means two
gates.

**Geometry is separate from timing.** A track also carries a spline path, used
only to draw the course and place the ship on screen. The simulation never
reads it; lengths, hazards and gates decide everything that happens. Progress
along the drawn line is linear in ticks at base speed, so a long segment takes
up more of the line.

Track numbers — segment lengths, hazard placements, control points — are level
data, not balance constants, and live with the track rather than in
`tuning.ts`.

#### The slice track

Nine segments, 1,320 ticks at base speed (about 22 seconds at 60 ticks per
second), three stages of three segments each. All four slice hazards appear.

| #   | Segment         | Ticks | Hazard                                              |
| --- | --------------- | ----- | --------------------------------------------------- |
| 0   | Launch          | 120   | —                                                   |
| 1   | Asteroid belt   | 180   | asteroid field, ticks 30–150                        |
| 2   | Open run        | 120   | — _(gate: stage 1 ends)_                            |
| 3   | Ringed planet   | 150   | ringed planet, ticks 20–130                         |
| 4   | Gamma corridor  | 160   | gamma-ray burst at tick 80                          |
| 5   | Debris tail     | 140   | asteroid field, ticks 40–120 _(gate: stage 2 ends)_ |
| 6   | Inner system    | 130   | —                                                   |
| 7   | Black hole      | 200   | black hole, ticks 40–170                            |
| 8   | Finish straight | 120   | —                                                   |

Stage 1 teaches the asteroid field on a build with no parts yet. Stage 2 pairs
the ringed planet's gravity assist with a burst to shield against. Stage 3 is
the black hole the player has been able to see all along.

### Ship

Five stats, and nothing else. Every part, hazard and active moves one or more
of these.

| Stat            | Unit                 | Base | What it does                                                                                                            |
| --------------- | -------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------- |
| Speed           | track-ticks per tick | 1.0  | How fast the ship covers the course. Base speed is 1.0 by definition: that is what "a segment is 180 ticks long" means. |
| Acceleration    | speed per tick       | 0.02 | How quickly speed closes on its target after something changes it.                                                      |
| Shield capacity | damage points        | 50    | How much damage shields absorb while they are up.                                                                       |
| Heat tolerance  | heat points          | 100  | How much heat the ship holds before it cooks.                                                                           |
| Hull            | damage points        | 100  | How much damage the ship survives.                                                                                      |

A **build** is the parts bolted on. A part is a set of **additive deltas** on
the base stats; resolving a build sums every delta onto the base and clamps
each stat to a floor, so a build stacked with downsides still produces a ship
that can race. Resolution happens once, before the race starts — the race reads
the derived stats and never looks at a part again. Parts stack, and order does
not matter.

#### The six slice parts

Each part is one upside paid for with one cost. Four answer a hazard; two are
about raw pace.

| Part                | Gives                            | Costs              | For                                             |
| ------------------- | -------------------------------- | ------------------ | ----------------------------------------------- |
| Ion Thruster        | +0.15 speed                      | −10 hull           | Raw pace on a light frame.                      |
| Ablative Plating    | +40 hull                         | −0.08 speed        | Asteroid fields.                                |
| Mirror Shielding    | +35 shield capacity              | −0.05 speed        | Gamma-ray bursts.                               |
| Radiator Fins       | +45 heat tolerance               | −15 hull           | The ringed planet's gravity assist.             |
| Inertial Anchor     | +0.03 acceleration               | −0.02 speed        | Black holes: clawing speed back after the pull. |
| Overclocked Reactor | +0.10 speed, +0.015 acceleration | −30 heat tolerance | Going fast and accepting the heat risk.         |

The intended tension: hull and shields are bought with speed, and speed is
bought with fragility or heat. A player who takes every fast part arrives at
the black hole quickly and badly equipped for it.

### Hazards (four in the slice)

Ringed planet, asteroid field, gamma-ray burst, black hole. Each hazard is one
function in `src/sim/hazards.ts` with its own test. A hazard is asked, once per
tick the ship is inside it, what it does; it returns hull damage, heat, a
multiplier on top speed, and whether the ship is lost outright. The race loop
applies the answer — hazards never change anything themselves.

A hazard catches the ship if the ship's movement **this tick overlaps the
hazard's stretch of track**, so a fast ship cannot skip over a short hazard
between one tick and the next.

Every hazard that rolls dice draws from **its own stream**, forked per placement
from the race seed. Adding a roll to one hazard cannot change what another
hazard on the same track does.

#### Asteroid field

Rock chews on the hull for every tick the ship spends inside. Damage per tick
scales with the **square** of the ship's speed, with a variance band rolled each
tick.

Squaring is what makes the field a real decision. A ship going twice as fast
spends half as many ticks inside but takes four times the damage in each, so it
comes out having taken roughly twice as much. Crossing a field fast is
expensive; armour or restraint is the answer. Ablative Plating both raises hull
and lowers speed, so it pays twice here.

#### Gamma-ray burst

A single tick, no dice, and a large bite out of the hull — nearly half a base
hull in one hit. Nothing about the ship changes what arrives: not speed, not
luck. The only answer is to have shields up when it lands, which is why the
burst is drawn on the course before the race starts. An unshielded hit is a
call the player got wrong, not bad luck.

The burst is **one-shot**: a ship moving about one track-tick per tick overlaps
a one-tick window on two consecutive ticks, and must still only be hit once.

#### Black hole

The pull holds the ship at a little over half the top speed it could otherwise
make, for every tick it is inside. It deals no damage at all — the danger is a
**threshold**: a ship that arrives already battered, below the escape hull,
cannot pull away and is lost with it.

The threshold is a flat number, not a fraction of the ship's hull, so extra
plating raises what you arrive with but never lowers the bar you have to clear.
This is why the black hole sits in stage 3: it charges the player for the hull
they spent in stages 1 and 2. Climbing back out afterwards is an acceleration
problem, which is where Inertial Anchor earns its place.

#### Ringed planet

A gravity assist. The ship is slung through the segment about a third faster
than it could otherwise fly, and pays for it in **heat**, every tick of the way.
The hazard itself never damages anything.

Note the assist speeds the ship up, so it spends fewer ticks inside than the
segment is long — the faster you take it, the less heat you collect. A base ship
comes out of the slice track's assist with about 122 heat against a tolerance of
100, so it cooks for a few seconds. Radiator Fins take the assist for free.

#### Heat

Heat builds while something is adding it, and bleeds away when nothing is. Above
the ship's heat tolerance it **cooks the hull**, a little each tick, until heat
falls back under the line.

Two rules matter here:

- Heat is a resource that comes back, not a scar. Dissipation is fast enough
  that overcooking an assist costs a few seconds of hull, not the rest of the
  race.
- Overheat damage is **internal**, so shields do not stop it. Shields are for
  what the galaxy throws at the ship, not for what the ship does to itself.

The same rule covers heat from an assist and heat from rerouting power (S2.10),
which is why it lives in the race loop rather than in any one hazard.

#### Shields

Shields hold a **pool** of points equal to the ship's shield capacity. Every
point of hazard damage passes through the pool first: the pool absorbs what it
can and the rest reaches the hull. Absorption happens in one place, so every
hazard is shielded the same way.

A base pool of 50 stops a 45-point burst dead and is nearly spent doing it —
there is not enough left for a second. Mirror Shielding takes the pool to 85, so
it covers a burst and the asteroid damage around it. The pool is filled by
raising shields, and whatever is left drops when they run out.

### Actives (two in the slice)

Two taps, each with a duration and a cooldown. Everything about them is timing:
the hazards are drawn on the course before the start, so a shield raised into a
gamma burst is a call the player made, not luck.

| Active | What it does | Holds for | Cooldown |
|--------|--------------|-----------|----------|
| Raise Shields | Fills the shield pool to the ship's shield capacity. Costs nothing but the tap. | 90 ticks (1.5s) | 420 ticks (7s) |
| Reroute Power | Top speed × 1.3, and heat every tick it is on. | 120 ticks (2s) | 420 ticks (7s) |

Rules that matter:

- **A tap during a cooldown is a tap wasted.** Taps do not queue. Mistiming one
  costs you the use, which is the whole game of timing them.
- **Shields fill the pool when raised, and drop whatever is left when they run
  out.** They are not a bank; holding damage over from a previous stage is not a
  thing.
- **Rerouted power stacks with a gravity assist** rather than replacing it — the
  multipliers multiply, and so does the heat.
- Each active is on its own cooldown: using one never blocks the other.

Roughly one shield per stage is the intent, so the player picks which hazard to
answer rather than answering all of them.

### The race loop

`simulate(track, build, inputs, seed) → outcome`. Once per tick, in this order:

1. **Speed closes on top speed by acceleration.** A ship never exceeds the top
   speed its build can hold, and never gains more than its acceleration in a
   tick.
2. **The ship advances by its current speed**, measured in track-ticks — so a
   ship at speed 1.0 covers a 180-tick segment in 180 ticks.
3. **If it has crossed a gate line, the stage ends.** The ship stops exactly on
   the gate line rather than carrying its overshoot into the next stage, so
   every stage is exactly as long as the track says.

The ship leaves the start line, and every stage gate, **from a standstill**.
The garage pause itself costs no ticks — the clock only counts flying — but a
gate still costs time, because the ship has to get back up to speed. This is
what makes acceleration worth buying: a course with more stages rewards it more.

A race also ends if it runs past a hard tick cap. That only happens if the loop
is broken, and the outcome says the ship was abandoned rather than finished.

### The run

A run is three stages of one track, one ship. The garage opens **before every
stage**, including the first, so a finished run is a three-part build the player
assembled a piece at a time.

Two rules make a run more than three separate races:

1. **The build carries forward.** Every garage adds one part, chosen from three
   the run's own dice put on offer. Parts already bolted on can be offered
   again — taking a second Ion Thruster is a real choice.
2. **The hull carries forward.** Damage is not repaired between stages. This is
   what gives the black hole in stage 3 its teeth: it charges the player for
   what they spent surviving stages 1 and 2. A part that raises maximum hull
   adds that much to the ship as it stands; it does not repair what is already
   gone.

A run ends when the third stage is finished, or the moment the ship is lost —
there is no garage after a loss.

Within a stage, ticks are counted from the start of that stage, so the player's
taps are timed against the piece of course in front of them.

### The field

**Three ships fly every stage: the player and two rivals.** A race you can only
lose by dying is a race with soft stakes — a cautious build survives everything
and never has to answer for being slow. Rivals fix that: finishing last is a
loss even when the ship comes home in one piece.

**The ships do not touch.** No collisions, no blocking, no drafting. Each ship
flies the same course under the same rules, and the hazards apply to all of them
the same way. Two reasons: contact between ships is a whole design of its own,
and without it the field costs the simulation nothing but three ships stepped
side by side. What the player races is the clock and the other two ships'
choices, which is the auto-battler bet — the interesting decisions are between
rounds.

**Lanes are a drawing problem, not a rule.** Three ships on one line would
overlap, so the renderer offsets each one across the track. The simulation has a
single line and one distance per ship; nothing about a lane changes what a
hazard does.

#### The rivals

Two ships with fixed characters, so the player learns what they are:

| Rival | Reaches for | What it does |
|-------|-------------|--------------|
| Redline | speed, then heat cover | Quick and greedy. Sets the time to beat, and gets home about two runs in three. |
| Bulwark | armour, then cover | Slow and hard to kill. Almost always there at the end. |

**Rivals shop in the same garage the player does.** At every stage a rival is
offered three parts from the same pool and takes the one nearest the top of its
wish list. Its character is the list, not a fixed build.

That fairness is load-bearing. When rivals simply bolted on a hand-picked build,
Redline had the best speed parts in the game every single run while the player
had whatever three cards turned up — so the player could not out-race it, only
outlive it, and **choosing well in the garage barely changed a run**. Once
everyone draws from the same pool, a player who picks well beats a player who
picks blindly by half again.

#### Pilots

A rival is flown by a **pilot**: a rule that looks at the race each tick and
decides whether to tap anything. The pilot raises shields when a burst is close
enough ahead, and reroutes power on clear track. Its timing is deliberately
imperfect, seeded per race, so a rival can misjudge a burst exactly as a player
can — and so the balance harness measures what real play is like rather than
what frame-perfect play is like.

Its rules, in full:

- **Shields**: find the next burst ahead, work out roughly when the ship reaches
  it, and raise shields to cover it — aiming at the middle of the shield window
  and missing by a seeded amount, so a pilot eats the occasional burst.
- **Rerouted power**: only when the next hazard is well clear ahead *and* the
  ship has the heat headroom to hold the whole boost. A hazard the ship is
  already inside counts as zero ticks away — boosting through an asteroid field
  is the worst thing a pilot could do, because rock scales with the square of
  speed.
- It never taps into a cooldown. A wasted tap is a player's mistake to make.

The same pilot flies the rivals and the harness's reference builds. One rule,
one place.

#### Winning

A stage produces a finishing order. A ship that is lost is placed behind every
ship that finished. A run produces standings across all three stages, by total
time, with lost ships last. The player wins a run by beating both rivals — which
means a ship that survives but crawls loses, and that is the point.

Where the slice sits today, over 200 pilot-flown runs per player
(`npm run balance -- --runs 200`):

| Player | Won | Survived | Beat Redline on time |
|--------|-----|----------|----------------------|
| Takes the first card offered | 27% | 83% | 4% |
| Picks for speed | 40% | 67% | 35% |
| Picks armour only | 22% | 97% | 0% |
| Reads the ship, buys what it lacks | 39% | 80% | 22% |

A three-way race is even at 33%. Good play sits a little above that and blind
play well below, which is the shape to hold: winnable, never a formality, and
worth thinking about. Armour alone survives nearly every run and wins the fewest
— surviving is not winning. Redline gets home about two runs in three, so a
player who only ever inherits the win when it crashes tops out around a quarter.

### Slow motion

As the player's ship closes on a gamma burst, time slows — down to two fifths
speed on top of it, easing in over the last hundred ticks of approach. The burst
is the one hazard that is pure timing, so it is the one worth giving the player
a moment to see coming.

**The simulation never learns about this.** Slow motion changes only how many
ticks a second of wall clock buys. The ticks are the same ticks, arriving further
apart, so a race is identical whether it was flown slowly or not — which a test
pins by running the same game at two frame rates and comparing the results.

### Outcome

A race produces: finish time, damage taken, whether the ship survived, what hull
and heat it has left, how much its shields swallowed, and — when it ends badly —
**what killed it**: the black hole, its own heat, or the hull simply giving out.

A run produces a results screen after three stages: each stage's time, damage
and **finishing position**, the standings across the field, the build the player
ended with, and one tap to run again.
Stages the run never reached are listed as not reached, because a run that died
in stage 2 should look different from one that finished.

The screen's real job is the design's success test — *you play three runs and
want to try a different build* — so it names the cause of death plainly rather
than showing a number.

## Tuning

All balance constants live in `src/sim/tuning.ts`. This document describes
what a constant does; the file holds its value.

`npm run balance -- --races 1000` races three standard builds — a bare hull, a
speed build and a survival build — against the slice track, with a reference
player whose taps are deliberately imperfect: shields aimed at each burst and
missed by up to a shield window either way, seeded per race. It answers "how
often does this build survive real play?", not "how does it do under perfect
input". Run it before and after a tuning change.

At the close of S2 the table reads:

| Build | Survived | Ticks (mean) | Damage (mean) |
|-------|----------|--------------|---------------|
| Bare hull | 100% | 1,463 | 48.9 |
| Speed | 68% | 1,154 | 73.3 |
| Survival | 100% | 1,575 | 34.5 |

Which is the shape the slice is aiming for: the fast build is the quickest and
the only one that loses races, and the tough build pays for its survival in
time.

## Later

<!-- Anything not in the slice goes here and stays here until S4 is done. -->
