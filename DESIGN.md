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

- One star system, one visible track, three stages.
- The track is a spline through a list of segments. Each segment may carry
  hazards. Stage gates sit between stages; the race pauses there and you
  return to the garage.
- Hazard placement is visible before the run starts.

### Ship

- Stats: speed, acceleration, shield capacity, heat tolerance, hull.
  (Exact list to be fixed in S2 and recorded here.)
- A **build** is a set of parts. Parts modify base stats. A build resolves to
  derived stats before the race starts.
- Six parts in the slice. (To be named and described here as they are added.)

### Hazards (four in the slice)

Seen in the plan's track figure: ringed planet, asteroid field, gamma-ray
burst, black hole. Each hazard is one function in `src/sim/hazards.ts` and
has its own test. Effects to be specified here as each is implemented.

### Actives (two in the slice)

Player-timed controls with cooldowns, for example raise shields, reroute
power, dump heat. Big tap targets, visible cooldown. To be specified here as
each is implemented.

### Outcome

A race produces: finish time, damage taken, did you survive. A run produces
a results screen after three stages.

## Tuning

All balance constants live in `src/sim/tuning.ts`. This document describes
what a constant does; the file holds its value.

## Later

<!-- Anything not in the slice goes here and stays here until S4 is done. -->
