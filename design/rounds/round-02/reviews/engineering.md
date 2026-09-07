# Review: engineering (fit and cost)

I am the one who has to build this. I read the four proposals against 2,275
lines of `src/sim`, a 475-line `race.ts`, a 306-line `run.ts` and five UI files.
Two things are true of all four and neither is said clearly enough anywhere.

**First: the floor is identical.** Every proposal needs the same first four
PRs. A modifier block off `resolveBuild` that `race.ts` and `hazards.ts` read
instead of `tuning.ts`. `field.ts` widened from a three-value `ShipId` union to
a string and to N ships. `RaceState` gaining a damage-per-placement map, and
`HazardPlacement` gaining an owner id. `run.ts` replaced by a season state
machine. That is the same work under The Ante, The Toll, The Rising Line and
Ignition. It is unblocked today. Whichever framework wins, those four PRs should
start now, because the choice does not change them.

**Second: nobody is building this in a handful of PRs.** The claims are 17, 15,
15 and 17, with first playables at 9, 9, 11 and 8. My own count says the sim
floor alone — modifiers, hazards reading them, new parts with threshold tests,
attribution, course data, the track phase, the ladder or ledger, the economy,
the draft, N bots, the season machine — is eleven PRs before a pixel of new UI,
under every proposal. At the slice's one-item-a-session pace that is a fortnight
to headless and a month to playable. Only **The Ante** says this out loud ("nine
is not a handful"), and only **The Rising Line** structures for it ("the first
playable is PRs 1 to 11 — headless, driven by the harness"). Both deserve credit
for it. **Ignition**'s eight is the least honest number in the round, because
what it excludes at eight is cards and course choice — the entire answer to the
brief's fourth gap.

## Scoreboard

| Proposal          | Build fantasy | Tradeoffs | Interaction | Stakes | Legibility | Fit | Buildable | Measurable | Total  |
| ----------------- | ------------- | --------- | ----------- | ------ | ---------- | --- | --------- | ---------- | ------ |
| interaction-first | 4             | 4         | 5           | 4      | 4          | 5   | 4         | 5          | **35** |
| run-first         | 4             | 5         | 5           | 4      | 3          | 5   | 4         | 5          | **35** |
| economy-first     | 3             | 5         | 4           | 4      | 3          | 5   | 3         | 4          | **31** |
| build-first       | 5             | 4         | 3           | 5      | 3          | 3   | 2         | 3          | **28** |

## The Ante (economy-first)

**Build fantasy 3.** The tags, the two-of-a-tag direction and the three-of-a-tag
rule are the same twelve-part structure three proposals share; nothing about the
build is this proposal's own. Sling 3 turning the black hole from the run's worst
hazard into an assist is a real online moment, and Brick 3 ignoring the escape
threshold rewards being alive rather than fast, which is what armour should pay
for. But the build here is a consequence of the bank, not a thing with its own
shape.

**Tradeoffs 5.** The best in the round and it is not close. The ante rising 0, 1,
2, 3, 4, 6, 8 is a clock every ship can read from the lobby. Prices floating with
demand means another player's purchase is what makes your build expensive. Refit
costs 3 _and_ your one board purchase, so repairing costs a part — that is a
price that bites, and it answers the critique's sixth point properly. The credit
table is the most detailed of the four and its conclusion is the right one: the
committed player holds 8 against an ante of 6, then 5 against an ante of 8. The
winner is never comfortable.

**Interaction 4.** The market is the only genuinely two-way interaction anyone
proposed that does not touch the track: I buy the third Mirror Shielding, the row
reads "5, three left", and every other captain re-prices their plan. That is
counter-pick information as a number rather than a guess, and it is very good.
The course half is weaker. Five slots against eight ships, markers bought in
ledger order, and a ship below two of a tag cannot buy at all — so in heats 1 to
3 most of the field is still mute on the track, which is exactly what the
critique told this round to fix.

**Stakes and recovery 4.** Bankruptcy by forced scrap is the freshest elimination
in the round and it inverts the usual failure: you go broke by building, not by
losing, and "rich in seventh and cut" becomes "rich and still flying". The forced
scrap gets its own screen naming what is sold, which is the right call. Marked
down because with no cut, the number of ships in the final is emergent — the
harness has to _discover_ whether two, four or zero ships fold, and a season
where nobody goes bankrupt is a season with no elimination at all.

**Legibility 3.** A fourteen-row board with floating prices and a base column,
plus an ante schedule, interest, scrap value, five marker prices, tag pips and
hull. The single-currency idea buys a lot of this back — one number for money,
score and life is genuinely elegant — but the board spends it again. The proposal
names this risk itself and it is right to.

**Fit 5.** Nothing bent. Credits never enter the race. The market resolves as a
pure fold over purchases in a fixed order, which is deterministic and replayable.
One tap per screen, two to four taps between heats.

**Buildable 3.** The most honest cost section in the round: it names `hazards.ts`
explicitly, names the three functions and three test files, and states the
schedule in weeks. But `market.ts` is a stateful subsystem — price, stock, drift,
scrap, refund, ceiling — that no other proposal needs and that every bot must
model. Five new modules against The Toll's four smaller ones, and seventeen PRs.

**Measurable 4.** Good assertions, and one that is specific to its own mechanic:
"the leader pays 1.5 more per part than the tail" is a claim about the market
that a harness can falsify. Marked down because a floating market makes bot
purchase policy high-dimensional — "buys at or below base" versus "buys the best
affordable" versus "buys to deny" is a policy space with no natural enumeration,
so a null result is hard to interpret.

**Best single idea.** The ante schedule printed in the lobby. One rising number
does the work of an economy, run health and elimination at once, and it is the
only elimination rule in the round that a player can see coming three heats out
without a points calculation.

**Fatal flaw.** None fatal, but the floating market is the wrong first
subsystem. It is the largest piece of new machinery in the round, it is invisible
during a race, and it is the one thing whose balance cannot be measured by racing
ships. Build it third, not first.

## The Toll (interaction-first)

**Build fantasy 4.** Two of the threshold rewrites are direct, correct answers to
the critique. **Brick 3 caps continuous damage only** — and it says so by reusing
`isOneShot`, which already exists in `hazards.ts` and already draws the exact
line the rule needs. That is the sharpest piece of code reuse anyone proposed:
the rule is one branch in the damage path and the test is one line. **Mirror 3
buys uptime rather than depth** — shields up 180 of every 320 ticks, 56% of a
course, making it the only ship that can be shielded through an asteroid field.
That is a Y that is not X, it fixes the Mirror-3-does-nothing hole from round one,
and it is visible in fifteen seconds. Marked at 4 rather than 5 because build =
weapon = armour is elegant but means the build has no dimension the stake does
not already show.

**Tradeoffs 4.** Repairs at 1 credit per 6 hull means a full repair from 40 costs
10, more than a tier-2 part at 8 — the critique's target, hit exactly. The
five-draft table is thin at three rows but its conclusion is real: the spender
reaches the heat-3 draft on 2 and watches the tier-2 go. Marked down because the
toll partly decouples income from placing, which softens greed: a ship can be
paid well for finishing sixth, and the author names the farming risk.

**Interaction 5.** The whole design and the best answer to the fourth gap in the
round. All eight ships stake, every heat, one tap each. You cannot stake what you
cannot survive, so a rival's pips predict what it will do to the course before it
does it. The four-tag cycle gives a Y that is never X, which round one never
managed. And the anti-snowball is structural rather than bolted on: the leader
earns no toll, so money flows down the ladder while points flow up. Not a 5 with
room to spare only because socket _order_ is fixed level data — nobody can put
rock in front of a hole, so sequence, the best idea in round one's course phase,
is gone. The author names this and offers the fallback.

**Stakes and recovery 4.** Standard ladder and cut. The distinctive lever is
excellent: **a destroyed ship still collects the toll its hazard earned while it
was flying.** That is precisely the brief's second direction — a ship can be
destroyed in a heat while the player stays in the game — and it turns a crash
from a lost heat into a bad one. Marked down because the cut is otherwise the
same rule three proposals share, and because farming sixth for toll is a real
exploit the author flags but does not close.

**Legibility 4.** The fewest new nouns of the four. Same four hazards on every
course, drawn faint, with pip counts. No ante, no floating price, no Frame, no
Drives, no course choice, no lay-versus-wipe. Two screens, three taps. The stake
is one tap on an icon and the reveal is one picture. This is the only proposal I
could explain to someone on a train in under a minute.

**Fit 5.** Pure, fixed tick, no contact, one thumb. The toll needs cross-ship
damage out of a field, and `field.ts` already steps every ship's `RaceState` in
lockstep inside one function, so the data is right there — it needs a
`Map<PlacedHazard, number>` written in the damage branch of `stepRace` and read
after `flyField`, which every proposal needs anyway for attribution. A stake is
an input exactly like a tap, so a bot, a ghost and a live player are the same
thing to the sim. That sentence is true here and I checked it.

**Buildable 4.** The smallest new decision surface in the round by a distance. A
stake is a five-way enum; `stake.ts` is about forty lines and its bot rule is
three. Four new modules. It reuses `isOneShot` rather than adding a concept. The
nine-PR first playable is optimistic by about two, because PR 3 hides a second
one: intensity does not only scale a number, it **changes the number of
placements** — "intensity bursts, 150 ticks apart" means a socket expands into N
placements at course-generation time, which is `course.ts`, not `HazardContext`.
Say so and the count is eleven, same as everyone.

**Measurable 5.** The best assertion list in the round, and it has a property
nothing else does: because a stake is a five-way enum, the _entire_ stake policy
space can be enumerated exhaustively in the harness. "A bot that stakes its own
tag beats one that always stakes the same hazard in at least 55% of seasons" and
"on a course with its own hazard at intensity 4, a set-3 ship beats an identical
set-2 ship in at least 70% of races" are both directly codeable head-to-heads,
and the second is exactly what the critique demanded.

**Best single idea.** Brick 3 capping continuous damage only, expressed through
`isOneShot`. It is a rule that reads in one line, tests in one assertion, is
already half-written in the repo, and gives Brick a weakness a burst can exploit.
Runner-up: a destroyed ship still collects its toll.

**Fatal flaw.** None. The nearest thing is the loss of sequence — fixed socket
order means the track phase is a volume knob, not a composition — and its own
fallback (the bottom two ships may swap two adjacent sockets) is one PR and
should simply be in the design rather than in the risks.

## The Rising Line (run-first)

**Build fantasy 4.** The counter ring — four tags in a circle, each tag's set
beating exactly one other tag's card — is the cleanest archetype structure in the
round, and the sentence that follows it is the one the brief was asking for: the
answer to their card is never their part. Sling 3 removing the square from
asteroid damage is a huge felt moment; a Sling 3 crossing rock at speed is a
visible transformation. The author flags that it may simply be the best thing in
the game, which is honest and correct.

**Tradeoffs 5.** **Frame** is the best run-health mechanic in the round. Maximum
hull that starts at 100, floors at 30, is repaired to full free before every heat
and charges 1 Frame per 10 hull put back — so the careful ship ends the season on
88 and the greedy one reaches the final on 58 where a flat escape threshold is a
wall. That is the F-Zero trade at season length, it is one falling number, and it
is the only proposal where a bad heat 2 still costs you in the final. Brick 2
halving the bill gives armour a reason to exist at run scale rather than only at
race scale.

**Interaction 5.** All eight lay, every heat, and the two-wave structure means
the bottom half lays with complete information — the tail is the only ship that
sees the whole map. **Open Run as a defuse** is the best single card idea in the
round: it makes a _defensive_ track move possible, so a ship with no armour can
spend its card taking weight off the segment aimed at it. Every other proposal's
track phase can only add threat. This one can subtract.

**Stakes and recovery 4.** The rising line, 10/17/24/31, takes one ship most
heats, two sometimes and nobody sometimes, and the grid flies knowing the next
line is harder. It is genuinely novel and it beats a fixed cut for tension.
Marked down for exactly the reason the author gives: the numbers are a first
guess against a mean that shifts as the field shrinks, so the first table will be
wrong and the fallback is a fixed cut.

**Legibility 3.** The most to hold of the three ladder proposals. Points, the
line number, Frame, credits, four pips with counts, intensity as "rock, three
deep", plus a seeding screen with two waves where half the field acts blind. Each
piece is defensible; the sum is one idea more than a phone wants. Intensity as a
depth count is harder to read than The Toll's pip count because it resolves —
"the slot takes the kind with the most cards behind it, minus Open Runs, floored
at 0, capped at 4" is four rules for one number.

**Fit 5.** Pure, fixed tick, no contact. Seeding waves are recorded inputs. Frame
is one number per ship on the season row and `RaceOptions.startHull` already
exists to feed it. Nothing bent.

**Buildable 4.** Fifteen PRs and the right shape: **first playable at 11,
headless, driven by the harness, before a pixel of new UI.** That matches how
this repo actually works — `flyField` is already headless and the balance script
already drives whole runs. One genuine hole: Frame is a third hull quantity
alongside `resolveBuild(...).hull` and current hull, and the proposal never says
what a +70 hull Ram Prow does to a ship on 58 Frame. That is an unspecified rule
in the middle of the load-bearing mechanic, and it needs answering before PR 8.
The seeding phase — menus, waves, slot resolution, intensity, Open Run
subtraction — is meaningfully more code than a stake enum.

**Measurable 5.** Strong list, and it is the only proposal that asks the harness
to report a **distribution** rather than a rate: cuts per heat. A rising line
cannot be validated any other way, and noticing that is the mark of someone who
has thought about what the harness is for.

**Best single idea.** Open Run as a defuse. One card kind turns the track phase
from a threat auction into a negotiation, gives the ship being targeted a move,
and costs one branch in slot resolution.

**Fatal flaw.** None fatal. The seeding equilibrium risk is real — if piling
every card into one slot is always right, the course is one wall and three empty
segments — but the author names it, names the counterweights and names the
one-note-seeder bot that would catch it. That is how a risk should be written.

## Ignition (build-first)

**Build fantasy 5.** The best in the round and the reason to read this proposal.
One Drive declared in the lobby before a part is bought; the Drive is the only
thing on the ship that changes a rule; cells are pure stat deltas with a colour
on them. **Four rules to learn in the whole game, not fourteen part texts.** Six
slots with ignition at four means two slots are left for what you lack, so
commitment is arithmetic nobody has to be told. And Keel 4 — free repairs,
therefore money, therefore tier-3 cells, so the armour build wins by being the
richest ship at the end — is the freshest archetype anyone proposed.

**Tradeoffs 4.** Good and specific. Ignition counts cells, not credits, so four
cheap cells light a Drive as surely as four dear ones — and once four slots are
full the only way up is buy-expensive-and-scrap-cheap. Repairs at 1 per 8 hull.
The credit table's conclusion is the sharpest of the four: the saver sits seventh
for four heats and is cut before its build lands, so its cells arrive on a ship
no longer in the season.

**Interaction 3.** This is where it falls down, and it falls down on the exact
point the critique raised. Only the **bottom half** of the ladder gets a move on
the track. In the worked run the player lays nothing in heat 6 — "climbing cost
you your voice on the track" — which is a nice line and a re-creation of the
round-one failure with the sign flipped. The leader's course pick is genuinely
good and genuinely cheap (one index), and lay-versus-wipe makes the phase a fight
rather than a queue. But four of eight ships acting is not the answer to a gap
the brief calls the one that matters most.

**Stakes and recovery 5.** **The head start final is the best single mechanic in
the round.** Six heats of ladder converted into 40, 25, 12 and 0 ticks on an
1,150-tick course: the ladder matters, the final is not a formality, it reads
instantly off the grid, and it is one number per ship. Everything else here —
the cut, the tiebreak, a destroyed ship returning at 30 hull with its build — is
the shared spine done competently.

**Legibility 3.** The build half is the most legible in the round: four Drives,
one pip lit at ignition, cells that are pure stats. The season half spends it
all. Course choice, lay or wipe, short or long, Drive swap at 5, scrap at 1,
repairs, interest, tiers unlocking at drafts 1/3/5 — and a hazard the author
admits the current renderer cannot draw. The collapsing corridor reads as
unexplained damage until the third-person view exists, and the proposal says so.

**Fit 3.** The only proposal with an unearned bend, and it is in the mechanic I
like most. The head start puts ships at different `startDistance` in one field.
`standings()` sorts survivors by `finishTicks`, and `livePositions()` sorts by
`distance` — both are silently wrong the moment two ships start from different
places. The proposal claims `field.ts` is "unchanged apart from widening
`ShipId`". It is not: two ordering functions become rule changes, and the HUD's
live position with them. Separately, `actives.ts` reading shield duration and
reroute cooldown off the build means `ACTIVES` stops being a static table, which
reaches `pilot.ts` and the HUD. Both are fixable in a PR. Neither is admitted.

**Buildable 2.** The most hidden scope in the round. Seventeen PRs, and the
eight-PR first playable explicitly excludes cards and course choice — so what
ships at eight is today's game with more parts and a ladder, and the brief's
fourth gap is unanswered until PR 13 or so. The leader picking which of the
remaining courses is flown next means all seven courses must be balanced
_against each other_, not merely sequenced: that is seven pieces of level data
with a mutual constraint, and it is the most expensive authoring job proposed.
The collapsing corridor needs per-placement `ticksInside` carried in the race
loop — new mutable per-placement state, small but novel. Nine modifiers is
declared a ceiling and, in the author's own words, not proved. Lay/wipe ×
short/long × slot is four decision axes for bots where The Toll has one.

**Measurable 3.** The assertions are reasonable but the headline one is
confounded. "No Drive wins more than 33%" cannot be measured cleanly when the
leader bot chooses the course, because Sling's win rate is partly a measurement
of how often the leader bot picks a course with a black hole on it. The author
half-concedes this in the Sling risk ("if Sling wins from fifth and never from
second"). Confounding a headline metric with a bot policy is the thing a harness
exists to avoid.

**Best single idea.** The head start final. One number in `startRace`, six heats
of ladder made to matter, no points arithmetic on the results screen. Take it.

**Fatal flaw.** Only the bottom half of the ladder touches the track. The brief
says the fourth gap matters most; this proposal answers it for four ships out of
eight and then writes a worked run in which the player, doing well, is silent.
Combined with a first playable that ships the ladder before the cards, this is
the framework most likely to arrive at PR 8 and still not be a game.

## Recommended merge

**Build from The Toll (interaction-first).** It has the smallest new decision
surface, the best legibility, the best measurability, the only exhaustively
enumerable bot policy space in the round, and it is the only proposal whose
distinctive mechanic reuses code that already exists. Every ship acts on the
track every heat, which is what the critique asked for and what the brief calls
the gap that matters most.

Graft five things onto it.

**1. Frame, from The Rising Line.** The Toll's run health is hull-carries-plus-
paid-repairs, which is the weakest of the four. Frame — max hull, floors at 30,
1 Frame per 10 hull repaired, 20 Frame for a crash — is one falling number, it is
the F-Zero trade the brief explicitly asked for, and it makes a bad heat 2 cost
something in the final. It replaces The Toll's repair-at-1-per-6 entirely. Settle
the unspecified rule first: a hull-adding part raises Frame, and current hull
never exceeds Frame.

**2. Open Run as a fifth stake, from The Rising Line.** The Toll's stake menu is
four hazards plus Hold; Hold pays 2 credits and does nothing to the course. Make
the fifth option Open Run: it subtracts one from a socket's intensity. The stake
enum goes from five to six, the bot rule gains one branch, and the ship being
targeted gets a move. This is the cheapest large improvement available in the
round.

**3. The head start final, from Ignition.** Replace The Toll's double-points
final with 40/25/12/0 ticks of head start. It is one number in `startRace`, it
removes a points multiplier from the results screen, and it makes the ladder
matter without the final being a formality. Budget the same PR for fixing
`standings()` and `livePositions()` to compare progress rather than raw distance
and finish tick — Ignition does not admit this cost, so we should.

**4. The socket swap, from The Toll's own risks.** Promote it out of the risks
section: the bottom two ships may each swap two adjacent sockets. That buys back
sequence — rock in front of a hole — for one bot rule and one index, and it is
the thing The Toll's fixed socket order otherwise throws away.

**5. `layCards(course, cards) → Track`, from Ignition.** Not a mechanic, a
signature, and it is the right one. Keep season courses as immutable level data
and make the track phase a pure function from course plus stakes to a `Track`.
Every proposal needs this shape; only Ignition wrote it down.

**Reject three things explicitly.** The floating market from The Ante — the
largest new subsystem in the round, invisible during a race, and the one thing
whose balance cannot be measured by racing ships; if a price signal is wanted,
copies-left printed on a face-up card already gives it for free. The leader
picking the course from Ignition — seven mutually balanced courses is the most
expensive authoring job proposed, and it confounds every per-tag win-rate
assertion in the harness. The collapsing corridor — a hazard the current
renderer cannot show is a hazard the player will read as a bug, and the parked
third-person view is not on this milestone.

**Take one thing from The Ante that is not a mechanic:** its cost section. It is
the only one that names the functions, the test files and the schedule in weeks
without flattering itself. That should be the template for the next round's
"what it costs to build".

**Start now, whatever wins.** The four floor PRs are identical under all four
proposals and none of them is blocked on this decision: (1) a `Modifiers` block
returned by `resolveBuild` and read by `race.ts`; (2) `hazards.ts` reading it,
with its four test files updated; (3) `ShipId` widened to a string and `field.ts`
taking N ships; (4) per-placement damage on `RaceState` and `laidBy` on
`HazardPlacement`. Four sessions of work that the framework choice cannot waste.
