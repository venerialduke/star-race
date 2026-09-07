# Star Race — how to work in this repo

Read this first. `DESIGN.md` is the source of truth for the game's rules.
`BACKLOG.md` holds the next tasks, one per agent session. `PLAN.md` is the
original project plan and is background only.

## What this is

Auto-chess meets racing. The player builds a ship between stages; the ship
flies the course on its own; the player makes a handful of timed calls
(actives) during the race. One star system, three stages, six parts, two
actives, four hazard types. See `DESIGN.md`.

## The two rules everything depends on

1. **The simulation is pure and deterministic.**
   `simulate(track, shipBuild, playerInputs, seed) → outcome`. No rendering,
   no timers, no `Date`, no `Math.random` outside the seeded RNG. Tests run
   thousands of races headless.
2. **The race advances on a fixed integer tick.** Speed, heat, shields and
   hazards all update per tick. Real time never enters the sim; `main.ts`
   converts wall-clock time into whole ticks.

## Layout

```
src/sim/       PURE. No DOM, no Date, no Math.random, no imports from render/ or ui/.
src/render/    Canvas drawing. Reads sim state, never writes it.
src/ui/        Garage, results, HUD buttons.
src/main.ts    Fixed timestep: input → sim → render.
tests/sim/     Unit tests per hazard, part, active.
tests/         balance.test.ts runs N seeded races and asserts sanity bounds.
```

## Conventions (these are enforced or reviewed, not optional)

- `src/sim` imports nothing from `render`, `ui` or `main.ts`, and nothing
  nondeterministic. ESLint enforces this (`eslint.config.js`, the
  `src/sim/**` block). A violation is a lint error, not a review comment.
- Every hazard and every part has a test. A PR that adds one without the
  other is incomplete.
- Balance numbers live in one file, `src/sim/tuning.ts`. Never inline a
  tuning constant. Tuning PRs should be one-file diffs.
- Commit messages describe the player-visible change first, the code change
  second. Example: `Shields now absorb gamma bursts fully; add shieldAbsorb to hazards.ts`.
- Update `DESIGN.md` in the same PR as any rule change. The doc is the source
  of truth, not the code.
- `main` is always playable. Nothing merges red.
- Scope guard: anything not in the current milestone goes in `DESIGN.md`
  under "Later" and stays there until S4 is done.

## Commands

```
npm run dev          # Vite dev server
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
npm test             # vitest run
npm run build        # vite build → dist/ (base path /star-race/)
```

Before reporting a task done: `npm run typecheck && npm run lint && npm test`.
Before opening a PR, also `npm run build`, or use the `deploy-checker`
subagent.

## Subagents (`.claude/agents/`)

- `sim-engineer`: implements changes in `src/sim` with tests.
- `balance-analyst`: read-only; runs seeded race batches and reports stats.
- `deploy-checker`: read-only; confirms typecheck, tests and Pages build pass.

## Working style

- One backlog item per session. Small enough to finish in one sitting.
- Work in a branch or worktree, open a PR with a short summary the owner can
  read on a phone: what changed for the player, what changed in code, which
  tests were added.
- Do not touch `main` directly. Do not force-push. Do not `rm -rf`.
- If a task needs a rule change not covered by `DESIGN.md`, stop and ask.

## Design rounds (`design/`)

The slice is done; the next job is finding the game. `design/BRIEF.md` is the
question, `design/PROCESS.md` says how a round runs, `design/LEDGER.md` is
every idea ever considered and its fate. Rounds live under `design/rounds/`
and are append-only: never overwrite a round folder or edit an earlier ledger
section. `npm run design-page -- --round N` renders a round into
`public/design/`, which the Pages site serves at `/star-race/design/`.

Running a round, and the two things that have gone wrong doing it:

- **Pass the round as an object**: `Workflow({ name: 'framework-round', args:
{ round: 2 } })`. A string like `"round 2"` is not parsed, the script falls
  back to round 1, and the append-only guard stops it — harmless, but it wastes
  a launch.
- **The owner is rarely at the desk.** A round has to run start to finish
  without a permission dialog, so everything it needs is allowed in
  `.claude/settings.json` (committed, so it works on any machine — not
  `settings.local.json`). Prefer Edit and Write over shelling out to an
  interpreter to rewrite files: interpreter calls are the one thing that should
  keep prompting, and using them for edits turns a quiet run into a stalled one.

## Milestones

- S1 (done when: Pages URL shows a moving dot, CI green): scaffold, canvas,
  spline demo, CI, Pages.
- S2: the `sim/` module. See `BACKLOG.md`.
- S3: garage and stages.
- S4: actives and feel.
