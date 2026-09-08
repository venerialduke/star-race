# How a round 3 proposal is scored

Reviewers score every proposal on each criterion from 1 to 5, with one line of
justification per score. A 3 is "adequate and unremarkable"; a 5 is "this is
the reason to pick this proposal"; a 1 is "this sinks it". Totals are out
of 40.

Scores are a tool for comparison, not a verdict. A reviewer's written case
matters more than the sum, and a proposal with one 5 and one 1 may be worth
more than a proposal of 3s, because the 5 can be grafted onto something else.

This round is scored against `seed.md` and this folder's `BRIEF.md`. It is not
scored against any existing implementation, and a proposal must not be credited
or penalised for resembling one.

| #   | Criterion       | The question                                                                                                                                                                                                                       |
| --- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Build**       | Does assembling and tuning a ship feel like a plan coming together? Are there identifiable directions, choices that reward commitment, and a moment where a ship becomes the thing it was aiming at?                               |
| 2   | **Tradeoffs**   | Does every good thing cost something? Speed against handling, acceleration against the crew, aggression against attention, spending against saving — are the seed's tensions real, priced, and live every round?                   |
| 3   | **Interaction** | Do other players' choices change my race and my ship? Is there information to read, something to contest, and a reason to care who I am matched against?                                                                           |
| 4   | **Stakes**      | Can a player be knocked out, is it earned rather than sudden, does the margin rule genuinely reward staying close, and can a bad early heat be recovered from?                                                                     |
| 5   | **Legibility**  | On a phone, can a player understand what happened in a race and why, in the time the race takes? Are the systems few enough to hold in one head? Three defensive layers and a shared-pool economy are a lot — is the count earned? |
| 6   | **Fit**         | Deterministic simulation, fixed integer tick, one thumb. Does it fit, and where it bends a constraint does it say so and earn it?                                                                                                  |
| 7   | **Buildable**   | Is the scope honest? How much system is actually here, how small could a first playable version be, and what complexity is the proposal hiding? Judge the design's own weight — there is no existing codebase in scope.            |
| 8   | **Measurable**  | Could a harness of bot strategies tell us whether choosing well pays, whether any approach dominates, and whether a run is winnable from behind?                                                                                   |

## Scoring the seed itself

Beyond the eight, every reviewer answers two questions in prose:

- **What in the seed does this proposal make better?** Name the idea from
  `seed.md` and say what the proposal added to it.
- **What in the seed does it drop, and was it right to?** Some of the seed
  should not survive. A proposal that keeps everything has not made choices;
  a proposal that keeps almost nothing has changed the subject.

## What reviewers also deliver

- **The best single idea** in each proposal, whether or not the proposal wins.
- **The fatal flaw**, if there is one, in each proposal.
- **A recommended merge**: which proposal to build from, and what to graft onto
  it from the others.
