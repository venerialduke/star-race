# Review: Systems

I read these as a person who has to write them down as rules that resolve on an
integer tick, with numbers that agree with each other, and then hand the result
to a harness of bots. I checked the arithmetic. Where a proposal gives a formula
I ran it. Where a mechanic is described in one sentence but needs five rules to
resolve, I say so, because that is where the schedule goes.

## Scoreboard

| Proposal                                | Build | Tradeoffs | Interaction | Stakes | Legibility | Fit | Buildable | Measurable | Total  |
| --------------------------------------- | ----- | --------- | ----------- | ------ | ---------- | --- | --------- | ---------- | ------ |
| track-first — The Line and the Wide     | 4     | 5         | 5           | 3      | 5          | 4   | 2         | 5          | **33** |
| economy-first — The Ledger and the Line | 4     | 4         | 5           | 3      | 3          | 3   | 4         | 4          | **30** |
| season-first — Par and Purse            | 4     | 4         | 4           | 5      | 3          | 3   | 2         | 4          | **29** |
| ship-first — The Flight Card            | 5     | 2         | 4           | 3      | 3          | 2   | 3         | 5          | **27** |

## The Line and the Wide

**Build 4.** Six systems on a 0/80/180/320/500 ladder with 600 starting credits
and 50% sell-back is a real build space with real commitment, and the worked run
shows four distinct directions being flown rather than described.

**Tradeoffs 5.** Offset is one number from 0 to 100 and everything is priced
against it: speed multiplier, charge rate, credits, hazard exposure. G-load with
a zero-charge Hold that costs 15 ticks to shed 30 G is a closed, self-consistent
loop — the cost of acceleration is stated in the same units as the cure.

**Interaction 5.** Blind route declaration, simultaneous reveal, then placement
is the best-specified interaction step in the round. It is one discrete choice
from four options with a known payoff structure, and it answers the seed's
"how do I know a pool is contested" without a scoreboard.

**Stakes 3.** Five heats a season is too few. Each ship races once per phase, so
a player has five data points and three of them are cut gates. A DNF at 0 in a
five-heat season is close to fatal, and the proposal knows it — it asks the owner
whether DNF should floor at 1. Margins have almost no room to compound into "an
extra stage or two" when there are only five heats to compound across.

**Legibility 5.** One bar with three dots on it and you can read the whole race.
Two currencies, not four. Delay lands in the thumb rather than in a stat block.
This is the only proposal where I believe a player can watch a 60-second race on
a phone and say afterwards what happened and why.

**Fit 4.** Every timing number checks out exactly: 12/16/20/24/28 segments at
50 ticks a segment, laps 3/2/2/1/1, at 30 ticks a second gives 60, 53.3, 66.7,
40 and 46.7 seconds — the proposal writes 60, 54, 67, 40, 47. The pairing rule
`i, 9−i, i+8` for i in 1..4 covers ranks 1–12 exactly once. Reaction delay is an
integer input queue, which is about four lines of sim. The gap: growth markers
give a probability with no complement. Tightening becomes a chicane 60% of the
time — and the other 40% it becomes what? Three rules are missing there.

**Buildable 2.** Nav is a five-level route planner. "Nav 5 sequences a wide
excursion so it lands on the exit of a bend where you were losing speed anyway"
is not a rule, it is an optimiser, and five graded qualities of optimiser is five
different behaviours to author, tune, and keep deterministic. The proposal names
this as its own risk and proposes a dumb nav for the first playable — but a dumb
nav deletes the difference between Nav 1 and Nav 5, which is a 320-credit
purchase and one of six systems. The scope honesty is real; the fix is not.
Twelve bots that build, declare, place and fly is also the largest field in the
round.

**Measurable 5.** Declarations are discrete and sweepable. Offset policy is a
scalar per segment. The 240-per-type pool is named as the single dial to tune
first. And it makes falsifiable claims a harness can kill: the skeleton build
starves by phase 4, mod purchase rate should exceed 30%. That is how you write a
design for measurement.

