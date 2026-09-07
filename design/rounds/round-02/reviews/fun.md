# Review: Fun — the auto-battler player

Before the scores, one thing about the round. These are not four frameworks.
They are one framework and four economies. All four have four tags, thresholds
at two and three of a tag, copies counting toward a set, eight ships, seven
heats, a ladder, a face-up draft in reverse order, a Solar Flare or its cousin,
a modifier block capped at eight or nine numbers, and a worked run the player
wins. The round-01 spine held so hard that each proposal differentiated on
exactly one system and left the rest identical. That is good news for merging
and bad news for the round: nobody argued with the skeleton, so nobody tested
it.

The second thing. Three of the four have a purse spread so flat that finishing
first barely pays more than finishing sixth — 5/4/4/3/3/3/2/2 in run-first,
5/5/4/4/4/3/3/2 in build-first. Round-01's critique said "the purse for fourth
differs from eighth" and only economy-first heard it, at 8/7/6/5/4/3/2/1. In an
auto-battler, winning a round has to pay. Whatever wins here takes economy-first's
spread.

## Scoreboard

| Proposal          | 1 Build fantasy | 2 Tradeoffs | 3 Interaction | 4 Stakes | 5 Legibility | 6 Fit | 7 Buildable | 8 Measurable | Total |
| ----------------- | --------------- | ----------- | ------------- | -------- | ------------ | ----- | ----------- | ------------ | ----- |
| run-first         | 4               | 4           | 5             | 4        | 3            | 4     | 3           | 5            | 32    |
| interaction-first | 4               | 2           | 5             | 4        | 3            | 5     | 4           | 5            | 32    |
| build-first       | 5               | 3           | 3             | 4        | 4            | 4     | 4           | 4            | 31    |
| economy-first     | 3               | 5           | 4             | 4        | 3            | 4     | 3           | 4            | 30    |

On my lens the first four columns decide it: run-first 17, economy-first 16,
interaction-first 15, build-first 15.

## The Rising Line (run-first)

**Build fantasy 4.** The counter ring is closed and it is the only one in the
round that is: Brick lays rock and Sling 3 crosses it, Sling lays the pull and
Burner 3 boosts out, Burner lays the flare and Mirror 3 shields the heat, Mirror
lays the burst and Brick 3 eats a stack. "The answer to their card is never
their part" is the exact thing round-01's critique said nobody had delivered.
Points off because the parts under the ring are the same tag skeleton as the
other three, and a build is still three flat picks then a rule.

**Tradeoffs 4.** Frame is the best long-run cost anyone wrote and it is one
falling number. A refit at 5 credits against a tier-1 at 3 bites. The spender
sits at 0 credits after every draft, which proves prices bite and also means the
spender has no decision left to make. Marked down for the flat purse and for
having no escalating pressure: heat 6 costs exactly what heat 1 cost.

**Interaction 5.** All eight ships lay every heat, in two waves, and the bottom
half lays second with the whole map in front of it. Slot resolution is a vote —
the kind with the most cards wins, minus Open Runs — so my card can cancel yours
rather than only stacking on it. That is strictly better than an additive
intensity dial, because it gives a card a target and an answer. Heat 3 of the
worked run, spending your card on Open Run to defuse a rock stack because you
have no armour, is a decision I would enjoy making.

**Stakes 4.** Frame is decline you earned, visible from heat 2, floored at 30 so
it is never a spiral. Free hull repair to Frame before each heat trades drama
for legibility and I think the trade is correct — the flat escape threshold
still becomes a wall at Frame 58.

**Legibility 3.** Rising line plus Frame plus intensity plus the counter ring
plus purse plus interest plus two-wave seeding plus tags plus tiers. The lobby's
printed counter ring is a good teaching device. Twelve minutes is the longest
season of the four.

**Fit 4.** Cards are inputs, intensity is a multiplier per hazard. Mirror 3's
shields-until-empty is a real rewrite of the actives model, unremarked.

**Buildable 3.** Fifteen PRs, first playable at eleven and headless. The most
honest cost note in the round — "S2 and S3 again on the same bones" — and the
least reassuring.

**Measurable 5.** Best target list anywhere here: the ladder-reader beats the
one-note-seeder by 8 points a season; a bot that never refits ends on mean Frame
under 65; saver, spender and switcher each reach the final between 40% and 60%.
Those are assertions, not adjectives.

**Best idea.** Frame. Maximum hull that never fully comes back, one point lost
per ten hull repaired, floored at 30, halved by Brick 2. It is the F-Zero trade
at season length in a single number, it makes armour pay at run scale rather
than heat scale, and it is the only run-health system here that makes a bad heat
2 still hurt in the final.

