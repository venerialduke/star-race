# Star Race — how to work in this repo

Read this first. `DESIGN.md` is the source of truth for the game's rules.
`BACKLOG.md` holds the next tasks, one per agent session. `PLAN.md` is the
original project plan and is background only.

## What this is

Auto-chess meets racing. The player builds a ship between heats; the ship flies
the loop on its own. The bet the game rests on is one sentence: **the faster a
ship goes into a bend, the wider and less predictably it swings off the golden
path.**

The 2026 vertical slice is finished and is **not** what is being built now. Its
code sits in `legacy/` (last commit `543ac1e`) and carries nothing forward but
its engineering conventions. `DESIGN.md` is the game as built; the wider design
is `design/catalogue/framework.md`.

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
src/ui/        Controls and readouts.
src/main.ts    Fixed timestep: input → sim → render.
tests/sim/     Determinism and the properties everything later stands on.
legacy/        The finished 2026 slice. Nothing imports it; delete when ready.
design/        The design rounds, the catalogue, and the framework.
```

## Conventions (these are enforced or reviewed, not optional)

- `src/sim` imports nothing from `render`, `ui` or `main.ts`, and nothing
  nondeterministic. ESLint enforces this (`eslint.config.js`, the
  `src/sim/**` block). A violation is a lint error, not a review comment.
- The visual stages (S1, S2) are judged by eye, so they carry determinism
  tests and little else. The suite grows when the economy does, where the
  answers are numbers rather than feel.
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
npm run mechanics-page   # design/catalogue/ → public/design/mechanics.html
npm run balance          # whole seasons, policy against policy
```

The **track builder** is a second page of the same site: `/star-race/builder.html`,
or `builder.html` under `npm run dev`. Pieces from a catalogue into sectors, the
loop closed for you when it is open, and TypeScript out at the bottom to paste
into `src/sim/track.ts`. `design/track-model.md` is the model it is built on.

Before reporting a task done: `npm run typecheck && npm run lint && npm test`.
Before opening a PR, also `npm run build`, or use the `deploy-checker`
subagent.

## Subagents (`.claude/agents/`)

- `sim-engineer`: implements changes in `src/sim` with tests.
- `balance-analyst`: read-only; runs seeded race batches and reports stats.
- `deploy-checker`: read-only; confirms typecheck, tests and Pages build pass.

## Working style

- One backlog item per session. Small enough to finish in one sitting.
- Measure before tuning. A claim about balance should come with the seeded
  runs behind it, and findings belong in `BACKLOG.md` where the next session
  will read them.
- Work in a branch or worktree, open a PR with a short summary the owner can
  read on a phone: what changed for the player, what changed in code, which
  tests were added.
- Work on a branch and open a PR. Merging it is allowed once CI is green — the
  owner granted that on 2026-09-13 — but `main` must never go red, so never
  merge on a red or pending check. Do not force-push. Do not `rm -rf`.
- If a task needs a rule change not covered by `DESIGN.md`, stop and ask.

## Branches, and the force-push trap

**The owner should turn on Settings → General → "Automatically delete head
branches".** It is one checkbox and it closes this whole section. Everything
below is why, and what to do until then.

A session is handed a branch **name**, and the same name comes back session
after session. PRs here are squash-merged, so the merge puts a *different*
commit on `main` carrying the same tree — the branch's own commit is never an
ancestor of `main` again. The branch is left behind pointing at dead history,
and the next session, starting correctly from the current `main`, finds its push
rejected as a non-fast-forward. From there the only ways out are to force-push
or to delete the branch, and a session under time pressure picks the first. That
is how a repo with a "do not force-push" rule collected three force-pushes in
two days.

**An agent session cannot delete the remote branch itself.** Verified
2026-09-15: this sandbox's git proxy refuses a delete refspec, reporting `fatal:
the remote end hung up unexpectedly` followed by a cheerful `Everything
up-to-date`, and the branch is still there afterwards. The GitHub MCP server has
`create_branch` and no delete. So do not "clean up the branch" and assume it
worked — if you try at all, check with `git ls-remote --heads origin` and
believe that, not the push output.

Which leaves, in order:

1. **The repo setting**, so no branch is ever left behind. Owner, one click,
   permanent.
2. **The owner deleting merged branches** from the PR page ("Delete branch") or
   from a real machine.
3. Only when neither has happened and the branch genuinely cannot be deleted: a
   `--force-with-lease`, and **only** after proving the remote tip is
   already-merged history — `git diff --stat <remote-tip> <squash commit on
   main>` must come back empty. Say it out loud in the reply. Never force past a
   push rejection you have not diagnosed.

A rejection whose cause is *not* case 3 — a branch carrying work nobody merged —
means something else is pushing to it, and the answer is to merge or rebase onto
it, never to overwrite it.

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

See `BACKLOG.md`. S1 the swing · S2 the heat · S3 the ship and the shop ·
S4 the route · S5 the season · S6 interaction. S1 is the bet: if a ship
swinging wide is not interesting to watch, nothing below it saves the game.