**Best idea.** Reaction delay reaching the player's thumb.
`delay = round(12 × (speed/100)² ÷ handling_factor)`, and your taps land that
many ticks late. I checked both worked examples: 145 speed at handling factor 1.0
gives 25 ticks, 92 speed at 2.4 gives 4. It is one input queue, it is fully
deterministic, it is measurable by giving bots tap-timing policies, and it is the
only answer in the round that makes "less reaction time" mean something for a
ship that flies itself _and_ something the player feels. Take this whatever else
wins.

**Fatal flaw.** Not fatal, but the season is too thin to carry the scoring rule
it is built on. Five heats with three cuts of three means the margin formula
never gets to compound, and the design's own recovery lever — bounty pools that
scale with standing — needs more than one heat between cuts to work.

**What it makes better in the seed.** The golden path. The seed says ships move
faster on it and collect energy from it, and that swinging wide is dangerous and
slow. This proposal turns that into a single number, offset, that carries the
speed multiplier, the charge rate, the collector yield and the hazard exposure at
once, and then prices a wide excursion out loud: forty ticks in the band costs
8 charge and roughly 10 ticks of lap. That is the seed's central geometry made
into arithmetic.

**What it drops, and was it right.** It drops gravity assists, correctly — the
track model has no celestial bodies and adding them to support one nav behaviour
is a second geometry for one feature. It narrows humanoid "random luck outcomes"
to a single 35% Improvisation roll, correctly, because a diffuse luck stat cannot
be measured by a harness and one named roll can. It shrinks laps from three to
1–3 as the ring grows, which is right for a phone but quietly abandons the seed's
"a heat is three laps" — that is a real loss, because three laps is what makes a
mid-race read possible, and phase 5's single lap has no second chance in it at
all. Folding shield deflection into absorption is right; two shield modes is one
system too many.

## The Ledger and the Line

**Build 4.** Hull class, nav rating, crew type and mounts, all public, with
saving toward a 550-credit ship that a stipend-spender never reaches. Hardware as
a public statement is a genuinely different build fantasy from the others.

**Tradeoffs 4.** Banked charge is income, spent charge is speed and shields —
one bar that is simultaneously your payday and your defence is the sharpest
single tradeoff any proposal states. The throttle dial is where it slips (below).

**Interaction 5.** The manifest, tolls that only pay when rivals harvest,
flares placed blind, seat order putting each lap on a different pilot's course,
and a post-heat split screen that teaches the pool rule without a tutorial. The
worked run earns it: Sabine's 25-credit flare changes Vex's race without the two
ships ever interacting on track.

**Stakes 3.** The margin formula is sound and I verified it never makes winning
worse: winner always scores 12 + 8 = 20, and the best any loser can reach is
6 + 8 = 14. But the season arithmetic breaks. Twelve pilots cut to eight, and
eight pilots do not divide into heats of three. Stage 2 cannot be run as written.

**Legibility 3.** Four pools, three defensive layers, Wanted, tolls, flares,
seat order, throttle, line, and tap plans. The proposal admits this may be too
much and names bounty as the first cut, which is the right instinct. The
post-heat split screen is a strong mitigation.

**Fit 3.** Deterministic and tick-based throughout, and the lap-time formula is
clean. Two holes. First, the humanoid's read "names a rival's chosen line before
you lock yours" — if two humanoids in a heat both read, the reads are circular
and there is no resolution rule. That is a simultaneous-decision problem that
needs a stated order or a fixed point, and neither is given. Second, patrol
cutters "sit on the golden path" and halve harvest "inside range" — no position
rule, no range number, no movement rule. One sentence, five missing rules.

**Buildable 4.** The only proposal that names a first playable, and it is
genuinely small and genuinely keeps the thesis: one course, three pools, one
hull, the throttle dial, two mounts, four heats, no tolls, no seams, no Wanted.
That paragraph is worth more than a page of architecture. The hidden cost it does
not name: a heat runs three laps on three different courses, so the sim holds
three track objects per heat and hands ships across at lap boundaries. That needs
matched segment counts and a stated carry rule for position and state, and none
is given.

**Measurable 4.** The pool rule is one sentence and closed-form: your cut is the
pool times your share of what the field harvested. Every scoring channel is
closed-form. Bot strategies map onto discrete choices — hull, nav level, crew,
mounts, throttle, line, toll segment, flare segment. The hard part to bot is the
part that is the game: a bot reading a rig manifest to predict which pool will be
empty is a game-theoretic layer, and a naive harness will under-test exactly the
mechanic the design rests on.

