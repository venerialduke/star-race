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

## S4 — the field, and feel

S4 is done when: three ships fly every stage, the results screen shows where you
came, and three runs on a phone make you want a different build.

Done in the order below. The two fixes come first because they are cheap and
everything after them is easier to trust.

### S4.1 Close the main.ts gap, and a beat before the stage starts

`main.ts` is the only untested code in the repo — the glue that moves between
garage, race and results. Add `tests/ui/loop.test.ts` driving a whole run
through it with a fake clock. While in there: the race currently starts the
instant a part is tapped, with no moment to look at the course. Add a short
countdown before the ship launches.
Done when: a test plays garage, stage, results and run-again without a browser,
and a stage opens with a beat rather than a jump.

### S4.2 Fit the course to the screen

The course is drawn into the largest centred square, which on a phone wastes the
top and bottom of the screen. Fit the track's bounding box to the viewport
instead, leaving room for the HUD. Three ships need more room, not less.
Done when: the course fills the space between the readouts and the buttons at
phone sizes.

### S4.3 Pilots

Add `src/sim/pilot.ts`: a rule that reads a race each tick and returns the taps
to make — shields when a burst is close ahead, reroute on clear track — with
seeded imperfect timing. Move the balance harness's reference player onto it, so
one rule flies rivals and the harness both.
Done when: `tests/sim/pilot.test.ts` shows a pilot shielding a burst it can see,
missing sometimes, never tapping into a cooldown, and being deterministic per
seed. The balance table still reads sensibly.

### S4.4 The field

Add `src/sim/field.ts`: three ships stepped in lockstep through one stage, each
with its own race state and its own hazard dice, no contact between them.
Produces a finishing order, with lost ships behind finishers. `run.ts` carries
two rivals with the fixed builds and upgrade schedule in `DESIGN.md`, their hull
carried between stages like the player's.
Done when: `tests/sim/field.test.ts` covers finishing order, lost ships placed
last, determinism per seed, and rivals growing a part per stage.

### S4.5 Draw the field

Three ships on screen, offset into lanes so they are legible, each with its own
colour, and a position readout in the HUD.
Done when: three ships fly the course without overlapping, and the player can
tell at a glance whether they are winning.

### S4.6 Results with standings

Per-stage position, overall standings across the field, and a headline that says
whether the run was won — including the case where the ship survived and still
came last.
Done when: the results screen shows the field, and a surviving-but-slow run
reads as a loss.

### S4.7 Slow-motion beat when a hazard is imminent

The renderer slows time as the ship closes on a burst, so it is something the
player sees coming rather than reacts to late. The simulation never learns about
it: only the rate ticks are fed to it changes.
Done when: approaching a burst visibly slows, the sim's tick count is unchanged
by it, and a race replays identically with or without slow motion.

### S4.8 Telemetry to the console

Taps made, taps wasted on cooldown, near-misses, per-stage positions. What
tells us whether the timing windows are right.
Done when: a finished run prints one readable block.
