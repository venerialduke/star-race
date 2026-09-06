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

One system, three stages, six parts, two actives, four hazard types. Not
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
| Shield capacity | damage points        | 20   | How much damage shields absorb while they are up.                                                                       |
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
| Inertial Anchor     | +0.03 acceleration               | −0.04 speed        | Black holes: clawing speed back after the pull. |
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

#### Shields

Shields hold a **pool** of points equal to the ship's shield capacity. Every
point of hazard damage passes through the pool first: the pool absorbs what it
can and the rest reaches the hull. Absorption happens in one place, so every
hazard is shielded the same way.

A base pool of 20 blunts a 45-point burst without stopping it. Mirror Shielding
takes the pool past the burst's damage, so a well-timed shield swallows one
whole. The pool is empty until an active fills it (S2.10).

### Actives (two in the slice)

Player-timed controls with cooldowns, for example raise shields, reroute
power, dump heat. Big tap targets, visible cooldown. To be specified here as
each is implemented.

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

### Outcome

A race produces: finish time, damage taken, did you survive. A run produces
a results screen after three stages.

## Tuning

All balance constants live in `src/sim/tuning.ts`. This document describes
what a constant does; the file holds its value.

## Later

<!-- Anything not in the slice goes here and stays here until S4 is done. -->