**Best idea.** The one-line pool rule. "Your cut is the pool times your share of
what the field harvested from it." Alone you take all of it; three ships in
evenly take a third each. It resolves any number of routes with any number of
participants, it needs no ordering, no tie-break and no cap, it is one line in
the sim, and a player learns it from one post-heat screen. Every other proposal
uses at least two different sharing rules; this one uses one and loses nothing.

**Fatal flaw.** The throttle dial does not do what the prose says it does. Lap
time is `1200 − 105t`, so throttle 5 saves 420 ticks a lap over throttle 1. The
grip penalty is `floor(t²/3)` on line score, and a shortfall of n costs 8n ticks
at that corner. With four corners a lap and the maximum possible shortfall of 7,
that is 224 ticks — still barely half of the 420 you saved. On lap time alone,
maximum throttle always wins. What actually stops it is hull: 3n damage per
failed corner is 84 hull a lap on that worst case, and a Skiff has 60. So the
seed's quadratic speed/handling trade is not priced in time at all; it is priced
in a death check. The tradeoff is binary, not graded, and the proposal's claim
that "the visible cost is money left on the track" is contradicted by its own
numbers. Fixable — steepen the wide penalty, flatten the lap-time gain — but it
has to be fixed before anything else is measured.

**What it makes better in the seed.** Shared pools. The seed says many economy
routes are shared and pay less the more ships chase them, and leaves it there.
This proposal makes that the centre of the game, gives it one resolution rule,
four named routes with stated pool sizes, and — crucially — makes contest
_readable before you commit_ by putting rigs on a public manifest. The seed's
loosest idea becomes its spine.

**What it drops, and was it right.** It drops the crewless ship as a chosen
build, folding it into the robot crew. That is right for this design: a dead
humanoid crew here is a bad outcome, and the robot is the version of "the nav
flies it" a player would actually pick on purpose. It drops gravity impairing all
actions and narrows it to boosts costing stamina, which is right — a global
action penalty reads as fog and is hard to attribute in a post-race sheet. It
drops shields deflecting objects, correctly, since there is nothing to deflect
without collisions. What it should not have dropped: the seed's insistence that
mods appear in the modifier's own races. Turning mods into pure toll booths that
never affect your own flying makes them clean but makes them accounting, and the
seed's version — you have to fly your own hazard — is the more interesting rule.

## Par and Purse

**Build 4.** Hull, crew, nav core, mounts, plus the Line dial. The nav-tier
purchase window is the sharpest spending decision in the round: 700 credits is
two thirds of a season and it is only worth it _before_ phase 2, while there is
still a spur to reveal. The Drone Hull as a deliberate no-crew build is well
argued.

**Tradeoffs 4.** Strain against thrust is a real cost, and the nav-versus-parts
window is excellent. The purse card is the strongest structural tradeoff: the
same build choice is priced differently every heat and you know the price before
you spend. Strain itself is weaker than it reads (below).

**Interaction 4.** Livery tags, the host rule, four markers placed by three
pilots, and an energy-rate readout that tells you how many rivals are on your
line without a scoreboard. That last one is a genuinely good live signal.

**Stakes 5.** The best of the four and not close. Drop your worst heat in each
phase, so one disaster is free. Inverted matchmaking takes one pilot from each
third of the standings, so rank 12 always races a fast reference to stay close
to. The trailing pilot hosts. The final is staggered by points rather than being
a coronation. Every one of those is a rule, not a fudge, and together they make
elimination earned and recovery structural.

**Legibility 3.** Hull, shield, crew and strain is four bars mid-race, which the
proposal admits is at the ceiling. Against that, "you finished four lengths back,
worth 5 points" is a single number that explains a whole race, and the
six-line post-heat sheet is well chosen. Net: adequate, and one bar over budget.