**Fatal flaw.** Not fatal, but the weakest system is the one in the title. The
rising line at 10/17/24/31 runs against means the author admits are a first
guess; it takes two ships some heats and nobody others. "Am I safe?" becomes
arithmetic against a moving target, which is anxiety without a decision, and a
heat that cuts nobody is a heat with no stakes at all. The fixed cut it replaced
was one sentence and a player could read it off the ladder in a glance.

## The Toll (interaction-first)

**Build fantasy 4.** Mirror 3 rewritten as uptime — shields up 180 of every 320
ticks, 56% of a course, the only ship that can be shielded through rock — is the
best set-3 rule in the round and the only named counter to an archetype that is
not that archetype's own part. Brick 3 capping continuous damage only, using the
`isOneShot` that already exists in `hazards.ts`, is both sharp and nearly free.
This proposal read round-01's critique hardest. Twelve parts over two tiers is
thin, and the stated four-way cycle is not a cycle: Brick is killed by two
things and nothing on the table kills Sling.

**Tradeoffs 2.** There is one reason to save and it is that the tier-2 costs 8.
No interest, no rising cost, no ante, nothing that compounds. The credit table
is three asserted rows. Worse, the toll pays you for being behind and pays the
leader nothing, so the design's economic gradient runs downhill the whole
season: the richest ship in the game is usually the one about to be cut. That is
a superb anti-snowball and a terrible reason to try to win a heat.

**Interaction 5.** Everyone stakes, every heat, one tap, secret and simultaneous.
The reveal is a course you can read. Your build is your menu. The toll makes
hurting the people ahead of you an income stream. Attribution names who did it.
And heat 6 of the worked run — buying an Inertial Anchor worth almost nothing to
your stats, purely to unlock staking the black hole, and it costs Halo the
season — is the single best moment written in this round. That is a purchase
that is a play rather than a stat, which is what an auto-battler actually is.

**Stakes 4.** Cut after heats 3 to 6, bottom row. A destroyed ship returns at 30
hull, keeps its build, scores 0, and still collects the toll its hazard earned
while it was flying. Your play surviving your death is a lovely rule and the
cleanest recovery lever in the round.

**Legibility 3.** "Every course carries the same four hazards" is a real win —
you learn four things once and never learn a course again. But the toll itself
is not something a phone player can compute before they commit: one credit per
fifteen points of hull removed from ships that were above me on the ladder at
the moment I staked, capped at five. I can read that after the fact on the
results screen and I can never predict it at the Board.

**Fit 5.** Cleanest fit here. Intensity is one number through `HazardContext`,
stakes are inputs identical to taps, `isOneShot` is reused rather than
reinvented.

**Buildable 4.** First playable at nine of fifteen, honest about `hazards.ts`,
and the smallest real change to the sim of the four.

**Measurable 5.** "A bot that stakes its own tag beats one that always stakes the
same hazard in at least 55% of seasons" is exactly the degenerate-course test the
critique asked for, and course variance across heats measures the proposal's own
top risk directly.

**Best idea.** You may only stake a hazard you own at least one part of the tag
for. A build's weapon and its armour are the same parts, so a rival's pips tell
you what it is about to do to the course. One rule, and it makes builds legible,
makes commitment pay twice, and makes nobody able to stake something they cannot
themselves survive.

**Fatal flaw.** The risk section is right and it sinks the design as written.
From heat 4 the field has the tag-count to max all four hazards, every course
becomes the same course, and the interesting move becomes Hold — which is
opting out for two credits. A stake phase that saturates goes stale at exactly
the heat the builds come online, which is the moment the game is supposed to get
good. And because socket order is level data, sequence is impossible: nobody can
put rock in front of a hole, only turn an existing dial up. Every heat's move is
"which of four sliders do I raise," and by heat 4 the answer is "none, they are
all at four."

## Ignition (build-first)

**Build fantasy 5.** The only 5 in the round and it deserves it for two reasons.
First, per-cell scaling: Torch's reroute is ×1.30 and +0.05 per red, Keel takes
8% less hazard damage per grey. Every cell you buy makes your Drive visibly
better all season, so there is no dead pick and the build improves every draft
rather than three times. Every other proposal has the flat "nothing, nothing,
RULE" shape; this one has a curve with a spike on it, which is the correct
auto-battler shape. Second, four rules exist in the entire game because cells are
pure stats with a colour on them — the only proposal that paid for legibility
structurally instead of asserting a cap of eight numbers. Six slots with ignition
at four leaves two for what you lack, and a Drive swap at 5 credits plus your
pick is a real pivot with a real price.

