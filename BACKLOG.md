# Backlog

One item per agent session. Each item is written as an acceptance test.
Pick the top unblocked item, work in a branch or worktree, open a PR.

S2 is done when: a test runs 1,000 seeded races on three builds and prints a
stats table. No rendering changes in S2.

**S2 is done.** Every item below is merged; the harness prints its table in
under a second. Kept here as the record of what was built.

## S2 — the simulation

### S2.1 Seeded RNG

Add `src/sim/rng.ts`: a small seeded PRNG (e.g. mulberry32 or xoshiro) with
`nextFloat()`, `nextInt(min, max)`, and `fork()` for independent streams.
Done when: `tests/sim/rng.test.ts` shows the same seed gives the same
sequence, different seeds differ, and values stay in range. ESLint still
forbids `Math.random` in `src/sim`.

### S2.2 Tuning file

Add `src/sim/tuning.ts` exporting every balance constant as a named export
with a one-line comment. Move `TICK_RATE` and `SPEED` out of `demo.ts`.
Done when: `grep` finds no _balance_ numeric literals in `src/sim` outside
`tuning.ts`, and all tests pass. Three kinds of number are not balance and
stay where they are:

- **Algorithm internals**: the Catmull-Rom basis in `spline.ts`, the
  mulberry32 constants in `rng.ts`. Changing one is a bug, not a tuning call.
- **Level data**: spline control points (`demo.ts` today, `track.ts` from
  S2.3). The shape of a track is content, not a knob.
- **Structural numbers**: array indices, `+ 1` in a counter, `/ 2` for a
  midpoint.

### S2.3 Track model

Add `src/sim/track.ts`: a track is an ordered list of segments, each with a
length in ticks-at-base-speed and a list of hazard placements; stage gates
mark segment indices where the race pauses. Include one hard-coded slice
track with three stages. Reuse `spline.ts` for geometry only.
Done when: `tests/sim/track.test.ts` covers total length, gate positions, and
that every hazard placement lands inside a segment. `DESIGN.md` Track section
updated.

### S2.4 Ship stats and parts

Add `src/sim/ship.ts`: base stats, the `Part` type, and `resolveBuild(parts)
→ DerivedStats`. Add the six slice parts (names and effects go in
`DESIGN.md`).
Done when: `tests/sim/ship.test.ts` has one test per part showing its stat
delta, and a test that an empty build equals base stats.

### S2.5 Tick loop and simulate()

Add `src/sim/race.ts`: `simulate(track, build, inputs, seed) → RaceOutcome`
with `{ finishTicks, damageTaken, survived, log }`. Ship moves along the
track per tick using derived speed and acceleration. No hazards yet.
Done when: `tests/sim/race.test.ts` shows a faster build finishes sooner,
the same inputs produce an identical outcome, and a stage gate pauses the
tick count correctly.

### S2.6 Hazard: asteroid field

Add the asteroid-field hazard in `src/sim/hazards.ts` (one function per
hazard). Hull damage per tick inside the field, scaled by speed; seeded
variance.
Done when: `tests/sim/hazards.test.ts` covers it, damage is deterministic
per seed, and a slower ship takes less damage. `DESIGN.md` describes it.

### S2.7 Hazard: gamma-ray burst

Timed burst at a fixed tick in its segment. Shielded ship survives;
unshielded ship loses a large fraction of hull (constant in `tuning.ts`).
Done when: the hazards test covers both shielded and unshielded outcomes and
`DESIGN.md` describes it.

### S2.8 Hazard: black hole

Pulls the ship: reduces effective speed inside its segment, with a hull
threshold below which the ship is lost.
Done when: hazards test covers slowdown and the lost-ship case; `DESIGN.md`
describes it.

### S2.9 Hazard: ringed planet

Gravity assist with a heat cost: speeds the ship up through the segment but
adds heat per tick; exceeding heat tolerance damages hull.
Done when: hazards test covers the speed gain, heat gain, and the overheat
case; `DESIGN.md` describes it.

### S2.10 Actives with cooldowns

Add `src/sim/actives.ts`: shields (absorb damage for N ticks) and power
reroute (temporary speed boost at a heat cost), each with a cooldown in
ticks. `playerInputs` is a list of `{ tick, active }` events consumed by
`simulate()`.
Done when: `tests/sim/actives.test.ts` shows an active fires once per
cooldown, inputs during cooldown are ignored, and shields prevent gamma
damage when timed correctly.

### S2.11 Balance harness

Add `scripts/balance.ts` and `npm run balance -- --races N`: runs N seeded
races for three standard builds against the slice track and prints a table
of finish time (mean, p50), survival rate, and mean damage per build.
Done when: `npm run balance -- --races 1000` prints the table in under ten
seconds, and `tests/balance.test.ts` runs 1,000 races and asserts sanity
bounds (survival between 5% and 95%, no NaN, finish time monotone in speed).
This closes S2.

**S3 is done.** All five items are merged: a run is three stages with a garage
before each, the ship flies the drawn course, the HUD has two thumb-sized
actives, and a results screen says what killed you. Kept here as the record.

## S3 — garage and stages

S3 is done when: on a phone, you can play three stages with a garage between
them, see the ship fly the course, and get a results screen — and want to try a
different build.

### S3.1 Run state and the garage offer

Add `src/sim/run.ts`: a run is three stages of the slice track with one build
carried forward and **hull carried forward too** — the black hole in stage 3
only means something if damage accumulates. A `Run` is immutable state with a
phase (garage, racing, done); `choosePart`, `runStage` return a new one.
`simulate()` grows options for running a single stage and starting from a given
hull. Add `src/sim/garage.ts`: three distinct parts offered per garage, drawn
from the seeded RNG.
Done when: `tests/sim/run.test.ts` covers a whole three-stage run, hull
carrying between stages, a run ending early when the ship is lost, and offers
being deterministic per seed. `DESIGN.md` describes the run.

### S3.2 Draw the course

Replace the S1 demo dot: `src/render/` draws the slice track from the spline,
the ship at its current distance, hazard markers with a shape per kind, and
stage gates. Everything reads sim state and writes none.
Done when: the Pages build shows the ship flying the real course with hazards
visible ahead of it, at phone width.

### S3.3 HUD and actives

Hull, heat and shield readouts, plus two big tap targets with visible
cooldowns. One thumb, bottom of the screen.
Done when: tapping a button feeds a `PlayerInput` into the sim at the right
tick, cooldowns are visible, and the readouts track the sim.

### S3.4 Garage screen

Three part cards between stages, each showing what it gives and what it costs.
One tap picks one and starts the next stage.
Done when: a run can be played end to end on a phone-sized screen.

### S3.5 Results screen

After three stages: finish time per stage, total, damage taken, what killed you
if anything, and the build you ended with. One tap to run again.
Done when: a finished run lands on the results screen and can be replayed.

## S4 — actives and feel (not yet broken down)

The actives themselves landed in S2.10 and their buttons in S3.3, so what is
left of S4 is feel:

- A slow-motion beat when a hazard is imminent, so a burst is something the
  player sees coming rather than reacts to late.
- Telemetry to the console: taps made, taps wasted on cooldown, near-misses.
- Whatever three runs on a phone say is missing. The success test is unchanged:
  you play three runs and want to try a different build.