**Fit 3.** The season arithmetic is the only one in the round that works
end to end: 12 into 9 into 6 into 3, four heats then three then two, nine heats a
pilot, and roughly nine minutes of racing. The path-energy split — 3 per tick
divided among ships on the line, remainder to whoever is ahead — is exactly the
integer tie-break a deterministic sim needs, and it is one of the few places any
proposal wrote the tie-break down. But the central corner rule is broken as
written. It checks `v² / 400` against `Grip × H / 10`, and `v` is never defined:
Thrust is rated 1–10 and no rule maps thrust to speed, so the load-bearing
inequality of the whole ship model has an undefined variable in it. Then "hull
damage equal to the excess" makes damage out of the unit-free difference between
those two sides. And the Line dial, which is what the player actually sets, never
appears in the inequality at all — Line 1 "never swings wide" is a guarantee the
formula cannot make for a fast, low-Grip ship. Three rules missing from the most
important check in the design.

**Buildable 2.** No first playable is named, and this is the heaviest system
count in the round: three writ types, three marker types, eight mounts, three
purse cards drawn from a nine-card multiset, four spur points with a
two-of-four draw, wanted and a patrol cutter with a firing rule, strain, Instinct
with a strain-interpolated probability, Auto Line, the Line dial, drop-worst
scoring, three-way inverted matchmaking, and a staggered final with a
points-to-lengths conversion. Every one of those is defensible and the total is a
lot. A proposal that will not say what its smallest version is has not finished
costing itself.

**Measurable 4.** The purse card is a gift to a harness: three explicit
optimisation targets, and you can ask directly whether an Endurance-optimised
build dominates. The proposal asks that question itself and names the answer
(S drops from 16 to 12 if a no-input drone survives to phase 3). The undefined
`v` is what keeps this off a 5 — you cannot measure a corner check you cannot
evaluate.

**Best idea.** The reference line is the winner _or a par ghost, whichever
crosses first_. That one clause kills the obvious exploit in margin scoring — a
slow heat where everyone stays close and everyone banks — without any extra
system, and it means a fast winner pays the whole field more because staying near
them is hard. It is one comparison, fully deterministic, and it makes
margin-based scoring safe to build on. Second-best: the trailing pilot hosts, so
track mods are bought by losers and met by leaders. That single rule turns the
seed's private self-buff into the recovery mechanism, which is the cleverest
reframing anyone did with the seed.

**Fatal flaw.** None fatal, but two things need fixing before a line is written.
The corner check must define `v`. And strain is binary rather than graded: rise
is `Thrust / 10` per tick under power and decay is 1 per tick coasting, so a
Thrust-8 ship must coast 44% of every lap to stay under the pin threshold of 60.
On a twelve-segment loop that is not happening, which means high-thrust ships are
pinned essentially always and the bar is a build-time flag wearing a mid-race
costume. Also flagged: a length is 1/25 of a lap by distance, so it is 36 ticks
in phase 1 and 60 in phase 3 — the scoring unit the proposal says survives the
growth actually drifts by 67% across the season, and "four lengths back" gets
easier to hold every phase. And a photo-finish second on Even Split scores 9, not
the 8 the text claims, since a zero gap floors to zero.

**What it makes better in the seed.** The elimination rule. The seed flags point
cutoffs as boring and asks for margin sensitivity with some randomness, and does
not know how to get there. This proposal answers with `max(0, S − gap) + W`, a
par ghost so closeness cannot be farmed, and — the real move — puts the
randomness in the _purse card shown before the build_ rather than in the race. So
the seed's "some randomness" becomes a question your ship answers rather than a
thing that happens to your ship. That is the single best piece of design thinking
in the round.

**What it drops, and was it right.** It drops gravity assists as a player-facing
system, folding them into the nav core — right, for the same reason track-first
was right to. It narrows humanoid luck to Instinct alone — right, and it bounds
it to once a lap, which a harness can price. It compresses nav planning into two
numbers, Auto Line and the Line dial, which is a much more honest treatment of
"good navigation plans a better route" than a route planner would be. What it
drops wrongly: the seed's mods-in-your-own-races. Making the host the only source
of track changes is elegant, but it means a leader never flies their own
purchases, so the interesting version of the decision — build a ship that can
survive the hazard you are about to install — never happens to anyone.

## The Flight Card

**Build 5.** The strongest build fantasy in the round. Hardware sets ceilings,
the garage draws each ceiling as a notch on a slider, and the card says how close
to the notch you will run. Two players with identical parts and different cards
are two different ships. Robot as "delivers the same number nine heats running"
against humanoid as "push past the ceiling and gamble" is the only crew fork in
the round that is genuinely two different games rather than a stat swap with a
story attached.

