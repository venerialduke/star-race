# Backlog

One item per agent session. Each item is written as an acceptance test.
Pick the top unblocked item, work in a branch or worktree, open a PR.

S2 is done when: a test runs 1,000 seeded races on three builds and prints a
stats table. No rendering changes in S2.

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

## S3 — garage and stages (not yet broken down)

Between-stage garage offering three parts, build carried forward, three
stages on one track, results screen. Rendering shows ship, track ahead,
hazard markers, heat/shield readout. Phone-sized, one-thumb.

## S4 — actives and feel (not yet broken down)

Two actives with big tap targets and visible cooldown. Slow-motion beat when
a hazard is imminent. Telemetry to console.