**Tradeoffs 3.** Repairs at 1 per 8 hull — 8 credits from 40, more than a tier-2
cell — is priced exactly as the critique demanded. The late squeeze is genuinely
good and nobody else has it: once four slots are cheaply full, the only way up is
to buy a tier-3 and scrap a tier-1 of the same colour. But the purse is flat, and
the proposal's own three-bot table says the saver "sits seventh for four heats
and is cut before its build lands." If saving is stated to lose, the tradeoff is
not a tradeoff.

**Interaction 3.** The wipe is the best adversarial move written this round: a
move is lay or wipe, never both, so the second mover decides whether the first
wasted a credit and the last mover chooses between the course it wants and the
course it can survive. That is a fight, not a queue. But only the bottom half of
the ladder gets a move, so climbing costs you your voice on the track — the
worked run's own heat 6 has the player above the line and laying nothing. The
top four ships are scenery in the interaction phase, which is round-01's
critique wearing a different hat.

**Stakes 4.** The head start is the best ending in the round. Cut after 3 to 6
and a 30-hull return are unremarkable, and a destroyed ship needing 8 credits to
repair against a purse of 3 has a thinner recovery than it claims.

**Legibility 4.** Highest here, and earned. Four Drive rules, pure-stat cells,
pips with the Drive lit, and a final whose entire season summary is where the
ships are standing on the grid. The one hole is the collapsing corridor:
quadratic in time inside, and the proposal admits the current view cannot show
it. A hazard whose rule is invisible is unexplained damage, which is the one
thing a phone player will not forgive. Cut it or draw it.

**Fit 4.** The head start is one number in `startRace`. `ticksInside` in
`HazardContext` is small. Nine modifiers is one more than everyone else and the
author says the ceiling is unproven.

**Buildable 4.** Seventeen PRs and the author says four months, which is the most
alarming and the most honest number in the round. But the staging is the best of
the four: the first playable at eight PRs is a coherent game — eight ships, four
Drives, drafts, a ladder and a cut — that you could hand to a person, rather than
a headless engine waiting on three more PRs.

**Measurable 4.** "A bot that ignites by heat 5 reaches the final over 60% of the
time and one that never ignites under 25%" is the right shape. Fewer economy
targets than run-first.

**Best idea.** The head start. The final is one race and the ladder becomes a
starting stagger of 40, 25, 12 and 0 ticks on 1,150. Six heats of standings
become a physical, beatable advantage you can read off the grid without doing
arithmetic. Double points is a sum; a stagger is a picture. Per-cell scaling is
a very close second and I want both.

**Fatal flaw.** The leader picks the next course, so one free tap can switch off
another ship's entire build — Halo picks a course with no black hole and a
Sling's four purple cells do nothing — and ships above the halfway line have no
card with which to answer. A build that a rival can turn off, that I cannot
protect, spent five heats assembling, is the least fun thing proposed this
round. The second problem compounds it: the Drive is declared in the lobby before
any information exists, so the commitment is made without a decision. In every
auto-battler worth playing the game deals you into a direction and you read it;
here you announce it blind and then grind.

## The Ante (economy-first)

**Build fantasy 3.** Sling 3 turning the black hole into an assist and Brick 3
ignoring the escape threshold are good "it came online" rules. But the build is
throttled by a currency that is also the score, so every part you buy visibly
lowers your standing, and the proposal offers nothing to build with that the
other three do not.

**Tradeoffs 5.** Easily the best, and it is not close. The ante rises 0, 1, 2, 3,
4, 6, 8, so the last two garages cost 14 between them and everybody has to bank
into the back half. Prices float, so buying nothing is sometimes the cheapest way
to buy. Interest is 1 per 6 capped at 4. And Refit uses your one board purchase,
so repairing costs you a part — which is the cleanest repair price anyone wrote,
because it is an opportunity cost rather than a number a player can misjudge.
Four claims on every credit, every garage.

**Interaction 4.** Floating prices — every copy bought raises that part by 1 for
everyone to base+4, every heat every price drops 1 — is the best interaction idea
in the round. It is always on, it needs no extra screen, it affects every ship
every draft, and "Ion Thruster 5 (base 2), three left" is counter-pick
information delivered as a number on a row I am already reading. That is the
contested-unit feeling from TFT, correctly translated. Marked down because the
other half, the bought course, is unmotivated: a marker costs credits, credits
are score, and the hazard hits you too, so laying one is paying score to be
spiteful. The proposal never says what a marker earns.

**Stakes 4.** Bankruptcy with forced scrapping is the most dramatic elimination
here — you watch your own build come apart one part at a time, at half price,
and your tag rule switches off before you do. Nobody is surprised, because the
ante is printed in the lobby.

**Legibility 3.** One currency instead of points plus credits is a genuine
simplification and I credit it. A fourteen-row board with floating prices,
an ante schedule, interest, salvage, marker prices and scrap values is not.