**Tradeoffs 2.** The tradeoffs are stated beautifully and the numbers do not
enforce a single one. Charge income is 1 per 4 ticks on the path, so about 300
charge over a 1,200-tick race, against costs of 8 for a Burn, 10 for a Strike,
5 for a Brace. Charge is roughly thirty times more abundant than it needs to be,
which means "aggression against attention is charge spent on a rival instead of
your own lap" is simply false — you can afford both, many times over. The only
thing actually limiting action is the G cooldown, and that is broken in the other
direction (below).

**Interaction 4.** Visible collector loadouts on the grid, four track mod types,
blind simultaneous mines, Strike at range. The Charge Siphon in the worked run is
the best cross-player moment anyone wrote: a purchase made three heats earlier,
on a segment the buyer barely uses, ends a rival's season without the two ships
touching.

**Stakes 3.** Twelve to six after three heats is a 50% cut on three data points,
which is sudden rather than earned, and then six to three again. Recovery is "you
have a bigger wallet than the leader," which is the weakest recovery lever in the
round because it does not act until the next phase and the next phase may not
exist for you. The margin formula itself is the most carefully worked of the
four — I checked every claim in it and they all hold, including that a close
second scores 10 and a bare win scores 12, so winning is strictly better.

**Legibility 3.** Three dials with visible notches is a genuinely readable
garage, and berths as four icons going dark is a good crew display. Against that,
explaining why your crew is slow requires walking mass to acceleration to G to
tolerance to cooldown — a four-step chain to produce one number, and the number
is a cooldown the player never sees.

**Fit 2.** The physics is underspecified in a load-bearing way. There is no drag
term and no top speed anywhere in the proposal; a drive produces 0.875 u/tick²
and nothing takes speed away except a corner check. So on a straight, `v`
integrates without bound, and `v` is the variable the entire grip inequality
turns on. Related: acceleration reaches a working speed of 3 u/tick in under four
ticks, so the ship's headline number — thrust over mass — barely affects pace and
matters only through G. And G matters only through the crew cooldown
`4 + 16 × (G / tolerance)`, capped at 24, which is 4 to 24 ticks between charge
spends across 1,200 ticks. Either that cooldown never binds, in which case the
whole mass-acceleration-G-crew chain is inert, or it does bind and the player is
tapping fifty to three hundred times a race, which is not one thumb. The chain
the design is named after has a weak link at every joint. (The worked number is
also wrong: at G 0.9 with tolerance 1.0 the cooldown is 4 + 14.4 = 18.4 ticks,
not the 21 the text gives.)

**Buildable 3.** No first playable named. Real bookkeeping in the shared-pool
rule — 100/60/30 by crossing order, per node, with 120-tick regrowth, means
tracking arrival order per node per lap. Four mod types, a patrol that shadows
the field's highest-wanted player, a mass budget across six component classes.
Moderate on its own terms; the real cost is hidden in the missing speed model,
because writing one changes every number in the ship section.

**Measurable 5.** The best harness surface in the round. A flight card is three
integers from 0 to 10 — 1,331 combinations you can sweep exhaustively against
fixed hardware, which tells you immediately whether cards have a dominant
setting and where the notches should sit. Overdrive is a single seeded
probability, `0.5 − 0.1 × overdrive`, so humanoid-versus-robot is one clean
variance experiment. If the underlying speed model were specified, this design
would be the easiest of the four to tune.

**Best idea.** The overdrive notch. A dial is overdriven when it exceeds a
hardware number, the garage draws that number as a notch on the slider, and going
past it is a seeded roll a humanoid can pass and a robot always fails. That is
one mechanic that carries the speed/handling trade, the crew fork, the meaning of
nav, and the reason to buy hardware — and it is all visible in the garage as a
line on a slider before you commit. It is also, not coincidentally, the cleanest
thing in the round to measure.

**Fatal flaw.** There is no speed model. No drag, no top speed, no map from
thrust to velocity — and `v` appears in the grip inequality that every corner,
every dial and the whole track section depends on. Everything downstream of that
is arithmetic on an undefined quantity. Compounding it, the two systems the
design is built to price — charge scarcity and G-throttled crew — are both
numerically inert as written. This is fixable, but it is not a tuning pass; it is
the missing half of the simulation.

