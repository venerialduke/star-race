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

## Two kinds of round

**Divergent** — `framework-round.js`, and its unanchored twin `seed-round.js`.
Four proposers each pick a design and commit to it, three reviewers score them,
a synthesiser merges. Ten agents, roughly half an hour when nothing stalls. Use
it when nobody knows what the game is yet.

**Sharpen** — `sharpen-round.js`. One designer develops an existing idea in
place, two readers mark it up. Three agents, minutes. Use it when the owner has
an idea and wants it made feasible and legible rather than replaced.

The distinction exists because round 3 got it wrong: a page of the owner's notes
went into a divergent round and came back as four new frameworks and 34,575
words, with two named systems silently dropped. Divergence is a generator, not a
sharpener. Feeding an idea you like into four agents told to "commit to your own
design" will reliably give you four other ideas.

Both kinds obey the same budgets: around 1,500 words for a proposal or a
sharpened design, 800 for a review, 1,800 for a synthesis, 700 for a set of
notes — always stated as a target, never a range, and always with "do not count
your words". A range invites an agent to count and trim, which cost round 3
about an hour. Every document carries at least one `mermaid` diagram; the page
renders them as pictures.

## Running a divergent round

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

## Running a sharpen round

> run the sharpen-round workflow for round 4

Put the idea in `design/rounds/round-NN/seed.md` first (or pass `seed` pointing
at an earlier round's).

To iterate on a sharpen round you have read, write your notes to that round's
`feedback.md` and pass both it and its design as inputs:

> run sharpen-round for round 5 with base round-04/sharpened.md and notes
> round-04/feedback.md

The three inputs have a strict order. The **base** is the spine: the output
should read as that document with the notes worked in. The **notes** lead:
where a note and the base disagree the note wins, and if a note moves
something the base is built on, the designer says so rather than picking a
side quietly. The **seed** is the guard: every named system in the original
brainstorm is accounted for in every pass, kept, altered or flagged.

Sharpen rounds write in a particular register, asked for after round 4:
mechanics, not values. "Shields regenerate slowly" is the right sentence; a
point value is only worth writing when the mechanic cannot be understood
without it. Every term is defined where it first appears.

It does:

1. **Sharpen.** One designer reads the seed and writes `sharpened.md`: the same
   idea, made feasible, with the numbers filled in and two diagrams. It may say
   what does not work and propose additions. It may not replace the core
   principle, rename the seed's vocabulary, or drop a named system without
   flagging it — every system in the seed appears in the output, kept, altered
   or argued away.
2. **Read.** Two readers in parallel — one plays it, one checks the rules and
   the arithmetic — write `notes/plays.md` and `notes/rules.md`. They do not
   score: a score out of 40 compares things, and there is only one design here.
   Each answers first whether the owner's idea survived.

Then `round.json` is written with `"kind": "sharpen"` and the page is rendered.
A sharpen round's page drops the scoreboard, the proposals and the critique
section, and shows the design followed by the notes.

## After the framework: the catalogue

Once a framework is settled enough to populate, the work moves to
`design/catalogue/`: one table per element — ship parts, crews, fixtures,
abilities and so on — dictated by the owner and transcribed, never invented.
`design/catalogue/README.md` is the tracker and says how to dictate. Reviews
and the build plan come after every element is seeded, and the build is clean
slate: nothing in the catalogue is costed against `src/`.

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