**Fit 4.** Fine. The market is stateful but deterministic.

**Buildable 3.** Seventeen PRs, first playable at nine, plus a market module
nobody else needs.

**Measurable 4.** Good list, and "the leader pays 1.5 more per part than the
tail" is the only market-specific assertion in the round.

**Best idea.** Floating prices. Demand raises a part for everyone and time cools
it, so another player's build is what makes yours expensive, and the shop row is
the ladder's build information without anyone having to read pips.

**Fatal flaw.** Two, and they compound. Credits are money, score, life and track
power at once, so buying the part your build needs is spending your score — and
then the triple final purse, 24 down to 2, is a wider spread than the entire
season's accumulated difference, so seven heats of careful economy get settled by
one race. And the ante only bites ships that spent: the proposal's own punchline
is that a ship finishing eighth every heat and buying nothing survives all seven
antes. Elimination pressure lands exclusively on the players who engaged. In
every auto-battler that works, the player who does not play dies first; here they
are the safest ship on the board.

## Recommended merge

**Build from run-first, The Rising Line.** It wins on the four criteria my lens
weights: a closed counter ring where the answer to a rival's card is never a copy
of their part, all eight ships acting on the track every heat with the bottom
half acting second and informed, Frame as a single falling number that makes
early greed cost late, and the sharpest harness targets. Its weaknesses are all
grafts rather than rewrites.

Graft these, in the order I would fight for them.

**1. Per-cell scaling, from build-first.** The most important graft. Every part
of a tag improves that tag continuously — Brick takes 4% less asteroid damage per
grey part, Sling gains 0.04 black-hole pull per purple — on top of the rules at
two and three. Right now every proposal has two dead picks before a spike, which
means drafts 1 and 4 do nothing you can feel. A curve with a spike on it means no
pick is dead, the build gets better every heat, and the threshold still lands as
a moment.

**2. The head start final, from build-first**, replacing double points. Four
ships, 40/25/12/0 ticks on 1,100. It reads off the grid with no arithmetic and it
makes six heats of ladder physical.

**3. The rising ante, from economy-first**, replacing the rising points line.
0, 1, 2, 3, 4, 6, 8, paid at the top of every garage. This fixes run-first's
weakest system with its own strongest one: escalating pressure that produces a
decision every garage instead of a moving number that produces anxiety. Keep the
**fixed cut** — bottom row after heats 3 to 6 — as the only elimination, and make
a failed ante a forced scrap rather than a death. Two elimination systems is one
too many; one death rule and one escalating tax is right.

**4. Floating prices, from economy-first.** Base +1 per copy bought to a ceiling
of base+4, −1 per heat back toward base, printed on the card beside copies left.
It costs one small module and it is the only mechanism in the round that makes
another player's build change the cost of mine continuously rather than once.

**5. Refit costs your draft pick, from economy-first**, replacing run-first's
5-credit refit. Repairing should cost a part, not a number.

**6. The purse spread, from economy-first:** 8, 7, 6, 5, 4, 3, 2, 1. Winning a
heat has to pay, and three of these four proposals made it barely matter.

**7. Mirror 3 as uptime and Brick 3 as a continuous-only cap, from
interaction-first.** Drop-in replacements for run-first's versions. Mirror 3 as
56% shield uptime is the only counter to rock in the round that is not more
plating; Brick 3 capping continuous damage while one-shots stay uncapped reuses
`isOneShot` and keeps a burst lethal to armour.

**8. A destroyed ship still gets credit for the card it laid, from
interaction-first.** Your play outliving your ship is the best recovery rule
here and it costs nothing.

**9. Declare a direction at draft 2, from build-first — but not in the lobby.**
Keep the moment where you name what you are building and the ladder shows it;
move it to after one course flown and one deal seen, so it is a read rather than
a coin flip. This is what build-first's own owner question 7 already suspects.

Reject: interaction-first's toll (elegant, but unpredictable at the moment of
staking and it starves the leader so hard that winning a heat becomes something
to avoid); economy-first's credits-as-score and its bought markers (spending
score to hurt a field you are flying in); build-first's leader-picks-the-course
and its collapsing corridor (a build a rival can switch off with a free tap, and
a hazard whose rule cannot be drawn); run-first's rising line.

One thing to add that no proposal has. Every interaction here is a queue —
reverse ladder order, wave one then wave two, richest first. There is no moment
where the field reaches for the same thing at the same time and someone visibly
loses the race for it. TFT's carousel is not decoration; it is the round players
talk about afterwards. One heat in the middle of the season where the eight ships
choose simultaneously from eight cards, ties broken by ladder position from the
bottom up, would cost one screen and give the season a scene.