**What it makes better in the seed.** Hull damage. The seed calls hull "closest
to traditional health," which is the least interesting thing it could be. This
proposal reroutes hull damage into _handling_ damage — below 50% hull, grip drops
30%, and a ship never explodes — so taking damage is felt as losing the ability
to hold a corner rather than as a bar emptying toward a fail state. That is a
better idea than the seed had, it costs nothing to implement, and it makes
attrition legible on a phone as a line you can no longer hold. Second: the seed's
"better nav plans better routes" becomes three concrete jobs — adds handling,
raises the overdrive ceiling, flies home crewless — instead of a route planner.

**What it drops, and was it right.** It drops the DNF entirely: a ship never
explodes, damage is a bad race rather than a lost one. That is right for a
nine-heat phone season where a single zero is unrecoverable. It replaces the
crew health bar with berths, which is right — four icons is legible and a bar of
crew HP is not. It cuts ships contesting the same line, as the brief requires.
What it should not have dropped is the seed's shared-pool _economy_: it keeps a
sharing rule for nodes but makes finish position pay 300/200/120 unshared, so
racing dominates and the seed's "many economy routes are shared" is decoration
rather than structure.

## Recommended merge

**Build from track-first.** It has the cleanest state model in the round — one
offset number that carries speed, charge, credits and hazard — the only set of
timing numbers that all check out, the best interaction step, and the best
measurability. It is also the only proposal where I can picture the post-race
screen and believe a player reads it.

Four grafts, in order of how much they matter.

**Graft the flight card over nav-as-planner.** This is the important one.
Track-first's largest hidden system is a five-level route optimiser it cannot
afford and its own risk section proposes to gut. Ship-first solves exactly that
problem: hardware sets ceilings, three dials from 0 to 10 say how close to the
ceilings to run, and the garage draws each ceiling as a notch. Nav stops being a
graded AI and becomes a number that raises a notch. Keep the overdrive roll —
humanoid passes at `0.5 − 0.1 × overdrive`, robot always fails — because it is
the crew fork, the speed/handling trade and the reason to buy nav in a single
mechanic. Then use track-first's reaction delay as the third consequence of a
fast card: dial the card past the notch and your taps land late as well.

**Graft season-first's season whole.** Nine heats, twelve into nine into six into
three, four heats then three then two, drop your worst heat in each phase,
inverted matchmaking across thirds. Track-first's five-heat season is its worst
weakness and this is a drop-in fix that also gives the margin rule room to
compound. Bring the par ghost with it — the reference is the winner or the par
time, whichever crosses first — because it is the one clause that makes margin
scoring safe. Bring the purse card too: it puts the seed's randomness before the
build instead of inside the race, and it gives the harness three named
optimisation targets on day one.

**Graft economy-first's pool rule, and use it everywhere.** Your cut is the pool
times your share of what the field harvested from it. One line, no ordering, no
tie-break, no cap. Drop ship-first's 100/60/30 crossing-order rule and
track-first's `pool_share × min(1, band_ticks / 40)` in favour of it — the second
is nearly the same rule with an extra clause, and having one sharing rule for the
whole economy is worth more than the precision.

**Keep track-first's declaration step and mods-you-must-fly.** Blind
declaration, simultaneous reveal, then placement is how a player learns a pool is
contested in time to respond, and it is the cheapest good interaction in the
round. And keep mods appearing in your own races — season-first's host rule is
elegant, but a mod you never fly is accounting, and "build a ship that survives
the hazard you are about to install" is the better decision. If recovery needs
more help than the underdog grant gives, take season-first's drop-worst rule
rather than its host rule.

**Fix before measuring anything.** Write the speed model first — a top speed and
an acceleration curve — because every corner check in every one of these
proposals is arithmetic on a `v` that nobody defined. Then set charge income
against action cost so that a race affords three to five taps, not fifty. Then
state the complement of every probability: a Tightening marker becomes a chicane
60% of the time and _something_ the other 40%. Then run the first sweep on one
dial only, the wide band's credit yield, because if the wide pays better than
winning the race stops being a race, and that is the one number every proposal in
this round independently identified as the thing that breaks first.
