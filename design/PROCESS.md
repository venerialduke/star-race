# The design rounds

The framework is found by iteration: agents propose, agents review, one agent
synthesises, the owner reads a page and gives feedback, and the next round
starts from that feedback. This file says how a round runs and where everything
goes.

## What a round produces

```
design/
  BRIEF.md                 the question, amended by owner feedback
  RUBRIC.md                how proposals are scored
  PROCESS.md               this file
  LEDGER.md                every idea ever considered, with its fate; append-only
  rounds/
    round-01/
      proposals/*.md       one framework per proposer, fixed section headings
      reviews/*.md         one review per reviewer, scores plus a written case
      synthesis.md         the recommended framework, and the open questions
      critique.md          what the synthesis leaves unaddressed
      round.json           title, date, the scoreboard, the questions
      feedback.md          the owner's response — written by the owner
public/design/
  index.html               every round, newest first
  ledger.html              the ledger, rendered
  round-01.html            the round, rendered for a phone
```

**Nothing is overwritten.** A round folder is written once. The workflow
refuses to run into a folder that already holds proposals, so re-running a
round produces the next number, and every proposal, review and synthesis ever
written stays on disk and on the site. The ledger is the short form of that
history: one line per idea, with its fate and the round that decided it.

The markdown is the record. The HTML is rendered from it by
`npm run design-page -- --round 1` and is served from the Pages site at
`https://venerialduke.github.io/star-race/design/`.

## Running a round

The round is a saved workflow, `.claude/workflows/framework-round.js`. Ask
Claude Code to run it:

> run the framework-round workflow for round 2

It does, in order:

1. **Propose.** Four proposers, each given the brief, the previous round's
   synthesis and the owner's feedback on it, and one _lens_ to lead with:
   economy, interaction, run structure, or build synergy. Each writes one
   complete framework under `proposals/`. The lenses are starting angles, not
   silos — every proposal has to cover everything the brief asks for.
2. **Review.** Three reviewers, each with a lens of their own: an auto-battler
   veteran judging fun, an engineer judging fit and cost against this codebase,
   and a phone player judging legibility and pace. Each reads every proposal,
   scores it against `RUBRIC.md`, and recommends a merge.
3. **Synthesise.** One agent reads everything and writes the recommended
   framework: what was taken from where, what was rejected and why, the
   decisions only the owner can make, and what the next round should focus on.
   It also appends the round's section to `LEDGER.md`.
4. **Critique.** One agent checks the synthesis against the brief and the
   owner's feedback and names what it dodged.

Then the page is rendered, the round is committed on a branch, and a PR is
opened so the page lands on the Pages site when merged.

## Giving feedback

Write `design/rounds/round-NN/feedback.md`, in whatever shape is convenient:
answers to the open questions, things to keep, things to drop, new
constraints, a different direction entirely. The next round's proposers read it
first. If a piece of feedback should hold for every future round, it goes into
`BRIEF.md` as well.

## When a round is "done"

When the owner reads a synthesis and says "build this". At that point the
synthesis becomes the new `DESIGN.md` — rewritten, not appended — and the
backlog is cut from it.
